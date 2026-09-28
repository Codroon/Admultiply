"""Pass 2 of planning -- compose three storylines from the brief.

Pass 1 (understand.py) turned the ad into a handful of MOMENTS, each a
narrative unit with a role and a strength rating as an opener. This pass
builds one micro-ad storyline per recommended angle by choosing and ordering
moments -- the way an editor thinks, rather than picking clauses off a list.

Three guardrails, all enforced in code and fed back as repair text:

  1. Openings must be different moments.
  2. Openings must be at least MIN_OPENING_GAP seconds apart in the source.
     Two adjacent moments are the same opening from the viewer's side -- the
     client caught exactly this: two clips whose first five seconds matched.
  3. No two storylines may share more than MAX_OVERLAP of their footage.

Storylines are generated one per call, each told what the previous ones took.
A small model cannot hold "these three must differ" across outputs written in
one pass; it can easily avoid a list of things already used.

Realisation -- moments to beats to padded time spans, bridging of small gaps,
the minimum-length backstop, captions from the transcript -- is deterministic
and unchanged from before. The model never touches a timestamp.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass

from config import cache_read, cache_write, file_fingerprint
from edl import (
    EDL,
    IDEAL_RANGE,
    MIN_OUTPUT_SECONDS,
    MIN_SEGMENT_SECONDS,
    Caption,
    Segment,
    Variation,
    validate,
)
from ffmpeg_tools import SourceInfo
from net import post_json
from transcribe import Transcript
from understand import ANGLE_GUIDE, Brief

MODEL = "gpt-4o-mini"
CACHE_VARIANT = f"{MODEL}-story-v3"  # v3: visual-first realisation
PRICE_IN = 0.15 / 1_000_000
PRICE_OUT = 0.60 / 1_000_000

# Breathing room, taken from the silence either side of a beat.
PAD_IN = 0.18
PAD_OUT = 0.38
MIN_GAP_KEEP = 0.06

# Skipping only a second or two lands on the same person in the same pose and
# reads as a glitch. Bridge it instead: a little longer, no cut at all.
BRIDGE_MAX_GAP = 3.0

# Distinctness. Openings closer than this in the source are the same opening
# to a viewer. That is the rule that matters -- it is exactly what the client
# caught: two cuts whose first five seconds matched. Scaled to the ad: ten
# seconds on a 90s ad is fair, on a 43s ad with five moments it leaves no
# legal combination.
def opening_gap_for(duration: float, mode: str = "speech") -> float:
    if mode == "visual":
        # Visual moments are already distinct shots, delimited by scene
        # changes, so a different moment is a different opening by
        # construction; this only rules out the same instant. The ten-second
        # rule exists for speech, where adjacent clauses share a shot.
        return 2.0
    return max(6.0, min(10.0, duration / 6.0))

# Beyond the opening, cuts may share at most this many moments. A shared
# product shot in the middle is normal -- every real variation of an ad shows
# the product -- so a time-based overlap ratio was flagging every pair. Two
# shared moments out of two or three, though, is the same cut twice.
MAX_SHARED_MOMENTS = 1

SCHEMA = {
    "name": "storyline",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "Six words or fewer. The idea of this cut, as a label.",
            },
            "logline": {
                "type": "string",
                "description": "One sentence: what a viewer experiences, start to finish.",
            },
            "reframe": {
                "type": "string",
                "enum": ["crop", "blur"],
                "description": (
                    "crop when one subject is centred; blur when the frame has "
                    "edge text, packaging or wide action worth keeping."
                ),
            },
            "sequence": {
                "type": "array",
                "description": "1-3 moments, in the order they play.",
                "items": {
                    "type": "object",
                    "properties": {
                        "moment": {"type": "string", "description": "A moment id, like m3."},
                        "why": {"type": "string"},
                    },
                    "required": ["moment", "why"],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["title", "logline", "reframe", "sequence"],
        "additionalProperties": False,
    },
}

SYSTEM = f"""You are a senior direct-response video editor. A strategist has \
broken a long ad into numbered MOMENTS -- narrative units with timings, a \
role, an opener-strength rating, and a note on what is on screen. You build \
ONE short vertical micro-ad by choosing and ordering moments.

You choose moments by id. You never invent timestamps.

Rules you never break:

