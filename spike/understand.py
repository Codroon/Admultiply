"""Pass 1 of planning -- understand the ad before cutting it.

The previous planner worked bottom-up: here are thirteen clauses, pick some.
It never formed a view of what the ad *is*. That works by accident on a
talking-head ad, where the speech carries the story, and fails on a tutorial
or a montage, where the story is on screen and the words are secondary.

This pass reads the transcript and the visual analysis together and writes a
brief a human strategist would recognise: what is being sold, to whom, in what
format, with what arc -- and the ad broken into *moments*. A moment is a
narrative unit (a run of beats) with a role, a strength rating as an opener,
and a note on what is on screen while it plays. Pass 2 composes storylines
from moments, not clauses, which is how an editor actually thinks.

It also recommends which three angles suit this particular ad. "Social proof"
is a poor fit for a hair tutorial; "Before -> After" is the obvious one. Fixing
the three angles in advance was forcing square pegs.

Low temperature: this is analysis, not invention.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field

from config import cache_read, cache_write, file_fingerprint
from ffmpeg_tools import SourceInfo
from net import post_json
from transcribe import Transcript

MODEL = "gpt-4o-mini"
CACHE_VARIANT = f"{MODEL}-brief-v1"
PRICE_IN = 0.15 / 1_000_000
PRICE_OUT = 0.60 / 1_000_000

# The palette of angles. A closed set so the data flywheel can compare
# win-rates across thousands of ads; broad enough that every ad has three
# that genuinely fit.
ANGLES = [
    "Hook-first",
    "Problem → Solution",
    "Social proof",
    "Before → After",
    "How it works",
    "Feature spotlight",
]

ANGLE_GUIDE = """- "Hook-first": open on the single most scroll-stopping claim, statistic \
or question, then pay it off fast.
- "Problem → Solution": name the pain the viewer feels, then present the \
product as the answer.
- "Social proof": lead with credibility -- ingredients, science, results, \
testimonials, authority.
- "Before → After": lead with the transformation. Best when the ad shows a \
visible change.
- "How it works": lead with the demonstration or technique. Best for \
tutorials and product-in-use footage.
- "Feature spotlight": go deep on one benefit rather than wide on several."""

ROLES = ["hook", "problem", "product", "proof", "demo", "transformation", "close", "filler"]

# Granularity. The first run produced four moments for a 55s ad, two of them
# over twenty seconds -- and no storyline can be built from blocks that size:
# include one and you blow the length limit, avoid both and you have nine
# seconds. Moments are the atoms Pass 2 composes from, so they have to be
# small enough to compose with. A long section gets split into its steps.
MAX_MOMENT_SECONDS = 9.0
MIN_MOMENT_SECONDS = 1.5


def min_moments_for(duration: float) -> int:
    return max(5, round(duration / 8.0))


@dataclass
class Moment:
    id: str
    label: str
    from_beat: int
    to_beat: int
    role: str
    strength: int
    shown: str
    start: float = 0.0
    end: float = 0.0
    # Which of the model's original moments this came from. Halves of a split
    # moment share a parent, so two cuts each using one half are recognised as
    # using the same shot -- which, to a viewer, they are.
    parent: int = -1

    @property
    def duration(self) -> float:
        return self.end - self.start


@dataclass
class Brief:
    product: str
    audience: str
    format: str
    arc: str
    moments: list[Moment]
    angles: list[str]
    angle_reasoning: str
    cost_usd: float = 0.0
    cached: bool = False
    seconds_taken: float = 0.0
    raw: dict = field(default_factory=dict)

    def moment(self, mid: str) -> Moment | None:
        return next((m for m in self.moments if m.id == mid), None)

    def menu(self) -> str:
        """The compact view Pass 2 composes from."""
        lines = []
        for m in self.moments:
            shown = f"  |  on screen: {m.shown}" if m.shown else ""
            lines.append(
                f"{m.id}. [{m.start:.1f}-{m.end:.1f}s, {m.duration:.1f}s] "
                f"({m.role}, opener strength {m.strength}/5) {m.label}{shown}"
            )
        return "\n".join(lines)


SCHEMA = {
    "name": "ad_brief",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "product": {"type": "string", "description": "What is being sold, in a few words."},
            "audience": {"type": "string", "description": "Who this ad is for."},
            "format": {
                "type": "string",
                "enum": ["talking-head", "tutorial", "lifestyle", "montage", "testimonial", "mixed"],
            },
            "arc": {"type": "string", "description": "The ad's narrative shape in one sentence."},
            "moments": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "label": {"type": "string", "description": "A short name an editor would use."},
                        "from_beat": {"type": "integer"},
                        "to_beat": {"type": "integer", "description": "Inclusive."},
                        "role": {"type": "string", "enum": ROLES},
                        "strength": {
                            "type": "integer",
                            "description": "1-5. How well this moment would work as the OPENING of a short ad.",
                        },
                        "shown": {
                            "type": "string",
                            "description": "What is on screen during this moment, from the visual analysis. Empty if unknown.",
                        },
                    },
                    "required": ["label", "from_beat", "to_beat", "role", "strength", "shown"],
                    "additionalProperties": False,
                },
            },
            "angles": {
                "type": "array",
                "description": "Exactly three, from the allowed list, best fit first.",
                "items": {"type": "string", "enum": ANGLES},
            },
            "angle_reasoning": {"type": "string", "description": "One or two sentences."},
        },
        "required": ["product", "audience", "format", "arc", "moments", "angles", "angle_reasoning"],
        "additionalProperties": False,
    },
}

SYSTEM = f"""You are a senior creative strategist at a performance marketing \
agency. Before an editor re-cuts a long ad into short vertical versions, you \
write the brief: what the ad is, how it is built, and where its strongest \
material lives.

