/* ---------------------------------------------------------------------------
   Derived metrics.

   Pure functions over the current dataset — no hidden state, so the same
   figures hold after an admin refunds a token or retries a job. In production
   each of these becomes a SQL query (or a materialised view once the tables
   get big); the shapes below are what the API should return.
--------------------------------------------------------------------------- */

import { getPlan } from "./plans";
import { CYCLE_START, NOW } from "./admin-mock";
import {
  PROVIDER_LABEL,
  STRATEGIES,
  type AdminJob,
  type AdminUser,
  type ApiProvider,
  type LedgerEntry,
} from "./admin-types";

const DAY = 86_400_000;

/** Verified baseline from docs/backend-mvp-plan.md — the line margins depend on. */
export const COST_BASELINE_CENTS = 15;

const startOfDay = (t: number) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

export const TODAY_START = startOfDay(NOW);
export { CYCLE_START };

/* -------------------------------------------------------------------------- */
/* Per-user                                                                   */
/* -------------------------------------------------------------------------- */

/** Balance is SUM(delta) for the cycle — never a stored column. */
export function balanceFor(ledger: LedgerEntry[], userId: string): number {
  return ledger
    .filter((e) => e.userId === userId && e.createdAt >= CYCLE_START)
    .reduce((s, e) => s + e.delta, 0);
}

export function ledgerFor(ledger: LedgerEntry[], userId: string): LedgerEntry[] {
  return ledger.filter((e) => e.userId === userId);
}

export function jobsFor(jobs: AdminJob[], userId: string): AdminJob[] {
  return jobs.filter((j) => j.userId === userId);
}

export function userCost(jobs: AdminJob[], userId: string): number {
  return jobs.filter((j) => j.userId === userId).reduce((s, j) => s + j.costCents, 0);
}

/* -------------------------------------------------------------------------- */
/* Time series                                                                */
/* -------------------------------------------------------------------------- */

export type DayBucket = {
  day: number;
  label: string;
  total: number;
  failed: number;
  costCents: number;
};

export function dailySeries(jobs: AdminJob[], days: number): DayBucket[] {
  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = TODAY_START - i * DAY;
    buckets.push({
      day,
      label: new Date(day).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
      total: 0,
      failed: 0,
      costCents: 0,
    });
  }

  const index = new Map(buckets.map((b, i) => [b.day, i]));
  for (const job of jobs) {
    const i = index.get(startOfDay(job.createdAt));
    if (i === undefined) continue;
    buckets[i].total++;
    buckets[i].costCents += job.costCents;
    if (job.stage === "failed") buckets[i].failed++;
  }
  return buckets;
}

/* -------------------------------------------------------------------------- */
/* Overview                                                                   */
/* -------------------------------------------------------------------------- */

export type Alert = {
  id: string;
  tone: "danger" | "warning";
  title: string;
  detail: string;
  href?: string;
  cta?: string;
};

