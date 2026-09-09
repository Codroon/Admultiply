"""Render an EDL into finished 9:16 micro-ads.

One ffmpeg invocation per variation, built as a single filter_complex: trim,
concat, reframe, caption, encode. No intermediate files and no double encode,
which keeps quality up and wall-clock down.

Text (captions *and* watermark) all goes through one ASS subtitle file rather
than drawtext. libass handles font fallback and outlines properly, and it
dodges drawtext's fontconfig dependency, which is a common failure on Windows.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path

from edl import Caption, Variation, remap_captions
from ffmpeg_tools import ContentCrop, SourceInfo, binary, run

TARGET_W = 1080
TARGET_H = 1920
TARGET_FPS = 30

# Fade lengths, in seconds. Short enough to be invisible, long enough that the
# join stops registering as a cut.
SPLICE_FADE = 0.09      # either side of every internal audio join
EDGE_FADE = 0.20        # video fade at the very start and end
EDGE_FADE_AUDIO = 0.28  # audio settles a touch slower than picture

# "crop" fills the frame and loses the sides; "blur" keeps the whole frame over
# a blurred backdrop. Which one wins is an open question we settle on real
# footage — subject-aware cropping is explicitly out of MVP scope.
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


def _ass_time(seconds: float) -> str:
    """ASS wants H:MM:SS.cc — centiseconds, single-digit hours."""
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

    Colours are ASS's &HAABBGGRR — alpha first and inverted, so 00 is opaque.
    """
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {TARGET_W}
PlayResY: {TARGET_H}
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Arial Black,74,&H00FFFFFF,&H000000FF,&H00000000,&H90000000,-1,0,0,0,100,100,1,0,1,6,3,2,90,90,300,1
Style: Mark,Arial,40,&H66FFFFFF,&H000000FF,&H66000000,&H00000000,-1,0,0,0,100,100,2,0,1,3,0,8,60,60,70,1

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


def build_filtergraph(
    variation: Variation,
    source: SourceInfo,
    *,
    fit: str,
    ass_name: str | None,
    content_crop: ContentCrop | None = None,
) -> str:
    segments = sorted(variation.segments, key=lambda s: s.start)
    parts: list[str] = []
    labels: list[str] = []

    for i, seg in enumerate(segments):
        # Clamp defensively: a model off by a few frames shouldn't fail a render.
        start = max(0.0, seg.start)
        end = min(source.duration, seg.end)
        dur = max(0.05, end - start)
        parts.append(
            f"[0:v]trim=start={start:.3f}:end={end:.3f},setpts=PTS-STARTPTS[v{i}]"
        )
        if source.has_audio:
            # Splice fades. Stitching two moments from different parts of a
            # video jumps room tone, breath and level in a single frame, and
            # the ear reads that as "cut" well before the eye does. A short
            # fade either side of every join removes it without changing
            # duration, which a crossfade would.
            fade = min(SPLICE_FADE, dur / 3)
            parts.append(
                f"[0:a]atrim=start={start:.3f}:end={end:.3f},asetpts=PTS-STARTPTS,"
                f"afade=t=in:st=0:d={fade:.3f},"
                f"afade=t=out:st={max(0.0, dur - fade):.3f}:d={fade:.3f}[a{i}]"
            )
        labels.append(f"[v{i}]" + (f"[a{i}]" if source.has_audio else ""))

    n = len(segments)
    if source.has_audio:
        parts.append(f"{''.join(labels)}concat=n={n}:v=1:a=1[vcat][acat]")
    else:
        parts.append(f"{''.join(labels)}concat=n={n}:v=1:a=0[vcat]")

    # Strip baked-in letterbox/pillarbox bars before reframing, or we end up
    # scaling black and nesting one frame inside another.
    src_label = "[vcat]"
    if content_crop is not None:
        parts.append(f"[vcat]{content_crop.as_filter()}[vtrim]")
        src_label = "[vtrim]"

    reframe, _ = _reframe_chain(fit, src_label)
    parts.append(reframe)

    if ass_name:
        # Run with cwd set to the output directory so this is a bare filename —
        # Windows absolute paths need painful escaping inside a filter string.
        parts.append(f"[vfit]subtitles={ass_name}[vsub]")
        last_v = "[vsub]"
    else:
        last_v = "[vfit]"

    # Top and tail. Slamming in at full brightness and volume and stopping dead
    # is most of what separates "a clip someone extracted" from "an ad someone
    # made". Cheap, and it does more for perceived quality than anything else
    # in this filter graph.
    total = sum(max(0.0, min(source.duration, s.end) - max(0.0, s.start)) for s in segments)
    v_out_start = max(0.0, total - EDGE_FADE)
    parts.append(
        f"{last_v}fade=t=in:st=0:d={EDGE_FADE:.3f},"
        f"fade=t=out:st={v_out_start:.3f}:d={EDGE_FADE:.3f}[vout]"
    )

    if source.has_audio:
        a_out_start = max(0.0, total - EDGE_FADE_AUDIO)
        parts.append(
            f"[acat]afade=t=in:st=0:d={EDGE_FADE_AUDIO:.3f},"
            f"afade=t=out:st={a_out_start:.3f}:d={EDGE_FADE_AUDIO:.3f}[aout]"
        )

    return ";".join(parts)


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
) -> RenderResult:
    if fit not in FIT_MODES:
        raise ValueError(f"fit must be one of {FIT_MODES}, got {fit!r}")

    out_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{source.path.stem}__{variation.id}__{fit}"
    out_path = out_dir / f"{stem}.mp4"

    captions = remap_captions(variation)
    total = variation.output_duration

    ass_name: str | None = None
    if captions or watermark:
        ass_name = f"{stem}.ass"
        (out_dir / ass_name).write_text(
            build_ass(captions, total, watermark=watermark),
            encoding="utf-8",
        )

    graph = build_filtergraph(
        variation, source, fit=fit, ass_name=ass_name, content_crop=content_crop
    )

    args = [
        binary("ffmpeg"),
        "-y",
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
