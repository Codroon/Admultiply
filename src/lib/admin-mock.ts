/* ---------------------------------------------------------------------------
   Deterministic sample data for the admin demo.

   Two rules this file follows, both of which matter:

   1. DETERMINISTIC — no Math.random(), no Date.now(). A seeded PRNG and a
      frozen "now" mean the server render and the client render produce byte-
      identical data, so there is no hydration mismatch. It also means the
      client sees the same numbers every time they open the demo.

   2. RECONCILED — every headline figure is derived from generated rows, never
      typed in by hand. MRR is the sum of real subscriptions; a user's token
      balance is the sum of their real ledger entries; cost per video is the
      sum of real api_usage rows. If a number appears on screen, you can click
      through to the rows that produced it.
--------------------------------------------------------------------------- */

import { PLANS, getPlan, type PlanId } from "./plans";
import {
  ERROR_LABEL,
  STRATEGIES,
  type AdminJob,
  type AdminUser,
  type AdminVariation,
  type ApiUsage,
  type JobErrorCode,
  type JobStage,
  type LedgerEntry,
  type ServiceHealth,
  type StageEvent,
  type WaitlistEntry,
} from "./admin-types";

/* -------------------------------------------------------------------------- */
/* Deterministic randomness                                                   */
/* -------------------------------------------------------------------------- */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260814);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const intBetween = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));

/** Frozen clock. Everything relative ("12 mins ago") is measured from here. */
export const NOW = Date.UTC(2026, 7, 14, 14, 30, 0);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Billing cycle length, and where the current one began. Grants, balances and
    every "this cycle" figure key off these — exported so the stats layer can't
    drift from the generator. */
export const CYCLE_LENGTH_DAYS = 30;
export const CYCLE_ELAPSED_DAYS = 24;
export const CYCLE_START = NOW - CYCLE_ELAPSED_DAYS * DAY;
export const DAYS_TO_RESET = CYCLE_LENGTH_DAYS - CYCLE_ELAPSED_DAYS;

/* -------------------------------------------------------------------------- */
/* Name pools                                                                 */
/* -------------------------------------------------------------------------- */

const FIRST = [
  "Alex", "Sarah", "Marcus", "Elena", "David", "Maria", "Yuki", "Liam",
  "Chloe", "Mateo", "Priya", "Noah", "Amara", "Tomas", "Ines", "Kwame",
  "Hana", "Diego", "Nadia", "Felix", "Zara", "Omar", "Lena", "Ravi",
  "Sofia", "Jonas", "Aisha", "Ethan", "Mila", "Caleb",
];
const LAST = [
  "Johnson", "Jenkins", "Thorne", "Rodriguez", "Kim", "Garcia", "Tanaka",
  "Thompson", "Martinez", "Ruiz", "Sharma", "Bennett", "Okafor", "Silva",
  "Costa", "Mensah", "Sato", "Alvarez", "Haddad", "Meyer", "Ahmed", "Novak",
  "Fischer", "Patel", "Rossi", "Lindqvist", "Diallo", "Walsh", "Petrova", "Reid",
];
const DOMAINS = [
  "gmail.com", "agency.co", "design.studio", "creative.jp", "marketing.net",
  "studios.inc", "brandlab.io", "outlook.com", "growthco.com", "media.house",
];
const CATEGORIES = [
  "E-commerce", "Fitness", "SaaS", "Beauty", "Food & Drink", "Fashion",
];
const FILE_STEMS = [
  "hero_ad_final", "spring_campaign", "product_launch_v3", "testimonial_cut",
  "black_friday_master", "brand_story", "ugc_creator_01", "founder_pitch",
  "demo_reel_final", "summer_promo", "app_walkthrough", "before_after",
];

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

/* Distribution tuned to a healthy freemium shape: ~12% free→paid conversion,
   with Creator as the fat middle. Matches the pricing page exactly. */
const PLAN_MIX: [PlanId, number][] = [
  ["free", 560],
  ["plus", 16],
  ["starter", 20],
  ["creator", 26],
  ["pro", 12],
  ["business", 6],
];

