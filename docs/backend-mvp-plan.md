# AdMultiply — Backend, Cost & Feasibility Plan (MVP)

*Prepared for the AdMultiply build. All API prices verified against official pricing pages (2026). Figures exclude development time.*

---

## 1. Executive summary

The MVP is one flow done extremely well: **sign up → upload one 1-min+ video → AI generates 3 micro variations → watermarked preview → upgrade to download HD → subscribe.**

Three things are true from the cost research, and they shape every decision below:

1. **TwelveLabs (video understanding) is ~90–95% of the cost of processing a video.** Everything else — GPT-4o Mini, transcription, rendering — is a rounding error. Cost control = TwelveLabs control.
2. **Paid plans are healthy: ~83–86% gross margin at full usage, ~90%+ at realistic usage.** The pricing tiers the client set are well-priced against true cost.
3. **The free tier is the one real burn.** Every free upload costs us ~$0.15 in unmonetized TwelveLabs spend. "4 free tokens/month" recurring is meaningfully more expensive than "1 free upload," and that choice is worth a conscious decision (§6).

Strategically, the backend is not just a video tool — it is **the data-collection engine the fundraise depends on.** Investors want initial data; so the schema and event capture must be correct from day one, because *data you don't log on launch day is gone forever.* The analytics layer (§4) is therefore treated as a first-class MVP deliverable, not a phase-2 add-on.

**Verdict: fully feasible on the confirmed stack, with strong margins and a clean scaling path.** The single largest risk is the quality + cost of the video pipeline, which we de-risk with a week-1 spike (§7).

---

## 2. The MVP in one flow

```
Sign up (email / Google / Apple)
   │   ↳ capture user type: creator | agency | brand   (1 field, huge fundraise value)
   ▼
Upload 1 video (60–120s)  →  direct-to-storage, presigned URL (never through the API)
   ▼
AI pipeline (async, ~30–120s):  analyse → plan 3 strategies → render 3 clips
   ▼
Watermarked / low-res preview of all 3
   ▼
"Download HD" → gated by plan  →  upgrade / subscribe (Stripe)
```

**Token model (confirmed):** 1 token = 1 upload = 3 variations. Free = watermarked preview. Paid = HD download. Downloads are gated by tier, not by a second token spend.

---

## 3. Backend architecture (lean, but built to extend)

```
┌─────────────────────────────────────────────────────────────┐
│ Next.js frontend (Vercel)                                    │
└───────────────┬─────────────────────────────────────────────┘
                │ REST + presigned URLs
┌───────────────▼─────────────────────────────────────────────┐
│ FastAPI (Python)  — one modular service (Railway)            │
│   • auth (Supabase)   • jobs   • billing (Stripe webhooks)   │
└───────┬───────────────────────────────────┬─────────────────┘
        │ enqueue                            │ read/write
┌───────▼──────────┐                ┌────────▼─────────────────┐
│ Redis + Celery   │                │ Supabase Postgres        │
│  • analyze queue │                │  users, jobs, variations,│
│  • render queue  │                │  tokens, events, costs   │
└───────┬──────────┘                └──────────────────────────┘
        │ pipeline
   ┌────▼───────────────────────────────────────────────┐
   │ TwelveLabs (analyse) · Whisper (transcribe)         │
   │ GPT-4o Mini (remix plan) · FFmpeg (render)          │
   └────┬────────────────────────────────────────────────┘
        │ store / deliver
   ┌────▼───────────────────────┐
   │ Cloudflare R2 (or S3+CDN)  │  → HD download links
   └────────────────────────────┘
```

### Key engineering decisions (with the "why")

