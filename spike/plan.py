"""Step 4 -- the edit plan.

GPT-4o Mini's only job is to decide *what to keep and why*. It does no timing
arithmetic, writes no captions, and never touches ffmpeg.

The key design decision: **the model picks whole sentences by index, not
timestamps.** Asking a language model for float timestamps and snapping them
afterwards sounds reasonable and isn't -- a cut it intends at 6.3s lands in the
middle of a thought, and no amount of snapping recovers the intent. Choosing
from a numbered list of complete sentences makes a mid-sentence cut
structurally impossible, and it is an easier decision for the model besides:
pick from six options rather than invent a number.

Timings then come from the transcript, padded into the natural silence between
sentences so speech never clips.
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
    Caption,
    Segment,
    Variation,
    validate,
)
from ffmpeg_tools import SourceInfo
from net import post_json
from transcribe import Transcript

MODEL = "gpt-4o-mini"
CACHE_VARIANT = f"{MODEL}-v4"  # v4 = beats + visual analysis
PRICE_IN = 0.15 / 1_000_000
PRICE_OUT = 0.60 / 1_000_000

STRATEGIES = ["Hook-first", "Problem → Solution", "Social proof"]

# Breathing room, taken from the silence either side of a sentence. Cutting on
# the exact millisecond speech stops is what makes a clip end abruptly.
PAD_IN = 0.18
PAD_OUT = 0.38
MIN_GAP_KEEP = 0.06  # never eat a neighbouring sentence

# If two chosen blocks sit closer together than this, bridge them into one
# continuous run instead of cutting.
#
# A cut only earns its discontinuity if it skips enough material to justify it.
# Skipping twenty seconds lands on a different shot and reads as a deliberate
# scene change. Skipping two lands on the same person in the same pose in the
# same room -- a jump cut, which the eye reads as a glitch rather than an edit.
# This was exactly the regression that made the TwelveLabs version feel cut
# again: it picked blocks 1.9s apart where the previous plan jumped 21s.
#
# Bridging costs a couple of seconds of runtime and removes the cut entirely.
# That is always the better trade at this scale.
BRIDGE_MAX_GAP = 3.0

# One named field per strategy rather than an array.
#
# Strict structured output guarantees every `required` property is present, but
# it cannot enforce an array length -- there is no minItems. Asked for "an
# array of exactly three", gpt-4o-mini reliably returned one, and telling it so
# on retry did not fix it. Three named, required fields make the correct shape
# the only representable shape, so the count stops being something we validate
# and start being something that cannot go wrong.
KEY_TO_STRATEGY = {
    "hook_first": "Hook-first",
    "problem_solution": "Problem → Solution",
    "social_proof": "Social proof",
}

_VARIATION = {
    "type": "object",
    "properties": {
        "hook": {
            "type": "string",
            "description": "Under 8 words. How you would describe the opening.",
        },
        "reframe": {
            "type": "string",
            "enum": ["crop", "blur"],
            "description": (
                "crop when one subject is centred; blur when the frame has edge "
                "text, packaging or wide action worth keeping."
            ),
        },
        "picks": {
            "type": "array",
            "description": "Blocks of sentences, in the order they should play.",
            "items": {
                "type": "object",
                "properties": {
                    "from_beat": {"type": "integer"},
                    "to_beat": {
                        "type": "integer",
                        "description": "Inclusive. Same as from_beat for one.",
                    },
                    "why": {"type": "string"},
                },
                "required": ["from_beat", "to_beat", "why"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["hook", "reframe", "picks"],
    "additionalProperties": False,
}

# One variation per call.
#
# Asking for all three at once means asking the model to hold a global
# constraint -- "these must not overlap" -- across three outputs it writes in a
# single pass. gpt-4o-mini cannot, and repeated repair rounds naming the
# offending variation did not move it: it kept opening two variations on the
# strongest beat, because that beat genuinely is the strongest. Generating them
# in sequence, each told which openings are already taken, removes the need to
# hold the constraint at all. Three small calls cost the same as one big one.
SCHEMA = {"name": "variation", "strict": True, "schema": dict(_VARIATION)}

SYSTEM = """You are a senior direct-response video editor who cuts vertical \
social ads for a living. You are given a long ad broken into numbered beats. \
A beat is a clause or a whole sentence. You choose which beats become three \
short vertical micro-ads.

