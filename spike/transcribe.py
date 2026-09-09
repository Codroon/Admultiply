"""Step 3 -- transcription with word-level timestamps.

`whisper-1` specifically, not the cheaper gpt-4o-*-transcribe models. It is the
only one that returns word-level timestamps, and those are what let us snap
cuts to word boundaries. A cut landing mid-word is the single most obvious
"a bot made this" tell there is, so the cheaper model is a false economy.

The audio is extracted and compressed before upload. Whisper caps uploads at
25 MB and a raw video will blow past that, but 16 kHz mono speech is tiny --
a 90 second ad lands around 350 KB, so one ad is never near the limit.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path

from config import CACHE_DIR, cache_read, cache_write, file_fingerprint
from ffmpeg_tools import SourceInfo, binary, run
from net import post_multipart

MODEL = "whisper-1"
PRICE_PER_MINUTE = 0.006  # USD, verified 2026


@dataclass
class Word:
    start: float
    end: float
    text: str


@dataclass
class Transcript:
    text: str
    words: list[Word]
    language: str
    duration: float
    cost_usd: float
    cached: bool
    seconds_taken: float

    def window(self, start: float, end: float) -> str:
        """Words spoken inside a time range -- used to caption a chosen cut."""
        return " ".join(w.text for w in self.words if w.start >= start and w.end <= end)

    def snap(self, t: float, edge: str) -> float:
        """Move a time to the nearest real word boundary.

        The model is good at deciding *what* to keep and unreliable about
        frame-accurate timing, so we never trust its numbers directly. Snapping
        starts to a word's start and ends to a word's end makes a mid-word cut
        structurally impossible, whatever the model returns.
        """
        if not self.words:
            return t
        if edge == "start":
            candidates = [w.start for w in self.words]
        else:
            candidates = [w.end for w in self.words]
        return min(candidates, key=lambda c: abs(c - t))

    def timed_lines(self, max_chars: int = 110) -> str:
        """A compact timestamped view for the planning prompt.

        Feeding raw word-level JSON to the model wastes tokens and reads badly.
        Grouping into short timestamped lines gives it what it needs -- what was
        said and when -- in a fraction of the tokens.
        """
        lines: list[str] = []
        buf: list[Word] = []

        def flush() -> None:
            if buf:
                lines.append(
                    f"[{buf[0].start:.1f}-{buf[-1].end:.1f}] "
                    + " ".join(w.text for w in buf)
                )
                buf.clear()

        for w in self.words:
            buf.append(w)
            joined = sum(len(x.text) + 1 for x in buf)
            ends_sentence = w.text.rstrip().endswith((".", "?", "!"))
            if joined >= max_chars or ends_sentence:
                flush()
        flush()
        return "\n".join(lines)


def extract_audio(source: SourceInfo, fingerprint: str) -> Path:
    """16 kHz mono MP3 -- Whisper downsamples to this anyway."""
    out = CACHE_DIR / fingerprint / "audio.mp3"
    if out.exists():
        return out
    out.parent.mkdir(parents=True, exist_ok=True)
    run([
        binary("ffmpeg"), "-y",
        "-i", str(source.path.resolve()),
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-b:a", "32k",
        str(out),
    ])
    return out


def transcribe(source: SourceInfo, api_key: str, *, force: bool = False) -> Transcript:
    fingerprint = file_fingerprint(source.path)

    if not force:
        cached = cache_read(fingerprint, "transcript", MODEL)
        if cached:
            return Transcript(
                text=cached["text"],
                words=[Word(**w) for w in cached["words"]],
                language=cached.get("language", "?"),
                duration=cached.get("duration", source.duration),
                cost_usd=0.0,  # already paid for; a re-run costs nothing
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
    duration = float(data.get("duration") or source.duration)

    cache_write(
        fingerprint,
        "transcript",
        {
            "text": data.get("text", ""),
            "language": data.get("language", "?"),
            "duration": duration,
            "words": [{"start": w.start, "end": w.end, "text": w.text} for w in words],
        },
        MODEL,
    )

    return Transcript(
        text=data.get("text", ""),
        words=words,
        language=data.get("language", "?"),
        duration=duration,
        cost_usd=(duration / 60.0) * PRICE_PER_MINUTE,
        cached=False,
        seconds_taken=elapsed,
    )
