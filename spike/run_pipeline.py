"""The pipeline spike, end to end.

    python spike/run_pipeline.py <video>
    python spike/run_pipeline.py <video> --replan     # new plan, cached transcript

Transcribe -> plan -> render, with measured cost at every step. The output is
three vertical micro-ads plus a report that replaces the estimated $0.15 per
video with a real number.

Everything expensive is cached by file fingerprint, so iterating on the prompt
costs a fraction of a cent per pass instead of re-transcribing each time.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from config import CACHE_DIR, load_env, require
from edl import validate, warnings
from ffmpeg_tools import FFmpegMissing, detect_content_crop, fmt_duration, probe
from net import ApiError
from plan import make_plan
from render import render_variation
from transcribe import transcribe

for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, "reconfigure"):
        _s.reconfigure(encoding="utf-8", errors="replace")


def main() -> int:
    ap = argparse.ArgumentParser(description="AdMultiply pipeline spike.")
    ap.add_argument("video", type=Path)
    ap.add_argument("--out", type=Path, default=Path("spike/output"))
    ap.add_argument("--replan", action="store_true", help="re-run the planner")
    ap.add_argument("--retranscribe", action="store_true")
    ap.add_argument("--watermark", nargs="?", const="AdMultiply", default=None)
    ap.add_argument(
        "--fit",
        choices=["auto", "crop", "blur"],
        default="auto",
        help="auto lets the model choose per variation",
    )
    # Most real ad creative already carries burned-in captions, so adding ours
    # stacks a near-duplicate underneath and looks amateurish. Off by default
    # until step 2, where TwelveLabs' scene analysis can detect on-screen text
    # and make this call per video.
    ap.add_argument(
        "--captions",
        choices=["on", "off"],
        default="off",
        help="burn our own captions (default off: sources usually have their own)",
    )
    args = ap.parse_args()

    env = load_env()
    openai_key = require("OPENAI_API_KEY", env)

    # ---------------------------------------------------------------- probe
    try:
        source = probe(args.video)
    except (FFmpegMissing, FileNotFoundError, ValueError) as e:
        print(f"\n{e}\n", file=sys.stderr)
        return 2

    print("\n" + "=" * 66)
    print("SOURCE")
    print("=" * 66)
    print(f"  {source.summary()}")
    if source.width < 1080:
        print(f"  note: {source.width}px wide, below the 1080 target - output is upscaled")

    crop = detect_content_crop(source)
    content_crop = crop if crop and crop.is_significant(source) else None
    print(f"  bars: {content_crop.describe(source) if content_crop else 'none detected'}")

    # ----------------------------------------------------------- transcribe
    print("\n" + "=" * 66)
    print("STEP 3  TRANSCRIBE  (whisper-1, word-level timestamps)")
    print("=" * 66)
    try:
        t = transcribe(source, openai_key, force=args.retranscribe)
    except ApiError as e:
        print(f"  failed: {e.message}", file=sys.stderr)
        return 1
    tag = "cached (free)" if t.cached else f"{t.seconds_taken:.1f}s, ${t.cost_usd:.5f}"
    print(f"  {len(t.words)} words, {len(t.beats)} beats, {t.language}  -  {tag}")
    for i, b in enumerate(t.beats):
        mark = "" if b.ends_sentence else " ~"
        print(f"    {i:2}.{mark} [{b.end - b.start:4.1f}s] {b.text[:72]}")

    # ----------------------------------------------------------------- plan
    print("\n" + "=" * 66)
    print("STEP 4  EDIT PLAN  (gpt-4o-mini, structured output)")
    print("=" * 66)
    try:
        p = make_plan(source, t, openai_key, force=args.replan)
    except ApiError as e:
        print(f"  failed: {e.message}", file=sys.stderr)
        return 1

    tag = (
        "cached (free)"
        if p.cached
        else f"{p.seconds_taken:.1f}s, ${p.cost_usd:.5f}, {p.tokens_in}+{p.tokens_out} tok"
    )
    print(f"  {tag}{'  [repaired after validation]' if p.repaired else ''}")

    errors = validate(p.edl, source.duration)
    if errors:
        print("\n  PLAN REJECTED even after repair:")
        for e in errors:
            print(f"    - {e}")
        return 1
    for w in warnings(p.edl):
        print(f"  note: {w}")

    print()
    for v, r in zip(p.edl.variations, p.reasoning["variations"]):
        print(f"  {v.strategy}  ({v.output_duration:.1f}s, reframe={r['reframe']})")
        print(f"    hook: \"{r['hook']}\"")
        for pick in r["picks"]:
            print(
                f"    beat {pick['beats']:<5} "
                f"{pick['start']:6.1f}-{pick['end']:5.1f}s  {pick['why']}"
            )
        print()

    # --------------------------------------------------------------- render
    print("=" * 66)
    print("STEP 1  RENDER")
    print("=" * 66)
    if args.captions == "off":
        print("  captions: off (source likely has its own; --captions on to add ours)")
        for v in p.edl.variations:
            v.captions = []

    results = []
    for v, r in zip(p.edl.variations, p.reasoning["variations"]):
        fit = r["reframe"] if args.fit == "auto" else args.fit
        print(f"  {v.id:<22} {fit:<5} ... ", end="", flush=True)
        try:
            res = render_variation(
                v, source, args.out,
                fit=fit,
                watermark=args.watermark,
                content_crop=content_crop,
            )
        except RuntimeError as e:
            print("FAILED")
            print(f"\n{e}\n", file=sys.stderr)
            return 1
        results.append(res)
        print(f"{fmt_duration(res.duration)}  {res.size_mb:>5.1f} MB  {res.seconds_taken:>5.1f}s")

    # --------------------------------------------------------------- report
    ai_cost = t.cost_usd + p.cost_usd
    render_s = sum(r.seconds_taken for r in results)
    wall = (t.seconds_taken + p.seconds_taken + render_s)

    print("\n" + "=" * 66)
    print("COST  (measured, this run)")
    print("=" * 66)
    print(f"  whisper-1 transcription   ${t.cost_usd:.5f}{'  (cached)' if t.cached else ''}")
    print(f"  gpt-4o-mini edit plan     ${p.cost_usd:.5f}{'  (cached)' if p.cached else ''}")
    print(f"  TwelveLabs analysis       $0.00000  (step 2, not yet wired)")
    print(f"  ffmpeg render             ~$0.00300  (compute, estimated)")
    print(f"  {'-' * 44}")
    print(f"  measured so far           ${ai_cost + 0.003:.5f} per video")
    print(f"  plan estimate             $0.15000 per video (TwelveLabs is ~90% of it)")
    print(f"\n  wall clock: {wall:.1f}s for 3 clips")
    print(f"  -> {args.out.resolve()}")

    report = {
        "source": source.path.name,
        "duration_s": round(source.duration, 2),
        "transcription_usd": round(t.cost_usd, 6),
        "plan_usd": round(p.cost_usd, 6),
        "measured_ai_usd": round(ai_cost, 6),
        "wall_clock_s": round(wall, 1),
        "plan": p.reasoning,
        "clips": [
            {
                "id": r.variation_id,
                "strategy": r.strategy,
                "file": r.output.name,
                "duration_s": round(r.duration, 2),
                "size_mb": round(r.size_mb, 2),
            }
            for r in results
        ],
    }
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"  -> report.json")
    print(f"  cache: {CACHE_DIR}  (delete to force a paid re-run)\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
