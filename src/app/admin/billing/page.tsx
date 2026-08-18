"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Info } from "lucide-react";
import { useAdmin } from "@/components/admin/admin-provider";
import { ShareBar } from "@/components/admin/chart";
import {
  Panel,
  PanelHeader,
  StatTile,
} from "@/components/admin/primitives";
import { Badge } from "@/components/ui/badge";
import { PLANS, getPlan } from "@/lib/plans";
import { fmtAgo, fmtMoney, fmtNum, revenueStats } from "@/lib/admin-stats";

const PLAN_COLORS: Record<string, string> = {
  free: "bg-zinc-300 dark:bg-zinc-600",
  plus: "bg-brand-200",
  starter: "bg-brand-300",
  creator: "bg-brand-500",
  pro: "bg-brand-600",
  business: "bg-brand-700",
};

/* Everything transactional lives in Stripe. This screen answers "how is the
   business doing" and hands off for anything you'd actually click. */
const STRIPE_LINKS = [
  { label: "Payments & invoices", href: "https://dashboard.stripe.com/payments" },
  { label: "Refunds & disputes", href: "https://dashboard.stripe.com/disputes" },
  { label: "Subscriptions", href: "https://dashboard.stripe.com/subscriptions" },
  { label: "Churn & retention", href: "https://dashboard.stripe.com/billing" },
  { label: "Tax & reporting", href: "https://dashboard.stripe.com/tax" },
  { label: "Payouts", href: "https://dashboard.stripe.com/payouts" },
];

export default function BillingPage() {
  const { users } = useAdmin();
  const rev = useMemo(() => revenueStats(users), [users]);

  const planRows = useMemo(
    () =>
      PLANS.map((p) => {
        const count = users.filter((u) => u.plan === p.id && u.status === "active").length;
        return { plan: p, count, mrr: count * p.price };
      }),
    [users]
  );

  const recentPaid = useMemo(
    () =>
      users
        .filter((u) => u.plan !== "free")
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 8),
    [users]
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="MRR" value={fmtMoney(rev.mrr)} hint="Active subscriptions" />
        <StatTile label="ARR run rate" value={fmtMoney(rev.arr)} hint="MRR × 12" />
        <StatTile
          label="Paying customers"
          value={fmtNum(rev.paidCount)}
          hint={`${fmtNum(rev.freeCount)} on free`}
        />
        <StatTile label="ARPU" value={`$${rev.arpu.toFixed(2)}`} hint="Per paying customer" />
        <StatTile
          label="Free → paid"
          value={`${rev.conversion.toFixed(1)}%`}
          hint={`${rev.newPaid} new this cycle`}
          tone={rev.conversion >= 5 ? "success" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Plan distribution"
            subtitle="Where the revenue actually comes from"
          />
          <div className="p-4">
            <ShareBar
              segments={planRows
                .filter((r) => r.count > 0)
                .map((r) => ({
                  label: r.plan.name,
                  value: r.count,
                  color: PLAN_COLORS[r.plan.id],
                }))}
            />
            <table className="mt-4 w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                  <th className="pb-2 font-bold">Plan</th>
                  <th className="pb-2 text-right font-bold">Customers</th>
                  <th className="pb-2 text-right font-bold">Price</th>
                  <th className="pb-2 text-right font-bold">MRR</th>
                  <th className="pb-2 text-right font-bold">Share</th>
                </tr>
              </thead>
              <tbody>
                {planRows.map((r) => (
                  <tr
                    key={r.plan.id}
                    className="border-t border-[var(--color-border-subtle)] dark:border-[var(--color-border-dark-subtle)]"
                  >
                    <td className="py-2">
                      <span className="flex items-center gap-2 text-[13px] font-medium">
                        <span
                          className={`h-2.5 w-2.5 rounded-[3px] ${PLAN_COLORS[r.plan.id]}`}
                        />
                        {r.plan.name}
                      </span>
                    </td>
                    <td className="py-2 text-right text-[13px] tabular-nums">
                      {fmtNum(r.count)}
                    </td>
                    <td className="py-2 text-right text-[13px] tabular-nums text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                      ${r.plan.price}
                    </td>
                    <td className="py-2 text-right text-[13px] font-semibold tabular-nums">
                      {fmtMoney(r.mrr)}
                    </td>
                    <td className="py-2 text-right text-[12px] tabular-nums text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                      {rev.mrr ? ((r.mrr / rev.mrr) * 100).toFixed(0) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <PanelHeader title="Manage in Stripe" subtitle="Source of truth for money" />
          <div className="flex flex-1 flex-col p-4">
            <div className="flex items-start gap-2.5 rounded-lg bg-black/[0.03] px-3 py-2.5 dark:bg-white/[0.04]">
              <Info size={13} className="mt-px shrink-0 text-[var(--color-ink-muted)]" />
              <p className="text-[11px] leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                We deliberately don&apos;t rebuild invoices, refunds or disputes.
                Stripe does it better, and mirroring payment data would mean
                holding sensitive records we have no reason to keep.
              </p>
            </div>
            <div className="mt-3 flex flex-col gap-0.5">
              {STRIPE_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-lg px-2.5 py-2 text-[12px] font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/5"
                >
                  {l.label}
                  <ExternalLink
                    size={12}
                    className="opacity-30 transition-opacity group-hover:opacity-70"
                  />
                </a>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Newest paying customers"
          subtitle="Click through to the account, or open them in Stripe"
          action={
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline dark:text-brand-400"
            >
              All users
              <ArrowRight size={11} />
            </Link>
          }
        />
        <ul className="divide-y divide-[var(--color-border-subtle)] dark:divide-[var(--color-border-dark-subtle)]">
          {recentPaid.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-4 py-2.5">
              <Link
                href={`/admin/users?user=${u.id}`}
                className="flex min-w-0 flex-1 items-center gap-2.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[11px] font-bold uppercase text-white">
                  {u.name.charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold">{u.name}</span>
                  <span className="block truncate text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                    {u.email}
                  </span>
                </span>
              </Link>
              <Badge tone="brand">{getPlan(u.plan).name}</Badge>
              <span className="hidden w-20 shrink-0 text-right text-[13px] font-semibold tabular-nums sm:block">
                ${getPlan(u.plan).price}/mo
              </span>
              <span className="hidden shrink-0 text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)] md:block">
                {fmtAgo(u.createdAt)}
              </span>
              {u.stripeCustomerId && (
                <a
                  href={`https://dashboard.stripe.com/customers/${u.stripeCustomerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open in Stripe"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition-colors hover:bg-black/5 hover:text-[var(--color-ink)] dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <ExternalLink size={13} />
                </a>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
