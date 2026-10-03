"""HTTP front for the pipeline, so the dashboard can drive it.

    cd spike && uvicorn api:app --port 8000 --reload

    POST /jobs              multipart: file, id?, captions?, watermark?
    GET  /jobs/{id}         stage, detail, planned slots, finished clips
    GET  /jobs              everything this server knows about
    GET  /clips/{id}/{file} the rendered mp4s and their poster frames

This is the production API in miniature: the same endpoints, the same job
shape, the same progressive reveal. What changes later is underneath --
Celery instead of a thread, R2 instead of a local folder, Supabase instead of
a JSON file per job. The dashboard will not notice.

Jobs run on a background thread and report through the pipeline's callbacks,
which is what lets the UI show "rendering 2 of 3" and reveal clips as they
land rather than all at once at the end.
"""

from __future__ import annotations

import json
import re
import threading
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from ffmpeg_tools import binary, run as ffrun
from pipeline import Options, refine as pipeline_refine, run
from plan import MAX_REFINES, REFINE_INTENTS
from render import RenderResult
from understand import Brief

JOBS_DIR = Path(__file__).resolve().parent / "jobs"
JOBS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="AdMultiply pipeline", version="0.1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_jobs: dict[str, dict] = {}
_lock = threading.Lock()

# What the customer reads while they wait. Written for a person, not a log.
DETAIL = {
    "queued": "Waiting for a worker…",
    "probing": "Reading your video…",
    "analyzing": "Watching the footage…",
    "transcribing": "Listening to every word…",
    "understanding": "Understanding the story…",
    "planning": "Writing three storylines…",
    "ready": "",
}

_SAFE_ID = re.compile(r"[^A-Za-z0-9_-]")


# --------------------------------------------------------------------------- #
# Job state
# --------------------------------------------------------------------------- #


def _path(job_id: str) -> Path:
    return JOBS_DIR / job_id


def _save(job: dict) -> None:
    p = _path(job["id"]) / "job.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(job, indent=2, ensure_ascii=False), encoding="utf-8")


def _update(job_id: str, **patch) -> None:
    with _lock:
        job = _jobs[job_id]
        job.update(patch)
        job["updated_at"] = time.time()
        _save(job)


def _public(job: dict) -> dict:
    """Never hand the source path or internal bits back to the browser."""
    return {k: v for k, v in job.items() if not k.startswith("_")}


