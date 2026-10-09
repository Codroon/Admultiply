# Pipeline spike, complete

De-risking the one genuinely unknown part of AdMultiply: **can we turn one
60 to 120s ad into three vertical micro-ads a marketer would actually run?**

**Answer: yes.** Validated on a real client ad. Auth, billing and queues are
known problems; this wasn't, so it was built and tested first, standalone, no
FastAPI, no Celery, no database.

```
video.mp4
   ↓  ffprobe        duration, resolution, codec, audio
   ↓  bar detection  strip baked-in letterbox/pillarbox
   ↓  TwelveLabs     what is SEEN: framing, on-screen text, moments
   ↓  Whisper-1      what is SAID: transcript + word timings
   ↓  beat splitting our code: cut the script into clauses
   ↓  GPT-4o Mini    UNDERSTAND: the brief, product, arc, moments, angles
   ↓  GPT-4o Mini    STORYLINES: one cut per angle, composed from moments
   ↓  FFmpeg         cut, bridge, reframe 9:16, fade, encode
3 clips + report.json
```

The AI never touches the video file. It reads text and returns moment ids;
FFmpeg does all the video work. That's why it costs about a cent and takes
under a minute.

**Ads with no dialogue take a different path.** After transcription the
pipeline classifies the speech, `speech`, `sparse`, or `none`, by how much
of the runtime has words in it. A voiceover ad cuts on word boundaries. A
silent or music-only ad (a product montage, motion graphics, a before/after
with a soundtrack) has nothing to cut on, so it cuts on **scene changes**
instead: the moments come from what TwelveLabs *sees* rather than what
Whisper *hears*, the brief recommends visual angles (Before → After, How it
works, Feature spotlight), and any stretch the analysis left undescribed is
sliced into shots at its scene cuts so the planner can still reach it. This
is the case where visual analysis is load-bearing rather than a nice-to-have;
without it, a silent ad fails with a clear message instead of a hallucinated
transcript.

Planning is two passes on purpose. The first reads the transcript and the
visual analysis together and writes a brief a strategist would recognise:
what's being sold, the narrative arc, the ad broken into **moments** (each
rated as an opener, each noting what's on screen), and which three angles
this particular ad can support. The second composes one storyline per angle
from those moments, the way an editor thinks, rather than picking clauses
off a list. Distinctness is enforced in code: openings must be different
shots at least ~10s apart in the source, and cuts may share at most one
moment beyond that.

## Setup

```bash
winget install Gyan.FFmpeg     # ffmpeg 9.x
python --version               # 3.11+
```

The pipeline itself uses the standard library only, so the command line
scripts are clone-and-run. The API that the dashboard talks to needs a web
framework, listed in `requirements.txt`. Keys live in `.env.local` at the repo
root (gitignored):

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

Two servers. The pipeline API needs the packages in `requirements.txt`:

```bash
pip install -r spike/requirements.txt

# terminal 1, the pipeline API
cd spike && uvicorn api:app --port 8000

# terminal 2, the dashboard
npm run dev
```

With `NEXT_PUBLIC_PIPELINE_URL=http://localhost:8000` in `.env.local`, the
dashboard at http://localhost:3000/dashboard uploads to the real pipeline:
the stepper reports live stages, the three slots are named as soon as
planning finishes, and clips appear one by one as each render lands. Remove
the variable and the dashboard falls back to the simulated demo.

The API is the production shape in miniature, same endpoints, same job
JSON, same progressive reveal. Jobs and their clips live in `spike/jobs/`.

| Endpoint | |
|---|---|
| `POST /jobs` | multipart `file`, optional `id`, `captions`, `watermark` |
| `GET /jobs/{id}` | stage, human-readable detail, planned slots, finished clips |
| `GET /clips/{id}/{file}` | the rendered mp4s and their poster frames |
| `GET /health` | 200 when this instance can take a job, 503 and the failing check when not |

## Deploying

The API runs on Railway from the `Dockerfile` in this folder. Everything that
differs between a laptop and a server is an environment variable, and every
one has a default that keeps local development working unchanged.

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | yes | planning and transcription |
| `TWELVELABS_API_KEY` | yes | visual understanding |
| `ALLOWED_ORIGINS` | yes | comma separated origins the dashboard is served from. A `*` matches one label, so `https://admultiply-*-mujtaba-s-projects6.vercel.app` covers every Vercel preview build |
| `DATA_DIR` | set by the image | where jobs and the analysis cache live; mount the volume here |
| `MAX_UPLOAD_MB` | no | largest source accepted, default 500 |
| `MAX_CONCURRENT_JOBS` | no | jobs processed at once, the rest queue, default 2 |
| `MAX_JOBS_PER_HOUR` | no | uploads accepted per rolling hour, default 30 |
| `FFMPEG_THREADS` | set by the image | threads per render; unset means FFmpeg chooses |

**Sizing.** The image defaults to `FFMPEG_THREADS=2` and `MAX_CONCURRENT_JOBS=1`,
which fits Railway's trial (1 GB of memory). Measured on a real three cut job:
with FFmpeg choosing its own thread count, one render peaked at 913 MB on a 12
thread machine, and inside a container it sees the host's CPUs rather than the
service's share, so it would do the same there. Capped at 2 threads it peaks at
551 MB, 609 MB with the API, and the job takes 83s instead of 33s. On a plan
with more memory, raise both.

