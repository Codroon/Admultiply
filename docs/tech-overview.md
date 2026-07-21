# AdMultiply — Tech Overview

> **The product:** Upload one winning video ad → AI generates 3 high-converting micro-ad variations → fight ad fatigue without manual editing.

---

## The stack — 4 layers

```
┌─────────────────────────────────────────────────────────────┐
│  INTERFACE       Next.js + Tailwind CSS         (Vercel)    │
├─────────────────────────────────────────────────────────────┤
│  LOGIC           FastAPI (Python) + Arq queue   (Railway)   │
├─────────────────────────────────────────────────────────────┤
│  DATA + AUTH     Postgres via Supabase                      │
├─────────────────────────────────────────────────────────────┤
│  AI + MEDIA      TwelveLabs · GPT-4o Mini · FFmpeg · S3     │
│  PAYMENTS        Stripe                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Why each choice — one line each

| Component | Why this, in one line |
|---|---|
| **Next.js + Tailwind** | Industry standard (Vercel, OpenAI, Notion). SSR for SEO. Fastest UI build velocity. |
| **FastAPI (Python)** | Best AI/ML ecosystem on Earth. Async-native. Auto-generates API docs. Type-safe. |
| **Postgres + Supabase** | Bulletproof DB + bundled auth + storage + real-time. One vendor for MVP. Migrates off easily. |
| **TwelveLabs** | Purpose-built for video understanding — finds best moments, hooks, product placements. |
| **GPT-4o Mini** | 60× cheaper than full GPT-4o. Generates hooks, captions, ad copy. Strong quality / price ratio. |
| **FFmpeg** | Free. Powers YouTube and Netflix. Handles every codec. Zero vendor lock-in. |
| **Arq + Redis** | Async Python job queue. Survives restarts. Auto-retries. Background video processing. |
| **AWS S3** | Cheapest durable storage at scale. Direct browser-to-S3 upload (no server bandwidth). |
| **Stripe** | SaaS payments standard. Handles tax, refunds, disputes. Webhooks integrate with token logic. |
| **Vercel + Railway** | Zero-config deploys. Free tier covers MVP. Linear pricing as we scale. |

---

## The strategic frame

### No lock-in. Everything is portable.

- Postgres data → moves to any host
- FFmpeg processing → runs on any server
- Python services → deploy to any cloud
- AI layer → swappable (TwelveLabs ↔ alternatives), and eventually replaceable with our own fine-tuned models

We could leave Supabase, Vercel, Railway, even AWS — and the product still runs. **No bet on a single vendor's survival.**

### The moat is data, not tech.

The stack above is replicable by any competent team in a few months. **What can't be copied is the dataset of ads + which variations users actually used.** Every upload makes AdMultiply's AI smarter. *(See flywheel doc.)*

### Cost shape (rough, verify before quoting)

- **Variable cost per video processed:** ~$0.30–$0.80 (TwelveLabs + GPT calls + storage)
- **Fixed monthly infrastructure (MVP scale):** ~$50–$200
- **Gross margin at Creator plan ($39/mo, 25 videos):** ~50–70%

Pricing tiers are designed so margin improves as users upgrade to higher plans.

---

## What's in the MVP vs. what's later

| In MVP | Phase 2+ |
|---|---|
| Upload → 3 variations → token-gated download | Performance scoring of ads |
| Auth, dashboard, billing, admin panel | Viral clip finder |
| Stripe subscriptions + token system | Creative datasets / benchmarks |
| 3 tiers: Starter / Creator / Pro / Business | Fine-tuned proprietary AI model |
| Basic monitoring + admin tools | Mobile app |
