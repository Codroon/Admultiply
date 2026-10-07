"""Render an EDL into finished 9:16 micro-ads.

One ffmpeg invocation per variation, built as a single filter_complex: trim,
concat, reframe, caption, encode. No intermediate files and no double encode,
which keeps quality up and wall-clock down.

Text (captions *and* watermark) all goes through one ASS subtitle file rather
than drawtext. libass handles font fallback and outlines properly, and it
dodges drawtext's fontconfig dependency, which is a common failure on Windows.
"""

from __future__ import annotations

import os
import shutil
import time
from dataclasses import dataclass
from pathlib import Path

from edl import Caption, Variation, remap_captions
from ffmpeg_tools import ContentCrop, SourceInfo, binary, run

TARGET_W = 1080
TARGET_H = 1920
TARGET_FPS = 30

# Transition lengths, in seconds.
#
# Internal joins are a true CROSS-DISSOLVE on picture and an equal-power
# crossfade on sound. The previous version hard-cut the video and only dipped
# the audio down and back up, which left two problems the client felt
# immediately: two shots of the same person in the same room swapping in one
# frame reads as a glitch, and the audio dip is an audible stumble mid-sentence.
# Overlapping the two removes both.
#
# DISSOLVE is the one number to turn if the result is still jumpy (raise it) or
# feels sluggish (lower it). 0.25s is about two frames short of noticeable as a
# "transition" while being long enough to stop registering as a cut.
DISSOLVE = 0.25

# Top and tail. Asymmetric on purpose: the opening fade has to finish before the
# first word lands, the closing one can breathe.
EDGE_FADE_IN = 0.30
EDGE_FADE_OUT = 0.40
AUDIO_FADE_IN = 0.20
AUDIO_FADE_OUT = 0.45

# "crop" fills the frame and loses the sides; "blur" keeps the whole frame over
# a blurred backdrop. Which one wins is an open question we settle on real
# footage, subject-aware cropping is explicitly out of MVP scope.
FIT_MODES = ("crop", "blur")


@dataclass
class RenderResult:
    variation_id: str
    strategy: str
    output: Path
    duration: float
    seconds_taken: float
    size_mb: float


# --------------------------------------------------------------------------- #
# ASS subtitles
# --------------------------------------------------------------------------- #


# Captions and the watermark are drawn by libass, which needs the font as a
# file it can load. They used to name Arial Black and Arial, which exist on
# Windows and on nothing else: in a Linux container libass silently fell back
# to whatever font it could find, so every free plan render would have carried
# its watermark in the wrong face. Archivo Black is open licensed (OFL, see
# fonts/OFL.txt), close in weight and width to Arial Black, and ships with the
# code, so a render looks the same on a laptop and on the server.
FONTS_DIR = Path(__file__).resolve().parent / "fonts"
CAPTION_FONT = "Archivo Black"


def _ffmpeg_threads() -> int | None:
    """How many threads FFmpeg may use, from FFMPEG_THREADS. None means auto.

    Auto sizes x264's thread pool from the CPUs it can see, and every encoding
    thread holds frames in memory. On a 12 thread laptop one 1080x1920 render
    peaked at 913 MB. In a container FFmpeg typically sees the host's CPUs, not
    the slice the service is allowed, so it would size itself the same way and
    could blow straight through a 1 GB memory limit mid render. The Docker image
    sets this; a laptop leaves it unset and keeps full speed.
    """
    raw = os.environ.get("FFMPEG_THREADS", "").strip()
    return int(raw) if raw.isdigit() and int(raw) > 0 else None



def _stage_fonts(out_dir: Path) -> None:
    """Give libass the bundled fonts, next to the render.

    FFmpeg runs with its working directory set to `out_dir` so the subtitle
    file can be a bare name; Windows absolute paths need awkward escaping inside
    a filter graph. The fonts follow the same rule: copied into a `.fonts`
    folder there and referenced as `fontsdir=.fonts`. A dedicated folder rather
    than `fontsdir=.` matters, because libass reads every file in that folder
    trying to load it as a font, and the job folder holds the source video.

    Copied once per job folder and never removed, since a refine can render in
    the same folder while another render is still running.
    """
    target = out_dir / ".fonts"
    target.mkdir(exist_ok=True)
    for font in FONTS_DIR.glob("*.ttf"):
        dest = target / font.name
        if not dest.exists():
            shutil.copy2(font, dest)


