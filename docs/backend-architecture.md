# AdMultiply — Backend Architecture & The Self-Improving AI Loop

*How the system works, what it learns from every video, and why it compounds into a defensible advantage.*

---

## 1. Executive summary

AdMultiply's backend is a **video intelligence pipeline wrapped around a data flywheel**.

The pipeline does one job extremely well: take one winning 1-minute+ video ad, understand *why* it works, and generate three high-converting micro variations in seconds — fully automated, no editing.

But the architecture's real design goal is the second layer: **every video processed teaches the system.** Each upload adds to a proprietary dataset of winning-ad structures — what hooks work, in which categories, validated by real user choices. The AI's output quality scales with the size of that archive. Competitors can copy the features in months; they cannot copy the accumulated dataset, and the gap widens with every upload.

One pipeline. Two products: the video tool the customer sees, and the learning engine underneath it.

---

## 2. System architecture

```
                        ┌────────────────────────────┐
                        │   NEXT.JS WEB APP (Vercel) │
                        │  upload · preview · billing │
                        └─────────────┬──────────────┘
                                      │ REST + presigned upload URLs
                        ┌─────────────▼──────────────┐
                        │     FASTAPI BACKEND         │
                        │ auth · jobs · webhooks ·    │
                        │ token ledger · rate limits  │
                        └───┬──────────────────┬─────┘
                   enqueue  │                  │  read / write
              ┌─────────────▼───────┐   ┌──────▼──────────────────┐
              │   REDIS + CELERY    │   │   SUPABASE POSTGRES     │
              │  analyze queue (I/O)│   │  users · videos · jobs  │
              │  render queue (CPU) │   │  variations · tokens ·  │
              └─────────────┬───────┘   │  events · ai_metadata   │
                            │           │  + pgvector embeddings  │
                            │           └──────▲──────────────────┘
              ┌─────────────▼───────────────┐  │ every step writes back
              │      AI PIPELINE (async)     │──┘
              │  TwelveLabs → Whisper →      │
              │  GPT-4o Mini → FFmpeg        │
              └─────────────┬───────────────┘
                            │ store clips
              ┌─────────────▼───────────────┐
              │  CLOUDFLARE R2 object store  │→ watermarked previews
              │  (zero-egress delivery)      │→ HD downloads (paid)
              └─────────────────────────────┘

   ANALYTICS LAYER (reads from everything, powers decisions + investor metrics)
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │   PostHog    │  │   Metabase   │  │    Stripe    │
   │ behaviour /  │  │ BI dashboards│  │ MRR · churn ·│
   │ funnels      │  │ on Postgres  │  │ LTV          │
   └──────────────┘  └──────────────┘  └──────────────┘
```

**Component roles, one line each:**

| Component | Role |
|---|---|
| **FastAPI** (Python) | The brain's front door — auth, job orchestration, billing webhooks, token ledger |
| **Celery + Redis** | Async job engine; two queues so a heavy render never blocks an upload |
| **Supabase Postgres** | Single source of truth — every user, video, job, choice, and embedding |
| **TwelveLabs** | Video understanding — scenes, hooks, product moments, emotional beats |
| **Whisper** | Word-level timestamped transcription — enables cutting on speech boundaries |
| **GPT-4o Mini** | Creative reasoning — turns analysis into 3 distinct variation strategies |
| **FFmpeg** | Deterministic rendering — executes each strategy into a finished 9:16 clip |
| **Cloudflare R2** | Video storage + delivery with zero egress fees |
| **PostHog / Metabase / Stripe** | Behaviour, BI, and revenue analytics — the investor dashboard |

---

## 3. The pipeline — from one ad to three, step by step

```
 UPLOAD          ANALYZE                 PLAN                RENDER           DELIVER
┌───────┐   ┌───────────────┐   ┌──────────────────┐   ┌─────────────┐   ┌──────────┐
│ 90s   │──▶│ TwelveLabs:   │──▶│ GPT-4o Mini      │──▶│ FFmpeg cuts │──▶│ 3 clips: │
│ video │   │ scenes, hooks │   │ writes 3 distinct│   │ each EDL    │   │ preview  │
│ direct│   │ Whisper:      │   │ strategies as    │   │ into a 9:16 │   │ (free) or│
│ to R2 │   │ word-level    │   │ EDLs (edit       │   │ clip with   │   │ HD (paid)│
└───────┘   │ transcript    │   │ decision lists)  │   │ captions    │   └──────────┘
            └───────────────┘   └──────────────────┘   └─────────────┘
                    │                    │                    │
                    ▼                    ▼                    ▼
            ═══════════════ EVERYTHING IS WRITTEN TO POSTGRES ═══════════════
```