You select beats by number. You never invent timestamps.

Rules you never break:

- Each variation runs 12-22 seconds total. Shorter is better. Never exceed 25.
- Use 1-3 blocks. Two is usually right. A block may span consecutive beats \
using from_beat and to_beat when they belong together.
- Beat durations are given to you. Add them up. If the beats are short, widen \
your blocks with to_beat rather than adding more blocks -- a run of six short \
beats is one block, not six. Hitting the length target matters more than \
keeping blocks narrow.
- List your blocks in the order they appear in the source, earliest first. \
The clip plays them in that order.
- A block must end on a beat that completes a sentence, so the clip never \
stops mid-thought. Beats marked "(mid-sentence)" are fine to start on or pass \
through, but never to end on.
- The opening decides everything. Lead with the single most arresting claim, \
statistic or question available, never a preamble or a greeting. The strongest \
hook is often the final clause of a long sentence rather than its start.
- The three variations must feel genuinely different. Draw them from different \
parts of the ad. Never open two variations on the same beat.
- Never pick two blocks that sit close together in the source. Skipping only a \
second or two puts the same person in the same pose either side of the cut, \
which looks like a glitch rather than an edit. Either take the material in \
between as one block, or jump somewhere clearly different.
- End on the product, the offer, or a line that lands. Never trail off.
- A viewer sees only what you pick, with no other context. Each variation must \
make complete sense standing alone.

The three strategies:

- "Hook-first" -- open on the most scroll-stopping claim, then pay it off fast.
- "Problem → Solution" -- name the viewer's pain, then present the product as \
the answer.
- "Social proof" -- lead with credibility: ingredients, science, results, \
authority.

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


def plan_errors(edl: EDL, raw: dict, source_duration: float) -> list[str]:
    """EDL validity plus the plan-level rules a JSON schema can't express.

    Strict structured output guarantees the *shape* of the response, not that
    there are three of them or that they differ meaningfully. Those checks live
    here, and their messages are written to be read by the model on retry.
    """
    errors = validate(edl, source_duration)

    # Three variations that open on the same beat are three copies, not three
    # angles. This is the check that actually forces variety -- and the message
    # names the offender, because "they overlap" is not something a model can
    # act on, whereas "change problem_solution" is.
    opened_by: dict[int, list[str]] = {}
    for key in KEY_TO_STRATEGY:
        v = raw.get(key)
        if isinstance(v, dict) and v.get("picks"):
            opened_by.setdefault(int(v["picks"][0].get("from_beat", -1)), []).append(key)

    for beat, keys in sorted(opened_by.items()):
        if len(keys) > 1:
            keep, *change = keys
            errors.append(
                f"{' and '.join(keys)} both open on beat {beat}. Keep {keep} as it "
                f"is and rewrite {', '.join(change)} to open on a different beat "
                f"from a different part of the ad."
            )

    return errors


def _beat_menu(transcript: Transcript) -> str:
    return "\n".join(
        f"{i}. [{b.end - b.start:.1f}s]"
        f"{'' if b.ends_sentence else ' (mid-sentence)'} {b.text}"
        for i, b in enumerate(transcript.beats)
    )


