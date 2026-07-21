"use client";

import { motion } from "framer-motion";
import { Play, Sparkles, Check } from "lucide-react";

/* Product-in-one-glance visual: a single source ad → AdMultiply AI →
   one results screen showing all THREE generated variations at once.
   Fully responsive: stacks vertically on mobile so nothing is cut off,
   sits horizontally on sm+. Images are Unsplash placeholders. */
const SOURCE_IMG =
  "https://images.unsplash.com/photo-1610018556010-6a11691bc905?auto=format&fit=crop&w=640&h=360&q=80";

const variations = [
  {
    label: "Hook A",
    img: "https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=300&h=540&q=80",
  },
  {
    label: "Hook B",
    img: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&h=540&q=80",
  },
  {
    label: "Hook C",
    img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=300&h=540&q=80",
  },
];

export function HeroMockup() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
      {/* Source ad card (16:9) */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-44 shrink-0 sm:w-40"
      >
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-[var(--color-surface-dark-card)] dark:ring-white/10">
          <div className="relative aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SOURCE_IMG}
              alt="Your winning ad"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur">
                <Play size={13} className="fill-brand-500 text-brand-500" />
              </div>
            </div>
            <span className="absolute left-2 top-2 rounded-md bg-black/50 px-2 py-0.5 text-[9px] font-medium text-white backdrop-blur">
              Your winning ad
            </span>
          </div>
          <div className="p-2.5">
            <div className="h-1.5 w-3/4 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="mt-1.5 h-1.5 w-1/2 rounded-full bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
      </motion.div>

      {/* AdMultiply AI engine badge (arrow points down on mobile, right on desktop) */}
      <div className="relative flex shrink-0 flex-col items-center gap-1.5">
        <motion.div
          animate={{ scale: [1, 1.12, 1], rotate: [0, 8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/40"
        >
          <Sparkles size={16} />
        </motion.div>
        <span className="whitespace-nowrap rounded-full bg-brand-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
          AdMultiply AI
        </span>
      </div>

      {/* Results screen — all 3 variations in one frame */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-60 shrink-0"
        style={{ animation: "float-slow 4s ease-in-out infinite" }}
      >
        <div className="rounded-2xl bg-white p-2.5 shadow-xl ring-1 ring-black/5 dark:bg-[var(--color-surface-dark-card)] dark:ring-white/10">
          {/* Header makes "you get 3" explicit */}
          <div className="mb-2 flex items-center justify-between px-0.5">
            <span className="text-[10px] font-semibold">3 new variations</span>
            <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-600 dark:text-emerald-400">
              <Check size={8} strokeWidth={3} />
              Ready
            </span>
          </div>

          {/* The 3 micro-videos, side by side, responsive */}
          <div className="flex gap-1.5">
            {variations.map((v, i) => (
              <motion.div
                key={v.label}
                initial={{ opacity: 0, y: 16, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: 0.6 + i * 0.18,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="min-w-0 flex-1 overflow-hidden rounded-lg"
              >
                <div className="relative aspect-[9/16]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.img}
                    alt={`${v.label} variation`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-600/60 via-transparent to-black/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 shadow backdrop-blur">
                      <Play size={8} className="fill-brand-500 text-brand-500" />
                    </div>
                  </div>
                  <span className="absolute left-1 top-1 rounded bg-white/25 px-1 py-0.5 text-[6px] font-bold text-white backdrop-blur">
                    {v.label}
                  </span>
                  <div className="absolute inset-x-1 bottom-1 space-y-0.5">
                    <div className="h-0.5 w-3/4 rounded-full bg-white/70" />
                    <div className="h-0.5 w-1/2 rounded-full bg-white/50" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Floating "ready" badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.4, type: "spring", stiffness: 400 }}
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-white dark:ring-[var(--color-surface-dark)]"
        >
          <Check size={13} strokeWidth={3} />
        </motion.div>
      </motion.div>
    </div>
  );
}