| Decision | Choice | Why |
|---|---|---|
| **Job queue** | **Celery + Redis** | The proposal said BullMQ — that's **Node-only and cannot run in Python.** Celery is the standard Python choice and is what the client's future dev will know (handover). |
| **Two queues** | `analyze` (I/O) + `render` (CPU) | Never let a 60s FFmpeg render block API calls. Scale them independently. |
| **Upload** | Presigned direct-to-storage | Never proxy 100MB through FastAPI — no timeouts, no bandwidth cost. |
| **TwelveLabs usage** | **Analyse once, reuse** | Pegasus re-bills the *full* video minutes on **every** call. Analysing once per video (~$0.11) vs once per variation (~$0.25+) is a 2× cost swing. |
| **Transcription** | **Whisper-1**, not gpt-4o-mini-transcribe | Only Whisper-1 returns **word-level timestamps**, which we need to cut on word boundaries and place captions. The "cheaper" model can't do it. |
| **Storage** | **Cloudflare R2** (recommend) over S3+CloudFront | R2 has **zero egress fees** — ~3× cheaper for video delivery, and it's S3-API-compatible so code ports trivially. |
| **State** | DB-backed job state machine | Each step records completion + output; retries skip done steps; the queue stays swappable. |

### Built to extend (agility the client asked for)
The schema is modelled so future features are **additions, not rewrites**: videos already belong to a user (→ **folders/projects** later), an `events` table already exists (→ new event types), billing already supports N tiers (→ new plans), and an integrations table is stubbed (→ **ad-manager plugins** for Meta/Google later). We *don't build* these now — we make sure adding them is a feature, not a refactor.

---

## 4. The data & analytics layer — the centrepiece for the raise

**Principle: capture everything from launch.** Dashboards can come slightly later; *data capture cannot.* Every recommendation here is chosen to be free/cheap at MVP scale and client-ownable at handover.

| Layer | Tool | Cost at MVP | Role |
|---|---|---|---|
| Source of truth | **Supabase Postgres** | $25/mo | Users, videos, jobs, variations, tokens, subscriptions, AI metadata |
| Product / behaviour analytics | **PostHog** | **$0** (free tier) | Time on site, funnels, uploads/day, retention, session replay, cohorts |
| BI dashboards ("the CMS") | **Metabase** (self-host) | ~$0–15/mo | Investor-ready charts straight off Postgres |
| Revenue analytics | **Stripe** | included | MRR, churn, LTV, subscription length |

### Every metric the client named → where it comes from

| The client wants to know… | Source | In MVP? |
|---|---|---|
| Time spent on site, on-site behaviour | PostHog | ✅ |
| Videos uploaded per day / per user | Supabase + PostHog | ✅ |
| Subscribers accumulated, MRR | Stripe + Supabase | ✅ |
| How long they subscribe (retention / LTV) | Stripe → Supabase | ✅ |
| Creator vs agency vs brand | **Signup field** → Supabase | ✅ (one field) |
| What makes videos good, by category | Supabase: AI metadata + category tag + which variation was downloaded | ✅ (capture only) |
| Which ads convert, by category | Ad-manager (Meta/Google) plugin | ⏳ Phase 2 |

### The flywheel capture (the moat, and the investor story)
For **every** processed video we store: the TwelveLabs analysis, the auto-detected **category**, the 3 generated strategies, and — critically — **which variation the user actually downloaded** (their "vote"). That accumulates, from day one, a proprietary dataset of *"what winning ads look like, by category, and which AI remix humans chose."* The *active* learning model (RAG, then fine-tuning) is Phase 2 — but it is worthless without the capture we build now, and the capture is nearly free.

---

## 5. Verified API cost model (2026)

### Cost to process ONE video (90s baseline, single analyse pass)

| Service | Cost | Notes |
|---|---:|---|
| TwelveLabs — index ($0.042/min) + Pegasus analyse ($0.0292/min) + output | **$0.114** | **The cost driver (~90%)** |
| Whisper-1 transcription ($0.006/min) | $0.009 | Word timestamps |
| GPT-4o Mini (remix plan, ~4k in + 1.5k out) | $0.0015 | Negligible |
| FFmpeg render (3 clips, ~2 vCPU worker) | ~$0.003 | Negligible |
| **Total variable cost per video** | **≈ $0.13** | 90s; ~$0.17 at 120s |

> Plan around **~$0.15 per video processed.** At 120s videos, or if any step retries, budget up to ~$0.18.

### Cost per user

