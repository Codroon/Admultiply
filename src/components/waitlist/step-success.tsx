"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

const benefits = [
  { emoji: "🚀", label: "Early beta access" },
  { emoji: "🎁", label: "Free trial tokens" },
  { emoji: "💸", label: "Exclusive launch pricing" },
  { emoji: "✨", label: "Product updates and new features" },
];

export function StepSuccess() {
  return (
    <div className="text-center">
      {/* Animated check */}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-xl shadow-brand-500/40"
      >
        <Check size={36} strokeWidth={3} />
        <motion.span
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{ opacity: 0, scale: 1.9 }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 }}
          className="absolute inset-0 rounded-full bg-brand-500"
        />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="mt-7 text-3xl font-bold tracking-tight sm:text-4xl"
      >
        🎉 You&apos;re on the list!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="mt-3 text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)] sm:text-base"
      >
        Thanks for joining the AdMultiply waitlist.
        <br />
        We&apos;ll be in touch before launch with:
      </motion.p>

      <div className="mx-auto mt-7 flex max-w-sm flex-col gap-2.5">
        {benefits.map((b, i) => (
          <motion.div
            key={b.label}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
            className="flex items-center gap-3 rounded-xl bg-white/70 px-4 py-3 text-left text-sm font-medium ring-1 ring-black/5 backdrop-blur dark:bg-white/5 dark:ring-white/10"
          >
            <span className="text-lg">{b.emoji}</span>
            {b.label}
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        className="mt-7 text-sm font-semibold text-brand-600 dark:text-brand-400"
      >
        Launching September 2026.
      </motion.p>
    </div>
  );
}
