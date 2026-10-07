"""Step 1 of the pipeline spike, prove the render path, with no AI involved.

Everything downstream of the model is exercised here: probing, the EDL
contract, validation, cutting, concatenating, reframing to 9:16, captions,
watermark and encode. If this half is wrong, no amount of clever prompting
saves the output, and this half costs nothing to debug.

    python spike/run_render.py <video>                   # placeholder EDL
    python spike/run_render.py <video> --fit both        # compare reframing
    python spike/run_render.py <video> --edl plan.json   # a real EDL

Once step 4 exists, the only change is where the EDL comes from.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from edl import EDL, Caption, Segment, Variation, validate, warnings
from ffmpeg_tools import (
    FFmpegMissing,
    SourceInfo,
    detect_content_crop,
    fmt_duration,
    probe,
)
from render import FIT_MODES, RenderResult, render_variation

# Windows consoles default to cp1252, which cannot encode the arrow in
# "Problem -> Solution" or an em dash. Force UTF-8 on the streams rather than
# sanitising every string: the production worker logs these same names.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")


def placeholder_edl(source: SourceInfo) -> EDL:
    """Three structurally different cuts, sized to the source.

    Deliberately not clever, it stands in for the model so we can test
    rendering. The shapes mirror the three real strategies so we exercise
    single-segment and multi-segment paths.
    """
    d = source.duration
    if d < 12:
        raise SystemExit(
            f"Source is only {d:.1f}s. Use something 30s or longer to test properly."
        )

    def clamp(a: float, b: float) -> Segment:
        return Segment(max(0.0, min(a, d)), max(0.0, min(b, d)))

    # Proportional so this works on a 30s clip or a 2-minute one.
    return EDL(
        source=str(source.path),
        variations=[
            Variation(
                id="hook-first",
                strategy="Hook-first",
                hook="Opens on the strongest moment",
                segments=[clamp(0, min(6.0, d * 0.12)), clamp(d * 0.45, d * 0.45 + 8.0)],
                captions=[
                    Caption(0.2, min(3.0, d * 0.08), "Placeholder hook line"),
                    Caption(d * 0.46, d * 0.46 + 3.0, "Second caption here"),
                ],
            ),
            Variation(
                id="problem-solution",
                strategy="Problem → Solution",
                hook="Frames the pain, then the fix",
                segments=[clamp(d * 0.15, d * 0.15 + 7.0), clamp(d * 0.7, d * 0.7 + 8.0)],
                captions=[
                    Caption(d * 0.16, d * 0.16 + 3.0, "Here is the problem"),
                    Caption(d * 0.71, d * 0.71 + 3.0, "And here is the fix"),
                ],
            ),
            Variation(
                id="social-proof",
                strategy="Social proof",
                hook="Leads with credibility",
                segments=[
                    clamp(d * 0.05, d * 0.05 + 4.0),
                    clamp(d * 0.4, d * 0.4 + 5.0),
                    clamp(d * 0.8, d * 0.8 + 5.0),
                ],
                captions=[
                    Caption(d * 0.06, d * 0.06 + 2.5, "Three shorter beats"),
                    Caption(d * 0.41, d * 0.41 + 2.5, "Cut together"),
                    Caption(d * 0.81, d * 0.81 + 2.5, "Ending on the offer"),
                ],
            ),
        ],
    )


def main() -> int:
    ap = argparse.ArgumentParser(description="Render an EDL into 9:16 micro-ads.")
    ap.add_argument("video", type=Path, help="source video")
    ap.add_argument("--edl", type=Path, help="EDL JSON; omit to use a placeholder")
    ap.add_argument(
        "--fit",
        default="crop",
        choices=[*FIT_MODES, "both"],
        help="how to reach 9:16 (default: crop)",
    )
    ap.add_argument("--out", type=Path, default=Path("spike/output"))
    ap.add_argument(
        "--watermark",
        nargs="?",
        const="AdMultiply",
        default=None,
        help="burn a watermark, as the free tier does",
    )
    ap.add_argument("--keep-ass", action="store_true", help="keep the subtitle file")
    ap.add_argument(
        "--no-debar",
        action="store_true",
        help="skip letterbox/pillarbox detection",
    )
    ap.add_argument("--dump-edl", action="store_true", help="write the EDL used")
    args = ap.parse_args()

    try:
        source = probe(args.video)
    except FFmpegMissing as e:
        print(f"\n{e}\n", file=sys.stderr)
        return 2
    except (FileNotFoundError, ValueError) as e:
        print(f"\n{e}\n", file=sys.stderr)
        return 2

    print("\nSOURCE")
    print(f"  {source.summary()}")
    if source.aspect < 1:
        print("  note: source is already vertical, reframing will be near-lossless")
    if not source.has_audio:
        print("  warning: no audio track. There will be no speech to cut on.")

    # Real ad creative is frequently padded with black. Strip it before
    # reframing, otherwise we scale bars and nest one frame inside another.
    content_crop = None
    if not args.no_debar:
        detected = detect_content_crop(source)
        if detected and detected.is_significant(source):
            content_crop = detected
            print(f"  bars detected: {detected.describe(source)}, trimming before reframe")
        else:
            print("  bars: none detected")

    edl = EDL.load(args.edl) if args.edl else placeholder_edl(source)
    origin = str(args.edl) if args.edl else "placeholder (no AI yet)"
    print(f"\nEDL  ({origin})")

    errors = validate(edl, source.duration)
    if errors:
        print("  REJECTED:")
        for e in errors:
            print(f"    - {e}")
        print("\n  In step 4 these strings go back to the model for one retry.\n")
        return 1

    for w in warnings(edl):
        print(f"  note: {w}")
    print(f"  {len(edl.variations)} variations, all valid")

    if args.dump_edl:
        p = args.out / f"{source.path.stem}__edl.json"
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(edl.to_dict(), indent=2), encoding="utf-8")
        print(f"  wrote {p}")

    fits = list(FIT_MODES) if args.fit == "both" else [args.fit]
    results: list[RenderResult] = []

    print("\nRENDERING")
    for fit in fits:
        for v in edl.variations:
            print(f"  {v.id:<18} {fit:<5} ... ", end="", flush=True)
            try:
                r = render_variation(
                    v,
                    source,
                    args.out,
                    fit=fit,
                    watermark=args.watermark,
                    keep_ass=args.keep_ass,
                    content_crop=content_crop,
                )
            except RuntimeError as e:
                print("FAILED")
                print(f"\n{e}\n", file=sys.stderr)
                return 1
            results.append(r)
            print(f"{fmt_duration(r.duration)}  {r.size_mb:>5.1f} MB  {r.seconds_taken:>5.1f}s")

    total_render = sum(r.seconds_taken for r in results)
    realtime = sum(r.duration for r in results)
    print(f"\n  {len(results)} clips in {total_render:.1f}s "
          f"({total_render / realtime:.2f}x realtime)")
    print(f"  -> {args.out.resolve()}\n")

    if len(fits) > 1:
        print("  Compare the two fit modes side by side and pick one; that decision")
        print("  carries into production.\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
