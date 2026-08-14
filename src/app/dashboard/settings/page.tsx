"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { PLANS, type PlanId } from "@/lib/plans";
import { useDashboard } from "@/components/dashboard/dashboard-provider";

export default function SettingsPage() {
  const { userName, email, plan, setPlan, resetDemo } = useDashboard();
  const toast = useToast();
  const [name, setName] = useState(userName);
  const [notify, setNotify] = useState(true);

  const inputCls =
    "w-full rounded-xl border border-[var(--color-border-subtle)] bg-transparent px-3.5 py-2.5 text-base transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-[var(--color-border-dark-subtle)] sm:text-sm";

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          Your profile and preferences.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-bold">Profile</h2>
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-semibold">
            Full name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold">
            Email
            <input value={email} readOnly className={`${inputCls} opacity-60`} />
          </label>
          <Button
            size="md"
            className="self-end"
            onClick={() => toast("Profile saved")}
          >
            Save changes
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">View mode</h2>
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              Switch between light and dark themes.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">Email notifications</h2>
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              Get an email when your variations finish processing.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notify}
            onClick={() => setNotify((n) => !n)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              notify ? "bg-brand-500" : "bg-black/15 dark:bg-white/20"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                notify ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Demo-only controls — remove before launch */}
      <Card className="border border-dashed border-brand-500/30 bg-brand-500/[0.03] p-5">
        <h2 className="text-sm font-bold text-brand-600 dark:text-brand-400">
          Demo controls
        </h2>
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          For client review only: simulate a plan to see how gating changes.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as PlanId)}
            className="rounded-xl border border-[var(--color-border-subtle)] bg-transparent px-3 py-2 text-sm font-medium focus:border-brand-500 focus:outline-none dark:border-[var(--color-border-dark-subtle)] dark:bg-[var(--color-surface-dark-card)]"
          >
            {PLANS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ${p.price}/mo
              </option>
            ))}
          </select>
          <Button variant="secondary" size="md" onClick={resetDemo}>
            <RotateCcw size={13} />
            Reset demo data
          </Button>
        </div>
      </Card>
    </div>
  );
}
