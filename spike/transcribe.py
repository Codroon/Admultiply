"""Step 3 -- transcription with word-level timestamps and sentence boundaries.

`whisper-1` specifically, not the cheaper gpt-4o-*-transcribe models. It is the
only one that returns word-level timestamps, and those are what let us snap
cuts to real speech boundaries. A cut landing mid-word is the most obvious
"a bot made this" tell there is, so the cheaper model is a false economy.

Crucially we reconstruct **sentences** too. Whisper's word list is stripped of
punctuation, but its `text` field keeps it, so walking the two in parallel
recovers exactly where each sentence starts and ends. Cutting on a word
boundary stops you slicing a word in half; cutting on a *sentence* boundary is
what stops the clip feeling like it was torn out of something longer.

The audio is extracted and compressed before upload. Whisper caps uploads at
25 MB and a raw video blows past that, but 16 kHz mono speech is tiny -- a 90
second ad lands around 350 KB.
"""

from __future__ import annotations

import re
import time
from dataclasses import dataclass, field
from pathlib import Path

from config import CACHE_DIR, cache_read, cache_write, file_fingerprint
from ffmpeg_tools import SourceInfo, binary, run
from net import post_multipart

MODEL = "whisper-1"
CACHE_VARIANT = f"{MODEL}-v3"  # v3 = clause-level beats
PRICE_PER_MINUTE = 0.006  # USD, verified 2026

_SENTENCE_END = re.compile(r"[.!?]+[\"')\]]*$")
_CLAUSE_END = re.compile(r"[,;:—–]$")
_STRIP = re.compile(r"[^\w']+", re.UNICODE)

# A beat shorter than this is a fragment, not a thought -- merge it forward.
MIN_BEAT_SECONDS = 1.3


@dataclass
class Word:
    start: float
    end: float
    text: str


@dataclass
class Beat:
    """A clause or sentence -- the smallest unit an edit may cut on.

    Sentences alone are too coarse. Real ad copy runs 9-13 second sentences,
    so "pick two sentences" can only ever produce a 20-25s clip, and the punchy
    four-second hook buried in a sentence's final clause is unreachable.
    Splitting on clauses as well gives the planner fine-grained choices that
    still land on natural pauses.
    """

    start: float
    end: float
    text: str
    ends_sentence: bool


@dataclass
class Transcript:
    text: str
    words: list[Word]
    language: str
    duration: float
    cost_usd: float
    cached: bool
    seconds_taken: float
    beats: list[Beat] = field(default_factory=list)

    # ------------------------------------------------------------------ #
    # Snapping
    # ------------------------------------------------------------------ #

    def snap(self, t: float, edge: str) -> float:
        """Nearest word boundary. The floor, not the goal."""
        if not self.words:
            return t
        pool = [w.start for w in self.words] if edge == "start" else [w.end for w in self.words]
        return min(pool, key=lambda c: abs(c - t))


    # ------------------------------------------------------------------ #
    # Views
    # ------------------------------------------------------------------ #

    def window(self, start: float, end: float) -> str:
        return " ".join(w.text for w in self.words if w.start >= start and w.end <= end)

    def timed_lines(self) -> str:
        """Beat-per-line view for the planning prompt.

        Feeding raw word-level JSON wastes tokens and reads badly. Punctuated
        beats with timings give the model exactly what it needs -- what was
        said, when, and where a thought ends -- in a fraction of the tokens.
        """
        if self.beats:
            return "\n".join(f"[{b.start:.1f}-{b.end:.1f}] {b.text}" for b in self.beats)
        return "\n".join(f"[{w.start:.1f}-{w.end:.1f}] {w.text}" for w in self.words)


# --------------------------------------------------------------------------- #
# Sentence reconstruction
# --------------------------------------------------------------------------- #