def _ass_time(seconds: float) -> str:
    """ASS wants H:MM:SS.cc, centiseconds, single-digit hours."""
    seconds = max(0.0, seconds)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{int(s):02d}.{int(round((s % 1) * 100)):02d}"


def _ass_escape(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
        .replace("{", "\\{")
        .replace("}", "\\}")
        .replace("\n", "\\N")
    )


def build_ass(
    captions: list[Caption],
    total_duration: float,
    *,
    watermark: str | None = None,
) -> str:
    """Caption track styled for paid social: big, high-contrast, lower third.

    WrapStyle 0 lets libass break a long line in two. It was 2, never wrap,
    which assumed a four word cue always fits; at 74px in a black weight face a
    32 character cue ran off both edges of a 1080 wide frame, in Arial Black
    as much as in Archivo Black. A cue that fits stays on one line either way.

    Colours are ASS's &HAABBGGRR, alpha first and inverted, so 00 is opaque.
    """
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {TARGET_W}
PlayResY: {TARGET_H}
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,{CAPTION_FONT},74,&H00FFFFFF,&H000000FF,&H00000000,&H90000000,0,0,0,0,100,100,1,0,1,6,3,2,90,90,300,1
Style: Mark,{CAPTION_FONT},40,&H66FFFFFF,&H000000FF,&H66000000,&H00000000,0,0,0,0,100,100,2,0,1,3,0,8,60,60,70,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    lines = [
        f"Dialogue: 0,{_ass_time(c.start)},{_ass_time(c.end)},Caption,,0,0,0,,"
        f"{_ass_escape(c.text.upper())}"
        for c in captions
    ]

    if watermark:
        lines.append(
            f"Dialogue: 1,{_ass_time(0)},{_ass_time(total_duration)},Mark,,0,0,0,,"
            f"{_ass_escape(watermark)}"
        )

    return head + "\n".join(lines) + "\n"


# --------------------------------------------------------------------------- #
# Filter graph
# --------------------------------------------------------------------------- #


def _reframe_chain(fit: str, src: str = "[vcat]") -> tuple[str, str]:
    """Filters that take `src` to a 1080x1920 [vfit]."""
    if fit == "crop":
        return (
            "{src}scale={w}:{h}:force_original_aspect_ratio=increase,"
            "crop={w}:{h},fps={fps},setsar=1[vfit]".format(
                src=src, w=TARGET_W, h=TARGET_H, fps=TARGET_FPS
            ),
            "centre crop (fills the frame, loses the sides)",
        )

    # blur: whole frame preserved over a blurred, filled backdrop
    return (
        "{src}split=2[bgsrc][fgsrc];"
        "[bgsrc]scale={w}:{h}:force_original_aspect_ratio=increase,"
        "crop={w}:{h},gblur=sigma=30[bg];"
        "[fgsrc]scale={w}:{h}:force_original_aspect_ratio=decrease[fg];"
        "[bg][fg]overlay=(W-w)/2:(H-h)/2,fps={fps},setsar=1[vfit]".format(
            src=src, w=TARGET_W, h=TARGET_H, fps=TARGET_FPS
        ),
        "blur pad (keeps the whole frame, blurred backdrop)",
    )


def _clip_durations(variation: Variation, source: SourceInfo) -> list[float]:
    """Each segment's length, clamped to the source."""
    out = []
    for seg in sorted(variation.segments, key=lambda s: s.start):
        start = max(0.0, seg.start)
        end = min(source.duration, seg.end)
        out.append(max(0.05, end - start))
    return out