def _user_prompt(
    source: SourceInfo,
    transcript: Transcript,
    strategy: str,
    taken: dict[int, str],
    repair: str = "",
    visual: str = "",
) -> str:
    seen = ""
    if visual:
        seen = (
            f"\n\nWhat is visible on screen (from video analysis):\n\n{visual}\n\n"
            "Favour beats whose visuals are strong, and let this decide the "
            "reframe mode."
        )

    total_beats = len(transcript.beats)
    mean = (
        sum(b.end - b.start for b in transcript.beats) / total_beats
        if total_beats
        else 0
    )
    # Spelling out the arithmetic matters on ads with short, fragmented beats,
    # where the model otherwise picks two 1-second beats and calls it a clip.
    need = f"{IDEAL_RANGE[0]:g}-{IDEAL_RANGE[1]:g}"
    sizing = (
        f"\n\nThese beats average {mean:.1f}s, so reaching {need}s takes roughly "
        f"{max(2, round(IDEAL_RANGE[0] / mean)) if mean else 6} beats in total. "
        f"Use to_beat to span runs of them."
    )

    base = f"""Source ad: {source.path.name}
Length: {source.duration:.1f} seconds

Beats you may choose from (a beat is a clause or a sentence):

{_beat_menu(transcript)}{sizing}{seen}

Build ONE variation using the "{strategy}" strategy."""

    if taken:
        listed = ", ".join(f"beat {b} (used by {s})" for b, s in sorted(taken.items()))
        base += (
            f"\n\nThese openings are already taken: {listed}. "
            f"You must open on a different beat, drawn from a different part of "
            f"the ad, so this variation feels genuinely distinct."
        )
    if repair:
        base += (
            "\n\nYour previous attempt was rejected for these reasons. Fix them "
            "precisely and keep everything else:\n" + repair
        )
    return base


def _padded_span(transcript: Transcript, i: int, j: int) -> tuple[float, float]:
    """Time span for sentences i..j, padded into the surrounding silence."""
    sents = transcript.beats
    i = max(0, min(i, len(sents) - 1))
    j = max(i, min(j, len(sents) - 1))

    start = sents[i].start
    end = sents[j].end

    prev_end = sents[i - 1].end if i > 0 else 0.0
    next_start = sents[j + 1].start if j + 1 < len(sents) else transcript.duration

    start = max(prev_end + MIN_GAP_KEEP, start - PAD_IN, 0.0)
    end = min(next_start - MIN_GAP_KEEP, end + PAD_OUT, transcript.duration)
    return start, max(start + 0.1, end)


def _grow_to_minimum(
    segments: list[Segment], transcript: Transcript
) -> tuple[list[Segment], float]:
    """Extend the last block forward until the clip clears the minimum length.

    A deterministic backstop behind the model. On ads with short, fragmented
    beats it kept returning 5-second clips and would not correct itself even
    when the repair message named the number. Rather than ship something
    unusable or fail the job, we walk the last block forward through the
    following beats until it is long enough. The model still chooses the angle;
    this only guarantees the result is a watchable length.
    """
    if not segments:
        return segments, 0.0

    total = sum(s.duration for s in segments)
    if total >= MIN_OUTPUT_SECONDS:
        return segments, 0.0

    last = segments[-1]
    grown_from = last.end

    for beat in transcript.beats:
        if beat.start < last.end - 0.05:
            continue  # already covered
        candidate_end = min(beat.end + PAD_OUT, transcript.duration)
        if candidate_end <= last.end:
            continue
        segments[-1] = Segment(last.start, candidate_end)
        last = segments[-1]
        total = sum(s.duration for s in segments)
        # Stop at the first beat that clears the bar and completes a thought.
        if total >= MIN_OUTPUT_SECONDS and beat.ends_sentence:
            break

    return segments, max(0.0, segments[-1].end - grown_from)