1. **Upload** — browser uploads directly to R2 via a presigned URL (a 100MB file never touches our API). A job is created; a token is reserved.
2. **Analyze** — TwelveLabs indexes the video once (scenes, hooks, product moments); Whisper produces a word-level timestamped transcript. Combined, the system knows *what happens, when, and what's said* — down to the word.
3. **Plan** — GPT-4o Mini receives the full analysis and returns **three distinct strategies** (e.g. hook-first, problem–solution, social-proof-led) as structured **EDLs**: exact cut points, ordering, caption text, hook overlay. The EDL is the contract between the AI and the renderer — auditable, reproducible, re-renderable.
4. **Render** — FFmpeg executes each EDL: cuts on word boundaries, reframes to 9:16, burns animated captions, watermarks free-tier output.
5. **Deliver** — three watermarked previews appear in the browser; HD downloads unlock with a paid plan. Failed jobs auto-retry per-step and refund the token if unrecoverable.

Typical wall-clock: **~60–90 seconds** from upload to three previews.

---

## 4. The data capture layer — what every video teaches us

The pipeline is instrumented so that **every upload deposits a complete training example** into Postgres. Per video, we permanently store:

| What we capture | Why it matters |
|---|---|
| **Full video analysis** (scenes, hooks, moments, pacing) | The structural DNA of an ad that already converts |
| **Auto-detected category** (fitness, skincare, SaaS…) | Lets learning become category-specific |
| **Word-level transcript** | The language of winning ads — hooks, claims, CTAs |
| **The 3 generated strategies (EDLs)** | What the AI proposed, in full detail |
| **Which variation the user downloaded** | **A human vote.** The user just labeled our data for free |
| **Regenerations & abandons** | Negative signal — what the AI got wrong |
| **Embedding vector** (pgvector, in-database) | Makes every past ad instantly searchable by similarity |

The critical design rule: **data not logged on day one is gone forever.** This layer ships with the MVP — the dashboards can evolve later, the capture cannot.

Every user interaction is simultaneously product usage *and* dataset growth. A user who uploads one video and downloads one variation has — without knowing it — told the system which of three creative strategies wins for their category.

---

## 5. The learning loop — how the AI gets better on its own

```mermaid
flowchart LR
    A([Ad uploaded]) --> B([AI analyzes &<br/>generates 3 variations])
    B --> C([User picks one<br/>= a human vote])
    C --> D([Vote + analysis stored<br/>in the archive])
    D --> E([Archive conditions<br/>the next generation])
    E --> F([Better variations<br/>for every next user])
    F --> A

    style D fill:#f97316,stroke:#c2410c,color:#fff
    style E fill:#f97316,stroke:#c2410c,color:#fff
```

The loop activates in four stages, each unlocked by the data the previous one accumulates — and each built on managed services (no ML team required to operate it):

### Stage 1 — Retrieval: the archive joins the pipeline
When a new ad arrives, the system embeds it and searches the archive (pgvector) for the **most similar high-performing ads in the same category** — ads whose variations users actually chose. Their winning patterns are injected into the generation prompt as live context.

> *"Here are 5 fitness ads similar to this one, and the hook structures users picked. Generate in that direction."*

From this moment, **output quality scales with archive size** — more users literally means a better product. This is the flywheel's ignition point.

### Stage 2 — Self-optimizing strategies
The system continuously measures **win-rates per strategy per category**: if "hook-first" gets downloaded 61% of the time in fitness but "social-proof-led" dominates skincare, the strategy mix shifts automatically per category. The AI tunes its own creative playbook from user behaviour — no manual re-engineering.