def build_beats(text: str, words: list[Word]) -> list[Beat]:
    """Recover clause and sentence spans by walking punctuated text vs timed words.

    Whisper gives punctuation in `text` and timings in `words`, but never both
    together. The token streams correspond, so we advance through them in
    lockstep and close a beat at any clause or sentence break.
    """
    if not words or not text.strip():
        return []

    tokens = text.split()
    beats: list[Beat] = []
    wi = 0
    start_idx = 0
    buf: list[str] = []

    for tok in tokens:
        if wi >= len(words):
            break
        bare = _STRIP.sub("", tok).lower()
        word_bare = _STRIP.sub("", words[wi].text).lower()

        # Normally these line up one-for-one. When they don't (Whisper
        # occasionally merges or splits a token) resync rather than stalling --
        # being a token out is harmless, losing sync is not.
        if bare and word_bare and bare != word_bare:
            look = next(
                (
                    j
                    for j in range(wi, min(wi + 3, len(words)))
                    if _STRIP.sub("", words[j].text).lower() == bare
                ),
                None,
            )
            if look is not None:
                wi = look

        buf.append(tok)
        ends_sentence = bool(_SENTENCE_END.search(tok))
        if ends_sentence or _CLAUSE_END.search(tok):
            beats.append(
                Beat(
                    start=words[start_idx].start,
                    end=words[min(wi, len(words) - 1)].end,
                    text=" ".join(buf).strip(),
                    ends_sentence=ends_sentence,
                )
            )
            buf = []
            start_idx = min(wi + 1, len(words) - 1)
        wi += 1

    if buf and start_idx < len(words):
        beats.append(
            Beat(
                start=words[start_idx].start,
                end=words[-1].end,
                text=" ".join(buf).strip(),
                ends_sentence=True,
            )
        )

    beats = [b for b in beats if b.end > b.start]

    # Merge sub-second fragments ("In our 20s,") into whatever follows, so every
    # beat is something a viewer could actually hear as a unit.
    merged: list[Beat] = []
    for b in beats:
        if merged and merged[-1].end - merged[-1].start < MIN_BEAT_SECONDS and not merged[-1].ends_sentence:
            prev = merged.pop()
            b = Beat(prev.start, b.end, f"{prev.text} {b.text}".strip(), b.ends_sentence)
        merged.append(b)
    return merged


# --------------------------------------------------------------------------- #
# API
# --------------------------------------------------------------------------- #


def extract_audio(source: SourceInfo, fingerprint: str) -> Path:
    """16 kHz mono MP3 -- Whisper downsamples to this anyway."""
    out = CACHE_DIR / fingerprint / "audio.mp3"
    if out.exists():
        return out
    out.parent.mkdir(parents=True, exist_ok=True)
    run([
        binary("ffmpeg"), "-y",
        "-i", str(source.path.resolve()),
        "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k",
        str(out),
    ])
    return out


def transcribe(source: SourceInfo, api_key: str, *, force: bool = False) -> Transcript:
    fingerprint = file_fingerprint(source.path)

    if not force:
        cached = cache_read(fingerprint, "transcript", CACHE_VARIANT)
        if cached:
            words = [Word(**w) for w in cached["words"]]
            return Transcript(
                text=cached["text"],
                words=words,
                beats=[Beat(**b) for b in cached.get("beats", [])],
                language=cached.get("language", "?"),
                duration=cached.get("duration", source.duration),
                cost_usd=0.0,
                cached=True,
                seconds_taken=0.0,
            )

    audio = extract_audio(source, fingerprint)
    started = time.perf_counter()

    data = post_multipart(
        "https://api.openai.com/v1/audio/transcriptions",
        {"Authorization": f"Bearer {api_key}"},
        fields={
            "model": MODEL,
            "response_format": "verbose_json",
            "timestamp_granularities[]": ["word", "segment"],
        },
        files={"file": audio},
    )
    elapsed = time.perf_counter() - started

    words = [
        Word(start=float(w["start"]), end=float(w["end"]), text=str(w["word"]).strip())
        for w in data.get("words", [])
    ]
    text = data.get("text", "")
    duration = float(data.get("duration") or source.duration)
    beats = build_beats(text, words)

    cache_write(
        fingerprint,
        "transcript",
        {
            "text": text,
            "language": data.get("language", "?"),
            "duration": duration,
            "words": [{"start": w.start, "end": w.end, "text": w.text} for w in words],
            "beats": [
                {
                    "start": b.start,
                    "end": b.end,
                    "text": b.text,
                    "ends_sentence": b.ends_sentence,
                }
                for b in beats
            ],
        },
        CACHE_VARIANT,
    )

    return Transcript(
        text=text,
        words=words,
        beats=beats,
        language=data.get("language", "?"),
        duration=duration,
        cost_usd=(duration / 60.0) * PRICE_PER_MINUTE,
        cached=False,
        seconds_taken=elapsed,
    )
