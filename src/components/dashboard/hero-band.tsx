"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getPlan, upgradeCta } from "@/lib/plans";
import { useDashboard } from "./dashboard-provider";

function useGreeting() {
  const [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);
  return greeting;
}

/* The home stage: brand ambience + time-aware greeting + onboarding pills.
   Replaces the generic "welcome card". */
export function HeroBand() {
  const { userName, jobs, previewPlayed, anyDownloaded } = useDashboard();
  const greeting = useGreeting();

  const steps = [
    { label: "Upload your winning ad", done: jobs.length > 0 },
    { label: "Preview your 3 variations", done: previewPlayed },
    { label: "Download your favourites", done: anyDownloaded },
  ];
  const allDone = steps.every((s) => s.done);

  return (
    <section className="relative isolate overflow-hidden rounded-3xl px-6 py-8 sm:px-8 sm:py-10">
      {/* Ambient brand background — same language as the marketing hero */}
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-white dark:bg-[var(--color-surface-dark-muted)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div className="absolute -top-24 left-1/4 h-64 w-96 rounded-full bg-brand-500/[0.16] blur-[90px]" />
        <div className="absolute -right-10 top-6 h-40 w-40 rounded-full bg-amber-400/10 blur-[70px]" />
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-ink) 1px, transparent 1px), linear-gradient(90deg, var(--color-ink) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(ellipse 65% 90% at 35% 0%, black, transparent)",
            WebkitMaskImage:
              "radial-gradient(ellipse 65% 90% at 35% 0%, black, transparent)",
          }}
        />
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl"
      >
        {greeting},{" "}
        <span className="bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer">
          {userName}
        </span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12 }}
        className="mt-2 max-w-lg text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
      >
        {allDone
          ? "Your winning creatives are multiplying. Keep the streak going."
          : "Let's turn your best-performing ad into three performance-ready micro-ads."}
      </motion.p>

      {/* Onboarding as inline progress pills */}
      {!allDone && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="mt-5 flex flex-wrap items-center gap-2"
        >
          {steps.map((s, i) => (
            <span
              key={s.label}
              className={`inline-flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3.5 text-xs font-semibold ring-1 transition-colors ${
                s.done
                  ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400"
                  : "bg-white/70 text-[var(--color-ink-muted)] ring-black/10 backdrop-blur dark:bg-white/5 dark:text-[var(--color-ink-dark-muted)] dark:ring-white/10"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  s.done
                    ? "bg-emerald-500 text-white"
                    : "bg-brand-500/15 text-brand-600 dark:text-brand-400"
                }`}
              >
                {s.done ? <Check size={11} strokeWidth={3.5} /> : i + 1}
              </span>
              {s.label}
            </span>
          ))}
        </motion.div>
      )}
    </section>
  );
}

/* Compact outcome stats — shown once the user has work. */
export function StatStrip() {
  const { jobs, tokens, plan } = useDashboard();
  const ready = jobs.filter((j) => j.stage === "ready").length;
  const cta = upgradeCta(plan);

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
        {cta ? (
          <Link
            href="/dashboard/billing#plans"
            /* narrow card on mobile — drop the icon and tighten the type so the
               longest label ("Upgrade to Business") never wraps */
            className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-brand-500 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm shadow-brand-500/30 transition-all hover:bg-brand-600 active:scale-[0.98] sm:text-[11px]"
          >
            <Sparkles size={11} className="hidden shrink-0 sm:block" />
            {cta}
          </Link>
        ) : (
          <Link
            href="/dashboard/billing"
            className="mt-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            Manage billing →
          </Link>
        )}
      </Card>
    </div>
  );
}
