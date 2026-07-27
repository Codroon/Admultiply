"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { PLANS, TOKEN_RULE, getPlan, type Plan } from "@/lib/plans";
import { useDashboard } from "@/components/dashboard/dashboard-provider";

export default function BillingPage() {
  const { plan, tokens, setPlan } = useDashboard();
  const toast = useToast();
  const current = getPlan(plan);
  const used = Math.max(0, current.tokens - tokens);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing &amp; Plan</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          {TOKEN_RULE}. Downloads are unlocked by your plan — never by tokens.
        </p>
      </div>

      {/* Current plan + usage */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{current.name} plan</h2>
              <Badge tone="brand">${current.price}/mo</Badge>
            </div>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              {used} of {current.tokens} tokens used this cycle
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              toast("Stripe Customer Portal opens here at launch", "info")
            }
          >
            Manage billing
            <ExternalLink size={13} />
          </Button>
        </div>
        {/* Usage meter */}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (used / current.tokens) * 100)}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
          />
        </div>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="mb-3 text-base font-bold">Choose the right plan for you</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <FreePlusCard />
          {PLANS.filter((p) => p.id !== "free" && p.id !== "plus").map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
        <p className="mt-4 text-center text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          Plan changes here are simulated for the demo — Stripe checkout arrives
          with the backend.
        </p>
      </div>
    </div>
  );

  function PlanCard({ plan: p }: { plan: Plan }) {
    const isCurrent = p.id === current.id;
    return (
      <Card
        className={`relative flex flex-col p-5 ${
          p.highlighted ? "ring-2 ring-brand-500" : ""
        }`}
      >
        {p.badge && (
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {p.badge}
          </span>
        )}
        <PlanBody p={p} isCurrent={isCurrent} onPick={() => setPlan(p.id)} />
      </Card>
    );
  }

  function FreePlusCard() {
    return <FreePlusInner current={current.id} onPick={(id) => setPlan(id)} />;
  }
}

function FreePlusInner({
  current,
  onPick,
}: {
  current: string;
  onPick: (id: Plan["id"]) => void;
}) {
  const pair = PLANS.filter((p) => p.id === "free" || p.id === "plus");
  const [tab, setTab] = useState(0);
  const p = pair[tab];

  return (
    <Card className="flex flex-col p-5">
      <div className="mb-1 flex rounded-full bg-black/5 p-0.5 dark:bg-white/10">
        {pair.map((x, i) => (
          <button
            key={x.id}
            onClick={() => setTab(i)}
            className={`relative flex-1 rounded-full py-1 text-xs font-semibold transition-colors ${
              tab === i
                ? "text-white"
                : "text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
            }`}
          >
            {tab === i && (
              <motion.span
                layoutId="billingFreePlus"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className="absolute inset-0 rounded-full bg-brand-500"
              />
            )}
            <span className="relative z-10">{x.name}</span>
          </button>
        ))}
      </div>
      <PlanBody p={p} isCurrent={p.id === current} onPick={() => onPick(p.id)} />
    </Card>
  );
}

function PlanBody({
  p,
  isCurrent,
  onPick,
}: {
  p: Plan;
  isCurrent: boolean;
  onPick: () => void;
}) {
  return (
    <div className="mt-3 flex flex-1 flex-col">
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight">${p.price}</span>
        <span className="text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          /mo
        </span>
      </div>
      <p className="mt-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
        {p.blurb}
      </p>
      <ul className="mt-3 flex-1 space-y-1.5">
        {p.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
              <Check size={10} strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>
      <Button
        variant={isCurrent ? "secondary" : "primary"}
        size="md"
        className="mt-4 w-full"
        disabled={isCurrent}
        onClick={onPick}
      >
        {isCurrent ? "Current plan" : p.cta}
      </Button>
    </div>
  );
}
