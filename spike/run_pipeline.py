"""Command-line wrapper over pipeline.run().

    python spike/run_pipeline.py <video>
    python spike/run_pipeline.py <video> --visual off
    python spike/run_pipeline.py <video> --replan          # new storylines
    python spike/run_pipeline.py <video> --rebrief         # new brief + storylines
    python spike/run_pipeline.py <video> --captions on

Everything expensive is cached by file fingerprint, so iterating on prompts
costs a fraction of a cent per pass.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from pipeline import Options, run

for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, "reconfigure"):
        _s.reconfigure(encoding="utf-8", errors="replace")

_LABEL = {
    "probing": "SOURCE",
    "analyzing": "STEP 2  VISUAL ANALYSIS  (TwelveLabs)",
    "transcribing": "STEP 3  TRANSCRIBE  (whisper-1)",
    "understanding": "STEP 4a UNDERSTAND  (gpt-4o-mini, the brief)",
    "planning": "STEP 4b STORYLINES  (gpt-4o-mini, one per angle)",
    "rendering": "STEP 1  RENDER",
}


def main() -> int:
    ap = argparse.ArgumentParser(description="AdMultiply pipeline.")
    ap.add_argument("video", type=Path)
    ap.add_argument("--out", type=Path, default=Path("spike/output"))
    ap.add_argument("--visual", choices=["on", "off"], default="on")
    ap.add_argument("--captions", choices=["on", "off"], default="off")
    ap.add_argument("--watermark", nargs="?", const="AdMultiply", default=None)
    ap.add_argument("--fit", choices=["auto", "crop", "blur"], default="auto")
    ap.add_argument("--replan", action="store_true", help="re-run storylines")
    ap.add_argument("--rebrief", action="store_true", help="re-run brief and storylines")
    ap.add_argument("--retranscribe", action="store_true")
    ap.add_argument("--reanalyze", action="store_true")
    args = ap.parse_args()

    seen_stage = {"value": ""}

    def on_progress(stage: str, detail: str) -> None:
        if stage == "ready":
            return
        if stage != seen_stage["value"]:
            seen_stage["value"] = stage
            print("\n" + "=" * 66)
            print(_LABEL.get(stage, stage.upper()))
            print("=" * 66)
        if detail:
            print(f"  {detail}")

    opts = Options(
        visual=args.visual == "on",
        captions=args.captions == "on",
        watermark=args.watermark,
        fit=args.fit,
        force_plan=args.replan or args.rebrief,
        force_brief=args.rebrief,
        force_transcript=args.retranscribe,
        force_visual=args.reanalyze,
    )

    try:
        r = run(args.video, args.out, opts, on_progress)
    except (RuntimeError, FileNotFoundError, ValueError) as e:
        print(f"\nFAILED: {e}\n", file=sys.stderr)
        return 1

    # ------------------------------------------------------------ summary
    print("\n" + "=" * 66)
    print("BRIEF")
    print("=" * 66)
    b = r.brief
    print(f"  {b.product}  ->  {b.audience}")
    print(f"  format: {b.format}   {'cached' if b.cached else f'${b.cost_usd:.5f}'}")
    print(f"  arc: {b.arc}")
    print(f"  angles: {', '.join(b.angles)}")
    print(f"    ({b.angle_reasoning})")
    print("\n  moments:")
    for m in b.moments:
        shown = f"   [{m.shown}]" if m.shown else ""
        print(f"    {m.id:<3} {m.start:5.1f}-{m.end:5.1f}s  {m.role:<14} {m.strength}/5  {m.label}{shown}")

    print("\n" + "=" * 66)
    print("STORYLINES")
    print("=" * 66)
    p = r.plan
    print(f"  {'cached' if p.cached else f'${p.cost_usd:.5f}, {p.tokens_in}+{p.tokens_out} tok'}"
          f"{'  [repaired]' if p.repaired else ''}")
    for v, why, clip in zip(p.edl.variations, p.reasoning["variations"], r.clips):
        cuts = why["cuts"]
        note = f"{cuts} cut{'' if cuts == 1 else 's'}"
        if why["bridged"]:
            note += f", {why['bridged']} bridged"
        if why["grown_s"]:
            note += f", +{why['grown_s']}s to reach length"
        print(f"\n  {v.strategy}  --  \"{why['title']}\"")
        print(f"    {why['logline']}")
        print(f"    {v.output_duration:.1f}s, {why['reframe']}, {note}")
        for m in why["moments"]:
            print(f"    {m['id']:<3} {m['label']}  --  {m['why']}")
        print(f"    -> {clip.output.name}  ({clip.size_mb:.1f} MB, {clip.seconds_taken:.1f}s)")

    if p.reasoning.get("overlap"):
        print("\n  footage shared between cuts:")
        for o in p.reasoning["overlap"]:
            flag = "  <-- too similar" if o["overlap"] > 0.30 else ""
            print(f"    {o['a']} / {o['b']}: {o['overlap']:.0%}{flag}")

    print("\n" + "=" * 66)
    print("COST  (this run)")
    print("=" * 66)
    c = r.report()["cost"]
    def line(label: str, usd: float, cached: bool) -> None:
        print(f"  {label:<26} ${usd:.5f}{'  (cached)' if cached else ''}")
    line("TwelveLabs analysis", c["twelvelabs_usd"], c["cached"]["twelvelabs"])
    line("whisper-1 transcription", c["whisper_usd"], c["cached"]["whisper"])
    line("gpt-4o-mini brief", c["brief_usd"], c["cached"]["brief"])
    line("gpt-4o-mini storylines", c["plan_usd"], c["cached"]["plan"])
    print(f"  {'-' * 40}")
    print(f"  {'AI total':<26} ${c['ai_total_usd']:.5f}")
    print(f"\n  wall clock: {r.wall_s:.1f}s")
    for w in r.warnings:
        print(f"  note: {w}")
    print(f"  -> {args.out.resolve()}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
