"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

import type { Variants } from "framer-motion";

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function StepCapture({
  onCaptured,
}: {
  onCaptured: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid work email.");
      return;
    }
    if (!company.trim()) {
      setError("Please enter your company name.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), company: company.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      onCaptured(email.trim().toLowerCase());
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="text-center">
      <motion.span
        custom={0}
        variants={item}
        initial="hidden"
        animate="visible"
        className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3.5 py-1.5 text-xs font-semibold text-brand-600 ring-1 ring-brand-500/20 dark:text-brand-400"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-brand-500" />
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
        </span>
        Launching this September 🚀
      </motion.span>

      <motion.h1
        custom={1}
        variants={item}
        initial="hidden"
        animate="visible"
        className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl"
      >
        Creative fatigue killing your{" "}
        <span className="bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer">
          ROAS
        </span>
        ?
      </motion.h1>

      <motion.p
        custom={2}
        variants={item}
        initial="hidden"
        animate="visible"
        className="mt-4 text-lg font-medium sm:text-xl"
      >
        Keep your winning creatives performing for longer.
      </motion.p>

      <motion.p
        custom={3}
        variants={item}
        initial="hidden"
        animate="visible"
        className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
      >
        Join the AdMultiply waitlist for early access, free trial tokens, and
        exclusive launch pricing.
      </motion.p>

      <motion.form
        custom={4}
        variants={item}
        initial="hidden"
        animate="visible"
        onSubmit={submit}
        className="mx-auto mt-9 flex w-full max-w-sm flex-col gap-3 text-left"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="wl-email" className="text-xs font-semibold">
            Work email <span className="text-brand-500">*</span>
          </label>
          <input
            id="wl-email"
            type="email"
            required
            autoComplete="email"
            placeholder="Enter your work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-white/70 px-4 py-3 text-base shadow-sm backdrop-blur placeholder:text-[var(--color-ink-muted)] transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-[var(--color-border-dark-subtle)] dark:bg-white/5 dark:placeholder:text-[var(--color-ink-dark-muted)] sm:text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="wl-company" className="text-xs font-semibold">
            Company name <span className="text-brand-500">*</span>
          </label>
          <input
            id="wl-company"
            type="text"
            required
            autoComplete="organization"
            placeholder="Enter your company name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-white/70 px-4 py-3 text-base shadow-sm backdrop-blur placeholder:text-[var(--color-ink-muted)] transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-[var(--color-border-dark-subtle)] dark:bg-white/5 dark:placeholder:text-[var(--color-ink-dark-muted)] sm:text-sm"
          />
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-medium text-red-500"
          >
            {error}
          </motion.p>
        )}

        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.99 }}
          className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:bg-brand-600 hover:shadow-brand-500/40 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              Join the Waitlist
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </>
          )}
        </motion.button>

        <p className="mt-1 text-center text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          No spam, ever. Unsubscribe anytime.
        </p>
      </motion.form>
    </div>
  );
}
