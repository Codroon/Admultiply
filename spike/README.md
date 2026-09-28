# Pipeline spike — complete

De-risking the one genuinely unknown part of AdMultiply: **can we turn one
60–120s ad into three vertical micro-ads a marketer would actually run?**

**Answer: yes.** Validated on a real client ad. Auth, billing and queues are
known problems; this wasn't, so it was built and tested first — standalone, no
FastAPI, no Celery, no database.

```
video.mp4
   ↓  ffprobe        duration, resolution, codec, audio
   ↓  bar detection  strip baked-in letterbox/pillarbox
   ↓  TwelveLabs     what is SEEN: framing, on-screen text, moments
   ↓  Whisper-1      what is SAID: transcript + word timings
   ↓  beat splitting our code: cut the script into clauses
   ↓  GPT-4o Mini    UNDERSTAND: the brief — product, arc, moments, angles
   ↓  GPT-4o Mini    STORYLINES: one cut per angle, composed from moments
   ↓  FFmpeg         cut, bridge, reframe 9:16, fade, encode
3 clips + report.json
```

The AI never touches the video file. It reads text and returns moment ids;
FFmpeg does all the video work. That's why it costs about a cent and takes
under a minute.

Planning is two passes on purpose. The first reads the transcript and the
visual analysis together and writes a brief a strategist would recognise:
what's being sold, the narrative arc, the ad broken into **moments** (each
rated as an opener, each noting what's on screen), and which three angles
this particular ad can support. The second composes one storyline per angle
from those moments — the way an editor thinks, rather than picking clauses
off a list. Distinctness is enforced in code: openings must be different
shots at least ~10s apart in the source, and cuts may share at most one
moment beyond that.

## Setup

```bash
winget install Gyan.FFmpeg     # ffmpeg 9.x
python --version               # 3.11+
```

No Python dependencies — standard library only, so this stays clone-and-run.
Keys live in `.env.local` at the repo root (gitignored):

```
OPENAI_API_KEY=...
TWELVELABS_API_KEY=...
```

## Running from the command line

```bash
python spike/run_pipeline.py <video>                  # full pipeline
python spike/run_pipeline.py <video> --watermark      # free-tier preview
python spike/run_pipeline.py <video> --captions on    # burn our captions
python spike/run_pipeline.py <video> --visual off     # skip TwelveLabs
python spike/run_pipeline.py <video> --replan         # new storylines, cached brief
python spike/run_pipeline.py <video> --rebrief        # new brief + storylines
```

Output and `report.json` land in `spike/output/`.

## Running with the dashboard

Two servers. The pipeline API needs `fastapi` and `uvicorn`:

```bash
pip install fastapi "uvicorn[standard]" python-multipart

# terminal 1 — the pipeline API
cd spike && uvicorn api:app --port 8000

# terminal 2 — the dashboard
npm run dev
```

With `NEXT_PUBLIC_PIPELINE_URL=http://localhost:8000` in `.env.local`, the
dashboard at http://localhost:3000/dashboard uploads to the real pipeline:
the stepper reports live stages, the three slots are named as soon as
planning finishes, and clips appear one by one as each render lands. Remove
the variable and the dashboard falls back to the simulated demo.

The API is the production shape in miniature — same endpoints, same job
JSON, same progressive reveal. Jobs and their clips live in `spike/jobs/`.

| Endpoint | |
|---|---|
| `POST /jobs` | multipart `file`, optional `id`, `captions`, `watermark` |
| `GET /jobs/{id}` | stage, human-readable detail, planned slots, finished clips |
| `GET /clips/{id}/{file}` | the rendered mp4s and their poster frames |

## Files

| File | Role |
|---|---|
| `edl.py` | **The contract** — what planning must produce, and its validation |
| `pipeline.py` | `run()` — the whole pipeline as a function with progress callbacks |
| `api.py` | FastAPI wrapper over `run()`; what the dashboard talks to |
| `run_pipeline.py` | CLI wrapper over `run()` |
| `understand.py` | Planning pass 1 — the brief: moments, angles, **the strategist prompt** |
| `plan.py` | Planning pass 2 — storylines from moments, guardrails, **the editor prompt** |
| `analyze.py` | TwelveLabs visual analysis |
| `transcribe.py` | Whisper + beat reconstruction |
| `ffmpeg_tools.py` | Binary discovery, probing, letterbox detection |
| `render.py` | Filter graph, ASS captions, fades, encode |
| `net.py` | Dependency-free HTTP with retries |
| `config.py` | Env loading and the fingerprint cache |