### Stage 3 — A model that speaks AdMultiply
Once the archive holds ~1,000 curated *analysis → winning variation* pairs, we fine-tune GPT-4o Mini on them (OpenAI's managed fine-tuning). The result is a model with AdMultiply's accumulated creative judgment baked in — better output, lower per-call cost, and **unreproducible without our dataset**.

### Stage 4 — Market-validated learning
The ad-manager integration (Meta / Google) upgrades our labels from *"the user picked it"* to *"the market converted on it"* — real CTR and ROAS flowing back per variation. The system stops learning what people *choose* and starts learning what actually *sells*, per category. This is where the loop compounds hardest.

### Why this ends in defensibility

Every stage deepens the same asset: **a proprietary, growing dataset of winning-ad structures, labeled first by human choices and eventually by market performance.** Features can be cloned in a quarter. The dataset cannot — a competitor starting later must acquire users at scale with a worse product to even begin collecting it, while ours improves with every upload. The moat isn't the AI. It's what the AI has seen.

---

## 6. The admin data contract — what the pipeline must write

The admin panel (`/admin`) is built on `src/lib/admin-types.ts`. Those types are
the **specification for these tables**, not just props for the demo screens.

The rule that matters: **if a row isn't written at processing time, the admin
screen can never reconstruct it afterwards.** Cost per video, strategy
win-rates and the token audit trail are all unrecoverable if the write is
skipped — there is no backfill.

### Tables

| Table | Written by | Purpose |
|---|---|---|
| `users` | Auth callback + Stripe webhook | Platform state alongside Supabase Auth identity |
| `jobs` | API on submit, workers on transition | The pipeline state machine |
| `job_stages` | Each Celery task | Timeline + per-stage durations |
| `variations` | Render worker; `downloaded_at` by the download endpoint | Output + **the flywheel signal** |
| `token_ledger` | **Append-only** — API, workers, admin actions | Balance, refunds, audit trail |
| `api_usage` | After every provider call | Cost per video, per provider, per user |

### Two decisions that are load-bearing

**1. `token_ledger` is append-only. A balance is never a stored column.**

```sql
-- balance for the current cycle
select coalesce(sum(delta), 0)
from token_ledger
where user_id = $1 and created_at >= $2;
```

Every grant, reservation, refund and admin adjustment is a row with a `reason`
and, for admin actions, an `admin_id` and a `note`. This means the audit log
required for "Adjust Tokens" is not a feature we build — it is a consequence of
modelling tokens correctly. A mutable `tokens` integer would need a parallel
audit table that can silently disagree with it.

**2. `api_usage` is written per job, per provider, immediately after the call.**

Every provider response already returns its usage (minutes indexed, audio
minutes, token counts). Persist it with the job id attached. Without this row
there is no cost-per-video, no per-user profitability, no early warning when
margin drifts — and no way to recover it later, because the provider invoice
arrives as one monthly total with no job attribution.

### Write-side checklist for backend week

- [ ] On submit: create `jobs` row (`stage='queued'`) **and** a `token_ledger`
      row (`delta=-1`, `reason='job_reserve'`, `job_id` set) in one transaction
- [ ] On every stage transition: update `jobs.stage` + insert `job_stages`
- [ ] After each provider call: insert `api_usage` (provider, units, cost_cents, job_id)
- [ ] On failure: set `error_code` (closed set — see `JobErrorCode`) and
      `error_message`, then insert `token_ledger` (`delta=+1`,
      `reason='job_refund'`). **A failed job that doesn't refund is a revenue
      bug** — the Overview alerts on it
- [ ] On render complete: insert three `variations` rows
- [ ] On download: set `variations.downloaded_at` + increment `download_count`,
      and emit the PostHog event. **This is the moat — never skip it**
- [ ] Monthly cron: insert `token_ledger` (`delta=plan.tokens`,
      `reason='monthly_grant'`). No rollover
- [ ] Admin mutations: always `admin_id` + `note`, never a direct balance write

### What the panel deliberately does not store

Payments, invoices, refunds and disputes stay in **Stripe** — the panel holds
only `stripe_customer_id` and deep-links out. Behavioural funnels and retention
stay in **PostHog**. Unhandled exceptions go to **Sentry**; `jobs.error_code`
covers only *expected*, classified failures. Queue internals live in **Flower**;
the panel reads depth and worker count from Celery's inspect API for the
at-a-glance number.
