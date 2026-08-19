"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock,
  TriangleAlert,
} from "lucide-react";
import { useAdmin } from "@/components/admin/admin-provider";
import { DailyBars } from "@/components/admin/chart";
import {
  Meter,
  Panel,
  PanelHeader,
  SectionTitle,
  StatTile,
  StatusDot,
} from "@/components/admin/primitives";
import { Badge } from "@/components/ui/badge";
import { ERROR_LABEL } from "@/lib/admin-types";
import {
  COST_BASELINE_CENTS,
  dailySeries,
  fmtAgo,
  fmtCents,
  fmtNum,
  overviewStats,
} from "@/lib/admin-stats";

export default function AdminOverview() {
  const { users, jobs, services, queue } = useAdmin();

  const degraded = services.filter((s) => s.status !== "operational").length;
  const series = useMemo(() => dailySeries(jobs, 14), [jobs]);
  const stats = useMemo(
    () => overviewStats(users, jobs, queue.depth, degraded),
    [users, jobs, queue.depth, degraded]
  );

  const recentFailures = useMemo(
    () =>
      jobs
        .filter((j) => j.stage === "failed")
        .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
        .slice(0, 6),
    [jobs]
  );

  const costDelta = stats.costPerVideo - COST_BASELINE_CENTS;
  const costTone =
    stats.costPerVideo > COST_BASELINE_CENTS * 1.15
      ? "danger"
      : stats.costPerVideo > COST_BASELINE_CENTS
        ? "neutral"
        : "success";

  return (
    <div className="flex flex-col gap-5">
      {/* Alerts — silent when nothing is wrong, which is the point */}
      {stats.alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {stats.alerts.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`flex flex-wrap items-start gap-3 rounded-xl px-4 py-3 ring-1 ${
                a.tone === "danger"
                  ? "bg-red-500/[0.06] ring-red-500/20"
                  : "bg-amber-500/[0.07] ring-amber-500/20"
              }`}
            >
              <span
                className={`mt-px shrink-0 ${
                  a.tone === "danger"
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {a.tone === "danger" ? <CircleAlert size={16} /> : <TriangleAlert size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold">{a.title}</p>
                <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                  {a.detail}
                </p>
              </div>
              {a.href && (
                <Link
                  href={a.href}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold shadow-sm ring-1 ring-black/10 transition-colors hover:bg-black/[0.03] dark:bg-white/10 dark:text-white dark:ring-white/15"
                >
                  {a.cta}
                  <ArrowRight size={11} />
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Pulse */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile
          label="Signups today"
          value={fmtNum(stats.signupsToday)}
          delta={stats.signupsDelta}
          deltaLabel="vs yesterday"
        />
        <StatTile
          label="Videos processed"
          value={fmtNum(stats.processedToday)}
          delta={stats.processedDelta}
          deltaLabel="vs yesterday"
          series={series.map((d) => d.total)}
        />
        <StatTile
          label="Jobs in flight"
          value={fmtNum(stats.inFlight)}
          hint={`${queue.depth} queued · ${queue.activeWorkers}/${queue.totalWorkers} workers`}
          tone={stats.inFlight > 20 ? "danger" : "neutral"}
          href="/admin/jobs"
        />
        <StatTile
          label="Failure rate · 7d"
          value={`${stats.failureRate.toFixed(1)}%`}
          hint={`${stats.failed7} failed of ${fmtNum(stats.total7)}`}
          tone={stats.failureRate > 5 ? "danger" : "success"}
          href="/admin/jobs?filter=failed"
        />
        <StatTile
          label="AI spend today"
          value={fmtCents(stats.spendToday)}
          delta={Math.round(stats.spendDelta)}
          deltaLabel="¢ vs yesterday"
          invertDelta
          href="/admin/ai-usage"
        />
      </div>

      {/* Throughput + margin health */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Throughput — last 14 days"
            subtitle="Successful renders with failures stacked on top"
          />
          <div className="p-4">
            <DailyBars data={series} />
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          {/* The number margins live or die on */}
          <Panel className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                  Cost per video · 7d
                </p>
                <p
                  className={`mt-1.5 text-3xl font-bold tabular-nums tracking-tight ${
                    costTone === "danger"
                      ? "text-red-600 dark:text-red-400"
                      : costTone === "success"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : ""
                  }`}
                >
                  {fmtCents(stats.costPerVideo)}
                </p>
              </div>
              <Badge tone={costTone === "danger" ? "danger" : costTone === "success" ? "success" : "neutral"}>
                {costDelta >= 0 ? "+" : ""}
                {costDelta.toFixed(1)}¢ vs plan
              </Badge>
            </div>
            <Meter
              value={Math.min(stats.costPerVideo, COST_BASELINE_CENTS * 2)}
              max={COST_BASELINE_CENTS * 2}
              tone={costTone === "danger" ? "danger" : costTone === "success" ? "success" : "brand"}
              className="mt-3"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              Modelled baseline is {fmtCents(COST_BASELINE_CENTS)} per 90s video. Sustained
              drift above it compresses every plan&apos;s margin.
            </p>
          </Panel>

          <Panel className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              Render queue
            </p>
            <div className="mt-2.5 grid grid-cols-3 gap-3">
              <QueueStat label="Waiting" value={String(queue.depth)} warn={queue.depth > 10} />
              <QueueStat
                label="Workers"
                value={`${queue.activeWorkers}/${queue.totalWorkers}`}
              />
              <QueueStat
                label="Oldest wait"
                value={`${queue.oldestWaitS}s`}
                warn={queue.oldestWaitS > 120}
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              Deep task inspection lives in Flower — this is the at-a-glance read.
            </p>
          </Panel>
        </div>
      </div>

      {/* Health + recent failures */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <span id="health" className="block scroll-mt-24" />
          <PanelHeader
            title="System health"
            subtitle="Live dependency checks — errors and stack traces go to Sentry"
          />
          <ul className="divide-y divide-[var(--color-border-subtle)] dark:divide-[var(--color-border-dark-subtle)]">
            {services.map((s) => (
              <li key={s.key} className="flex items-center gap-3 px-4 py-2.5">
                <StatusDot status={s.status} pulse />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{s.name}</p>
                  <p className="truncate text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                    {s.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-[11px] font-bold capitalize ${
                      s.status === "operational"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : s.status === "degraded"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {s.status}
                  </p>
                  <p className="text-[10px] tabular-nums text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                    {s.latencyMs !== null ? `${s.latencyMs}ms · ` : ""}
                    {s.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader
            title="Recent failures"
            action={
              <Link
                href="/admin/jobs?filter=failed"
                className="text-[11px] font-bold text-brand-600 hover:underline dark:text-brand-400"
              >
                All failures
              </Link>
            }
          />
          {recentFailures.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <CheckCircle2 size={20} className="text-emerald-500" />
              <p className="text-xs font-semibold">No failures on record</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border-subtle)] dark:divide-[var(--color-border-dark-subtle)]">
              {recentFailures.map((j) => {
                const user = users.find((u) => u.id === j.userId);
                return (
                  <li key={j.id}>
                    <Link
                      href={`/admin/jobs?job=${j.id}`}
                      className="flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                    >
                      <CircleAlert size={14} className="mt-0.5 shrink-0 text-red-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold">
                          {j.errorCode ? ERROR_LABEL[j.errorCode] : "Failed"}
                        </p>
                        <p className="truncate text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                          {user?.email ?? j.userId}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="flex items-center gap-1 text-[10px] tabular-nums text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                          <Clock size={9} />
                          {fmtAgo(j.finishedAt ?? j.createdAt)}
                        </p>
                        {!j.tokenRefunded && (
                          <span className="mt-0.5 inline-block rounded bg-red-500/10 px-1.5 py-px text-[9px] font-bold uppercase text-red-600 dark:text-red-400">
                            Token held
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {/* Scope note — makes the build/delegate split visible rather than implied */}
      <Panel className="p-4">
        <SectionTitle hint="Deliberately not rebuilt here">
          Where everything else lives
        </SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              name: "Stripe",
              owns: "Invoices, refunds, disputes, tax, payment methods",
              href: "https://dashboard.stripe.com",
            },
            {
              name: "PostHog",
              owns: "Funnels, retention, cohorts, session replay",
              href: "https://app.posthog.com",
            },
            {
              name: "Sentry",
              owns: "Unhandled exceptions and stack traces",
              href: "https://sentry.io",
            },
          ].map((t) => (
            <a
              key={t.name}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-lg border border-[var(--color-border-subtle)] px-3 py-2.5 transition-colors hover:border-brand-500/50 dark:border-[var(--color-border-dark-subtle)]"
            >
              <p className="flex items-center gap-1.5 text-[12px] font-bold">
                {t.name}
                <ArrowRight
                  size={11}
                  className="opacity-0 transition-opacity group-hover:opacity-60"
                />
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                {t.owns}
              </p>
            </a>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function QueueStat({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div>
      <p
        className={`text-lg font-bold tabular-nums ${
          warn ? "text-amber-600 dark:text-amber-400" : ""
        }`}
      >
        {value}
      </p>
      <p className="text-[10px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        {label}
      </p>
    </div>
  );
}