- The clip runs {IDEAL_RANGE[0]:g}-{IDEAL_RANGE[1]:g} seconds. Add the moment \
durations up and hit that band. Never exceed 25.
- Use 2-5 moments. When moments are short, use more of them -- the length \
target matters more than keeping the sequence brief.
- Moments play in source order, earliest first. List them that way.
- The opening decides everything. Open on a moment with high opener strength \
that fits the angle. Never open on filler or on mid-way context.
- Never choose two moments that sit within a few seconds of each other unless \
they are consecutive -- a small skip between the same shot looks like a \
glitch. Either take them together or jump somewhere clearly different.
- End on the product, the offer, or a line that lands. Never trail off.
- The viewer sees only what you pick. The clip must make complete sense \
standing alone.
- When told which openings other cuts already use, open somewhere genuinely \
different -- a different part of the ad, a different idea -- so that three \
people watching the three cuts would describe three different ads.

The angles:

{ANGLE_GUIDE}

For "reframe": choose "crop" when the shot is one centred subject, since it \
fills the frame. Choose "blur" when losing the sides would cut text, product \
packaging or wide action."""


@dataclass
class PlanResult:
    edl: EDL
    reasoning: dict
    cost_usd: float
    tokens_in: int
    tokens_out: int
    cached: bool
    seconds_taken: float
    repaired: bool


# --------------------------------------------------------------------------- #
# Prompt
# --------------------------------------------------------------------------- #


def _prompt(
    source: SourceInfo,
    brief: Brief,
    angle: str,
    taken: list[dict],
    repair: str,
) -> str:
    # Spell out the arithmetic. On a visual ad the good moments run 2-4s, and
    # left to itself the model picked two of them and called a 6s clip done.
    usable = [m for m in brief.moments if m.role != "filler"]
    mean = sum(m.duration for m in usable) / len(usable) if usable else 0.0
    need = max(2, round(IDEAL_RANGE[0] / mean)) if mean else 3
    sizing = (
        f"\n\nThese moments average {mean:.1f}s, so reaching "
        f"{IDEAL_RANGE[0]:g}-{IDEAL_RANGE[1]:g}s takes about {need} of them."
    )

    out = f"""Source ad: {source.path.name}  ({source.duration:.1f}s)
Product: {brief.product}
Audience: {brief.audience}
Format: {brief.format}
Arc: {brief.arc}

Moments:

{brief.menu()}{sizing}

