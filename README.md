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
| **User dashboard** (`/dashboard`, noindex) | Clickable demo on a **mocked data layer** that mirrors the real backend contract. Workspace (greeting hero, showcase marquee, upload with real file metadata), simulated pipeline (4-stage stepper with live narration, progressive 3-slot reveal), results (watermark preview vs tier-gated HD downloads → contextual upgrade modal), library grouped by source ad, billing (6-plan grid + usage meter), settings (incl. demo-only plan switcher). |
| **Domain & deploy** | `admultiply.io` via GoDaddy DNS → Vercel. GitHub → Vercel auto-deploy on merge to `main`. |
| **Design system** | Brand tokens (orange scale, Inter, light/dark), ui primitives in `src/components/ui/`, shared plan data in `src/lib/plans.ts`. |

### 🔜 Remaining (path to launch)

1. **Pipeline spike** — validate clip quality + real cost on 10 videos (TwelveLabs → Whisper → GPT-4o Mini EDLs → FFmpeg). *The critical path.*
2. **Backend** — FastAPI + Celery/Redis (two queues), DB-backed job state machine, presigned direct-to-R2 uploads, watermark burned at render.
3. **Auth** — wire `/login`, `/signup` to Supabase Auth; protect `/dashboard`.
4. **Real data** — swap the dashboard's mocked provider for Supabase/FastAPI + Realtime job status.
5. **Billing** — Stripe subscriptions, token ledger (1 token = 1 upload = 3 variations; downloads gated by tier, never tokens), Customer Portal.
6. **Analytics** — PostHog (behaviour/funnels) + Metabase on Postgres (investor dashboards) + event capture for the data flywheel.
7. **Admin basics** — user/job overview, dead-letter queue view.
8. **Launch flip** — landing back to `/`, waitlist to `/waitlist`, real showcase content + demo video, ToS/Privacy (incl. AI-training clause), remove demo controls, rotate keys, transfer accounts to client.

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
| `/dashboard` (+ `/library`, `/billing`, `/settings`) | Dashboard demo, noindex, mocked data |
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