You are given the ad's transcript broken into numbered beats (a beat is a \
clause or sentence, with timings), and where available a description of what \
is on screen.

Your job:

1. Identify the product, the audience and the format.
2. Describe the narrative arc in one sentence.
3. Break the ad into MOMENTS. A moment is a narrative unit: a run of \
consecutive beats that does one job -- states the problem, introduces the \
product, shows one step of it working, proves it, closes. Moments must not \
overlap and must appear in order.

   Moments are the building blocks a 12-22 second cut is assembled from, so \
each one must be between {MIN_MOMENT_SECONDS:g} and {MAX_MOMENT_SECONDS:g} \
seconds. A long section -- a 25-second demonstration, a 15-second list of \
benefits -- is NOT one moment. Split it into its steps: "Demo: sectioning the \
hair", "Demo: applying the weft", "Demo: curling to blend". Aim for one \
moment every 5-8 seconds of the ad.

   Not every beat needs to belong to a moment; leave out throat-clearing and \
filler, or mark it "filler".
4. For each moment, say what is on screen while it plays, using the visual \
description. This matters: on a tutorial or a montage the picture IS the \
story and the words are secondary.
5. Rate each moment 1-5 as an OPENER for a short ad. A 5 stops the scroll in \
two seconds -- a startling statistic, a visible transformation, a direct \
question. A 1 is context that only makes sense mid-way through.
   The ad's ENDING must always be a moment -- the product name, tagline, call \
to action or final line. Every cut needs something to end on. Never leave the \
last few seconds unassigned.
6. Recommend exactly THREE angles from this list, best fit first, that this \
particular ad has the material to support:

{ANGLE_GUIDE}

Pick angles the footage can actually deliver. Do not recommend "Before → \
After" if nothing visibly changes; do not recommend "How it works" if nothing \
is demonstrated. The three must be genuinely different from each other."""


def _prompt(source: SourceInfo, transcript: Transcript, visual: str, repair: str) -> str:
    beats = "\n".join(
        f"{i}. [{b.start:.1f}-{b.end:.1f}s]{'' if b.ends_sentence else ' (mid-sentence)'} {b.text}"
        for i, b in enumerate(transcript.beats)
    )
    seen = f"\n\nWhat is on screen (from video analysis):\n\n{visual}" if visual else (
        "\n\n(No visual analysis available -- work from the transcript alone and "
        "leave 'shown' empty.)"
    )
    out = f"""Source ad: {source.path.name}
Length: {source.duration:.1f} seconds

Transcript beats:

{beats}{seen}

