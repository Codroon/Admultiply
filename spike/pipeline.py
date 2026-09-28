"""The pipeline as a function.

    result = run(Path("ad.mp4"), Path("out/"), on_progress=print_stage)

Everything the CLI and the API both need lives here; run_pipeline.py is a thin
command-line wrapper and api.py will be a thin HTTP wrapper. The progress
callback is what lets a job report "rendering 2 of 3" to a dashboard.

Stages, in order:
    probing -> analyzing -> transcribing -> understanding -> planning
    -> rendering -> ready   (or -> failed)
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from analyze import VisualAnalysis, analyze
from config import cache_read, cache_write, file_fingerprint, load_env
from edl import validate, warnings
from ffmpeg_tools import ContentCrop, SourceInfo, detect_content_crop, detect_scene_cuts, probe
from net import ApiError
from plan import PlanResult, make_plan
from render import RenderResult, render_variation
from transcribe import Transcript, transcribe
from understand import Brief, understand

Progress = Callable[[str, str], None]
# Fired once planning is done, with the storyline reasoning, so a UI can name
# the three slots before any render exists.
OnPlan = Callable[[list[dict], Brief], None]
# Fired after each render lands, so a UI can reveal clips progressively.
OnClip = Callable[[int, RenderResult, dict], None]

STAGES = ["probing", "analyzing", "transcribing", "understanding", "planning", "rendering", "ready"]


@dataclass
class Options:
    visual: bool = True
    captions: bool = False
    watermark: str | None = None
    fit: str = "auto"  # auto | crop | blur
    force_plan: bool = False
    force_brief: bool = False
    force_transcript: bool = False
    force_visual: bool = False


@dataclass
class Result:
    source: SourceInfo
    transcript: Transcript
    visual: VisualAnalysis | None
    brief: Brief
    plan: PlanResult
    clips: list[RenderResult]
    content_crop: ContentCrop | None
    wall_s: float
    warnings: list[str] = field(default_factory=list)

    @property
    def ai_cost_usd(self) -> float:
        return (
            self.transcript.cost_usd
            + self.brief.cost_usd
            + self.plan.cost_usd
            + (self.visual.cost_usd if self.visual else 0.0)
        )

    def report(self) -> dict:
        """JSON-serialisable summary. This is what the API returns and what
        report.json contains."""
        return {
            "source": self.source.path.name,
            "duration_s": round(self.source.duration, 2),
            "resolution": f"{self.source.width}x{self.source.height}",
            "wall_clock_s": round(self.wall_s, 1),
            "cost": {
                "twelvelabs_usd": round(self.visual.cost_usd, 5) if self.visual else 0.0,
                "whisper_usd": round(self.transcript.cost_usd, 5),
                "brief_usd": round(self.brief.cost_usd, 5),
                "plan_usd": round(self.plan.cost_usd, 5),
                "ai_total_usd": round(self.ai_cost_usd, 5),
                "cached": {
                    "twelvelabs": bool(self.visual and self.visual.cached),
                    "whisper": self.transcript.cached,
                    "brief": self.brief.cached,
                    "plan": self.plan.cached,
                },
            },
            "mode": self.brief.mode,
            "speech_seconds": round(self.transcript.speech_seconds, 1),
            "scene_cuts": len(self.brief.scene_cuts),
            "brief": self.plan.reasoning.get("brief", {}),
            "variations": [
                {
                    **why,
                    "file": clip.output.name,
                    "duration_s": round(clip.duration, 2),
                    "size_mb": round(clip.size_mb, 2),
                    "render_s": round(clip.seconds_taken, 1),
                }
                for why, clip in zip(self.plan.reasoning["variations"], self.clips)
            ],
            "overlap": self.plan.reasoning.get("overlap", []),
            "warnings": self.warnings,
        }


def run(
    video: Path,
    out_dir: Path,
    opts: Options | None = None,
    on_progress: Progress | None = None,
    on_plan: OnPlan | None = None,
    on_clip: OnClip | None = None,
) -> Result:
    opts = opts or Options()
    env = load_env()
    openai_key = env.get("OPENAI_API_KEY", "")
    if not openai_key:
        raise RuntimeError("OPENAI_API_KEY is not set in .env.local")
    tl_key = env.get("TWELVELABS_API_KEY", "")

    def progress(stage: str, detail: str = "") -> None:
        if on_progress:
            on_progress(stage, detail)

    started = time.perf_counter()
    notes: list[str] = []

    # ---------------------------------------------------------------- probe
    progress("probing")
    source = probe(video)
    crop = detect_content_crop(source)
    content_crop = crop if crop and crop.is_significant(source) else None
    if source.width < 1080:
        notes.append(f"Source is {source.width}px wide; output is upscaled to 1080.")

    # -------------------------------------------------------------- visual
    visual: VisualAnalysis | None = None
    visual_error = ""
    if opts.visual and tl_key:
        progress("analyzing", "TwelveLabs")
        try:
            visual = analyze(source, tl_key, force=opts.force_visual)
        except (ApiError, RuntimeError, TimeoutError) as e:
            # Survivable on a dialogue ad; fatal on a silent one. Keep the
            # reason so the failure message can say what actually happened.
            visual_error = str(e)
            notes.append(f"Visual analysis skipped: {e}")
            visual = None
    elif not tl_key:
        visual_error = "no TWELVELABS_API_KEY configured"
    else:
        visual_error = "visual analysis was turned off for this job"

    # ----------------------------------------------------------- transcribe
    progress("transcribing", "Whisper")
    transcript = transcribe(source, openai_key, force=opts.force_transcript)

    # Which path? Dialogue throughout: cut on words. Otherwise: cut on the
    # picture, which needs the visual analysis to have run.
    scene_cuts: list[float] = []
    if transcript.mode != "speech":
        if visual is None:
            raise RuntimeError(
                "This ad has no dialogue to cut on"
                + (" and no audio track" if not source.has_audio else "")
                + f", so it needs visual analysis -- which failed: {visual_error}. "
                "Upload an ad with a voiceover, or try again."
            )
        notes.append(
            "No dialogue found; cut from the picture on scene changes."
            if transcript.mode == "none"
            else "Little dialogue; cut from the picture, spoken lines kept for captions."
        )
        progress("analyzing", "finding scene changes")
        fp = file_fingerprint(source.path)
        cached = cache_read(fp, "scenes")
        scene_cuts = cached["cuts"] if cached else detect_scene_cuts(source)
        if not cached:
            cache_write(fp, "scenes", {"cuts": scene_cuts})

    # ----------------------------------------------------------- understand
    progress("understanding", "building the brief")
    brief = understand(
        source,
        transcript,
        openai_key,
        visual=visual.for_prompt() if visual else "",
        scene_cuts=scene_cuts,
        force=opts.force_brief,
    )

    # ----------------------------------------------------------------- plan
    progress("planning", "composing storylines")
    plan = make_plan(source, transcript, brief, openai_key, force=opts.force_plan)

    hard = validate(plan.edl, source.duration, include_duration=False)
    if hard:
        raise RuntimeError("Plan is unrenderable: " + "; ".join(hard))
    notes.extend(warnings(plan.edl))

    # Distinctness, judged after every rule and fallback has run. Some ads
    # simply do not contain three different stories -- a 43s clip with five
    # usable moments cannot be cut three ways without reuse. Say so, rather
    # than hand the user three clips that look alike and let them find out.
    similar = [o for o in plan.reasoning.get("overlap", []) if o["overlap"] > 0.5]
    if similar:
        pairs = "; ".join(f"{o['a']} and {o['b']} share {o['overlap']:.0%}" for o in similar)
        notes.append(
            f"Limited distinct material in this ad: {pairs}. The variations will "
            f"feel related. A longer source with more distinct sections gives "
            f"better results."
        )

    if not opts.captions:
        for v in plan.edl.variations:
            v.captions = []

    if on_plan:
        on_plan(plan.reasoning["variations"], brief)

    # --------------------------------------------------------------- render
    clips: list[RenderResult] = []
    total = len(plan.edl.variations)
    for i, (v, why) in enumerate(zip(plan.edl.variations, plan.reasoning["variations"]), 1):
        fit = why["reframe"] if opts.fit == "auto" else opts.fit
        progress("rendering", f"{i} of {total}: {v.strategy}")
        clip = render_variation(
            v, source, out_dir,
            fit=fit,
            watermark=opts.watermark,
            content_crop=content_crop,
        )
        clips.append(clip)
        if on_clip:
            on_clip(i - 1, clip, why)

    result = Result(
        source=source,
        transcript=transcript,
        visual=visual,
        brief=brief,
        plan=plan,
        clips=clips,
        content_crop=content_crop,
        wall_s=time.perf_counter() - started,
        warnings=notes,
    )

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "report.json").write_text(
        json.dumps(result.report(), indent=2, ensure_ascii=False), encoding="utf-8"
    )
    progress("ready")
    return result
