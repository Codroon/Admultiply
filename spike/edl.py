"""The Edit Decision List — the contract between the AI and the renderer.

This is the most important interface in the whole pipeline. GPT-4o Mini's only
job is to emit one of these; FFmpeg's only job is to execute it. Keeping that
boundary sharp means we can iterate on prompting without touching rendering,
and swap the model later without touching either.

Two conventions that matter:

  * All times are SOURCE time (seconds into the original video). The model
    reasons about the transcript, which is in source time, so making it do
    output-time arithmetic is just an extra chance to get it wrong. Remapping
    to output time is our job — see `remap_captions`.

  * Validation returns a list of human-readable errors rather than raising.
    In step 4 those strings get fed straight back to the model for one retry,
    which is far cheaper than a re-render or a manual fix.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

# A micro-ad that runs long stops being a micro-ad. These are the guard rails
# the model's output is held to.
MIN_OUTPUT_SECONDS = 8.0
MAX_OUTPUT_SECONDS = 26.0
IDEAL_RANGE = (12.0, 22.0)

# Cutting a segment shorter than this produces a flash frame, not a shot.
MIN_SEGMENT_SECONDS = 0.6


@dataclass
class Segment:
    start: float
    end: float

    @property
    def duration(self) -> float:
        return self.end - self.start


@dataclass
class Caption:
    """A line of on-screen text, timed in SOURCE seconds."""
    start: float
    end: float
    text: str


@dataclass
class Variation:
    id: str
    strategy: str
    hook: str = ""
    segments: list[Segment] = field(default_factory=list)
    captions: list[Caption] = field(default_factory=list)

    @property
    def output_duration(self) -> float:
        return sum(s.duration for s in self.segments)


@dataclass
class EDL:
    source: str
    variations: list[Variation] = field(default_factory=list)

    # ----------------------------------------------------------------- #
    # Serialisation
    # ----------------------------------------------------------------- #

    @staticmethod
    def from_dict(data: dict) -> "EDL":
        return EDL(
            source=data.get("source", ""),
            variations=[
                Variation(
                    id=str(v.get("id") or f"v{i + 1}"),
                    strategy=v.get("strategy", "Untitled"),
                    hook=v.get("hook", ""),
                    segments=[
                        Segment(float(s["start"]), float(s["end"]))
                        for s in v.get("segments", [])
                    ],
                    captions=[
                        Caption(float(c["start"]), float(c["end"]), str(c["text"]))
                        for c in v.get("captions", [])
                    ],
                )
                for i, v in enumerate(data.get("variations", []))
            ],
        )

    @staticmethod
    def load(path: Path) -> "EDL":
        return EDL.from_dict(json.loads(Path(path).read_text(encoding="utf-8")))

    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "variations": [
                {
                    "id": v.id,
                    "strategy": v.strategy,
                    "hook": v.hook,
                    "segments": [{"start": s.start, "end": s.end} for s in v.segments],
                    "captions": [
                        {"start": c.start, "end": c.end, "text": c.text}
                        for c in v.captions
                    ],
                }
                for v in self.variations
            ],
        }


# --------------------------------------------------------------------------- #
# Validation
# --------------------------------------------------------------------------- #


def validate(
    edl: EDL, source_duration: float, *, include_duration: bool = True
) -> list[str]:
    """Check an EDL against the source.

    `include_duration` separates two different kinds of wrong. Overlapping
    segments or out-of-bounds times make a clip unrenderable. Being 0.5s over
    a target length does not -- it is a preference, and killing an otherwise
    good job over it is worse than shipping the clip. The repair loop checks
    both so the model tries to hit the band; the final render gate checks
    only what actually breaks.
    """
    errors: list[str] = []

    if not edl.variations:
        errors.append("EDL contains no variations; expected 3.")

    seen_ids: set[str] = set()

    for v in edl.variations:
        tag = f"variation '{v.id}'"

        if v.id in seen_ids:
            errors.append(f"{tag}: duplicate id.")
        seen_ids.add(v.id)

        if not v.segments:
            errors.append(f"{tag}: has no segments.")
            continue

        ordered = sorted(v.segments, key=lambda s: s.start)
        for i, seg in enumerate(ordered):
            if seg.end <= seg.start:
                errors.append(
                    f"{tag}: segment {i + 1} ends at {seg.end:.2f}s which is not "
                    f"after its start {seg.start:.2f}s."
                )
            if seg.start < 0:
                errors.append(f"{tag}: segment {i + 1} starts before 0.")
            if seg.end > source_duration + 0.05:
                errors.append(
                    f"{tag}: segment {i + 1} ends at {seg.end:.2f}s but the source "
                    f"is only {source_duration:.2f}s long."
                )
            if 0 < seg.duration < MIN_SEGMENT_SECONDS:
                errors.append(
                    f"{tag}: segment {i + 1} is {seg.duration:.2f}s — too short to "
                    f"read as a shot (minimum {MIN_SEGMENT_SECONDS}s)."
                )

        for i in range(len(ordered) - 1):
            if ordered[i].end > ordered[i + 1].start + 0.001:
                errors.append(
                    f"{tag}: segments {i + 1} and {i + 2} overlap "
                    f"({ordered[i].end:.2f}s > {ordered[i + 1].start:.2f}s)."
                )

        total = v.output_duration
        if not include_duration:
            pass
        elif total < MIN_OUTPUT_SECONDS:
            errors.append(
                f"{tag}: total length {total:.1f}s is under the {MIN_OUTPUT_SECONDS}s minimum."
            )
        elif total > MAX_OUTPUT_SECONDS:
            errors.append(
                f"{tag}: total length {total:.1f}s exceeds the {MAX_OUTPUT_SECONDS}s maximum."
            )

        for c in v.captions:
            if c.end <= c.start:
                errors.append(f"{tag}: caption '{c.text[:24]}' has a non-positive duration.")
            if not c.text.strip():
                errors.append(f"{tag}: empty caption text at {c.start:.2f}s.")

    return errors


def warnings(edl: EDL) -> list[str]:
    """Non-blocking observations worth printing."""
    notes: list[str] = []
    lo, hi = IDEAL_RANGE
    for v in edl.variations:
        total = v.output_duration
        if total and not (lo <= total <= hi):
            notes.append(
                f"variation '{v.id}' is {total:.1f}s; the {lo:g}-{hi:g}s band tends "
                f"to perform best for paid social."
            )
        if not v.captions:
            notes.append(f"variation '{v.id}' has no captions.")
    return notes


# --------------------------------------------------------------------------- #
# Source time -> output time
# --------------------------------------------------------------------------- #


def remap_captions(variation: Variation) -> list[Caption]:
    """Convert source-time captions into output-time captions.

    After concatenation the timeline is compressed: only the chosen segments
    survive. A caption is kept if it overlaps a segment, and is clipped to that
    segment's bounds so text never lingers past the cut it belongs to.
    """
    ordered = sorted(variation.segments, key=lambda s: s.start)
    out: list[Caption] = []
    elapsed = 0.0

    for seg in ordered:
        for c in variation.captions:
            overlap_start = max(c.start, seg.start)
            overlap_end = min(c.end, seg.end)
            if overlap_end - overlap_start <= 0.05:
                continue
            out.append(
                Caption(
                    start=elapsed + (overlap_start - seg.start),
                    end=elapsed + (overlap_end - seg.start),
                    text=c.text,
                )
            )
        elapsed += seg.duration

    out.sort(key=lambda c: c.start)

    # A caption that survives into two adjacent segments would otherwise be
    # drawn twice back to back; merge identical neighbours.
    merged: list[Caption] = []
    for c in out:
        if merged and merged[-1].text == c.text and abs(merged[-1].end - c.start) < 0.12:
            merged[-1] = Caption(merged[-1].start, c.end, c.text)
        else:
            merged.append(c)
    return merged
