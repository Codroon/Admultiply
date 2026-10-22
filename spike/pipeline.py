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
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from analyze import VisualAnalysis, analyze
from config import cache_read, cache_write, file_fingerprint, load_env
from edl import validate, warnings
from ffmpeg_tools import ContentCrop, SourceInfo, detect_content_crop, detect_scene_cuts, probe
from net import ApiError
from plan import PlanResult, make_plan, refine_storyline
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


def _render_workers() -> int:
    """How many cuts to render at once, from RENDER_WORKERS. Default 2.

    Measured, 16s cuts at 1080x1920 on the veryfast preset with 2 threads each:

        1 at a time    21s total (3 x 7s)   263 MB peak
        2 at a time    ~14s                 ~525 MB peak
        3 at a time    10.2s                786 MB peak

    Each render is a subprocess, so threads here only wait on them and the
    interpreter lock is not a factor. The ceiling is memory: three at once plus
    the API is about 850 MB, which fits a 1 GB container with little to spare
    and leaves nothing for a larger source. Two is the default because it takes
    most of the gain for two thirds of the memory; raise it where there is room.
    """
    raw = os.environ.get("RENDER_WORKERS", "").strip()
    return max(1, int(raw)) if raw.isdigit() else 2


class StageClock:
    """Seconds spent in each stage, accumulated as the pipeline moves.

    The client's first complaint about the deployed product was that it takes
    too long, and nothing recorded where the time went, so the only honest
    answer was a guess. Every stage change passes through `mark`, repeated
    stages accumulate rather than overwrite (rendering is announced once per
    cut), and the result rides along in the report. Costs nothing and means the
    next speed question is answered with a measurement.
    """

    def __init__(self) -> None:
        self._totals: dict[str, float] = {}
        self._stage: str | None = None
        self._since = time.perf_counter()

    def mark(self, stage: str) -> None:
        now = time.perf_counter()
        if self._stage and stage != self._stage:
            self._totals[self._stage] = self._totals.get(self._stage, 0.0) + (now - self._since)
            self._since = now
        elif self._stage is None:
            self._since = now
        self._stage = stage

    def close(self) -> dict[str, float]:
        self.mark("__done__")
        return {k: round(v, 2) for k, v in self._totals.items()}


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
    stage_seconds: dict[str, float] = field(default_factory=dict)

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
            "stage_seconds": self.stage_seconds,
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


@dataclass
class RefineOutcome:
    clip: RenderResult
    reasoning: dict
    cost_usd: float
    seconds_taken: float


def refine(
    video: Path,
    out_dir: Path,
    angle: str,
    *,
    intent: str = "",
    note: str = "",
    version: int = 2,
    opts: Options | None = None,
    on_progress: Progress | None = None,
) -> RefineOutcome:
    """Re-cut one variation to a customer instruction.

    Everything describing the *ad* is reused from cache -- the visual analysis,
    the transcript, the brief, the other two storylines. Only the one storyline
    is re-planned and the one clip re-rendered, which is why this costs about a
    fiftieth of a fresh upload and finishes in seconds rather than a minute.
    """
    opts = opts or Options()
    env = load_env()
    openai_key = env.get("OPENAI_API_KEY", "")
    if not openai_key:
        raise RuntimeError("OPENAI_API_KEY is not set in .env.local")

    def progress(stage: str, detail: str = "") -> None:
        if on_progress:
            on_progress(stage, detail)

    started = time.perf_counter()
    source = probe(video)
    crop = detect_content_crop(source)
    content_crop = crop if crop and crop.is_significant(source) else None

    visual = None
    if opts.visual and env.get("TWELVELABS_API_KEY"):
        try:
            visual = analyze(source, env["TWELVELABS_API_KEY"])
        except (ApiError, RuntimeError, TimeoutError):
            visual = None

    transcript = transcribe(source, openai_key)
    scene_cuts: list[float] = []
    if transcript.mode != "speech":
        fp = file_fingerprint(source.path)
        cached = cache_read(fp, "scenes")
        scene_cuts = cached["cuts"] if cached else detect_scene_cuts(source)
    brief = understand(
        source, transcript, openai_key,
        visual=visual.for_prompt() if visual else "",
        scene_cuts=scene_cuts,
    )

    # The existing plan, from cache. Gives us what this cut chose last time and
    # what the other two use, so the revision stays distinct from them.
    plan = make_plan(source, transcript, brief, openai_key)
    current: dict | None = None
    others: list[dict] = []
    for why in plan.reasoning["variations"]:
        shaped = {
            "title": why.get("title", ""),
            "logline": why.get("logline", ""),
            "reframe": why.get("reframe", "crop"),
            "sequence": [
                {"moment": m["id"], "why": m.get("why", "")} for m in why.get("moments", [])
            ],
        }
        if why["strategy"] == angle:
            current = shaped
        else:
            others.append({"angle": why["strategy"], "moments": why.get("used", [])})

    if current is None:
        raise RuntimeError(f"No existing cut for angle {angle!r} to refine.")

    progress("planning", "rewriting the cut")
    result = refine_storyline(
        source, transcript, brief, angle, current, openai_key,
        intent=intent, note=note, others=others,
    )

    if not opts.captions:
        result.variation.captions = []

    progress("rendering", "1 of 1")
    fit = result.reasoning["reframe"] if opts.fit == "auto" else opts.fit
    clip = render_variation(
        result.variation, source, out_dir,
        fit=fit,
        watermark=opts.watermark,
        content_crop=content_crop,
        suffix=f"v{version}",
    )
    progress("ready")
    return RefineOutcome(
        clip=clip,
        reasoning=result.reasoning,
        cost_usd=result.cost_usd,
        seconds_taken=time.perf_counter() - started,
    )


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

    clock = StageClock()

    def progress(stage: str, detail: str = "") -> None:
        clock.mark(stage)
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
    #
    # The cuts are independent, so they render together rather than one after
    # another. Two things this has to keep straight:
    #
    #   * `on_clip` carries the slot index, and a cut that finishes second may
    #     belong in slot three. Anything storing these has to place by index,
    #     not append, or the dashboard labels a cut with another one's angle.
    #   * `progress` is called from worker threads, so it reports how many are
    #     done rather than which one is running; "2 of 3" was only meaningful
    #     while they were sequential.
    total = len(plan.edl.variations)
    pairs = list(zip(plan.edl.variations, plan.reasoning["variations"]))
    results: list[RenderResult | None] = [None] * total
    finished = 0
    progress("rendering", f"0 of {total}")

    def render_one(index: int) -> None:
        v, why = pairs[index]
        fit = why["reframe"] if opts.fit == "auto" else opts.fit
        results[index] = render_variation(
            v, source, out_dir,
            fit=fit,
            watermark=opts.watermark,
            content_crop=content_crop,
        )

    workers = min(_render_workers(), total) or 1
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(render_one, i): i for i in range(total)}
        for future in as_completed(futures):
            index = futures[future]
            future.result()  # re-raise inside the pipeline, as a sequential loop would
            finished += 1
            progress("rendering", f"{finished} of {total}")
            clip = results[index]
            if on_clip and clip is not None:
                on_clip(index, clip, pairs[index][1])

    clips: list[RenderResult] = [c for c in results if c is not None]

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
        stage_seconds=clock.close(),
    )

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "report.json").write_text(
        json.dumps(result.report(), indent=2, ensure_ascii=False), encoding="utf-8"
    )
    progress("ready")
    return result
