"""Step 4 -- the edit plan.

GPT-4o Mini's only job is to decide *what to keep and why*. It does not do
timing arithmetic, it does not write captions, and it does not touch ffmpeg.

Two guard rails make the output reliable regardless of how the model behaves:

  1. **Structured output.** A strict JSON schema, so we never parse prose.
  2. **Word snapping.** Every timestamp it returns is moved to the nearest real
     word boundary from the transcript. A mid-word cut becomes structurally
     impossible rather than something we hope doesn't happen.

Captions are generated from the transcript, not from the model. The words on
screen are then guaranteed to match the words in the audio -- a model asked to
retype them will eventually paraphrase, and out-of-sync captions look broken.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path

from config import cache_read, cache_write, file_fingerprint
from edl import EDL, Caption, Segment, Variation, validate
from ffmpeg_tools import SourceInfo
from net import post_json
from transcribe import Transcript

MODEL = "gpt-4o-mini"
PRICE_IN = 0.15 / 1_000_000   # USD per input token, verified 2026
PRICE_OUT = 0.60 / 1_000_000

STRATEGIES = ["Hook-first", "Problem → Solution", "Social proof"]

SCHEMA = {
    "name": "edit_plan",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "variations": {
                "type": "array",
                "description": "Exactly three, one per strategy.",
                "items": {
                    "type": "object",
                    "properties": {
                        "strategy": {"type": "string", "enum": STRATEGIES},
                        "hook": {
                            "type": "string",
                            "description": "Under 8 words. The on-screen opener.",
                        },
                        "reframe": {
                            "type": "string",
                            "enum": ["crop", "blur"],
                            "description": (
                                "crop when one subject is centred; blur when the "
                                "frame has edge text, product shots or wide action."
                            ),
                        },
                        "segments": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "start": {"type": "number"},
                                    "end": {"type": "number"},
                                    "why": {
                                        "type": "string",
                                        "description": "One short line of reasoning.",
                                    },
                                },
                                "required": ["start", "end", "why"],
                                "additionalProperties": False,
                            },
                        },
                    },
                    "required": ["strategy", "hook", "reframe", "segments"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["variations"],
        "additionalProperties": False,
    },
}

SYSTEM = """You are a senior direct-response video editor who cuts vertical \
social ads for a living. You are given the transcript of a longer ad with \
timestamps. You choose which moments become three short vertical micro-ads.

Rules you never break:

- Each variation runs 12-25 seconds total. Shorter beats longer.
- Build each from 1-3 segments of the source. Two is usually right.
- A segment must be a complete thought. Never start or end mid-sentence.
- The first 2 seconds decide everything. Open on the single most arresting \
line in the whole transcript, not on a preamble or a greeting.
- The three variations must feel genuinely different, not three trims of the \
same passage. Draw from different parts of the source.
- End on the product, the offer, or a line that lands. Never trail off.

The three strategies:

- "Hook-first" -- open on the most scroll-stopping claim or moment, then \
immediately pay it off.
- "Problem → Solution" -- name the pain the viewer has, then present the \
product as the answer.
- "Social proof" -- lead with credibility: ingredients, science, results, \
authority, testimonial.

For "reframe": choose "crop" when the shot is one centred subject, since it \
fills the frame. Choose "blur" when losing the sides would cut text, product \
packaging or wide action.

Timestamps can be approximate; they get snapped to word boundaries afterwards."""


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


def _user_prompt(source: SourceInfo, transcript: Transcript, repair: str = "") -> str:
    base = f"""Source ad: {source.path.name}
Length: {source.duration:.1f} seconds
Frame: {source.width}x{source.height}

Transcript with timestamps:

{transcript.timed_lines()}

Produce exactly three variations, one per strategy."""
    if repair:
        base += (
            "\n\nYour previous attempt was rejected for these reasons. "
            "Fix them precisely and keep everything else:\n" + repair
        )
    return base


def _to_edl(
    data: dict,
    source: SourceInfo,
    transcript: Transcript,
) -> tuple[EDL, dict]:
    """Model output -> a renderable EDL, with times snapped and captions built."""
    variations: list[Variation] = []
    reasoning: dict = {"variations": []}

    for i, v in enumerate(data.get("variations", [])):
        strategy = v.get("strategy") or STRATEGIES[i % 3]
        segments: list[Segment] = []

        for seg in v.get("segments", []):
            start = transcript.snap(float(seg["start"]), "start")
            end = transcript.snap(float(seg["end"]), "end")
            if end <= start:
                continue
            segments.append(Segment(start, end))

        segments.sort(key=lambda s: s.start)

        # Captions come from the transcript, so they always match the audio.
        captions: list[Caption] = []
        for seg in segments:
            buf: list = []
            for w in transcript.words:
                if w.start < seg.start or w.end > seg.end:
                    continue
                buf.append(w)
                line = " ".join(x.text for x in buf)
                # Three or four words at a time is the readable rhythm on a phone.
                if len(buf) >= 4 or len(line) >= 26:
                    captions.append(Caption(buf[0].start, buf[-1].end, line))
                    buf = []
            if buf:
                captions.append(
                    Caption(buf[0].start, buf[-1].end, " ".join(x.text for x in buf))
                )

        slug = strategy.lower().replace(" → ", "-").replace(" ", "-")
        variations.append(
            Variation(
                id=slug,
                strategy=strategy,
                hook=v.get("hook", ""),
                segments=segments,
                captions=captions,
            )
        )
        reasoning["variations"].append(
            {
                "strategy": strategy,
                "hook": v.get("hook", ""),
                "reframe": v.get("reframe", "crop"),
                "segments": [
                    {"start": s["start"], "end": s["end"], "why": s.get("why", "")}
                    for s in v.get("segments", [])
                ],
            }
        )

    return EDL(source=str(source.path), variations=variations), reasoning


def make_plan(
    source: SourceInfo,
    transcript: Transcript,
    api_key: str,
    *,
    force: bool = False,
) -> PlanResult:
    fingerprint = file_fingerprint(source.path)

    if not force:
        cached = cache_read(fingerprint, "plan", MODEL)
        if cached:
            edl, reasoning = _to_edl(cached["raw"], source, transcript)
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

    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"}
    started = time.perf_counter()
    cost = 0.0
    tin = tout = 0
    repair = ""
    repaired = False
    raw: dict = {}
    edl: EDL | None = None

    # One repair round. Validation errors are written to be read by the model.
    for attempt in range(2):
        resp = post_json(
            url,
            headers,
            {
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM},
                    {"role": "user", "content": _user_prompt(source, transcript, repair)},
                ],
                "response_format": {"type": "json_schema", "json_schema": SCHEMA},
                "temperature": 0.7,
            },
        )
        usage = resp.get("usage", {})
        tin += usage.get("prompt_tokens", 0)
        tout += usage.get("completion_tokens", 0)
        cost += usage.get("prompt_tokens", 0) * PRICE_IN
        cost += usage.get("completion_tokens", 0) * PRICE_OUT

        raw = json.loads(resp["choices"][0]["message"]["content"])
        edl, reasoning = _to_edl(raw, source, transcript)
        errors = validate(edl, source.duration)
        if not errors:
            break
        repair = "\n".join(f"- {e}" for e in errors)
        repaired = True

    elapsed = time.perf_counter() - started
    assert edl is not None

    cache_write(
        fingerprint,
        "plan",
        {"raw": raw, "tokens_in": tin, "tokens_out": tout, "repaired": repaired},
        MODEL,
    )

    edl, reasoning = _to_edl(raw, source, transcript)
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