## Measured results

On a 55s client ad (collagen supplement, talking head, already 9:16):

| Stage | Cost | Time |
|---|---:|---:|
| TwelveLabs analysis | $0.0650 | 76s |
| Whisper transcription | $0.0055 | 6s |
| GPT-4o Mini planning (×3) | $0.0006 | 6s |
| FFmpeg render (×3) | ~$0.0030 | 40s |
| **Total** | **~$0.074** | **~2 min** |

Extrapolated to a 90s video: **~$0.12 against the $0.15 modelled.** TwelveLabs
is 88% of it, exactly as the cost model predicted. Every plan margin holds.

Output: 1080×1920, 30fps, yuv420p, AAC 128k, `+faststart`.

## The bar, and whether we met it

Agreed before looking at any output, so we couldn't rationalise a bad result:

- ✅ **At least 1 of 3 runnable without editing** — client confirmed
- ✅ No mid-word cuts, no cropped faces, captions in sync
- ✅ Under ~3 minutes per video
- ✅ Under ~$0.20 measured

## What we learned that changes the plan

**1. Real creative is full of baked-in bars.** One test source was a 9:16 video
exported inside a 1280×720 landscape box. Reframing without stripping the bars
nests a tiny picture in black inside a blurred backdrop. `detect_content_crop()`
handles it, unioned across five sample points so it never eats real content —
and it correctly refuses on sources that composite name cards or logos onto the
bars, because those are real pixels.

**2. Crop vs blur cannot be one global setting.** Talking heads want crop;
screen recordings and text-heavy ads are destroyed by it. TwelveLabs makes this
call per video now, which is most of what justifies its cost.

**3. Most ad creative already carries burned-in captions.** Ours stacked a
near-duplicate underneath and looked amateurish. TwelveLabs detects it, so
`--captions auto` decides per video.

**4. Cutting on word boundaries is not enough.** It stops you slicing a word in
half but not a sentence. The first clips felt torn because a cut at 6.3s–14.2s
started mid-sentence and ended mid-sentence. Fixed by removing the model's
ability to emit timestamps at all — it picks numbered beats instead.

**5. Sentences alone are too coarse.** Real ad copy runs 9–13s sentences, so
"pick two" can only produce 20–25s, and the punchy 4s hook buried in a
sentence's final clause is unreachable. Splitting on clauses gave 13 choices
instead of 6, and the model immediately found the hook.

**6. Three things make a clip feel finished** rather than extracted: padding
into the silence either side, short audio fades at every splice, and a fade in
and out. The audio fades matter most — the ear hears a hard join before the eye
sees one.

## Two model-wrangling findings

Both cost a round of debugging and both will recur in production.

**Strict JSON schema cannot enforce array length.** There is no `minItems`.
Asked for "an array of exactly three variations", gpt-4o-mini reliably returned
one, and repair rounds saying so did not fix it. Naming three required fields
makes the correct shape the only representable shape.

**A small model cannot hold a global constraint across simultaneous outputs.**
Asked for three variations that must not overlap, it kept opening two on the
strongest beat — even when the error named the offender. Generating one per
call, each told which openings are taken, removes the need to hold the
constraint. Same cost, succeeds first try.

## The open question for production

TwelveLabs is 88% of per-video cost. On this talking-head ad it barely changed
which beats were picked — its value was the framing decision and detecting
on-screen text.

That points at running it **selectively** rather than universally: landscape
sources, where the framing call matters, and sources with sparse speech, where
there is nothing to cut on. If half of uploads can skip it, average cost drops
from ~$0.12 to ~$0.07 per video and every margin improves.

Worth measuring on a montage-style ad with little dialogue before deciding.

## Carrying this into the backend

- `edl.py` is the contract the Celery render task consumes unchanged.
- The fingerprint cache becomes the `analyse-once-reuse` rule the cost model
  depends on — TwelveLabs re-bills full video minutes on every call.
- Every API response carries usage; those become the `api_usage` rows the admin
  panel needs (see `docs/backend-architecture.md` §6). If they aren't written at
  pipeline time, cost-per-video is unrecoverable.
