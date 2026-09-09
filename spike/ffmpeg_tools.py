"""FFmpeg/ffprobe discovery and source-video probing.

Binary discovery is deliberately defensive: winget installs to a Links
directory that isn't on an already-running shell's PATH, and the eventual
production worker will run in a container where ffmpeg sits somewhere else
again. Resolve once, cache, fail loudly with a fixable message.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

# Places to look when ffmpeg isn't already on PATH.
_FALLBACK_DIRS = [
    Path.home() / "AppData/Local/Microsoft/WinGet/Links",
    Path("C:/ffmpeg/bin"),
    Path("C:/Program Files/ffmpeg/bin"),
    Path("/usr/bin"),
    Path("/usr/local/bin"),
    Path("/opt/homebrew/bin"),
]


class FFmpegMissing(RuntimeError):
    pass


@lru_cache(maxsize=8)
def binary(name: str) -> str:
    """Absolute path to `ffmpeg` or `ffprobe`."""
    found = shutil.which(name)
    if found:
        return found

    for d in _FALLBACK_DIRS:
        for candidate in (d / name, d / f"{name}.exe"):
            if candidate.exists():
                return str(candidate)

    raise FFmpegMissing(
        f"Could not find '{name}'. Install it with:  winget install Gyan.FFmpeg\n"
        "then restart your terminal (or it will still be picked up from the "
        "winget Links directory automatically)."
    )


def run(args: list[str], *, cwd: Path | None = None) -> subprocess.CompletedProcess:
    """Run a command, raising with ffmpeg's own stderr on failure.

    ffmpeg's errors are genuinely informative; swallowing them and raising a
    generic 'command failed' is how you lose an afternoon.
    """
    proc = subprocess.run(
        args,
        cwd=str(cwd) if cwd else None,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        tail = "\n".join((proc.stderr or "").strip().splitlines()[-25:])
        raise RuntimeError(f"{Path(args[0]).name} failed ({proc.returncode}):\n{tail}")
    return proc


# --------------------------------------------------------------------------- #
# Probing
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class SourceInfo:
    path: Path
    duration: float
    width: int
    height: int
    fps: float
    has_audio: bool
    video_codec: str
    audio_codec: str | None
    size_mb: float

    @property
    def aspect(self) -> float:
        return self.width / self.height if self.height else 0.0

    def summary(self) -> str:
        audio = self.audio_codec if self.has_audio else "none"
        return (
            f"{self.path.name}  |  {fmt_duration(self.duration)}  |  "
            f"{self.width}x{self.height} @ {self.fps:g}fps  |  "
            f"v:{self.video_codec} a:{audio}  |  {self.size_mb:.1f} MB"
        )


def probe(path: Path) -> SourceInfo:
    """Read real metadata from the file. Never trust the extension."""
    if not path.exists():
        raise FileNotFoundError(f"No such video: {path}")

    out = run(
        [
            binary("ffprobe"),
            "-v", "error",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(path),
        ]
    ).stdout
    data = json.loads(out)

    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    if video is None:
        raise ValueError(f"{path.name} has no video stream.")

    # Duration can live on the format or the stream depending on container.
    duration = float(
        data.get("format", {}).get("duration")
        or video.get("duration")
        or 0.0
    )
    if duration <= 0:
        raise ValueError(f"Could not determine duration for {path.name}.")

    return SourceInfo(
        path=path,
        duration=duration,
        width=int(video.get("width", 0)),
        height=int(video.get("height", 0)),
        fps=_parse_fps(video.get("avg_frame_rate") or video.get("r_frame_rate")),
        has_audio=audio is not None,
        video_codec=video.get("codec_name", "?"),
        audio_codec=audio.get("codec_name") if audio else None,
        size_mb=path.stat().st_size / (1024 * 1024),
    )


def _parse_fps(rate: str | None) -> float:
    """ffprobe reports fps as a rational like '30000/1001'."""
    if not rate or "/" not in rate:
        try:
            return round(float(rate or 0), 3)
        except ValueError:
            return 0.0
    num, den = rate.split("/", 1)
    try:
        den_f = float(den)
        return round(float(num) / den_f, 3) if den_f else 0.0
    except ValueError:
        return 0.0


def fmt_duration(seconds: float) -> str:
    m, s = divmod(int(round(seconds)), 60)
    return f"{m}:{s:02d}"


# --------------------------------------------------------------------------- #
# Letterbox / pillarbox detection
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class ContentCrop:
    """The region of the frame that actually holds picture."""
    width: int
    height: int
    x: int
    y: int

    def is_significant(self, source: "SourceInfo", threshold: float = 0.02) -> bool:
        """True if trimming this is worth doing rather than encoder noise."""
        dw = (source.width - self.width) / source.width if source.width else 0
        dh = (source.height - self.height) / source.height if source.height else 0
        return dw > threshold or dh > threshold

    def as_filter(self) -> str:
        return f"crop={self.width}:{self.height}:{self.x}:{self.y}"

    def describe(self, source: "SourceInfo") -> str:
        return (
            f"{source.width}x{source.height} -> {self.width}x{self.height} "
            f"(+{self.x},{self.y})"
        )


_CROP_RE = re.compile(r"crop=(\d+):(\d+):(\d+):(\d+)")


def detect_content_crop(source: SourceInfo, samples: int = 5) -> ContentCrop | None:
    """Find the real picture area, ignoring baked-in black bars.

    Plenty of real ad creative is a vertical video exported inside a landscape
    container (or the reverse), with the difference padded in black. Reframing
    without removing those bars first gives you a tiny picture nested inside
    black nested inside a blurred backdrop, which looks broken.

    Sampled at several points and unioned rather than measured once: a video
    that opens on a black title card would otherwise report a crop of nothing,
    and a letterboxed insert shot midway would fool a single-point read.
    """
    if source.duration <= 0:
        return None

    points = [source.duration * f for f in (0.1, 0.3, 0.5, 0.7, 0.9)][:samples]
    left = top = 10**9
    right = bottom = 0
    found = False

    for t in points:
        try:
            proc = subprocess.run(
                [
                    binary("ffmpeg"),
                    "-hide_banner",
                    "-ss", f"{t:.2f}",
                    "-i", str(source.path),
                    "-vf", "cropdetect=limit=24:round=2:reset=0",
                    "-frames:v", "40",
                    "-f", "null",
                    "-",
                ],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
        except OSError:
            return None

        matches = _CROP_RE.findall(proc.stderr or "")
        if not matches:
            continue
        w, h, x, y = (int(v) for v in matches[-1])
        if w <= 0 or h <= 0:
            continue
        found = True
        left = min(left, x)
        top = min(top, y)
        right = max(right, x + w)
        bottom = max(bottom, y + h)

    if not found:
        return None

    # yuv420p needs even dimensions and offsets.
    left -= left % 2
    top -= top % 2
    width = min(right - left, source.width - left)
    height = min(bottom - top, source.height - top)
    width -= width % 2
    height -= height % 2

    if width <= 0 or height <= 0:
        return None
    return ContentCrop(width=width, height=height, x=left, y=top)
