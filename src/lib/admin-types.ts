/* ---------------------------------------------------------------------------
   Admin data contract.

   These types are the specification for the backend, not just props for the
   demo screens. Every field below maps to a column the pipeline must write —
   if a row isn't written at processing time, the corresponding admin screen
   can never reconstruct it afterwards.

   Postgres tables implied by this file:
     users          — identity lives in Supabase Auth; this holds platform state
     jobs           — one row per upload, the pipeline state machine
     job_stages     — one row per stage transition (timeline + durations)
     variations     — three rows per job; downloaded_at powers the flywheel
     token_ledger   — APPEND-ONLY. Balance is SUM(delta), never a stored column
     api_usage      — one row per provider call, per job. Powers cost-per-video

   See docs/backend-architecture.md for the write-side responsibilities.
--------------------------------------------------------------------------- */

import type { PlanId } from "./plans";

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

export type UserStatus = "active" | "suspended";
export type UserRole = "user" | "admin";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  plan: PlanId;
  status: UserStatus;
  role: UserRole;
  createdAt: number;
  lastActiveAt: number;
  /** Showcase consent — opt-in, default false. Gates the public gallery. */
  sharePublicly: boolean;
  /** Deep-link target for Stripe; null while on Free. */
  stripeCustomerId: string | null;
};

/* -------------------------------------------------------------------------- */
/* Jobs — the pipeline state machine                                          */
/* -------------------------------------------------------------------------- */

export type JobStage =
  | "queued"
  | "analyzing"
  | "planning"
  | "rendering"
  | "ready"
  | "failed";

/** Ordered pipeline stages, excluding terminal states. */
export const PIPELINE_STAGES: JobStage[] = [
  "queued",
  "analyzing",
  "planning",
  "rendering",
];

export const STAGE_LABEL: Record<JobStage, string> = {
  queued: "Queued",
  analyzing: "Analyzing",
  planning: "Planning",
  rendering: "Rendering",
  ready: "Ready",
  failed: "Failed",
};

/**
 * Error codes are a closed set on purpose: the admin can filter by them, and
 * each one maps to a known remediation. Anything unclassified goes to Sentry
 * with a stack trace — this table is for *expected* failures only.
 */
export type JobErrorCode =
  | "SOURCE_TOO_LONG"
  | "UNSUPPORTED_CODEC"
  | "TWELVELABS_TIMEOUT"
  | "TWELVELABS_RATE_LIMIT"
  | "NO_SPEECH_DETECTED"
  | "EDL_INVALID"
  | "RENDER_OOM"
  | "STORAGE_UPLOAD_FAILED";

export const ERROR_LABEL: Record<JobErrorCode, string> = {
  SOURCE_TOO_LONG: "Source too long",
  UNSUPPORTED_CODEC: "Unsupported codec",
  TWELVELABS_TIMEOUT: "TwelveLabs timeout",
  TWELVELABS_RATE_LIMIT: "TwelveLabs rate limit",
  NO_SPEECH_DETECTED: "No speech detected",
  EDL_INVALID: "Invalid edit plan",
  RENDER_OOM: "Render out of memory",
  STORAGE_UPLOAD_FAILED: "Storage upload failed",
};

/** Whether a retry is worth attempting, or the input itself is the problem. */
export const ERROR_RETRYABLE: Record<JobErrorCode, boolean> = {
  SOURCE_TOO_LONG: false,
  UNSUPPORTED_CODEC: false,
  TWELVELABS_TIMEOUT: true,
  TWELVELABS_RATE_LIMIT: true,
  NO_SPEECH_DETECTED: false,
  EDL_INVALID: true,
  RENDER_OOM: true,
  STORAGE_UPLOAD_FAILED: true,
};

export type StageEvent = {
  stage: JobStage;
  startedAt: number;
  durationMs: number;
  status: "done" | "failed" | "running" | "pending";
};

