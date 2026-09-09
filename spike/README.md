# Pipeline spike

De-risking the one genuinely unknown part of AdMultiply: **can we turn one
60–120s ad into three vertical micro-ads a marketer would actually run?**

Auth, billing and queues are known problems. This isn't. So it gets built and
tested first, standalone — no FastAPI, no Celery, no database.

```
video.mp4
   ↓  ffprobe        duration, resolution, codec, audio          OK step 1
   ↓  bar detection  strip baked-in letterbox/pillarbox          OK step 1
   ↓  TwelveLabs     visual analysis → framing, text, moments    OK step 2
   ↓  Whisper-1      transcript with word-level timestamps       OK step 3
   ↓  GPT-4o Mini    edit plan (EDL)                             OK step 4
   ↓  FFmpeg         cut, reframe 9:16, caption, encode          OK step 1
3 clips + cost report
```

## Setup

```bash
winget install Gyan.FFmpeg        # ffmpeg 9.x; restart the terminal after
python --version                  # 3.11+
```

No Python dependencies for step 1 — standard library only.

## Running

```bash
python spike/run_render.py <video>                    # placeholder EDL
python spike/run_render.py <video> --fit both         # compare reframing
python spike/run_render.py <video> --watermark        # free-tier preview
python spike/run_render.py <video> --edl plan.json    # a real edit plan
```

Output lands in `spike/output/`.

## Files

| File | Role |
|---|---|
| `ffmpeg_tools.py` | Binary discovery, probing, letterbox detection |
| `edl.py` | **The EDL contract** — schema, validation, source→output time remap |
| `render.py` | Filter graph, ASS captions, encode |
| `run_render.py` | Step 1 entry point |

`edl.py` is the important one. It's the interface between the model and the
renderer, and it's what step 4 has to satisfy.

---

## Step 1 results

Render path works end to end. Verified on real footage, not synthetic input.

**Output is correct:** 1080×1920, 30fps, yuv420p, AAC 128k, `+faststart`.
Captions and watermark burn in cleanly and are legible at phone size.

**Speed: 0.33–0.6× realtime.** A 15s clip renders in 5–9s on this laptop, so
three variations land in well under a minute. Comfortably inside the ~3 minute
per-video budget, and that's before a proper worker box.

### Three findings that change the plan

**1. Real creative is full of baked-in bars — and you can't always strip them.**

One test source was a 9:16 video exported inside a 1280×720 landscape box.
Reframing without stripping the bars first gives you a tiny picture nested in
black nested in a blurred backdrop. `detect_content_crop()` handles the normal
case, but that particular file had a name card, burned-in captions and a HeyGen
logo composited *onto* the black bars, so detection correctly refused to crop
them away — they're real pixels.

Detection is deliberately conservative (union across five sample points) so it
never eats real content. Sources with graphics in the bars stay imperfect.

**2. Crop vs blur cannot be one global setting.**

- Talking head, subject centred → **crop wins.** Full-bleed and punchy.
- Screen recording or text-heavy ad → **crop is unusable.** It guillotines text
  on both edges. Blur-pad is mandatory.

This has to be decided per video. Conveniently, TwelveLabs' scene analysis in
step 2 already describes the content well enough to make that call — so the
choice becomes part of the edit plan rather than a config flag.

**3. Sources often already have burned-in captions.** Ours then collide with
theirs, and crop slices theirs in half. Step 4 needs to detect existing on-screen
text and either skip our captions or reposition them.

### Design decisions worth keeping

- **One ffmpeg invocation per variation.** trim → concat → debar → reframe →
  caption → encode, as a single `filter_complex`. No intermediate files, no
  double encode.
- **All EDL times are source time.** The model reasons about a transcript in
  source time; making it do output-time arithmetic is just another chance to be
  wrong. `remap_captions()` handles the conversion.
- **Validation returns strings, not exceptions.** In step 4 those go straight
  back to the model for one retry — far cheaper than a failed render.
- **Text goes through ASS, not `drawtext`.** libass handles font fallback and
  outlines properly and dodges `drawtext`'s fontconfig dependency, a common
  Windows failure. The watermark rides the same path.

---

## Next: steps 2–4

Blocked on two keys:

- **TwelveLabs** — free tier, 600 minutes, no card required. ~400 ads' worth.
- **OpenAI** — the account is funded; we need the key itself.

When they land, the one non-obvious thing to build is **caching keyed by file
hash**. We'll iterate on the prompt twenty-plus times to get the clips good; if
each pass re-indexes the video we burn the free minutes in an afternoon and
learn nothing. Index once, cache to disk, then iterate against the part that
costs a fraction of a cent.

That also validates the production "analyse once, reuse" decision the cost model
depends on — TwelveLabs re-bills full video minutes on every call, so it's a 2×
cost swing.

## The bar

Agreed before looking at output, so we can't rationalise a bad result:

- **At least 1 of the 3 is runnable without editing.** Not three. One.
- No cuts mid-word, no cropped-off faces, captions in sync.
- Under ~3 minutes per video. *(Render alone: comfortably met.)*
- Under ~$0.20 measured, against a $0.15 estimate.