Build ONE storyline using the "{angle}" angle."""

    if taken:
        used_parents = {p for t in taken for p in t["parents"]}
        unused = [m.id for m in brief.moments if m.parent not in used_parents and m.role != "filler"]
        lines = "\n".join(
            f"- {t['angle']} opens on {t['opening']} ({t['opening_start']:.0f}s in) "
            f"and uses {', '.join(t['moments'])}"
            for t in taken
        )
        # A positive list of what to use works far better than a list of what
        # to avoid -- "choose from these" is an easy instruction, "don't overlap
        # with those" is a constraint the model kept failing to satisfy.
        out += (
            f"\n\nCuts already made:\n{lines}\n\n"
            f"Build this cut mainly from moments no other cut has used: "
            f"{', '.join(unused) if unused else 'none left -- do your best'}. "
            f"You may include at most ONE moment another cut already used. Your "
            f"opening must be at least {opening_gap_for(source.duration, brief.mode):.0f} "
            f"seconds away from the openings above. Three people watching the three "
            f"cuts should describe three different ads."
        )
    if repair:
        out += (
            "\n\nYour previous attempt was rejected for these reasons. Fix them "
            "precisely and keep everything else:\n" + repair
        )
    return out


# --------------------------------------------------------------------------- #
# Realisation (deterministic)
# --------------------------------------------------------------------------- #


def _padded_span(transcript: Transcript, i: int, j: int) -> tuple[float, float]:
    beats = transcript.beats
    i = max(0, min(i, len(beats) - 1))
    j = max(i, min(j, len(beats) - 1))
    prev_end = beats[i - 1].end if i > 0 else 0.0
    next_start = beats[j + 1].start if j + 1 < len(beats) else transcript.duration
    start = max(prev_end + MIN_GAP_KEEP, beats[i].start - PAD_IN, 0.0)
    end = min(next_start - MIN_GAP_KEEP, beats[j].end + PAD_OUT, transcript.duration)
    return start, max(start + 0.1, end)


SCENE_SNAP = 0.75  # seconds; a cut this close to a scene change lands on it


def _snap_scene(t: float, cuts: list[float]) -> float:
    if not cuts:
        return t
    nearest = min(cuts, key=lambda c: abs(c - t))
    return nearest if abs(nearest - t) <= SCENE_SNAP else t


def _visual_span(m, cuts: list[float], duration: float) -> tuple[float, float]:
    """Time span for a visual moment, cut on scene changes where one is near.

    The picture's equivalent of snapping to a word boundary: a cut that lands
    on a scene change reads as an edit, one that lands a second either side
    reads as a mistake.
    """
    start = _snap_scene(m.start, cuts)
    end = _snap_scene(m.end, cuts)
    if end - start < 1.0:
        end = min(duration, start + max(1.0, m.duration))
    return max(0.0, start), min(duration, end)


def _bridge(segments: list[Segment]) -> tuple[list[Segment], int]:
    merged: list[Segment] = []
    bridged = 0
    for s in sorted(segments, key=lambda s: s.start):
        if merged and s.start - merged[-1].end < BRIDGE_MAX_GAP:
            if s.start - merged[-1].end > 0.25:
                bridged += 1
            merged[-1] = Segment(merged[-1].start, max(merged[-1].end, s.end))
        else:
            merged.append(s)
    return merged, bridged


def _grow_to_minimum(
    segments: list[Segment],
    boundaries: list[tuple[float, bool]],
    duration: float,
    target: float = IDEAL_RANGE[0],
) -> tuple[list[Segment], float]:
    """Extend blocks forward until the clip is a watchable length.

    A backstop, not a strategy: the model chooses the angle, this only stops a
    7-second clip reaching the render. Grows toward the ideal floor and stops
    at the first good boundary past it.

    `boundaries` are (time, good_stop): a beat's padded end and whether it
    completes a sentence, or a scene change and True. Tries the FIRST block
    first. Growing the last block meant every short cut dragged into the same
    outro and three cuts converged on one ending; a hook that runs a little
    longer into what follows it is the more natural extension, and a block
    with no room simply passes to the next.
    """
    total = lambda: sum(s.duration for s in segments)  # noqa: E731
    if not segments or total() >= target:
        return segments, 0.0

    grown = 0.0
    for idx in range(len(segments)):
        seg = segments[idx]
        room = segments[idx + 1].start - MIN_GAP_KEEP if idx + 1 < len(segments) else duration
        before = seg.end
        for at, good in boundaries:
            # Compare against the segment END. A start-based check skipped the
            # very boundary that should have stopped growth, and one clip ran
            # on to 46 seconds.
            if at <= seg.end + 0.05:
                continue
            end = min(at, room)
            if end <= seg.end:
                break
            segments[idx] = seg = Segment(seg.start, end)
            if total() >= target and good:
                break
        grown += seg.end - before
        if total() >= target:
            break
    return segments, grown


def _captions(segments: list[Segment], transcript: Transcript) -> list[Caption]:
    out: list[Caption] = []

    def flush(buf: list) -> None:
        if buf and buf[-1].end - buf[0].start > 0.05:
            out.append(Caption(buf[0].start, buf[-1].end, " ".join(x.text for x in buf)))

    for seg in segments:
        buf: list = []
        for w in transcript.words:
            if w.start < seg.start or w.end > seg.end:
                continue
            buf.append(w)
            if len(buf) >= 4 or len(" ".join(x.text for x in buf)) >= 26:
                flush(buf)
                buf = []
        flush(buf)
    return out


def _overlap_ratio(a: list[Segment], b: list[Segment]) -> float:
    """Shared footage as a fraction of the shorter clip.

    Using the shorter clip as the denominator is deliberate: a 12s clip that
    sits entirely inside a 22s clip is the same clip to a viewer, and this
    reports 1.0 for it where a union-based measure would say 0.55.
    """
    inter = 0.0
    for x in a:
        for y in b:
            inter += max(0.0, min(x.end, y.end) - max(x.start, y.start))
    shorter = min(sum(s.duration for s in a), sum(s.duration for s in b))
    return inter / shorter if shorter > 0 else 0.0


def _realise(
    raw: dict,
    angle: str,
    brief: Brief,
    transcript: Transcript,
) -> tuple[Variation, dict]:
    """Model output for one storyline -> a renderable Variation."""
    segments: list[Segment] = []
    used: list[str] = []

    # Always play in source order, whatever order the model listed them. A
    # cold open is a deliberate future feature; done by accident it reverses
    # narration mid-ad. Sorting here also means the guardrails see the true
    # opening rather than whichever moment the model happened to list first.
    steps = sorted(
        (s for s in raw.get("sequence", []) if brief.moment(str(s.get("moment", ""))) is not None),
        key=lambda s: brief.moment(str(s["moment"])).start,
    )
    visual = brief.mode == "visual"
    for step in steps:
        m = brief.moment(str(step["moment"]))
        if visual or m.from_beat < 0:
            start, end = _visual_span(m, brief.scene_cuts, transcript.duration)
        else:
            start, end = _padded_span(transcript, m.from_beat, m.to_beat)
        segments.append(Segment(start, end))
        used.append(m.id)

    # Where a block may grow to: the next word boundary that completes a
    # sentence, or the next scene change.
    if visual:
        boundaries = [(c, True) for c in brief.scene_cuts] + [(transcript.duration, True)]
    else:
        boundaries = [(b.end + PAD_OUT, b.ends_sentence) for b in transcript.beats]

    segments, bridged = _bridge(segments)
    segments, grown = _grow_to_minimum(segments, boundaries, transcript.duration)
    # A flash frame can never reach the render, whatever produced it.
    segments = [x for x in segments if x.duration >= MIN_SEGMENT_SECONDS]
    if grown:
        # Growth may have closed the gap to the next block; bridge again so we
        # never cut and immediately rejoin.
        segments, more = _bridge(segments)
        bridged += more

    slug = angle.lower().replace(" → ", "-").replace(" ", "-")
    variation = Variation(
        id=slug,
        strategy=angle,
        hook=raw.get("title", "").strip(),
        segments=segments,
        captions=_captions(segments, transcript),
    )
    reasoning = {
        "strategy": angle,
        "title": raw.get("title", ""),
        "logline": raw.get("logline", ""),
        "reframe": raw.get("reframe", "crop"),
        "moments": [
            {"id": m.id, "label": m.label, "why": s.get("why", "")}
            for s in steps
            if (m := brief.moment(str(s["moment"]))) is not None
        ],
        "used": used,
        "picks": [
            {"start": round(s.start, 2), "end": round(s.end, 2)} for s in segments
        ],
        "bridged": bridged,
        "grown_s": round(grown, 1),
        "cuts": max(0, len(segments) - 1),
    }
    return variation, reasoning


# --------------------------------------------------------------------------- #
# Guardrails
# --------------------------------------------------------------------------- #


def _storyline_errors(
    variation: Variation,
    raw: dict,
    brief: Brief,
    source_duration: float,
    taken: list[dict],
    previous: list[Variation],
) -> list[str]:
    errors = validate(EDL(source="", variations=[variation]), source_duration)

    seq = raw.get("sequence") or []
    chosen = sorted(
        (m for s in seq if (m := brief.moment(str(s.get("moment")))) is not None),
        key=lambda m: m.start,
    )
    if not chosen:
        errors.append("The sequence must contain valid moment ids.")
        return errors
    opening = chosen[0]

    # Length, judged on what the model actually chose rather than on what the
    # backstop grew it to. The EDL minimum is 8s, but 8s is not a micro-ad
    # anyone would run; a 9s plan passed validation and never got repaired.
    planned = sum(m.duration for m in chosen)
    if planned < IDEAL_RANGE[0]:
        errors.append(
            f"Your moments add up to {planned:.1f}s; the cut must be at least "
            f"{IDEAL_RANGE[0]:g}s. Add a moment, or choose longer ones."
        )

    if opening.role == "filler":
        errors.append(f"{opening.id} is filler; never open on filler.")

    gap = opening_gap_for(source_duration, brief.mode)
    for t in taken:
        if t["opening"] == opening.id or t["opening_parent"] == opening.parent:
            errors.append(
                f"{opening.id} is the same shot the {t['angle']} cut opens on. "
                f"Open on a different moment."
            )
        elif abs(opening.start - t["opening_start"]) < gap:
            errors.append(
                f"{opening.id} starts at {opening.start:.0f}s, only "
                f"{abs(opening.start - t['opening_start']):.0f}s from the {t['angle']} "
                f"cut's opening at {t['opening_start']:.0f}s. Openings must be at least "
                f"{gap:.0f}s apart -- pick an opening from a different part of the ad."
            )

    # Shared footage, counted by parent so both halves of a split moment
    # register as the one shot they are.
    mine = {m.parent: m.id for m in chosen}
    for t in taken:
        shared = sorted(mine[p] for p in mine if p in t["parents"])
        if len(shared) > MAX_SHARED_MOMENTS:
            errors.append(
                f"This cut shares {', '.join(shared)} with the {t['angle']} cut "
                f"(the same shots). At most one may be shared; swap the others "
                f"for different parts of the ad."
            )

    return errors


def _enforce_distinct(
    raw: dict, brief: Brief, taken: list[dict], source_duration: float
) -> tuple[dict, list[str]]:
    """Deterministic fallback once repair has run out.

    Two rules the model kept breaking after three tries: an opening too close
    to another cut's, and sharing more than one moment with another cut. Both
    are fixed by substitution -- the offending moment is swapped for the
    strongest unused one in the same part of the ad. If nothing can be
    substituted, an extra shared moment is dropped and the length backstop
    fills in. The rest of the storyline is kept, and the report says what
    changed.
    """
    seq = [dict(s) for s in raw.get("sequence") or []]
    if not seq or not taken:
        return raw, []

    changes: list[str] = []
    gap = opening_gap_for(source_duration, brief.mode)
    other_openings = {t["opening_parent"] for t in taken}
    used_parents = {p for t in taken for p in t["parents"]}

    def chosen() -> list:
        return sorted(
            (m for s in seq if (m := brief.moment(str(s.get("moment")))) is not None),
            key=lambda m: m.start,
        )

    def clashes(m) -> bool:
        return any(
            t["opening_parent"] == m.parent or abs(m.start - t["opening_start"]) < gap
            for t in taken
        )

    def substitute(old, *, lo: float, hi: float, as_opening: bool):
        """The best replacement for `old` that keeps source order.

        An opening may be a shot another cut uses mid-way -- one shared moment
        is allowed -- but never another cut's opening, and never too close to
        one. A mid-cut substitute must be wholly unused, or it just moves the
        sharing around.
        """
        mine = {c.id for c in chosen()}
        pool = [
            m for m in brief.moments
            if m.role != "filler"
            and m.id not in mine
            and m.parent != old.parent
            and m.parent not in other_openings
            and lo <= m.start < hi
            and (not clashes(m) if as_opening else m.parent not in used_parents)
        ]
        if not pool:
            return None
        return max(
            pool,
            key=lambda m: (m.parent not in used_parents, m.strength, -abs(m.start - old.start)),
        )

    def swap(old, new, why: str) -> None:
        for s in seq:
            if str(s.get("moment")) == old.id:
                s["moment"], s["why"] = new.id, why
                break
        changes.append(f"{old.id}->{new.id}")

    # 1. The opening must be its own shot, a decent distance from the others'.
    c = chosen()
    if c and clashes(c[0]):
        hi = c[1].start if len(c) > 1 else source_duration
        new = substitute(c[0], lo=0.0, hi=hi, as_opening=True)
        if new is not None:
            swap(c[0], new, f"Opening substituted for distinctness (was {c[0].id}).")

    # 2. At most one moment in common with any other cut.
    for t in taken:
        theirs = set(t["parents"])
        c = chosen()
        shared = [m for m in c if m.parent in theirs]
        while len(shared) > MAX_SHARED_MOMENTS and c:
            # Keep the opening if it is one of the shared ones; lose the latest.
            victim = shared[-1] if shared[-1] is not c[0] else shared[-2]
            idx = c.index(victim)
            lo = c[idx - 1].end if idx > 0 else 0.0
            hi = c[idx + 1].start if idx + 1 < len(c) else source_duration
            new = substitute(victim, lo=lo, hi=hi, as_opening=False)
            if new is not None:
                swap(victim, new, f"Substituted for distinctness (was {victim.id}).")
            else:
                seq = [s for s in seq if str(s.get("moment")) != victim.id]
                changes.append(f"{victim.id} dropped")
            c = chosen()
            shared = [m for m in c if m.parent in theirs]

    return ({**raw, "sequence": seq} if changes else raw), changes


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #


def make_plan(
    source: SourceInfo,
    transcript: Transcript,
    brief: Brief,
    api_key: str,
    *,
    force: bool = False,
) -> PlanResult:
    fingerprint = file_fingerprint(source.path)
    variant = CACHE_VARIANT + ("-v" if any(m.shown for m in brief.moments) else "")

    if not force:
        cached = cache_read(fingerprint, "plan", variant)
        if cached:
            edl, reasoning = _assemble(cached["raw"], brief, transcript, source)
            return PlanResult(
                edl=edl,
                reasoning=reasoning,
                cost_usd=0.0,
                tokens_in=cached.get("tokens_in", 0),
                tokens_out=cached.get("tokens_out", 0),
                cached=True,
                seconds_taken=0.0,
                repaired=cached.get("repaired", False),
            )

    if not brief.moments or not brief.angles:
        raise SystemExit("The brief has no moments or angles; cannot plan.")

    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"}
    started = time.perf_counter()
    cost = 0.0
    tin = tout = 0
    repaired = False
    raw: dict[str, dict] = {}
    taken: list[dict] = []
    previous: list[Variation] = []

    for angle in brief.angles:
        repair = ""
        best: dict | None = None
        best_var: Variation | None = None
        # Keep the attempt with the fewest rule violations, not the last one.
        # Try 1 short, try 2 right length but over-shared, try 3 short again:
        # "last" kept the short one.
        best_score = 10**9

        for _ in range(3):
            resp = post_json(
                url,
                headers,
                {
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM},
                        {"role": "user", "content": _prompt(source, brief, angle, taken, repair)},
                    ],
                    "response_format": {"type": "json_schema", "json_schema": SCHEMA},
                    "temperature": 0.8,
                },
            )
            usage = resp.get("usage", {})
            tin += usage.get("prompt_tokens", 0)
            tout += usage.get("completion_tokens", 0)
            cost += usage.get("prompt_tokens", 0) * PRICE_IN + usage.get("completion_tokens", 0) * PRICE_OUT

            candidate = json.loads(resp["choices"][0]["message"]["content"])
            var, _ = _realise(candidate, angle, brief, transcript)

            errors = _storyline_errors(var, candidate, brief, source.duration, taken, previous)
            if len(errors) < best_score:
                best, best_var, best_score = candidate, var, len(errors)
            if not errors:
                break
            repair = "\n".join(f"- {e}" for e in errors)
            repaired = True

        if best is not None and best_var is not None:
            best, changes = _enforce_distinct(best, brief, taken, source.duration)
            if changes:
                best_var, _ = _realise(best, angle, brief, transcript)
                repaired = True
            raw[angle] = best
            chosen = sorted(
                (m for s in best.get("sequence") or [] if (m := brief.moment(str(s.get("moment")))) is not None),
                key=lambda m: m.start,
            )
            opening = chosen[0] if chosen else None
            taken.append(
                {
                    "angle": angle,
                    "opening": opening.id if opening else "?",
                    "opening_start": opening.start if opening else 0.0,
                    "opening_parent": opening.parent if opening else -1,
                    "moments": [m.id for m in chosen],
                    "parents": [m.parent for m in chosen],
                }
            )
            previous.append(best_var)

    elapsed = time.perf_counter() - started
    cache_write(
        fingerprint,
        "plan",
        {"raw": raw, "tokens_in": tin, "tokens_out": tout, "repaired": repaired},
        variant,
    )

    edl, reasoning = _assemble(raw, brief, transcript, source)
    return PlanResult(
        edl=edl,
        reasoning=reasoning,
        cost_usd=cost,
        tokens_in=tin,
        tokens_out=tout,
        cached=False,
        seconds_taken=elapsed,
        repaired=repaired,
    )


def _assemble(
    raw: dict[str, dict], brief: Brief, transcript: Transcript, source: SourceInfo
) -> tuple[EDL, dict]:
    variations: list[Variation] = []
    reasoning: dict = {"variations": [], "brief": {
        "product": brief.product,
        "audience": brief.audience,
        "format": brief.format,
        "arc": brief.arc,
        "angles": brief.angles,
        "angle_reasoning": brief.angle_reasoning,
        "moments": [
            {"id": m.id, "label": m.label, "start": round(m.start, 1), "end": round(m.end, 1),
             "role": m.role, "strength": m.strength, "shown": m.shown}
            for m in brief.moments
        ],
    }}
    for angle in brief.angles:
        if angle not in raw:
            continue
        var, why = _realise(raw[angle], angle, brief, transcript)
        variations.append(var)
        reasoning["variations"].append(why)

    # Report pairwise footage overlap so distinctness is visible in the output.
    pairs = []
    for i in range(len(variations)):
        for j in range(i + 1, len(variations)):
            pairs.append(
                {
                    "a": variations[i].strategy,
                    "b": variations[j].strategy,
                    "overlap": round(_overlap_ratio(variations[i].segments, variations[j].segments), 2),
                }
            )
    reasoning["overlap"] = pairs

    return EDL(source=str(source.path), variations=variations), reasoning