export function overviewStats(
  users: AdminUser[],
  jobs: AdminJob[],
  queueDepth: number,
  degradedServices: number
) {
  const since = (t: number) => jobs.filter((j) => j.createdAt >= t);
  const today = since(TODAY_START);
  const yesterday = jobs.filter(
    (j) => j.createdAt >= TODAY_START - DAY && j.createdAt < TODAY_START
  );
  const last7 = since(NOW - 7 * DAY);

  const signupsToday = users.filter((u) => u.createdAt >= TODAY_START).length;
  const signupsYesterday = users.filter(
    (u) => u.createdAt >= TODAY_START - DAY && u.createdAt < TODAY_START
  ).length;

  const inFlight = jobs.filter(
    (j) => j.stage !== "ready" && j.stage !== "failed"
  ).length;

  const failed7 = last7.filter((j) => j.stage === "failed").length;
  const failureRate = last7.length ? (failed7 / last7.length) * 100 : 0;

  const spendToday = today.reduce((s, j) => s + j.costCents, 0);
  const spendYesterday = yesterday.reduce((s, j) => s + j.costCents, 0);

  const billable7 = last7.filter((j) => j.stage === "ready");
  const costPerVideo = billable7.length
    ? billable7.reduce((s, j) => s + j.costCents, 0) / billable7.length
    : 0;

  // Failed jobs that never returned the customer's token — silent revenue bug.
  const unrefunded = jobs.filter((j) => j.stage === "failed" && !j.tokenRefunded);

  const alerts: Alert[] = [];
  if (unrefunded.length) {
    alerts.push({
      id: "unrefunded",
      tone: "danger",
      title: `${unrefunded.length} failed job${unrefunded.length === 1 ? "" : "s"} never refunded a token`,
      detail: "Customers were charged for work that never completed. Refund from the job detail.",
      href: "/admin/jobs?filter=unrefunded",
      cta: "Review",
    });
  }
  if (costPerVideo > COST_BASELINE_CENTS * 1.15) {
    alerts.push({
      id: "cost",
      tone: "warning",
      title: `Cost per video is ${fmtCents(costPerVideo)} against a ${fmtCents(COST_BASELINE_CENTS)} baseline`,
      detail: "Margins compress if this holds. Check average source duration and retry loops.",
      href: "/admin/ai-usage",
      cta: "Break down",
    });
  }
  if (queueDepth > 10) {
    alerts.push({
      id: "queue",
      tone: "warning",
      title: `Queue depth is ${queueDepth}`,
      detail: "Jobs are waiting longer than usual. Consider scaling the render workers.",
    });
  }
  if (failureRate > 5) {
    alerts.push({
      id: "failrate",
      tone: "danger",
      title: `Failure rate is ${failureRate.toFixed(1)}% over 7 days`,
      detail: "Above the 5% tolerance. Group failures by error code to find the cause.",
      href: "/admin/jobs?filter=failed",
      cta: "Inspect",
    });
  }
  if (degradedServices > 0) {
    alerts.push({
      id: "services",
      tone: "warning",
      title: `${degradedServices} service${degradedServices === 1 ? " is" : "s are"} degraded`,
      detail: "See system health below for the affected dependency.",
    });
  }

  return {
    signupsToday,
    signupsDelta: signupsToday - signupsYesterday,
    processedToday: today.filter((j) => j.stage === "ready").length,
    processedDelta:
      today.filter((j) => j.stage === "ready").length -
      yesterday.filter((j) => j.stage === "ready").length,
    inFlight,
    failureRate,
    failed7,
    total7: last7.length,
    spendToday,
    spendDelta: spendToday - spendYesterday,
    costPerVideo,
    totalUsers: users.length,
    alerts,
  };
}

/* -------------------------------------------------------------------------- */
/* Cost & AI usage                                                            */
/* -------------------------------------------------------------------------- */

export function costStats(jobs: AdminJob[], users: AdminUser[], ledger: LedgerEntry[]) {
  const cycle = jobs.filter((j) => j.createdAt >= CYCLE_START);
  const today = jobs.filter((j) => j.createdAt >= TODAY_START);

  const byProvider = new Map<ApiProvider, { cents: number; calls: number }>();
  for (const job of cycle) {
    for (const u of job.apiUsage) {
      const cur = byProvider.get(u.provider) ?? { cents: 0, calls: 0 };
      cur.cents += u.costCents;
      cur.calls += 1;
      byProvider.set(u.provider, cur);
    }
  }
  const cycleTotal = [...byProvider.values()].reduce((s, v) => s + v.cents, 0);

  const providers = [...byProvider.entries()]
    .map(([provider, v]) => ({
      provider,
      label: PROVIDER_LABEL[provider],
      cents: v.cents,
      calls: v.calls,
      share: cycleTotal ? (v.cents / cycleTotal) * 100 : 0,
    }))
    .sort((a, b) => b.cents - a.cents);

  // Token movement this cycle, straight off the ledger.
  const cycleLedger = ledger.filter((e) => e.createdAt >= CYCLE_START);
  const sumBy = (reason: string) =>
    cycleLedger.filter((e) => e.reason === reason).reduce((s, e) => s + Math.abs(e.delta), 0);

  const freeUserIds = new Set(users.filter((u) => u.plan === "free").map((u) => u.id));
  const freeBurn = cycle
    .filter((j) => freeUserIds.has(j.userId))
    .reduce((s, j) => s + j.costCents, 0);

  // Heaviest spenders — spots abuse before the invoice does.
  const perUser = new Map<string, { cents: number; jobs: number }>();
  for (const job of cycle) {
    const cur = perUser.get(job.userId) ?? { cents: 0, jobs: 0 };
    cur.cents += job.costCents;
    cur.jobs += 1;
    perUser.set(job.userId, cur);
  }
  const topSpenders = [...perUser.entries()]
    .map(([userId, v]) => ({ user: users.find((u) => u.id === userId), ...v }))
    .filter((r) => r.user)
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 8);

  const billable = cycle.filter((j) => j.stage === "ready");

  return {
    spendToday: today.reduce((s, j) => s + j.costCents, 0),
    spendCycle: cycleTotal,
    providers,
    costPerVideo: billable.length
      ? billable.reduce((s, j) => s + j.costCents, 0) / billable.length
      : 0,
    videosCycle: billable.length,
    granted: sumBy("monthly_grant"),
    consumed: sumBy("job_reserve"),
    refunded: sumBy("job_refund"),
    adjusted: sumBy("admin_adjust"),
    freeBurn,
    freeUsers: freeUserIds.size,
    topSpenders,
    /* Cost of a wasted job — money spent on renders nobody kept. */
    wasted: cycle
      .filter((j) => j.stage === "failed")
      .reduce((s, j) => s + j.costCents, 0),
  };
}

