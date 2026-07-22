"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";

import { PLANS, type Plan } from "@/lib/plans";

// Free + Plus share one card with a toggle (Notion-style)
const freePlus: Plan[] = PLANS.filter((p) => p.id === "free" || p.id === "plus");
const plans: Plan[] = PLANS.filter((p) => p.id !== "free" && p.id !== "plus");

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-20 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Choose the right plan for you
          </h2>
          <p className="mt-4 text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)] sm:text-base">
            Whether you&apos;re a creator, brand or agency, there&apos;s an
            AdMultiply plan to help you beat creative fatigue and maximise ROI.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          <FreePlusCard />
          {plans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FreePlusCard() {
  const [tab, setTab] = useState(0);
  const plan = freePlus[tab];

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col rounded-2xl bg-[var(--color-surface-muted)] p-5 ring-1 ring-black/5 transition-shadow hover:shadow-lg dark:bg-[var(--color-surface-dark-card)] dark:ring-white/5"
    >
      {/* Free / Plus toggle */}
      <div className="flex rounded-full bg-black/5 p-0.5 dark:bg-white/10">
        {freePlus.map((p, i) => (
          <button
            key={p.name}
            onClick={() => setTab(i)}
            className={`relative flex-1 rounded-full py-1 text-xs font-semibold transition-colors ${
              tab === i
                ? "text-white"
                : "text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
            }`}
          >
            {tab === i && (
              <motion.span
                layoutId="freePlusPill"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className="absolute inset-0 rounded-full bg-brand-500"
              />
            )}
            <span className="relative z-10">{p.name}</span>
          </button>
        ))}
      </div>

      <PlanBody plan={plan} />
    </motion.div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25 }}
      className={`relative flex flex-col rounded-2xl p-5 transition-shadow ${
        plan.highlighted
          ? "bg-brand-500 text-white shadow-xl shadow-brand-500/30 ring-1 ring-brand-400"
          : "bg-[var(--color-surface-muted)] ring-1 ring-black/5 hover:shadow-lg dark:bg-[var(--color-surface-dark-card)] dark:ring-white/5"
      }`}
    >
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-600 shadow-md">
          {plan.badge}
        </span>
      )}
      <PlanBody plan={plan} highlighted={plan.highlighted} />
    </motion.div>
  );
}

function PlanBody({
  plan,
  highlighted = false,
}: {
  plan: Plan;
  highlighted?: boolean;
}) {
  return (
    <div className="mt-4 flex flex-1 flex-col">
      <p className="text-sm font-semibold">{plan.name}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight">${plan.price}</span>
        <span
          className={`text-xs ${
            highlighted
              ? "text-white/80"
              : "text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
          }`}
        >
          /mo
        </span>
      </div>
      <p
        className={`mt-1 text-xs font-medium ${
          highlighted
            ? "text-white/85"
            : "text-brand-600 dark:text-brand-400"
        }`}
      >
        {plan.blurb}
      </p>

      <div
        className={`my-4 h-px ${
          highlighted ? "bg-white/20" : "bg-black/10 dark:bg-white/10"
        }`}
      />

      <ul className="flex-1 space-y-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                highlighted ? "bg-white text-brand-500" : "bg-brand-500 text-white"
              }`}
            >
              <Check size={10} strokeWidth={3} />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <a
        href="/waitlist"
        className={`mt-5 inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-xs font-semibold transition-colors ${
          highlighted
            ? "bg-white text-brand-600 hover:bg-white/90"
            : "bg-brand-500 text-white hover:bg-brand-600"
        }`}
      >
        {plan.cta}
      </a>
    </div>
  );
}