function buildUsers(): AdminUser[] {
  const users: AdminUser[] = [];
  let n = 0;

  for (const [plan, count] of PLAN_MIX) {
    for (let i = 0; i < count; i++) {
      const first = pick(FIRST);
      const last = pick(LAST);
      const id = `usr_${(n + 1).toString(36).padStart(6, "0")}`;
      // Paid users skew older — they've had time to convert.
      const ageDays = plan === "free" ? between(0, 120) : between(14, 200);
      const createdAt = NOW - ageDays * DAY;
      const dormant = rand() < 0.18;

      users.push({
        id,
        name: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@${pick(DOMAINS)}`,
        plan,
        status: rand() < 0.02 ? "suspended" : "active",
        role: "user",
        createdAt,
        lastActiveAt: dormant
          ? NOW - between(8, 45) * DAY
          : NOW - between(0.02, 6) * DAY,
        sharePublicly: rand() < 0.34,
        stripeCustomerId: plan === "free" ? null : `cus_${randomId(14)}`,
      });
      n++;
    }
  }

  return users.sort((a, b) => b.createdAt - a.createdAt);
}

function randomId(len: number) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(rand() * chars.length)];
  return out;
}

/* -------------------------------------------------------------------------- */
/* Jobs                                                                       */
/* -------------------------------------------------------------------------- */

const ERROR_DETAIL: Record<JobErrorCode, string> = {
  SOURCE_TOO_LONG: "Source runs 2:14 — the pipeline maximum is 1:30.",
  UNSUPPORTED_CODEC: "FFmpeg could not decode stream 0: VP9 inside a MOV container.",
  TWELVELABS_TIMEOUT: "Indexing did not return within the 300s ceiling.",
  TWELVELABS_RATE_LIMIT: "429 Too Many Requests from TwelveLabs — org concurrency cap hit.",
  NO_SPEECH_DETECTED: "Whisper returned an empty transcript; no dialogue to anchor cuts on.",
  EDL_INVALID: "Model returned an edit plan with overlapping segments (2 and 3 collide).",
  RENDER_OOM: "Render worker exceeded 2 GB on a 4K source before downscale.",
  STORAGE_UPLOAD_FAILED: "R2 rejected the multipart upload — part 3 checksum mismatch.",
};

/* Weighted so the common infra failures dominate, the way they do in reality. */
const ERROR_POOL: JobErrorCode[] = [
  "TWELVELABS_TIMEOUT", "TWELVELABS_TIMEOUT", "TWELVELABS_TIMEOUT",
  "TWELVELABS_RATE_LIMIT", "TWELVELABS_RATE_LIMIT",
  "UNSUPPORTED_CODEC", "UNSUPPORTED_CODEC",
  "RENDER_OOM",
  "EDL_INVALID",
  "NO_SPEECH_DETECTED",
  "SOURCE_TOO_LONG",
  "STORAGE_UPLOAD_FAILED",
];

/** Verified cost model: ~$0.15 for a 90s video, TwelveLabs ≈90% of it. */
function costFor(durationS: number): ApiUsage[] {
  const mins = durationS / 60;
  return [
    {
      provider: "twelvelabs",
      units: round(mins, 2),
      unitLabel: "min indexed",
      costCents: round(mins * 9.0, 2),
    },
    {
      provider: "openai_whisper",
      units: round(mins, 2),
      unitLabel: "min audio",
      costCents: round(mins * 0.6, 2),
    },
    {
      provider: "openai_gpt",
      units: intBetween(2400, 4200),
      unitLabel: "tokens",
      costCents: round(between(0.14, 0.28), 2),
    },
    {
      provider: "storage",
      units: round(between(0.12, 0.4), 2),
      unitLabel: "GB-month",
      costCents: round(between(0.18, 0.32), 2),
    },
    {
      provider: "egress",
      units: round(between(0.05, 0.2), 2),
      unitLabel: "GB",
      costCents: round(between(0.1, 0.2), 2),
    },
  ];
}

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;

function buildStages(createdAt: number, failAt: JobStage | null): StageEvent[] {
  const plan: [JobStage, number, number][] = [
    ["queued", 2_000, 40_000],
    ["analyzing", 38_000, 95_000],
    ["planning", 6_000, 16_000],
    ["rendering", 42_000, 130_000],
  ];

  const out: StageEvent[] = [];
  let t = createdAt;
  for (const [stage, lo, hi] of plan) {
    const durationMs = Math.round(between(lo, hi));
    if (failAt === stage) {
      out.push({ stage, startedAt: t, durationMs, status: "failed" });
      return out;
    }
    out.push({ stage, startedAt: t, durationMs, status: "done" });
    t += durationMs;
  }
  return out;
}

function buildVariations(finishedAt: number | null): AdminVariation[] {
  return STRATEGIES.map((strategy, i) => {
    const slot = (i + 1) as 1 | 2 | 3;
    if (!finishedAt) {
      return { slot, strategy, status: "pending" as const, downloadedAt: null, downloadCount: 0 };
    }
    /* The flywheel signal. Hook-first genuinely out-performs in the sample so
       the Insights screen has a real story to tell, and slot 1 carries a mild
       position bias — exactly the kind of confound the real data will have. */
    const base =
      strategy === "Hook-first" ? 0.52 : strategy === "Problem → Solution" ? 0.34 : 0.26;
    const positionBias = slot === 1 ? 0.05 : 0;
    const downloaded = rand() < base + positionBias;
    return {
      slot,
      strategy,
      status: "ready" as const,
      downloadedAt: downloaded ? finishedAt + between(1, 40) * MIN : null,
      downloadCount: downloaded ? intBetween(1, 3) : 0,
    };
  });
}

function buildJob(user: AdminUser, createdAt: number, seq: number): AdminJob {
  const durationS = Math.round(between(58, 94));
  const sizeMb = round(durationS * between(1.1, 2.4), 1);
  const id = `job_${(seq + 1000).toString(36)}`;

  const age = NOW - createdAt;
  const failed = rand() < 0.023;
  // Jobs from the last few minutes are still moving through the pipeline.
  const inFlight = !failed && age < 4 * MIN;

  let stage: JobStage;
  let errorCode: JobErrorCode | null = null;
  let finishedAt: number | null = null;
  let stages: StageEvent[];

  if (failed) {
    errorCode = pick(ERROR_POOL);
    const failStage: JobStage =
      errorCode === "SOURCE_TOO_LONG" || errorCode === "UNSUPPORTED_CODEC"
        ? "queued"
        : errorCode === "RENDER_OOM" || errorCode === "STORAGE_UPLOAD_FAILED"
          ? "rendering"
          : errorCode === "EDL_INVALID"
            ? "planning"
            : "analyzing";
    stage = "failed";
    stages = buildStages(createdAt, failStage);
    finishedAt = stages[stages.length - 1].startedAt + stages[stages.length - 1].durationMs;
  } else if (inFlight) {
    stages = buildStages(createdAt, null);
    const reached = intBetween(0, 3);
    stage = stages[reached].stage;
    stages = stages.map((s, i) => ({
      ...s,
      status: i < reached ? "done" : i === reached ? "running" : "pending",
    }));
  } else {
    stage = "ready";
    stages = buildStages(createdAt, null);
    const last = stages[stages.length - 1];
    finishedAt = last.startedAt + last.durationMs;
  }

  const apiUsage = costFor(durationS);
  // A job that dies before rendering never incurs the full cost.
  const chargedUsage =
    stage === "failed"
      ? apiUsage.filter((u) =>
          stages.some((s) => s.stage === "analyzing") ? u.provider !== "egress" : u.provider === "storage"
        )
      : apiUsage;

  return {
    id,
    userId: user.id,
    fileName: `${pick(FILE_STEMS)}.mp4`,
    durationS,
    sizeMb,
    category: pick(CATEGORIES),
    stage,
    createdAt,
    startedAt: createdAt + intBetween(2000, 30000),
    finishedAt,
    errorCode,
    errorMessage: errorCode ? ERROR_DETAIL[errorCode] : null,
    retryCount: errorCode && rand() < 0.35 ? intBetween(1, 2) : 0,
    costCents: round(
      chargedUsage.reduce((s, u) => s + u.costCents, 0),
      2
    ),
    // A failed job must return the token. The 6% that haven't are deliberate:
    // the Overview surfaces them as an alert, because in production this is
    // exactly the silent bug that costs you a customer.
    tokenRefunded: stage === "failed" ? rand() > 0.06 : false,
    stages,
    variations: buildVariations(finishedAt && stage === "ready" ? finishedAt : null),
    apiUsage: chargedUsage,
  };
}

/* -------------------------------------------------------------------------- */
/* Assembly — jobs, then a ledger derived from them                           */
/* -------------------------------------------------------------------------- */

function buildJobsAndLedger(users: AdminUser[]) {
  const jobs: AdminJob[] = [];
  const ledger: LedgerEntry[] = [];
  let seq = 0;
  let ledgerSeq = 0;

  const addEntry = (e: Omit<LedgerEntry, "id">) => {
    ledger.push({ ...e, id: `led_${(ledgerSeq++ + 5000).toString(36)}` });
  };

  for (const user of users) {
    const plan = getPlan(user.plan);
    const eager = rand();
    // How much of their allowance they actually burn this cycle.
    const utilisation =
      user.status === "suspended" ? 0 : eager < 0.22 ? 0 : eager < 0.6 ? between(0.15, 0.5) : between(0.5, 1);
    const cycleJobs = Math.min(plan.tokens, Math.round(plan.tokens * utilisation));

    // Grant at the start of the cycle.
    addEntry({
      userId: user.id,
      delta: plan.tokens,
      reason: "monthly_grant",
      jobId: null,
      adminId: null,
      note: `${plan.name} plan — ${plan.tokens} tokens`,
      createdAt: Math.max(CYCLE_START, user.createdAt),
    });

    // Historic jobs from previous cycles — they shape totals and charts but
    // don't touch the current balance.
    const historyCount =
      user.plan === "free" ? intBetween(0, 2) : intBetween(0, Math.round(plan.tokens * 1.2));
    for (let i = 0; i < historyCount; i++) {
      const createdAt = user.createdAt + between(0.5, 1) * (CYCLE_START - user.createdAt);
      if (createdAt >= CYCLE_START || createdAt < user.createdAt) continue;
      jobs.push(buildJob(user, createdAt, seq++));
    }

    // Current-cycle jobs, each backed by a ledger reservation.
    for (let i = 0; i < cycleJobs; i++) {
      // Weight recent: t^0.6 clusters activity toward today.
      const t = Math.pow(rand(), 0.6);
      const createdAt = CYCLE_START + (1 - t) * (NOW - CYCLE_START);
      const job = buildJob(user, createdAt, seq++);
      jobs.push(job);

      addEntry({
        userId: user.id,
        delta: -1,
        reason: "job_reserve",
        jobId: job.id,
        adminId: null,
        note: job.fileName,
        createdAt: job.createdAt,
      });

      if (job.stage === "failed" && job.tokenRefunded) {
        addEntry({
          userId: user.id,
          delta: 1,
          reason: "job_refund",
          jobId: job.id,
          adminId: null,
          note: ERROR_LABEL[job.errorCode!],
          createdAt: (job.finishedAt ?? job.createdAt) + 30_000,
        });
      }
    }

    // Occasional goodwill top-up from support.
    if (rand() < 0.04) {
      addEntry({
        userId: user.id,
        delta: intBetween(1, 3),
        reason: "admin_adjust",
        jobId: null,
        adminId: ADMIN.id,
        note: "Goodwill credit after a failed render",
        createdAt: NOW - between(1, 20) * DAY,
      });
    }
  }

  jobs.sort((a, b) => b.createdAt - a.createdAt);
  ledger.sort((a, b) => b.createdAt - a.createdAt);
  return { jobs, ledger };
}

/* -------------------------------------------------------------------------- */
/* The signed-in admin                                                        */
/* -------------------------------------------------------------------------- */

export const ADMIN = {
  id: "usr_admin01",
  name: "Sarah Jenkins",
  email: "sarah@admultiply.io",
  role: "admin" as const,
};

/* -------------------------------------------------------------------------- */
/* Infrastructure snapshot                                                    */
/* -------------------------------------------------------------------------- */

export const SERVICES: ServiceHealth[] = [
  {
    key: "twelvelabs",
    name: "TwelveLabs",
    description: "Scene indexing & video understanding",
    status: "operational",
    latencyMs: 112,
    detail: "No errors in the last hour",
  },
  {
    key: "openai",
    name: "OpenAI",
    description: "Whisper transcription & GPT-4o Mini edit planning",
    status: "operational",
    latencyMs: 84,
    detail: "No errors in the last hour",
  },
  {
    key: "queue",
    name: "Celery / Redis",
    description: "Task queue and worker pool",
    status: "degraded",
    latencyMs: 6,
    detail: "Queue depth above threshold — 14 waiting",
  },
  {
    key: "storage",
    name: "Cloudflare R2",
    description: "Source uploads and rendered output",
    status: "operational",
    latencyMs: 21,
    detail: "Zero egress billing",
  },
  {
    key: "db",
    name: "Supabase Postgres",
    description: "Application database and auth",
    status: "operational",
    latencyMs: 18,
    detail: "34 of 200 connections in use",
  },
  {
    key: "stripe",
    name: "Stripe",
    description: "Subscriptions and checkout",
    status: "operational",
    latencyMs: 45,
    detail: "Webhooks current — 0 pending",
  },
];

export const QUEUE = {
  depth: 14,
  activeWorkers: 3,
  totalWorkers: 4,
  oldestWaitS: 96,
};

/* -------------------------------------------------------------------------- */
/* Waitlist                                                                   */
/* -------------------------------------------------------------------------- */

const WL_ROLES = ["Brand / in-house", "Agency", "Creator", "Freelancer", "Other"];
const WL_SPEND = ["< $1k / mo", "$1k–5k / mo", "$5k–20k / mo", "$20k+ / mo"];
const WL_CHANNEL = ["Meta Ads", "TikTok", "YouTube", "Google Ads (PPC)", "Other"];

function buildWaitlist(): WaitlistEntry[] {
  const out: WaitlistEntry[] = [];
  for (let i = 0; i < 214; i++) {
    const first = pick(FIRST);
    const last = pick(LAST);
    const surveyed = rand() < 0.63;
    out.push({
      id: `wl_${(i + 100).toString(36)}`,
      email: `${first.toLowerCase()}${last.toLowerCase().slice(0, 3)}@${pick(DOMAINS)}`,
      company: rand() < 0.55 ? `${last} ${pick(["Studio", "Media", "Labs", "& Co", "Digital"])}` : null,
      role: surveyed ? pick(WL_ROLES) : null,
      spend: surveyed ? pick(WL_SPEND) : null,
      channel: surveyed ? pick(WL_CHANNEL) : null,
      createdAt: NOW - between(0, 46) * DAY,
      surveyed,
    });
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

/* -------------------------------------------------------------------------- */
/* Frozen dataset — generated once per module load                            */
/* -------------------------------------------------------------------------- */

export const USERS = buildUsers();
const { jobs: JOBS_RAW, ledger: LEDGER_RAW } = buildJobsAndLedger(USERS);
export const JOBS = JOBS_RAW;
export const LEDGER = LEDGER_RAW;
export const WAITLIST = buildWaitlist();

/** MRR from real subscriptions, not a typed-in figure. */
export const MRR = USERS.filter((u) => u.status === "active").reduce(
  (sum, u) => sum + getPlan(u.plan).price,
  0
);

export const PLAN_COUNTS = PLANS.map((p) => ({
  plan: p,
  count: USERS.filter((u) => u.plan === p.id).length,
}));