def _to_edl(data: dict, source: SourceInfo, transcript: Transcript) -> tuple[EDL, dict]:
    variations: list[Variation] = []
    reasoning: dict = {"variations": []}

    for key, strategy in KEY_TO_STRATEGY.items():
        v = data.get(key)
        if not isinstance(v, dict):
            continue
        segments: list[Segment] = []
        picked: list[dict] = []

        for pick in v.get("picks", []):
            i = int(pick.get("from_beat", 0))
            j = int(pick.get("to_beat", i))
            if i > j:
                i, j = j, i
            start, end = _padded_span(transcript, i, j)
            segments.append(Segment(start, end))
            picked.append(
                {
                    "beats": f"{i}" if i == j else f"{i}-{j}",
                    "start": round(start, 2),
                    "end": round(end, 2),
                    "why": pick.get("why", ""),
                }
            )

        segments.sort(key=lambda s: s.start)

        # Bridge blocks that sit close together rather than cutting between
        # them -- see BRIDGE_MAX_GAP. Also catches blocks that merely touch
        # after padding, so we never cut and immediately rejoin the same moment.
        merged: list[Segment] = []
        bridged = 0
        for s in segments:
            if merged and s.start - merged[-1].end < BRIDGE_MAX_GAP:
                if s.start - merged[-1].end > 0.25:
                    bridged += 1
                merged[-1] = Segment(merged[-1].start, max(merged[-1].end, s.end))
            else:
                merged.append(s)
        segments = merged
        segments, grown = _grow_to_minimum(segments, transcript)

        captions: list[Caption] = []

        def flush(buf: list) -> None:
            # Whisper occasionally emits a word whose start equals its end;
            # a trailing one of those would otherwise become a zero-length
            # caption and fail validation.
            if buf and buf[-1].end - buf[0].start > 0.05:
                captions.append(
                    Caption(buf[0].start, buf[-1].end, " ".join(x.text for x in buf))
                )

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
                "picks": picked,
                "bridged": bridged,
                "grown_s": round(grown, 1),
                "cuts": max(0, len(segments) - 1),
            }
        )

    return EDL(source=str(source.path), variations=variations), reasoning


def make_plan(
    source: SourceInfo,
    transcript: Transcript,
    api_key: str,
    *,
    force: bool = False,
    visual: str = "",
) -> PlanResult:
    fingerprint = file_fingerprint(source.path)

    if not force:
        cache_key = CACHE_VARIANT + ("-v" if visual else "")
        cached = cache_read(fingerprint, "plan", cache_key)
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

    if not transcript.beats:
        raise SystemExit(
            "No beats reconstructed from the transcript; cannot plan. "
            "Re-run with --retranscribe."
        )

    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"}
    started = time.perf_counter()
    cost = 0.0
    tin = tout = 0
    repaired = False
    raw: dict = {}
    taken: dict[int, str] = {}

    for key, strategy in KEY_TO_STRATEGY.items():
        repair = ""
        best: dict | None = None

        for _ in range(3):
            resp = post_json(
                url,
                headers,
                {
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM},
                        {
                            "role": "user",
                            "content": _user_prompt(
                                source, transcript, strategy, taken, repair, visual
                            ),
                        },
                    ],
                    "response_format": {"type": "json_schema", "json_schema": SCHEMA},
                    "temperature": 0.8,
                },
            )
            usage = resp.get("usage", {})
            tin += usage.get("prompt_tokens", 0)
            tout += usage.get("completion_tokens", 0)
            cost += usage.get("prompt_tokens", 0) * PRICE_IN
            cost += usage.get("completion_tokens", 0) * PRICE_OUT

            candidate = json.loads(resp["choices"][0]["message"]["content"])
            best = candidate

            probe_edl, _ = _to_edl({key: candidate}, source, transcript)
            errors = validate(probe_edl, source.duration)
            opening = (
                int(candidate["picks"][0].get("from_beat", -1))
                if candidate.get("picks")
                else -1
            )
            if opening in taken:
                errors.append(
                    f"Beat {opening} already opens {taken[opening]}. Open somewhere "
                    f"else, from a different part of the ad."
                )
            if not errors:
                break
            repair = "\n".join(f"- {e}" for e in errors)
            repaired = True

        if best is not None:
            raw[key] = best
            if best.get("picks"):
                taken[int(best["picks"][0].get("from_beat", -1))] = key

    elapsed = time.perf_counter() - started
    cache_write(
        fingerprint,
        "plan",
        {"raw": raw, "tokens_in": tin, "tokens_out": tout, "repaired": repaired},
        CACHE_VARIANT + ("-v" if visual else ""),
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