def dissolve_for(durations: list[float]) -> float:
    """How long each join may overlap.

    Capped at a third of the shortest segment so a dissolve can never eat a
    whole shot. With real segments running 5-20s this never binds; it only
    matters when the length backstop has produced something brief.
    """
    if len(durations) < 2:
        return 0.0
    return min(DISSOLVE, min(durations) / 3)


def rendered_duration(variation: Variation, source: SourceInfo) -> float:
    """Final length. Each dissolve overlaps two shots, so the clip shortens."""
    durations = _clip_durations(variation, source)
    return sum(durations) - dissolve_for(durations) * (len(durations) - 1)


def build_filtergraph(
    variation: Variation,
    source: SourceInfo,
    *,
    fit: str,
    ass_name: str | None,
    content_crop: ContentCrop | None = None,
) -> str:
    segments = sorted(variation.segments, key=lambda s: s.start)
    durations = _clip_durations(variation, source)
    d = dissolve_for(durations)
    n = len(segments)
    parts: list[str] = []

    for i, seg in enumerate(segments):
        start = max(0.0, seg.start)
        end = min(source.duration, seg.end)
        # xfade demands both inputs share a frame rate, pixel format and aspect,
        # so each shot is normalised before the join rather than after. Trimmed
        # streams can be variable-frame-rate, which xfade silently mishandles.
        parts.append(
            f"[0:v]trim=start={start:.3f}:end={end:.3f},setpts=PTS-STARTPTS,"
            f"fps={TARGET_FPS},format=yuv420p,setsar=1[v{i}]"
        )
        if source.has_audio:
            parts.append(
                f"[0:a]atrim=start={start:.3f}:end={end:.3f},asetpts=PTS-STARTPTS[a{i}]"
            )

    # Chain the dissolves. xfade's offset is measured from the start of its
    # first input, so it walks forward with the running length, which itself
    # shrinks by one dissolve at every join.
    if n == 1:
        parts.append("[v0]null[vcat]")
        if source.has_audio:
            parts.append("[a0]anull[acat]")
    else:
        running = durations[0]
        v_prev, a_prev = "[v0]", "[a0]"
        for i in range(1, n):
            v_out = "[vcat]" if i == n - 1 else f"[vx{i}]"
            parts.append(
                f"{v_prev}[v{i}]xfade=transition=fade:duration={d:.3f}:"
                f"offset={max(0.0, running - d):.3f}{v_out}"
            )
            v_prev = v_out
            if source.has_audio:
                a_out = "[acat]" if i == n - 1 else f"[ax{i}]"
                # Equal-power curves. A linear crossfade of two uncorrelated
                # signals dips about 6dB at the midpoint, which is exactly the
                # stumble we are removing.
                parts.append(
                    f"{a_prev}[a{i}]acrossfade=d={d:.3f}:c1=qsin:c2=qsin{a_out}"
                )
                a_prev = a_out
            running += durations[i] - d

    # Strip baked-in letterbox/pillarbox bars before reframing, or we end up
    # scaling black and nesting one frame inside another.
    src_label = "[vcat]"
    if content_crop is not None:
        parts.append(f"[vcat]{content_crop.as_filter()}[vtrim]")
        src_label = "[vtrim]"

    reframe, _ = _reframe_chain(fit, src_label)
    parts.append(reframe)

    if ass_name:
        # Run with cwd set to the output directory so this is a bare filename;
        # Windows absolute paths need painful escaping inside a filter string.
        # The bundled fonts sit in `.fonts` there for the same reason.
        parts.append(f"[vfit]subtitles={ass_name}:fontsdir=.fonts[vsub]")
        last_v = "[vsub]"
    else:
        last_v = "[vfit]"

    # Top and tail. Slamming in at full brightness and volume and stopping dead
    # is most of what separates "a clip someone extracted" from "an ad someone
    # made". Cheap, and it does more for perceived quality than anything else
    # in this filter graph.
    total = sum(durations) - d * (n - 1)
    parts.append(
        f"{last_v}fade=t=in:st=0:d={EDGE_FADE_IN:.3f},"
        f"fade=t=out:st={max(0.0, total - EDGE_FADE_OUT):.3f}:d={EDGE_FADE_OUT:.3f}[vout]"
    )

    if source.has_audio:
        parts.append(
            f"[acat]afade=t=in:st=0:d={AUDIO_FADE_IN:.3f},"
            f"afade=t=out:st={max(0.0, total - AUDIO_FADE_OUT):.3f}:"
            f"d={AUDIO_FADE_OUT:.3f}[aout]"
        )

    return ";".join(parts)