export type VariationStrategy =
  | "Hook-first"
  | "Problem → Solution"
  | "Social proof";

export const STRATEGIES: VariationStrategy[] = [
  "Hook-first",
  "Problem → Solution",
  "Social proof",
];

export type AdminVariation = {
  /** 1, 2 or 3 — slot position matters for the flywheel (is slot 1 favoured?). */
  slot: 1 | 2 | 3;
  strategy: VariationStrategy;
  status: "pending" | "rendering" | "ready";
  /** null = never downloaded. This single field is the flywheel's raw signal. */
  downloadedAt: number | null;
  downloadCount: number;
};

export type ApiProvider =
  | "twelvelabs"
  | "openai_whisper"
  | "openai_gpt"
  | "storage"
  | "egress";

export const PROVIDER_LABEL: Record<ApiProvider, string> = {
  twelvelabs: "TwelveLabs",
  openai_whisper: "OpenAI Whisper",
  openai_gpt: "OpenAI GPT-4o Mini",
  storage: "R2 storage",
  egress: "R2 egress",
};

export type ApiUsage = {
  provider: ApiProvider;
  /** Provider-native unit — minutes indexed, audio minutes, tokens, GB. */
  units: number;
  unitLabel: string;
  costCents: number;
};

export type AdminJob = {
  id: string;
  userId: string;
  fileName: string;
  durationS: number;
  sizeMb: number;
  category: string;
  stage: JobStage;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  errorCode: JobErrorCode | null;
  errorMessage: string | null;
  retryCount: number;
  /** Sum of apiUsage — denormalised so the jobs list doesn't need a join. */
  costCents: number;
  /** Failed jobs must return the token. Unrefunded failures are a bug. */
  tokenRefunded: boolean;
  stages: StageEvent[];
  variations: AdminVariation[];
  apiUsage: ApiUsage[];
};

/* -------------------------------------------------------------------------- */
/* Token ledger — append-only                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A balance is never stored. It is SUM(delta) for the current cycle.
 * This makes every adjustment auditable by construction: the audit log isn't
 * a feature we build, it's a consequence of modelling tokens correctly.
 */
export type LedgerReason =
  | "monthly_grant"
  | "job_reserve"
  | "job_refund"
  | "admin_adjust"
  | "plan_change";

export const LEDGER_LABEL: Record<LedgerReason, string> = {
  monthly_grant: "Monthly grant",
  job_reserve: "Held for upload",
  job_refund: "Refunded — job failed",
  admin_adjust: "Admin adjustment",
  plan_change: "Plan change",
};

export type LedgerEntry = {
  id: string;
  userId: string;
  /** Positive = granted, negative = consumed. */
  delta: number;
  reason: LedgerReason;
  jobId: string | null;
  /** Set only for admin_adjust — who did it. Never null for that reason. */
  adminId: string | null;
  note: string | null;
  createdAt: number;
};

/* -------------------------------------------------------------------------- */
/* Infrastructure                                                             */
/* -------------------------------------------------------------------------- */

export type ServiceStatus = "operational" | "degraded" | "down";

export type ServiceHealth = {
  key: string;
  name: string;
  description: string;
  status: ServiceStatus;
  /** Round-trip in ms, or null for services we measure differently. */
  latencyMs: number | null;
  detail: string;
};

export type QueueHealth = {
  depth: number;
  activeWorkers: number;
  totalWorkers: number;
  /** Seconds the oldest queued job has been waiting — the real SLA signal. */
  oldestWaitS: number;
};

/* -------------------------------------------------------------------------- */
/* Waitlist (already live in Supabase)                                        */
/* -------------------------------------------------------------------------- */

export type WaitlistEntry = {
  id: string;
  email: string;
  company: string | null;
  role: string | null;
  spend: string | null;
  channel: string | null;
  createdAt: number;
  /** Survey completed vs. email-only capture on step 1. */
  surveyed: boolean;
};