- **Free user (1 upload):** ~$0.15 one-time (unmonetized). Delete assets promptly → storage ≈ $0.
- **Paid user:** `(tokens used × $0.15) + storage + Stripe fee`. See §6 — lands at **~85% gross margin** even at full token usage.

### Fixed monthly infrastructure (independent of volume until thresholds)

| | 100 users | 1,000 users | 10,000 users |
|---|---:|---:|---:|
| Supabase Pro | $25 | $25 | $25 |
| Backend/worker compute (Railway) | ~$25 | ~$30 | ~$60 |
| PostHog | $0 | $0 | ~$100 |
| Metabase (self-host VM) | ~$0–10 | ~$10 | ~$15 |
| Storage/egress (R2) | ~$2 | ~$15 | ~$60 |
| **Fixed base** | **~$55/mo** | **~$80/mo** | **~$260/mo** |

### Steady-state monthly total (assumptions below)

*Assumes 10% free→paid conversion, average paid plan $39 at ~40% token use (10 videos/mo), free = one-time 1-upload allowance, assets deleted after 7 days.*

| Scale | Est. monthly cost | Monthly revenue (paid) | Gross margin |
|---|---:|---:|---:|
| **100 users** (10 paid) | ~$95 | ~$390 | ~76% |
| **1,000 users** (100 paid) | ~$530 | ~$3,900 | ~86% |
| **10,000 users** (1,000 paid) | ~$4,800 | ~$39,000 | ~88% |

> The blended margin *rises* with scale because fixed infra amortizes. Paid-user unit economics are ~85% throughout. The variance at 100 users is the fixed-cost floor, not the model.

---

## 6. Packages built from the cost (margin proof)

Per plan, at **full token utilization** (the worst case for margin). Stripe fee ≈ 3.6% + $0.30. Video cost = tokens × $0.15.

| Plan | Price | Tokens | Video cost | Stripe fee | ~Total cost | **Gross margin** |
|---|---:|---:|---:|---:|---:|---:|
| **Free** | $0 | 3/mo | $0.45 | $0 | ~$0.47 | **−$0.47 (acquisition cost — see below)** |
| **Plus** | $9 | 5 | $0.75 | $0.62 | ~$1.42 | **~84%** |
| **Starter** | $19 | 10 | $1.50 | $0.98 | ~$2.58 | **~86%** |
| **Creator** ⭐ | $39 | 25 | $3.75 | $1.70 | ~$5.65 | **~86%** |
| **Pro** | $69 | 50 | $7.50 | $2.78 | ~$10.68 | **~85%** |
| **Business** | $99 | 80 | $12.00 | $3.86 | ~$16.46 | **~83%** |

**Every paid tier clears ~83–86% margin at full usage — and most users won't use all their tokens, so real margins trend to ~90%.** The plans are sound. The per-video overage prices ($1.56–$2.00) carry ~90% margin against the $0.15 true cost, so overages are pure upside.

### ✅ Decided: the free tier

Two options were on the table:
- A **one-time free allowance** (1 upload, then upgrade) → ~$0.15 per free user, *once*.
- A **recurring monthly allowance** → cost repeats every month per active free user.

