"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Coins, Flame, TrendingUp } from "lucide-react";
import { useAdmin } from "@/components/admin/admin-provider";
import { ShareBar } from "@/components/admin/chart";
import {
  Meter,
  Panel,
  PanelHeader,
  SectionTitle,
  StatTile,
} from "@/components/admin/primitives";
import { Badge } from "@/components/ui/badge";
import { getPlan } from "@/lib/plans";
import {
  COST_BASELINE_CENTS,
  costStats,
  dailySeries,
  flywheelStats,
  fmtCents,
  fmtNum,
} from "@/lib/admin-stats";

const PROVIDER_COLORS = [
  "bg-brand-500",
  "bg-brand-300",
  "bg-sky-400",
  "bg-emerald-400",
  "bg-zinc-400",
];

export default function AiUsagePage() {
  const { jobs, users, ledger } = useAdmin();

  const cost = useMemo(() => costStats(jobs, users, ledger), [jobs, users, ledger]);
  const fly = useMemo(() => flywheelStats(jobs), [jobs]);
  const series = useMemo(() => dailySeries(jobs, 14), [jobs]);

  const drift = cost.costPerVideo - COST_BASELINE_CENTS;
  const overBaseline = cost.costPerVideo > COST_BASELINE_CENTS * 1.15;

  return (
    <div className="flex flex-col gap-5">
      {/* Spend */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Spend today"
          value={fmtCents(cost.spendToday)}
          hint="All providers"
          series={series.map((d) => d.costCents)}
        />
        <StatTile
          label="Spend this cycle"
          value={fmtCents(cost.spendCycle)}
          hint={`${fmtNum(cost.videosCycle)} videos delivered`}
        />
        <StatTile
          label="Cost per video"
          value={fmtCents(cost.costPerVideo)}
          hint={`${drift >= 0 ? "+" : ""}${drift.toFixed(1)}¢ vs ${fmtCents(
            COST_BASELINE_CENTS
          )} baseline`}
          tone={overBaseline ? "danger" : "success"}
        />
        <StatTile
          label="Spent on failures"
          value={fmtCents(cost.wasted)}
          hint="Renders nobody received"
          tone={cost.wasted > cost.spendCycle * 0.05 ? "danger" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Provider split */}
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Where the money goes"
            subtitle="Current billing cycle, by provider"
          />
          <div className="p-4">
            <ShareBar
              segments={cost.providers.map((p, i) => ({
                label: p.label,
                value: p.cents,
                color: PROVIDER_COLORS[i % PROVIDER_COLORS.length],
              }))}
            />
            <ul className="mt-4 flex flex-col gap-2.5">
              {cost.providers.map((p, i) => (
                <li key={p.provider} className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${
                      PROVIDER_COLORS[i % PROVIDER_COLORS.length]
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                    {p.label}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                    {fmtNum(p.calls)} calls
                  </span>
                  <span className="w-20 shrink-0 text-right text-[13px] font-semibold tabular-nums">
                    {fmtCents(p.cents)}
                  </span>
                  <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                    {p.share.toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-lg bg-black/[0.03] px-3 py-2 text-[11px] leading-relaxed text-[var(--color-ink-muted)] dark:bg-white/[0.04] dark:text-[var(--color-ink-dark-muted)]">
              TwelveLabs indexing dominates the bill by design — it is the one call
              that scales with source duration. Capping accepted length at 1:30 is
              the single most effective cost control we have.
            </p>
          </div>
        </Panel>

        {/* Free tier burn */}
        <Panel className="flex flex-col">
          <PanelHeader title="Free-tier burn" subtitle="Acquisition cost, this cycle" />
          <div className="flex flex-1 flex-col p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums tracking-tight">
                {fmtCents(cost.freeBurn)}
              </span>
              <Badge tone="neutral">{fmtNum(cost.freeUsers)} free users</Badge>
            </div>
            <p className="mt-1 text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              {fmtCents(cost.freeBurn / Math.max(1, cost.freeUsers))} per free user ·
              3 tokens granted monthly
            </p>

            <div className="mt-4 flex flex-col gap-2.5 border-t border-[var(--color-border-subtle)] pt-3.5 dark:border-[var(--color-border-dark-subtle)]">
              <SectionTitle>Token movement</SectionTitle>
              <TokenRow label="Granted" value={cost.granted} tone="neutral" />
              <TokenRow label="Consumed" value={cost.consumed} tone="brand" />
              <TokenRow label="Refunded on failure" value={cost.refunded} tone="warning" />
              <TokenRow label="Admin adjustments" value={cost.adjusted} tone="info" />
            </div>
            <p className="mt-auto pt-3 text-[10px] leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              Every figure here is a SUM over the append-only token ledger, so it
              always reconciles with individual balances.
            </p>
          </div>
        </Panel>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* The flywheel                                                     */}
      {/* ---------------------------------------------------------------- */}
      <div>
        <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-[13px] font-bold tracking-tight">
            <TrendingUp size={14} className="text-brand-500" />
            Creative intelligence
          </h2>
          <span className="text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            {fmtNum(fly.labelledJobs)} labelled jobs · {fmtNum(fly.totalDownloaded)} human
            preferences captured
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel className="xl:col-span-2">
            <PanelHeader
              title="Which strategy wins"
              subtitle="Share of generated variations the customer actually downloaded"
            />
            <div className="flex flex-col gap-3.5 p-4">
              {fly.byStrategy.map((s, i) => (
                <div key={s.strategy}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-2 text-[13px] font-semibold">
                      {i === 0 && <Flame size={12} className="text-brand-500" />}
                      {s.strategy}
                    </span>
                    <span className="text-[13px] font-bold tabular-nums">
                      {s.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <Meter
                    value={s.winRate}
                    max={Math.max(...fly.byStrategy.map((x) => x.winRate)) || 1}
                    tone={i === 0 ? "brand" : "neutral"}
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-[10px] tabular-nums text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                    {fmtNum(s.downloaded)} kept of {fmtNum(s.generated)} generated
                  </p>
                </div>
              ))}

              <div className="mt-1 rounded-lg bg-brand-500/[0.06] px-3 py-2.5 ring-1 ring-brand-500/15">
                <p className="text-[11px] font-bold text-brand-700 dark:text-brand-300">
                  This is the moat
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                  Every download is a human judging which cut of an ad is worth
                  running. Feed that back into prompt selection and the model gets
                  better at the specific job of ad repurposing — something no
                  general-purpose model has data for.
                </p>
              </div>
            </div>
          </Panel>

          <div className="flex flex-col gap-4">
            <Panel className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                Output quality
              </p>
              <div className="mt-2.5 flex flex-col gap-3">
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px] font-medium">
                      Jobs with at least one keeper
                    </span>
                    <span className="text-[15px] font-bold tabular-nums">
                      {fly.keeperRate.toFixed(0)}%
                    </span>
                  </div>
                  <Meter value={fly.keeperRate} max={100} className="mt-1.5" />
                  <p className="mt-1 text-[10px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                    The honest read on whether the product works.
                  </p>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px] font-medium">
                      Variation download rate
                    </span>
                    <span className="text-[15px] font-bold tabular-nums">
                      {fly.downloadRate.toFixed(0)}%
                    </span>
                  </div>
                  <Meter value={fly.downloadRate} max={100} tone="neutral" className="mt-1.5" />
                </div>
              </div>
            </Panel>

            <Panel className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                Position bias check
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                {fly.bySlot.map((s) => (
                  <div key={s.slot} className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-black/[0.06] text-[10px] font-bold dark:bg-white/10">
                      {s.slot}
                    </span>
                    <Meter value={s.winRate} max={100} tone="neutral" className="flex-1" />
                    <span className="w-10 shrink-0 text-right text-[11px] font-semibold tabular-nums">
                      {s.winRate.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                Slot 1 winning more often may be quality or may just be it being
                first. Worth randomising order before trusting the strategy numbers.
              </p>
            </Panel>
          </div>
        </div>
      </div>

      {/* Category + heavy users */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title="By category"
            subtitle="Which verticals the product serves best"
          />
          <ul className="divide-y divide-[var(--color-border-subtle)] dark:divide-[var(--color-border-dark-subtle)]">
            {fly.categories.map((c) => (
              <li key={c.category} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                  {c.category}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                  {fmtNum(c.jobs)} jobs
                </span>
                <Badge tone="neutral">{c.bestStrategy}</Badge>
                <span className="w-11 shrink-0 text-right text-[13px] font-semibold tabular-nums">
                  {c.winRate.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader
            title="Heaviest cost this cycle"
            subtitle="Spots abuse and unprofitable accounts before the invoice does"
          />
          <ul className="divide-y divide-[var(--color-border-subtle)] dark:divide-[var(--color-border-dark-subtle)]">
            {cost.topSpenders.map((s) => {
              const u = s.user!;
              const revenue = getPlan(u.plan).price * 100;
              const upsideDown = revenue > 0 && s.cents > revenue;
              return (
                <li key={u.id}>
                  <Link
                    href={`/admin/users?user=${u.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold">{u.name}</p>
                      <p className="truncate text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                        {u.email}
                      </p>
                    </div>
                    <Badge tone={u.plan === "free" ? "neutral" : "brand"}>
                      {getPlan(u.plan).name}
                    </Badge>
                    <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                      {s.jobs} jobs
                    </span>
                    <span
                      className={`w-14 shrink-0 text-right text-[13px] font-semibold tabular-nums ${
                        upsideDown ? "text-red-600 dark:text-red-400" : ""
                      }`}
                    >
                      {fmtCents(s.cents)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-[var(--color-border-subtle)] px-4 py-2 text-[10px] text-[var(--color-ink-muted)] dark:border-[var(--color-border-dark-subtle)] dark:text-[var(--color-ink-dark-muted)]">
            Red means AI cost has exceeded that account&apos;s monthly revenue.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function TokenRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "brand" | "warning" | "info";
}) {
  const color = {
    neutral: "text-[var(--color-ink)] dark:text-white",
    brand: "text-brand-600 dark:text-brand-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-sky-600 dark:text-sky-400",
  }[tone];

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        <Coins size={11} className="opacity-50" />
        {label}
      </span>
      <span className={`text-[13px] font-bold tabular-nums ${color}`}>
        {fmtNum(value)}
      </span>
    </div>
  );
}