Write the brief."""
    if repair:
        out += (
            "\n\nYour previous brief was rejected for these reasons. Fix them and "
            "keep everything else:\n" + repair
        )
    return out


# Trailing seconds the last moment may leave uncovered before we consider the
# ending missing. An ad's final line is its product name, tagline or call to
# action -- the one thing every cut should be able to end on.
ENDING_TOLERANCE = 4.0


def _split(m: Moment, transcript: Transcript) -> list[Moment]:
    """Halve an oversize moment at the sentence break nearest its midpoint."""
    if m.duration <= MAX_MOMENT_SECONDS or m.to_beat <= m.from_beat:
        return [m]
    beats = transcript.beats
    mid = (m.start + m.end) / 2
    candidates = [
        i for i in range(m.from_beat, m.to_beat)  # split after beat i
        if beats[i].ends_sentence
    ] or list(range(m.from_beat, m.to_beat))
    cut = min(candidates, key=lambda i: abs(beats[i].end - mid))
    left = Moment(m.id, m.label, m.from_beat, cut, m.role, m.strength, m.shown,
                  beats[m.from_beat].start, beats[cut].end, m.parent)
    right = Moment(m.id, m.label, cut + 1, m.to_beat, m.role, max(1, m.strength - 1),
                   m.shown, beats[cut + 1].start, beats[m.to_beat].end, m.parent)
    return _split(left, transcript) + _split(right, transcript)


def _normalise(moments: list[Moment], transcript: Transcript) -> list[Moment]:
    """Make the moment list structurally valid whatever the model returned.

    The model is good at naming and rating moments and unreliable at the
    arithmetic of keeping beat ranges disjoint and under a size cap -- three
    repair rounds routinely failed to converge on both at once. So the model's
    judgement (labels, roles, strengths, what is on screen) is kept and the
    structure is guaranteed here: sort, resolve overlaps by trimming the later
    moment, split anything oversize at a sentence break, and make sure the
    ending is covered.
    """
    beats = transcript.beats
    if not beats:
        return []

    ordered = sorted(moments, key=lambda m: (m.from_beat, m.to_beat))
    disjoint: list[Moment] = []
    for m in ordered:
        if disjoint and m.from_beat <= disjoint[-1].to_beat:
            m.from_beat = disjoint[-1].to_beat + 1
            if m.from_beat > m.to_beat:
                continue  # entirely inside the previous moment; drop it
            m.start = beats[m.from_beat].start
        disjoint.append(m)

    sized: list[Moment] = []
    for m in disjoint:
        parts = _split(m, transcript)
        if len(parts) > 1:
            for k, p in enumerate(parts, 1):
                p.label = f"{m.label} ({k}/{len(parts)})"
        sized.extend(parts)

    # The ending. If the model left the last few seconds unassigned, cover them
    # as a close -- the product name and final line are what cuts end on.
    if sized:
        last = sized[-1]
        if transcript.duration - last.end > ENDING_TOLERANCE and last.to_beat + 1 < len(beats):
            a = last.to_beat + 1
            b = len(beats) - 1
            tail = Moment("", "Close: final line", a, b, "close", 4, "",
                          beats[a].start, beats[b].end, parent=10_000)
            sized.extend(_split(tail, transcript))

    for i, m in enumerate(sized, 1):
        m.id = f"m{i}"
        # Anything that has become a sliver is filler, not a building block.
        if m.duration < MIN_MOMENT_SECONDS and m.role != "close":
            m.role = "filler"
            m.strength = 1
    return sized


def _to_brief(raw: dict, transcript: Transcript) -> tuple[Brief, list[str]]:
    """Build the Brief and return any structural problems as repair text."""
    errors: list[str] = []
    n = len(transcript.beats)
    moments: list[Moment] = []

    for i, m in enumerate(raw.get("moments", [])):
        a, b = int(m.get("from_beat", 0)), int(m.get("to_beat", 0))
        if a > b:
            a, b = b, a
        if a < 0 or b >= n:
            errors.append(f"moment {i + 1} references beat {max(a, b)} but beats run 0-{n - 1}.")
            continue
        moments.append(
            Moment(
                id=f"m{i + 1}",
                label=m.get("label", "").strip() or f"Moment {i + 1}",
                from_beat=a,
                to_beat=b,
                role=m.get("role", "filler"),
                strength=max(1, min(5, int(m.get("strength", 3)))),
                shown=m.get("shown", "").strip(),
                start=transcript.beats[a].start,
                end=transcript.beats[b].end,
                parent=i,
            )
        )

    for x, y in zip(moments, moments[1:]):
        if y.from_beat <= x.to_beat:
            errors.append(
                f"{x.label!r} (beats {x.from_beat}-{x.to_beat}) and {y.label!r} "
                f"(beats {y.from_beat}-{y.to_beat}) overlap. Moments must be in "
                f"order and must not share beats."
            )

    for m in moments:
        if m.duration > MAX_MOMENT_SECONDS:
            errors.append(
                f"{m.label!r} runs {m.duration:.1f}s (beats {m.from_beat}-{m.to_beat}). "
                f"The maximum is {MAX_MOMENT_SECONDS:g}s. Split it into its steps -- "
                f"two or three moments of {MIN_MOMENT_SECONDS:g}-{MAX_MOMENT_SECONDS:g}s "
                f"each, each with its own label."
            )

    need = min_moments_for(transcript.duration)
    if len(moments) < need:
        errors.append(
            f"Only {len(moments)} moments for a {transcript.duration:.0f}s ad; "
            f"at least {need} are needed so short cuts can be assembled from "
            f"them. Break the longer sections into their steps."
        )

    if moments and transcript.duration - max(m.end for m in moments) > ENDING_TOLERANCE:
        errors.append(
            f"The ad's last {transcript.duration - max(m.end for m in moments):.0f}s "
            f"are not part of any moment. The ending -- product name, tagline, "
            f"call to action, final line -- must be a moment, because every cut "
            f"needs something to end on."
        )

    # Whatever the model got wrong structurally, the brief that leaves here is
    # valid. The errors above still drive one repair round so the model's own
    # labels improve, but they never block.
    moments = _normalise(moments, transcript)

    angles = [a for a in raw.get("angles", []) if a in ANGLES]
    seen: list[str] = []
    for a in angles:
        if a not in seen:
            seen.append(a)
    angles = seen
    if len(angles) != 3:
        errors.append(
            f"Recommended {len(angles)} distinct angles; exactly three are required."
        )

    brief = Brief(
        product=raw.get("product", ""),
        audience=raw.get("audience", ""),
        format=raw.get("format", "mixed"),
        arc=raw.get("arc", ""),
        moments=moments,
        angles=angles[:3],
        angle_reasoning=raw.get("angle_reasoning", ""),
        raw=raw,
    )
    return brief, errors


def understand(
    source: SourceInfo,
    transcript: Transcript,
    api_key: str,
    *,
    visual: str = "",
    force: bool = False,
) -> Brief:
    fingerprint = file_fingerprint(source.path)
    variant = CACHE_VARIANT + ("-v" if visual else "")

    if not force:
        cached = cache_read(fingerprint, "brief", variant)
        if cached:
            brief, _ = _to_brief(cached["raw"], transcript)
            brief.cached = True
            return brief

    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"}
    started = time.perf_counter()
    cost = 0.0
    repair = ""
    brief: Brief | None = None

    # One shot plus one repair. Normalisation guarantees a valid brief either
    # way; the repair round is for the model's own labels, not for validity.
    for _ in range(2):
        resp = post_json(
            url,
            headers,
            {
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM},
                    {"role": "user", "content": _prompt(source, transcript, visual, repair)},
                ],
                "response_format": {"type": "json_schema", "json_schema": SCHEMA},
                "temperature": 0.3,
            },
        )
        usage = resp.get("usage", {})
        cost += usage.get("prompt_tokens", 0) * PRICE_IN + usage.get("completion_tokens", 0) * PRICE_OUT

        raw = json.loads(resp["choices"][0]["message"]["content"])
        brief, errors = _to_brief(raw, transcript)
        if not errors:
            break
        repair = "\n".join(f"- {e}" for e in errors)

    assert brief is not None
    brief.cost_usd = cost
    brief.seconds_taken = time.perf_counter() - started
    cache_write(fingerprint, "brief", {"raw": brief.raw}, variant)
    return brief