**Client decision: 3 video tokens per month, recurring.** That is ~$0.45 per *active* free user per month (≈$4,500/mo at 10,000 monthly-active free users, worst case at full utilisation — real burn will be well under this since most free users don't spend every token).

This is an **acquisition + data cost, not a leak**: every free upload feeds the training data behind the fundraise, and 3 uploads is enough for a user to judge the product without removing the reason to upgrade (HD, watermark-free downloads stay paid-only). Guard rails to keep it honest:
- Hard monthly reset — unused free tokens do **not** roll over.
- Per-account cost ceiling + abuse checks (email verification, one free allowance per account).
- Track free→paid conversion from day one; if burn outpaces conversion, drop to 2 or move to one-time.

---

## 7. MVP feasibility

**Feasible on the confirmed stack, high margins, clean scaling path.** What matters:

- **Biggest risk = the video pipeline** (quality of the 3 variations + TwelveLabs cost), not traffic. A "3 clips" demo is easy; "3 clips a marketer would actually run" is the real bar.
- **De-risk it week one:** run **10 real 60–120s videos** through the full pipeline before building auth/billing. This (a) validates output quality, (b) produces *measured* per-video cost to replace the estimates here, and (c) surfaces edge cases early. This is the single highest-value first task.
- **Cost is controllable by design:** analyse-once, delete assets on a TTL, hard per-user monthly cost ceiling, token reserved on submit + refunded on failure.

**What we deliberately do NOT build for MVP** (keeps it lean): custom queue dashboard (use Flower), billing UI (Stripe Customer Portal), folders/projects, ad-manager plugins, fine-tuned models (capture data now, train later), smart subject-aware cropping, multi-region. All have clean bolt-on paths.

---

## 8. ✅ Checklist — everything needed from the client

### Accounts to create (client-owned — this matters for handover)
- [ ] **Stripe** — must be the client's **legal entity** (bank account, tax details, business verification). *Cannot be in the freelancer's name.*
- [ ] **TwelveLabs** (Developer plan, pay-as-you-go) — **start this early**, it's the critical dependency
- [ ] **OpenAI** (API account + billing)
- [ ] **Supabase** (Pro, ~$25/mo)
- [ ] **Cloudflare R2** (recommended) *or* **AWS** (S3)
- [ ] **Railway** (backend hosting)
- [ ] **Vercel** (frontend — currently under the freelancer's account; **transfer to client** at handover)
- [ ] **PostHog** (free tier)
- [ ] **Metabase** (self-host, or Cloud $100/mo if they want zero ops)
- [ ] **Apple Developer Program** ($99/yr) — required for Apple sign-in
- [ ] **Google Cloud** project — for Google sign-in OAuth
- [ ] **Domain + business email**

### API keys / credentials to hand over (from the accounts above)
- [ ] TwelveLabs API key · OpenAI API key · Stripe secret + webhook signing secret · R2/S3 keys · Supabase URL + service key · PostHog project key · Google & Apple OAuth credentials

### Legal (before public launch)
- [ ] **Terms of Service + Privacy Policy** (lawyer review) — **must** include the **data-use / AI-training clause** (users' uploaded content improves the service), plus watermark, refund, and cancellation terms. ~$500–1,500 for a startup-friendly review.
- [ ] Enterprise opt-out language (later)

### Decisions still open
- [x] ~~**Free tier:** one-time vs recurring~~ — **decided: 3 tokens/month, recurring** (see §6)
- [ ] **Public showcase:** confirm the activation threshold (~50–100 published micro-ads) + that consent is opt-in, default OFF
- [ ] **Storage:** Cloudflare R2 (recommended) vs AWS S3
- [ ] Confirm **average video length** assumption (90s) — it moves the cost model
- [ ] **Data retention:** delete source video after processing? after N days? (affects storage cost + privacy)
- [ ] Confirm **user-type field** at signup (creator / agency / brand) — high fundraise value, one field

### Brand / content assets
- [ ] Final watermark asset + spec (for free-tier previews)
- [ ] A real **60-sec demo video** (the hero "Watch our 60-sec Demo" button)
- [ ] Final legal + FAQ copy
- [ ] Real testimonials (currently placeholders)
- [ ] Brand guidelines (fonts, colours, logo variants) — mostly have

---

## Appendix — pricing sources (verified 2026)

- TwelveLabs: twelvelabs.io/pricing · pricing-calculator
- OpenAI: developers.openai.com/api/docs/pricing
- AWS S3 / CloudFront: aws.amazon.com/s3/pricing · /cloudfront/pricing · Cloudflare R2: developers.cloudflare.com/r2/pricing
- Supabase: supabase.com/pricing
- Stripe: stripe.com/pricing · /billing/pricing
- Railway: railway.com/pricing · AWS Fargate/EC2: aws.amazon.com/fargate/pricing
- PostHog: posthog.com/pricing
- Metabase: metabase.com/pricing

*All figures are current-2026 list prices. Per-video costs are modelled estimates pending the week-1 measurement spike (§7); TwelveLabs dominates and should be measured against real videos before final pricing is locked.*