Railway settings that cannot live in `railway.json`:

- **Root Directory** `spike`
- **Config file path** `/spike/railway.json`. Railway does not look inside the
  root directory for it; the path is absolute from the repo root.
- **Volume** mounted at `/data`. Without one, jobs and clips vanish on every
  redeploy, and so does the cache that makes a refine nearly free.

`railway.json` sets the build to the Dockerfile, the health check to `/health`,
and the watch path to `/spike/**`, so a push that only touches the dashboard
does not restart the pipeline. A restart fails any job that was mid render,
with a message telling the customer to upload again.

Two things the image depends on and would be easy to break:

- **Fonts ship in `fonts/`, not from the system.** Captions and the burned in
  watermark are drawn by libass, which needs the face as a file. They used to
  name Arial, which exists on Windows and nowhere else. `render.py` copies the
  bundled font into each job folder and points libass at it.
- **The free plan watermark is an image, `assets/watermark.png`**: the logo
  and wordmark on a translucent capsule, laid over the picture by FFmpeg. Its
  source is `assets/watermark.html`, with notes on regenerating it. If the
  image is missing the renderer falls back to a text watermark rather than
  shipping a free render with none.
- **The API has no login yet**, so uploads are capped per hour and in size.
  Lift the caps when accounts arrive, not before.

## Files

| File | Role |
|---|---|
| `edl.py` | **The contract**, what planning must produce, and its validation |
| `pipeline.py` | `run()`, the whole pipeline as a function with progress callbacks |
| `api.py` | FastAPI wrapper over `run()`; what the dashboard talks to |
| `run_pipeline.py` | CLI wrapper over `run()` |
| `understand.py` | Planning pass 1, the brief: moments, angles, **the strategist prompt** |
| `plan.py` | Planning pass 2, storylines from moments, guardrails, **the editor prompt** |
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

- ✅ **At least 1 of 3 runnable without editing**, client confirmed
- ✅ No mid-word cuts, no cropped faces, captions in sync
- ✅ Under ~3 minutes per video
- ✅ Under ~$0.20 measured

## What we learned that changes the plan

**1. Real creative is full of baked-in bars.** One test source was a 9:16 video
exported inside a 1280×720 landscape box. Reframing without stripping the bars
nests a tiny picture in black inside a blurred backdrop. `detect_content_crop()`
handles it, unioned across five sample points so it never eats real content, 
and it correctly refuses on sources that composite name cards or logos onto the
bars, because those are real pixels.

**2. Crop vs blur cannot be one global setting.** Talking heads want crop;
screen recordings and text-heavy ads are destroyed by it. TwelveLabs makes this
call per video now, which is most of what justifies its cost.

**3. Most ad creative already carries burned-in captions.** Ours stacked a
near-duplicate underneath and looked amateurish. TwelveLabs detects it, so
`--captions auto` decides per video.

**4. Cutting on word boundaries is not enough.** It stops you slicing a word in
half but not a sentence. The first clips felt torn because a cut at 6.3s to 14.2s
started mid-sentence and ended mid-sentence. Fixed by removing the model's
ability to emit timestamps at all, it picks numbered beats instead.

**5. Sentences alone are too coarse.** Real ad copy runs 9 to 13s sentences, so
"pick two" can only produce 20 to 25s, and the punchy 4s hook buried in a
sentence's final clause is unreachable. Splitting on clauses gave 13 choices
instead of 6, and the model immediately found the hook.

**6. Three things make a clip feel finished** rather than extracted: padding
into the silence either side, short audio fades at every splice, and a fade in
and out. The audio fades matter most, the ear hears a hard join before the eye
sees one.

## Two model-wrangling findings

Both cost a round of debugging and both will recur in production.

**Strict JSON schema cannot enforce array length.** There is no `minItems`.
Asked for "an array of exactly three variations", gpt-4o-mini reliably returned
one, and repair rounds saying so did not fix it. Naming three required fields
makes the correct shape the only representable shape.

**A small model cannot hold a global constraint across simultaneous outputs.**
Asked for three variations that must not overlap, it kept opening two on the
strongest beat, even when the error named the offender. Generating one per
call, each told which openings are taken, removes the need to hold the
constraint. Same cost, succeeds first try.

## The open question for production

TwelveLabs is 88% of per-video cost. On this talking-head ad it barely changed
which beats were picked, its value was the framing decision and detecting
on-screen text.

That points at running it **selectively** rather than universally: landscape
sources, where the framing call matters, and sources with sparse speech, where
there is nothing to cut on. If half of uploads can skip it, average cost drops
from ~$0.12 to ~$0.07 per video and every margin improves.

Worth measuring on a montage-style ad with little dialogue before deciding.

## Carrying this into the backend

- `edl.py` is the contract the Celery render task consumes unchanged.
- The fingerprint cache becomes the `analyse-once-reuse` rule the cost model
  depends on, TwelveLabs re-bills full video minutes on every call.
- Every API response carries usage; those become the `api_usage` rows the admin
  panel needs (see `docs/backend-architecture.md` §6). If they aren't written at
  pipeline time, cost-per-video is unrecoverable.