def _load_existing() -> None:
    for p in JOBS_DIR.glob("*/job.json"):
        try:
            job = json.loads(p.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        # A job that was mid-flight when the server stopped is not coming back.
        if job.get("stage") not in ("ready", "failed"):
            job["stage"] = "failed"
            job["error"] = "The server restarted while this was processing. Please upload again."
        _jobs[job["id"]] = job


_load_existing()


# --------------------------------------------------------------------------- #
# Posters
# --------------------------------------------------------------------------- #


def _poster(clip: Path) -> Path | None:
    """One frame, half a second in, so the card has a picture before play."""
    out = clip.with_suffix(".jpg")
    try:
        ffrun([
            binary("ffmpeg"), "-y", "-v", "error",
            "-ss", "0.5", "-i", str(clip),
            "-frames:v", "1", "-q:v", "3",
            str(out),
        ])
        return out
    except RuntimeError:
        return None


def _version_entry(
    job_id: str, clip: RenderResult, why: dict, *, n: int, instruction: str | None
) -> dict:
    poster = _poster(clip.output)
    return {
        "n": n,
        "title": why.get("title", ""),
        "logline": why.get("logline", ""),
        "url": f"/clips/{job_id}/{clip.output.name}",
        "poster": f"/clips/{job_id}/{poster.name}" if poster else "",
        "duration_s": round(clip.duration, 2),
        "instruction": instruction,
    }


# --------------------------------------------------------------------------- #
# The worker
# --------------------------------------------------------------------------- #


def _run_job(job_id: str, source: Path, opts: Options) -> None:
    out_dir = _path(job_id)

    def progress(stage: str, detail: str) -> None:
        if stage == "rendering":
            n = detail.split(" of ")[0] if " of " in detail else "1"
            text = f"Rendering variation {n} of 3…"
        else:
            text = DETAIL.get(stage, detail)
        _update(job_id, stage=stage, detail=text)

    def on_plan(variations: list[dict], brief: Brief) -> None:
        _update(
            job_id,
            category=brief.format,
            product=brief.product,
            planned=[
                {"strategy": v["strategy"], "title": v["title"], "logline": v["logline"]}
                for v in variations
            ],
        )

    def on_clip(index: int, clip: RenderResult, why: dict) -> None:
        version = _version_entry(job_id, clip, why, n=1, instruction=None)
        entry = {
            "id": f"{job_id}_v{index}",
            "strategy": clip.strategy,
            "status": "ready",
            # Refines add versions rather than replacing the clip, so nothing
            # a customer liked is ever destroyed by asking for a change.
            "versions": [version],
            "active": 0,
            "refines_used": 0,
            **version,
        }
        with _lock:
            job = _jobs[job_id]
            job.setdefault("variations", []).append(entry)
            job["updated_at"] = time.time()
            _save(job)

    try:
        result = run(source, out_dir, opts, progress, on_plan=on_plan, on_clip=on_clip)
        _update(
            job_id,
            stage="ready",
            detail="",
            report=result.report(),
            warnings=result.warnings,
            finished_at=time.time(),
        )
    except Exception as e:  # noqa: BLE001 -- anything the pipeline raises is the job's failure reason
        _update(job_id, stage="failed", detail="", error=str(e), finished_at=time.time())


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #


@app.post("/jobs")
async def create_job(
    file: UploadFile = File(...),
    id: str = Form(""),
    captions: bool = Form(False),
    watermark: bool = Form(True),
) -> dict:
    job_id = _SAFE_ID.sub("", id)[:40] or f"job_{uuid.uuid4().hex[:10]}"
    if job_id in _jobs:
        raise HTTPException(409, f"Job {job_id} already exists")

    suffix = Path(file.filename or "upload.mp4").suffix.lower() or ".mp4"
    if suffix not in (".mp4", ".mov", ".m4v", ".avi", ".webm"):
        raise HTTPException(415, "Please upload an MP4, MOV or AVI")

    out_dir = _path(job_id)
    out_dir.mkdir(parents=True, exist_ok=True)
    source = out_dir / f"source{suffix}"
    with source.open("wb") as fh:
        while chunk := await file.read(1024 * 1024):
            fh.write(chunk)

    job = {
        "id": job_id,
        "stage": "queued",
        "detail": DETAIL["queued"],
        "file_name": file.filename or source.name,
        "created_at": time.time(),
        "options": {"captions": captions, "watermark": watermark},
        "category": None,
        "product": None,
        "planned": [],
        "variations": [],
        "warnings": [],
        "error": None,
        "_source": str(source),
    }
    with _lock:
        _jobs[job_id] = job
        _save(job)

    opts = Options(
        visual=True,
        captions=captions,
        watermark="AdMultiply" if watermark else None,
    )
    threading.Thread(target=_run_job, args=(job_id, source, opts), daemon=True).start()
    return _public(job)


class RefineRequest(BaseModel):
    intent: str = ""
    note: str = ""


def _run_refine(job_id: str, index: int, intent: str, note: str) -> None:
    job = _jobs[job_id]
    variation = job["variations"][index]
    angle = variation["strategy"]
    n = len(variation["versions"]) + 1

    def touch(**patch) -> None:
        with _lock:
            variation.update(patch)
            job["updated_at"] = time.time()
            _save(job)

    try:
        outcome = pipeline_refine(
            Path(job["_source"]),
            _path(job_id),
            angle,
            intent=intent,
            note=note,
            version=n,
            opts=Options(
                visual=True,
                captions=job["options"].get("captions", False),
                watermark="AdMultiply" if job["options"].get("watermark", True) else None,
            ),
        )
    except Exception as e:  # noqa: BLE001 -- any failure is this refine's failure
        touch(status="ready", refine_error=str(e))
        return

    version = _version_entry(
        job_id, outcome.clip, outcome.reasoning,
        n=n, instruction=note.strip() or intent or "changed",
    )
    with _lock:
        variation["versions"].append(version)
        variation["active"] = len(variation["versions"]) - 1
        variation["refines_used"] = variation.get("refines_used", 0) + 1
        variation["status"] = "ready"
        variation["refine_error"] = None
        variation.update(version)  # top-level mirrors the active version
        job["updated_at"] = time.time()
        _save(job)


@app.post("/jobs/{job_id}/variations/{index}/refine")
def refine_variation(job_id: str, index: int, req: RefineRequest) -> dict:
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "No such job")
    if job["stage"] != "ready":
        raise HTTPException(409, "This job is still processing")
    if index < 0 or index >= len(job.get("variations", [])):
        raise HTTPException(404, "No such variation")

    variation = job["variations"][index]
    if variation.get("status") == "refining":
        raise HTTPException(409, "Already refining this one")
    if variation.get("refines_used", 0) >= MAX_REFINES:
        raise HTTPException(
            429, f"This variation has been refined {MAX_REFINES} times, the limit"
        )
    if req.intent and req.intent not in REFINE_INTENTS:
        raise HTTPException(400, f"Unknown intent {req.intent!r}")
    if not req.intent and not req.note.strip():
        raise HTTPException(400, "Say what to change")

    with _lock:
        variation["status"] = "refining"
        variation["refine_error"] = None
        job["updated_at"] = time.time()
        _save(job)

    threading.Thread(
        target=_run_refine, args=(job_id, index, req.intent, req.note), daemon=True
    ).start()
    return _public(job)


@app.post("/jobs/{job_id}/variations/{index}/version/{n}")
def set_active_version(job_id: str, index: int, n: int) -> dict:
    """Switch which version of a variation is the live one."""
    job = _jobs.get(job_id)
    if not job or index >= len(job.get("variations", [])):
        raise HTTPException(404, "No such variation")
    variation = job["variations"][index]
    picked = next((v for v in variation["versions"] if v["n"] == n), None)
    if picked is None:
        raise HTTPException(404, "No such version")
    with _lock:
        variation["active"] = variation["versions"].index(picked)
        variation.update(picked)
        job["updated_at"] = time.time()
        _save(job)
    return _public(job)


@app.get("/refine-options")
def refine_options() -> dict:
    """What the UI offers as quick actions. Served so the two can't drift."""
    return {"max_refines": MAX_REFINES, "intents": REFINE_INTENTS}


@app.get("/jobs/{job_id}")
def get_job(job_id: str) -> dict:
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "No such job")
    return _public(job)


@app.get("/jobs")
def list_jobs() -> list[dict]:
    return sorted((_public(j) for j in _jobs.values()), key=lambda j: -j["created_at"])


@app.get("/health")
def health() -> dict:
    return {"ok": True, "jobs": len(_jobs)}


app.mount("/clips", StaticFiles(directory=str(JOBS_DIR)), name="clips")