/* -------------------------------------------------------------------------- */
/* The flywheel                                                               */
/* -------------------------------------------------------------------------- */

export function flywheelStats(jobs: AdminJob[]) {
  const ready = jobs.filter((j) => j.stage === "ready");

  const byStrategy = STRATEGIES.map((strategy) => {
    const all = ready.flatMap((j) => j.variations.filter((v) => v.strategy === strategy));
    const won = all.filter((v) => v.downloadedAt).length;
    return {
      strategy,
      generated: all.length,
      downloaded: won,
      winRate: all.length ? (won / all.length) * 100 : 0,
    };
  }).sort((a, b) => b.winRate - a.winRate);

  const bySlot = ([1, 2, 3] as const).map((slot) => {
    const all = ready.flatMap((j) => j.variations.filter((v) => v.slot === slot));
    const won = all.filter((v) => v.downloadedAt).length;
    return {
      slot,
      generated: all.length,
      downloaded: won,
      winRate: all.length ? (won / all.length) * 100 : 0,
    };
  });

  const categories = [...new Set(ready.map((j) => j.category))]
    .map((category) => {
      const inCat = ready.filter((j) => j.category === category);
      const vars = inCat.flatMap((j) => j.variations);
      const won = vars.filter((v) => v.downloadedAt).length;
      const best = STRATEGIES.map((s) => {
        const sv = vars.filter((v) => v.strategy === s);
        const sw = sv.filter((v) => v.downloadedAt).length;
        return { strategy: s, rate: sv.length ? sw / sv.length : 0 };
      }).sort((a, b) => b.rate - a.rate)[0];
      return {
        category,
        jobs: inCat.length,
        winRate: vars.length ? (won / vars.length) * 100 : 0,
        bestStrategy: best.strategy,
      };
    })
    .sort((a, b) => b.jobs - a.jobs);

  const totalVariations = ready.length * 3;
  const totalDownloaded = ready.flatMap((j) => j.variations).filter((v) => v.downloadedAt).length;

  // Jobs where the user kept at least one variation — the real quality signal.
  const jobsWithAKeeper = ready.filter((j) => j.variations.some((v) => v.downloadedAt)).length;

  return {
    byStrategy,
    bySlot,
    categories,
    totalVariations,
    totalDownloaded,
    downloadRate: totalVariations ? (totalDownloaded / totalVariations) * 100 : 0,
    keeperRate: ready.length ? (jobsWithAKeeper / ready.length) * 100 : 0,
    labelledJobs: ready.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Revenue (display-only — Stripe stays the source of truth)                  */
/* -------------------------------------------------------------------------- */

export function revenueStats(users: AdminUser[]) {
  const active = users.filter((u) => u.status === "active");
  const paid = active.filter((u) => u.plan !== "free");
  const mrr = active.reduce((s, u) => s + getPlan(u.plan).price, 0);
  const newPaid = paid.filter((u) => u.createdAt >= CYCLE_START).length;

  return {
    mrr,
    arr: mrr * 12,
    paidCount: paid.length,
    freeCount: active.length - paid.length,
    arpu: paid.length ? mrr / paid.length : 0,
    conversion: active.length ? (paid.length / active.length) * 100 : 0,
    newPaid,
    suspended: users.filter((u) => u.status === "suspended").length,
  };
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

export const fmtCents = (c: number) =>
  c >= 100 ? `$${(c / 100).toFixed(2)}` : `${c.toFixed(1)}¢`;

export const fmtMoney = (dollars: number) =>
  `$${dollars.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const fmtNum = (n: number) => n.toLocaleString("en-US");

export function fmtAgo(t: number, now = NOW): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(t).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export const fmtDuration = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export function fmtElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}
