"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useDashboard } from "./dashboard-provider";

/* Where you are, right now.

   The old pills tracked lifetime onboarding: have you ever uploaded, have you
   ever previewed, have you ever downloaded. That answers a question nobody
   asks. What the customer wants to know standing on this page is which part
   of *this* job they are in and what happens next, which is why the screen
   read as a set of panels rather than a process.

   Three steps, derived from the job itself so it cannot drift from what the
   page is actually showing. */

const STEPS = [
  { n: 1, label: "Upload your ad", short: "Upload" },
  { n: 2, label: "We cut three versions", short: "We cut" },
  { n: 3, label: "Review and download", short: "Download" },
] as const;

export function FlowRail() {
  const { jobs } = useDashboard();

  const working = jobs.some((j) => j.stage !== "ready" && j.stage !== "failed");
  const done = jobs.some((j) => j.stage === "ready");
  const current = working ? 2 : done ? 3 : 1;

  return (
    <ol className="flex items-center gap-1.5 sm:gap-2">
      {STEPS.map((s, i) => {
        const complete = s.n < current;
        const active = s.n === current;
        return (
          <li key={s.n} className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <div
              className={`flex min-w-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-2.5 transition-colors sm:pr-3.5 ${
                active
                  ? "bg-brand-500/12 ring-1 ring-brand-500/25"
                  : complete
                    ? "bg-emerald-500/10"
                    : "bg-black/[0.04] dark:bg-white/[0.05]"
              }`}
            >
              <span
                className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  complete
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-brand-500 text-white"
                      : "bg-black/10 text-[var(--color-ink-muted)] dark:bg-white/15 dark:text-[var(--color-ink-dark-muted)]"
                }`}
              >
                {complete ? <Check size={11} strokeWidth={3.5} /> : s.n}
                {active && (
                  <motion.span
                    aria-hidden
                    animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.7, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-brand-500"
                  />
                )}
              </span>
              <span
                className={`truncate text-[11px] font-semibold sm:text-xs ${
                  active
                    ? "text-brand-600 dark:text-brand-400"
                    : complete
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
                }`}
              >
                <span className="sm:hidden">{s.short}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <span
                className={`h-px w-2 shrink-0 sm:w-4 ${
                  complete ? "bg-emerald-500/40" : "bg-black/10 dark:bg-white/15"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
