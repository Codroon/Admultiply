# AdMultiply

AI video repurposing platform: upload **one winning video ad** (60–120s) and AdMultiply AI generates **three high-converting 9:16 micro-ad variations** — helping brands, agencies and creators beat creative fatigue and extend the lifespan of their best creatives.

**Live:** [admultiply.io](https://admultiply.io) · Launching September 2026

---

## Status at a glance

### ✅ Done (frontend, live or on branch)

| Area | State |
|---|---|
| **Waitlist funnel** (pre-launch homepage `/`) | Live. 3-step flow (email+company → 5-question survey → success), stores to Supabase `waitlist` table via `/api/waitlist`. Email captured on step 1 so survey abandonment never loses a lead. |
| **Landing page** | Built and parked at `/preview` (noindex) until launch. Hero with animated 1→3 mockup, How It Works, pricing (6 plans), FAQ, testimonials. |
| **Auth pages** (`/login`, `/signup`) | UI complete (Notion-style, email-first). **Not wired to Supabase Auth yet.** |
| **User dashboard** (`/dashboard`, noindex) | **Two modes, one contract.** With `NEXT_PUBLIC_PIPELINE_URL` set it uploads to the real pipeline API — live stage stepper, slots named as planning finishes, clips revealed as each render lands, captions toggle gated to paid plans. Without it, a simulated demo so the deployed site works with no backend. Workspace (greeting hero, showcase marquee, upload with real file metadata), simulated pipeline (4-stage stepper with live narration, progressive 3-slot reveal), results (watermark preview vs tier-gated HD downloads → contextual upgrade modal), library grouped by source ad, billing (6-plan grid + usage meter), settings (incl. demo-only plan switcher). |
| **AI pipeline** (`spike/`) | **Validated on four real client ads.** Upload → TwelveLabs (what's seen) + Whisper (what's said) → two-pass planner (understand the ad, then compose one storyline per angle from its moments) → FFmpeg. Three distinct 12–22s vertical cuts in ~40s, ~$0.07 per video with visual analysis, under a cent without. Distinctness guardrails enforced in code. `spike/api.py` is the production API in miniature; `spike/README.md` is the handover doc. |
| **Admin dashboard** (`/admin`, noindex) | Six screens on the same mocked-contract pattern: **Overview** (pulse, conditional alerts, 14-day throughput, system health, queue), **Users** (search/filter, drawer with append-only token ledger + audit-trailed adjustments, suspend), **Jobs** (pipeline triage — stage timeline, classified errors, retry, token refund), **AI Usage & Cost** (spend per provider, cost-per-video vs the $0.15 baseline, token movement, free-tier burn, **flywheel win-rates**), **Billing** (MRR/ARPU/conversion + Stripe deep-links, no rebuilt ledger), **Waitlist** (live Supabase data + CSV export). ⌘K command palette. Sample data is deterministic and fully reconciled — every figure derives from generated rows. |
| **Domain & deploy** | `admultiply.io` via GoDaddy DNS → Vercel. GitHub → Vercel auto-deploy on merge to `main`. |
| **Design system** | Brand tokens (orange scale, Inter, light/dark), ui primitives in `src/components/ui/`, shared plan data in `src/lib/plans.ts`. |

### 🔜 Remaining (path to launch)

1. ~~**Pipeline spike**~~ — **done.** The question it existed to answer ("can we make three cuts a marketer would run?") is answered yes, on real client ads. See `spike/README.md`.
2. **Backend** — promote `spike/api.py` to the real service: Celery/Redis instead of a thread, R2 instead of a local folder, Supabase instead of a JSON file per job. The pipeline itself (`spike/pipeline.py`) carries over unchanged.
3. **Auth** — wire `/login`, `/signup` to Supabase Auth; protect `/dashboard`, and gate `/admin` on `users.role = 'admin'`.
4. **Real data** — the customer dashboard already talks to the pipeline API; swap `admin-provider.tsx` for Supabase/FastAPI + Realtime. The admin write-side contract is specified in [`docs/backend-architecture.md` §6](docs/backend-architecture.md) — `src/lib/admin-types.ts` is the schema.
5. **Billing** — Stripe subscriptions, token ledger (1 token = 1 upload = 3 variations; downloads gated by tier, never tokens), Customer Portal.
6. **Analytics** — PostHog (behaviour/funnels) + Metabase on Postgres (investor dashboards) + event capture for the data flywheel.
7. **Admin basics** — user/job overview, dead-letter queue view.
8. **Public showcase (backend-driven)** — the "Made with AdMultiply" gallery goes live-data only when (a) the customer has **opted in** to sharing (`share_publicly`, default OFF, toggle in Settings) and (b) the library holds enough real micro-ads (**~50–100**, configurable). Until then it runs on sample clips.
9. **Launch flip** — landing back to `/`, waitlist to `/waitlist`, real showcase content + demo video, ToS/Privacy (incl. AI-training clause), remove demo controls, rotate keys, transfer accounts to client.

Full architecture and costs: see [`docs/backend-mvp-plan.md`](docs/backend-mvp-plan.md) and [`docs/backend-architecture.md`](docs/backend-architecture.md).

---

## Stack

- **Frontend:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · framer-motion · next-themes (light/dark)
- **Data (current):** Supabase Postgres (waitlist), server-side via service key in `/api/waitlist`
- **Planned backend:** FastAPI · Celery + Redis · Cloudflare R2 · TwelveLabs · OpenAI (GPT-4o Mini, Whisper) · FFmpeg · Stripe · PostHog · Metabase

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

Create `.env.local` (never commit — gitignored):

```
SUPABASE_URL=<project url>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server-only, never exposed client-side
```

Without these, waitlist submissions are accepted in dev but not stored (see `src/app/api/waitlist/route.ts`).

## Routes

| Route | Purpose |
|---|---|
| `/` | Waitlist funnel (pre-launch homepage) |
| `/preview` | Full landing page, noindex, for internal/client review |
| `/dashboard` (+ `/library`, `/billing`, `/settings`) | Customer dashboard demo, noindex, mocked data |
| `/admin` (+ `/users`, `/jobs`, `/ai-usage`, `/billing`, `/waitlist`) | Admin panel demo, noindex, mocked data |
| `/login`, `/signup` | Auth UI (not yet functional) |
| `/api/waitlist` | POST (capture) / PATCH (survey enrichment) → Supabase |

## Workflow

Feature branches → push to GitHub → PR → merge to `main` → Vercel auto-deploys. Do not push directly to `main`.

## Docs

| File | Contents |
|---|---|
| `docs/backend-mvp-plan.md` | Lean MVP scope, verified 2026 API cost model, plan margins, client checklist |
| `docs/backend-architecture.md` | Pipeline architecture + the self-improving AI loop (data flywheel) |
| `docs/tech-overview.md` · `docs/flywheel.md` · `docs/qa-cheatsheet.md` | Investor-meeting materials (some details superseded by the two docs above — those take precedence) |