def _shift_for_dissolve(
    captions: list[Caption], variation: Variation, source: SourceInfo
) -> list[Caption]:
    """Pull caption timings back to match the dissolved timeline.

    `remap_captions` works in hard-concat time, where each shot follows the
    last exactly. Dissolving overlaps them, so everything after the first join
    happens one dissolve earlier -- two joins in, two dissolves earlier. Without
    this the captions drift later and later through the clip.
    """
    durations = _clip_durations(variation, source)
    d = dissolve_for(durations)
    if d <= 0 or len(durations) < 2 or not captions:
        return captions

    # Segment boundaries in hard-concat time, which is what the captions use.
    bounds: list[float] = []
    acc = 0.0
    for dur in durations:
        acc += dur
        bounds.append(acc)

    out: list[Caption] = []
    for c in captions:
        idx = next((i for i, b in enumerate(bounds) if c.start < b), len(bounds) - 1)
        shift = d * idx
        start = max(0.0, c.start - shift)
        out.append(Caption(start, max(start + 0.05, c.end - shift), c.text))
    return out


# --------------------------------------------------------------------------- #
# Render
# --------------------------------------------------------------------------- #


def render_variation(
    variation: Variation,
    source: SourceInfo,
    out_dir: Path,
    *,
    fit: str = "crop",
    watermark: str | None = None,
    keep_ass: bool = False,
    content_crop: ContentCrop | None = None,
    suffix: str = "",
) -> RenderResult:
    if fit not in FIT_MODES:
        raise ValueError(f"fit must be one of {FIT_MODES}, got {fit!r}")

    out_dir.mkdir(parents=True, exist_ok=True)
    # `suffix` keeps refined versions beside the original rather than over it.
    stem = f"{source.path.stem}__{variation.id}__{fit}" + (f"__{suffix}" if suffix else "")
    out_path = out_dir / f"{stem}.mp4"

    total = rendered_duration(variation, source)
    captions = _shift_for_dissolve(remap_captions(variation), variation, source)

    ass_name: str | None = None
    if captions or watermark:
        _stage_fonts(out_dir)
        ass_name = f"{stem}.ass"
        (out_dir / ass_name).write_text(
            build_ass(captions, total, watermark=watermark),
            encoding="utf-8",
        )

    graph = build_filtergraph(
        variation, source, fit=fit, ass_name=ass_name, content_crop=content_crop
    )

    threads = _ffmpeg_threads()
    args = [binary("ffmpeg"), "-y"]
    if threads:
        args += ["-filter_complex_threads", str(threads)]
    args += [
        "-i", str(source.path.resolve()),
        "-filter_complex", graph,
        "-map", "[vout]",
    ]
    if source.has_audio:
        args += ["-map", "[aout]", "-c:a", "aac", "-b:a", "128k", "-ar", "48000"]
    else:
        args += ["-an"]
    args += [
        "-c:v", "libx264",
        "-preset", "medium",
        *(["-threads", str(threads)] if threads else []),
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        out_path.name,
    ]

    started = time.perf_counter()
    run(args, cwd=out_dir)
    elapsed = time.perf_counter() - started

    if ass_name and not keep_ass:
        (out_dir / ass_name).unlink(missing_ok=True)

    return RenderResult(
        variation_id=variation.id,
        strategy=variation.strategy,
        output=out_path,
        duration=total,
        seconds_taken=elapsed,
        size_mb=out_path.stat().st_size / (1024 * 1024),
    )
