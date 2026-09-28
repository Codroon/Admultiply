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
CACHE_VARIANT = f"{MODEL}-v5"  # v5 = filter only sparse transcripts; v4 ate real speech
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
    # How much the words can be trusted to carry the edit.
    #   speech  -- dialogue throughout; cut on word boundaries (the default path)
    #   sparse  -- a line or two over a mostly visual ad; plan from the picture,
    #              keep the words for captions
    #   none    -- no usable speech; plan from the picture alone
    mode: str = "speech"
    speech_seconds: float = 0.0

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
# Hallucination filter and speech classification
# --------------------------------------------------------------------------- #

# Whisper invents text on silence and music -- a token at the very end, a
# "thanks for watching", a phantom sentence. Its own per-segment confidence
# marks them: high no_speech_prob, low average log-probability. These are the
# thresholds the community has converged on.
NO_SPEECH_PROB = 0.6
MIN_AVG_LOGPROB = -1.0

# Below this, the words cannot carry an edit. 20% of a 60s ad is 12s of speech.
SPEECH_DENSITY = 0.20
MIN_SPEECH_WORDS = 8
MIN_SPEECH_SECONDS = 3.0

# A transcript with fewer words than this is Whisper's hallucination zone and
# gets the confidence filter; anything denser is real dialogue and is trusted.
SPARSE_WORDS = 30


def _drop_hallucinations(words: list[Word], segments: list[dict]) -> list[Word]:
    """Remove words inside segments Whisper itself does not believe in."""
    bad: list[tuple[float, float]] = [
        (float(sg.get("start", 0)), float(sg.get("end", 0)))
        for sg in segments
        if float(sg.get("no_speech_prob", 0)) > NO_SPEECH_PROB
        or float(sg.get("avg_logprob", 0)) < MIN_AVG_LOGPROB
    ]
    kept = []
    for w in words:
        if w.end - w.start <= 0.02:  # zero-length token: an artefact, not a word
            continue
        if any(a - 0.05 <= w.start and w.end <= b + 0.05 for a, b in bad):
            continue
        kept.append(w)
    return kept


def classify(words: list[Word], duration: float) -> tuple[str, float]:
    speech = sum(w.end - w.start for w in words)
    if len(words) < MIN_SPEECH_WORDS or speech < MIN_SPEECH_SECONDS:
        return "none", speech
    if duration > 0 and speech / duration < SPEECH_DENSITY:
        return "sparse", speech
    return "speech", speech


def silent(source: SourceInfo) -> Transcript:
    """The transcript of a video with no audio track: nothing, honestly."""
    return Transcript(
        text="", words=[], language="?", duration=source.duration,
        cost_usd=0.0, cached=False, seconds_taken=0.0, beats=[],
        mode="none", speech_seconds=0.0,
    )


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
    if not source.has_audio:
        return silent(source)

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
                mode=cached.get("mode", "speech"),
                speech_seconds=cached.get("speech_seconds", 0.0),
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
    # Only police a transcript that is already thin. Whisper hallucinates on
    # silence and music, where it returns a handful of tokens; on real
    # dialogue its per-segment confidence dips for accents, speed and music
    # beds, and filtering on it ate half of a genuine voiceover. A dense
    # transcript is trusted as-is.
    if len(words) < SPARSE_WORDS:
        words = _drop_hallucinations(words, data.get("segments", []))
    else:
        words = [w for w in words if w.end - w.start > 0.02]
    mode, speech_seconds = classify(words, duration)
    if mode == "none":
        words, text = [], ""
    beats = build_beats(text, words) if words else []

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
            "mode": mode,
            "speech_seconds": round(speech_seconds, 2),
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
        mode=mode,
        speech_seconds=speech_seconds,
    )
