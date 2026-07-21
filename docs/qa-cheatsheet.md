# AdMultiply — Q&A Cheatsheet

> Likely questions from the client and the investor, with prepared answers. Skim before the meeting.

---

## 🔧 Tech & Build

### "Why these specific tools instead of [X]?"
> Every choice optimizes for two things: speed to MVP and freedom to migrate later. We picked the stack with the largest talent pool, the most mature ecosystem, and zero vendor lock-in at the data layer. No piece is irreplaceable.

### "Can we move off [Supabase / Vercel / TwelveLabs] later if we need to?"
> Yes — that was a deliberate filter. Postgres data exports anywhere. Our FastAPI code runs on any cloud. Even the AI layer is swappable: TwelveLabs can be replaced with comparable services or with our own fine-tuned models once we have enough data.

### "Who else uses this stack?"
> Next.js powers OpenAI, Notion, TikTok's web. FastAPI powers Netflix, Uber, Microsoft internal tools. Postgres powers Stripe, Instagram, Reddit. We're using boring, battle-tested infrastructure — not bleeding-edge bets.

### "How do we handle a viral spike — what if we get 10,000 uploads in a day?"
> Three layers protect us:
> 1. The queue (Arq + Redis) absorbs the spike — users get a "processing" status instead of timeouts
> 2. Railway auto-scales the worker pool as queue depth grows
> 3. A hard cost ceiling per user prevents runaway API bills
>
> If something has to wait, it waits in line. Nothing breaks.

### "What's the biggest technical risk?"
> The video processing pipeline. Real-world video files fail in interesting ways — corrupt frames, weird codecs, oversized files. We're budgeting extra time for the queue + FFmpeg integration because that's where production reality hits hardest.

---

## 🤖 AI & Model Questions

### "What if OpenAI releases AdMultiply themselves?"
> OpenAI sells horizontal AI infrastructure, not vertical workflow tools. They didn't build Cursor or Perplexity or Lovable — they powered them. AdMultiply is the same shape: we sit on top of OpenAI + TwelveLabs and own the workflow, the brand, the customer relationship, and — most importantly — the dataset.

### "What if TwelveLabs goes out of business or 10× their pricing?"
> Two answers:
> 1. **Short term:** We can swap TwelveLabs for alternatives (Google Cloud Video Intelligence, Anthropic vision, or open-source CLIP-based pipelines). It's a service contract, not a marriage.
> 2. **Long term:** Once we have enough training data from our users, we fine-tune our own model. TwelveLabs is a launch crutch, not a permanent dependency.

### "How do you guarantee output quality?"
> We don't promise perfection — we promise three variations of which at least one is usable. The user picks the best one. If none are good, the token isn't spent. This sets honest expectations and protects user trust.

### "Can the AI generate inappropriate or biased content?"
> Three safeguards:
> 1. We run outputs through content moderation (OpenAI provides this in the API)
> 2. Users can only remix ads they uploaded — we're not generating from scratch
> 3. ToS prohibits using AdMultiply for content that violates our policies, with a flagging mechanism in the admin panel

---

## 💰 Cost & Economics

### "What's the unit economics — cost per user?"
> Variable cost is per video, not per user. A Creator-tier user processing 25 videos a month costs us roughly $7.50–20 in API + storage. They pay $39. Gross margin lands at 50–70% depending on their video lengths.

### "Where do API costs cap? What if a user uploads 1000 videos?"
> Tokens cap it automatically. You pay for tokens, you process that many videos. There's no "unlimited" tier. We can scale pricing by usage if cost behavior changes.

### "What's your gross margin?"
> Targeting 60% at MVP scale. Improves as we (1) batch API calls, (2) cache common operations, (3) eventually replace expensive third-party AI with our own fine-tuned models. By Phase 3 we target 80%+ on AI-heavy workloads.

### "When are you profitable?"
> Unit-economic profitable from day one of the Creator plan (we make money on every paying user). Business-profitable depends on customer acquisition cost — that's the variable to watch, not the tech.

---

## 🛡 Moat & Defensibility

### "What's the moat? Anyone can wire up GPT + FFmpeg."
> Two moats stacked:
> 1. **The dataset.** Every ad uploaded teaches our AI. After thousands of users, our outputs are measurably better than any newcomer's. *(see flywheel doc)*
> 2. **The workflow.** The UX of "upload → 3 variations → pick → download → done" is the product. Marketers don't want an AI lab; they want this specific workflow polished and reliable.

### "How long before someone clones you?"
> They can clone the *features* in 2–3 months. They can't clone the *dataset* — that takes acquiring users at scale, which takes capital and time. By the time a clone has data, we have 12+ months more. The gap compounds.

### "Why won't Adobe or Canva crush this?"
> Adobe and Canva are general creative platforms — they'd add this as one feature among hundreds, optimized for nobody specifically. AdMultiply is built for one job: performance marketers fighting ad fatigue. Specialists beat generalists in workflow products. (Figma vs Adobe XD. Notion vs OneNote. Stripe vs PayPal.)

### "What's the unfair advantage?"
> First-mover speed + a dataset that compounds + a UX nobody else will care enough to ship. Plus: we charge by tokens, so we capture value proportional to the value we deliver, instead of flat-rate seats.

---

## ⚖️ Scale, Privacy, Legal

### "What happens if processing fails halfway through?"
> The job queue auto-retries up to 3 times. If it still fails, the user is notified, the token is refunded, and the failed job goes to a dead-letter queue for admin review. Nothing is silently lost.

### "Privacy — what user data do you store?"
> Account info (email, name) + uploaded videos + generated variations + usage metadata. All stored encrypted at rest. EU/CA users get GDPR/CCPA deletion endpoints. Standard SaaS hygiene.

### "Copyright / DMCA — what if a user uploads someone else's ad?"
> Three layers:
> 1. ToS makes the user responsible for what they upload
> 2. Standard DMCA takedown process (designated agent, etc.)
> 3. We can run optional reverse-image-search on uploads to flag obvious lifts (Phase 2)
>
> Same exposure profile as YouTube, Canva, Figma — well-understood territory.

### "Do users know you're training on their content?"
> Yes — clearly disclosed in ToS, with an opt-out toggle for Enterprise customers who can't share content. This is standard for AI products (DALL-E, Midjourney, ChatGPT all do this). Lawyer review before launch.

---

## 🗺 Roadmap & What's Not in MVP

### "What's NOT in the MVP?"
> Performance scoring of generated ads. Viral clip finder. Mobile app. Creative benchmarks dataset. White-label / Enterprise tier. Custom fine-tuned model. These are Phase 2+.

### "Why not include [Phase 2 feature] now?"
> Scope discipline. Every additional feature in MVP delays the ship date and dilutes the demo story. We want to prove the core loop (upload → 3 variations → tokens) is something users will pay for, then build outward from there with data.

### "When can this handle 1000 concurrent users?"
> The MVP architecture handles ~100 concurrent video uploads on Railway's mid tier. Scaling to 1000 is a known path: add worker replicas, move to Cloudflare R2 for storage bandwidth, possibly Postgres read replicas. None of this is research — it's just configuration.

### "Mobile app?"
> The web app is mobile-responsive day one. A native iOS/Android app is Phase 2 — once we've validated the core flow on web and have demand signal.

---

## 🎯 The closing line (for the room)

> "AdMultiply is a focused vertical AI product on top of a portable, boring stack. The features are buildable. The dataset isn't. We're funding the time to build a moat that compounds while the product is in the market — not before."
