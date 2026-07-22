"use client";

import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getPlan } from "@/lib/plans";
import { useDashboard } from "./dashboard-provider";

/* Outcome-worded stat strip — the client's own vocabulary. */
export function StatStrip() {
  const { jobs, tokens, plan } = useDashboard();
  const ready = jobs.filter((j) => j.stage === "ready").length;

  const stats = [
    { label: "Winning ads repurposed", value: String(ready) },
    { label: "Micro variations generated", value: String(ready * 3) },
    { label: "Monthly tokens remaining", value: String(tokens) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            {s.label}
          </p>
          <p className="mt-1.5 text-2xl font-bold sm:text-3xl">{s.value}</p>
        </Card>
      ))}
      <Card className="flex flex-col justify-between p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          Current plan
        </p>
        <p className="mt-1.5 text-lg font-bold">{getPlan(plan).name}</p>
        <Link
          href="/dashboard/billing"
          className="mt-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
        >
          Manage billing →
        </Link>
      </Card>
    </div>
  );
}

/* Zero-state onboarding — the empty dashboard is an activation surface. */
export function OnboardingChecklist() {
  const { jobs, previewPlayed, anyDownloaded, userName } = useDashboard();

  const steps = [
    { label: "Upload your winning ad", done: jobs.length > 0 },
    { label: "Preview your 3 AI variations", done: previewPlayed },
    { label: "Download your favourite", done: anyDownloaded },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Welcome, {userName} 👋</h2>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            Three steps to your first multiplied ad.
          </p>
        </div>
        <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
          {doneCount}/3
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {steps.map((s) => (
          <div
            key={s.label}
            className={`flex items-center gap-2.5 text-sm ${
              s.done
                ? "text-[var(--color-ink-muted)] line-through dark:text-[var(--color-ink-dark-muted)]"
                : "font-medium"
            }`}
          >
            {s.done ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check size={12} strokeWidth={3} />
              </span>
            ) : (
              <Circle size={19} className="text-[var(--color-border-subtle)] dark:text-[var(--color-border-dark-subtle)]" />
            )}
            {s.label}
          </div>
        ))}
      </div>
    </Card>
  );
}
