"use client";

import { motion } from "framer-motion";
import {
  Upload,
  BrainCircuit,
  Layers,
  Rocket,
  Check,
  Play,
  Sparkles,
} from "lucide-react";
import { viewportOnce } from "@/lib/motion";

const IMG = {
  source:
    "https://images.unsplash.com/photo-1610018556010-6a11691bc905?auto=format&fit=crop&w=640&h=360&q=80",
  v1: "https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=300&h=540&q=80",
  v2: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&h=540&q=80",
  v3: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=300&h=540&q=80",
};

type Row = {
  label: string;
  icon: typeof Upload;
  heading: string;
  bullets: string[];
  Visual: () => React.ReactElement;
};

const rows: Row[] = [
  {
    label: "Step 1 · Upload",
    icon: Upload,
    heading: "Upload your winning ad",
    bullets: [
      "Drag and drop your best-performing ad",
      "Supports MP4 & MOV up to 1.5 minutes",
      "No editing skills required",
    ],
    Visual: UploadVisual,
  },
  {
    label: "Step 2 · Analyse",
    icon: BrainCircuit,
    heading: "AdMultiply AI identifies your winning formula",
    bullets: [
      "Learns what actually makes your ad perform",
      "Pinpoints your strongest hooks & moments",
      "Understands pacing, structure and messaging",
    ],
    Visual: AnalyzeVisual,
  },
  {
    label: "Step 3 · Generate",
    icon: Layers,
    heading: "Generate 3 creative variations",
    bullets: [
      "Three high-converting micro variations in seconds",
      "Fresh hooks and angles from your winning formula",
      "Hi-res and ready to test",
    ],
    Visual: GenerateVisual,
  },
  {
    label: "Step 4 · Launch",
    icon: Rocket,
    heading: "Download & launch",
    bullets: [
      "Export optimized for TikTok, Reels & Shorts",
      "Extend the lifespan of winning campaigns",
      "Launch new variations without skipping a beat",
    ],
    Visual: LaunchVisual,
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden px-6 py-20 lg:px-12 lg:py-28"
    >
      {/* Blended gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/4 h-[440px] w-[760px] -translate-x-1/2 rounded-full bg-brand-500/[0.10] blur-[150px]" />
        <div className="absolute bottom-10 right-1/4 h-64 w-64 rounded-full bg-amber-400/10 blur-[130px]" />
      </div>

      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            <Sparkles size={12} />
            From one ad to three, in seconds
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            How It Works
          </h2>
        </motion.div>

        <div className="mt-16 flex flex-col gap-16 lg:mt-20 lg:gap-24">
          {rows.map((row, i) => (
            <FeatureRow key={row.label} row={row} reverse={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureRow({ row, reverse }: { row: Row; reverse: boolean }) {
  const { Visual } = row;
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
      {/* Visual */}
      <motion.div
        initial={{ opacity: 0, x: reverse ? 40 : -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={viewportOnce}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={reverse ? "lg:order-2" : "lg:order-1"}
      >
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-brand-100 to-amber-100 p-6 ring-1 ring-black/5 dark:from-brand-500/15 dark:to-amber-500/10 dark:ring-white/10">
          <Visual />
        </div>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, x: reverse ? -40 : 40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={viewportOnce}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={reverse ? "lg:order-1" : "lg:order-2"}
      >
        <div className="inline-flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white shadow-sm shadow-brand-500/30">
            <row.icon size={16} strokeWidth={2.2} />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            {row.label}
          </span>
        </div>

        <h3 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          {row.heading}
        </h3>

        <ul className="mt-5 flex flex-col gap-3">
          {row.bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm sm:text-base">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                <Check size={12} strokeWidth={3} />
              </span>
              <span className="text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                {b}
              </span>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

/* ---------- Per-step visuals ---------- */

function UploadVisual() {
  return (
    <div className="flex w-full max-w-[240px] flex-col items-center">
      <div className="flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-brand-500/40 p-5">
        <motion.div
          initial={{ y: -18, opacity: 0.6 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={viewportOnce}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          className="w-full overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5 dark:bg-[var(--color-surface-dark)] dark:ring-white/10"
        >
          <div className="relative aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMG.source} alt="Winning ad" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
              <Play size={18} className="fill-white text-white" />
            </div>
          </div>
        </motion.div>
      </div>
      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
        <Upload size={12} /> Drop your winning ad
      </div>
    </div>
  );
}

function AnalyzeVisual() {
  return (
    <div className="relative w-full max-w-[240px]">
      <div className="overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 dark:bg-[var(--color-surface-dark)] dark:ring-white/10">
        <div className="relative aspect-video">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={IMG.source} alt="Analysing" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-brand-600/15" />
          <motion.div
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-x-0 h-8 bg-gradient-to-b from-brand-400/0 via-brand-400/70 to-brand-400/0"
          />
        </div>
        <div className="flex items-end justify-center gap-1 p-3.5">
          {[0.4, 0.85, 0.5, 1, 0.6, 0.9, 0.45, 0.75, 0.55].map((h, i) => (
            <motion.span
              key={i}
              animate={{ scaleY: [h, h * 0.4, h] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: i * 0.08,
                ease: "easeInOut",
              }}
              style={{ height: 26 * h, transformOrigin: "bottom" }}
              className="w-1.5 rounded-full bg-brand-500"
            />
          ))}
        </div>
      </div>
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="absolute -right-2 -top-2 flex items-center gap-1 rounded-full bg-brand-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg"
      >
        <Sparkles size={11} /> AdMultiply AI
      </motion.div>
    </div>
  );
}

function GenerateVisual() {
  const imgs = [IMG.v1, IMG.v2, IMG.v3];
  return (
    <div className="flex items-center justify-center gap-3">
      {imgs.map((src, i) => (
        <motion.div
          key={src}
          initial={{ opacity: 0, y: 24, rotate: i === 0 ? -8 : i === 2 ? 8 : 0 }}
          whileInView={{ opacity: 1, y: 0, rotate: i === 0 ? -5 : i === 2 ? 5 : 0 }}
          viewport={viewportOnce}
          transition={{ delay: 0.1 + i * 0.15, type: "spring", stiffness: 220, damping: 18 }}
          className="relative w-20 overflow-hidden rounded-xl shadow-lg ring-1 ring-black/5 dark:ring-white/10"
        >
          <div className="relative aspect-[9/16]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Variation ${i + 1}`} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-600/50 to-transparent" />
            <span className="absolute left-1 top-1 rounded bg-white/25 px-1 text-[7px] font-bold text-white backdrop-blur">
              Hook {String.fromCharCode(65 + i)}
            </span>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={viewportOnce}
            transition={{ delay: 0.5 + i * 0.15, type: "spring", stiffness: 400 }}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-[var(--color-surface-dark-card)]"
          >
            <Check size={11} strokeWidth={3} />
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

function LaunchVisual() {
  const imgs = [IMG.v1, IMG.v2, IMG.v3];
  const platforms = ["TikTok", "Reels", "Shorts"];
  return (
    <div className="flex w-full max-w-[260px] flex-col items-center gap-4">
      <div className="flex items-center justify-center gap-2.5">
        {imgs.map((src, i) => (
          <motion.div
            key={src}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ delay: i * 0.12 }}
            className="w-16 overflow-hidden rounded-lg shadow-md ring-1 ring-black/5 dark:ring-white/10"
          >
            <div className="relative aspect-[9/16]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check size={13} strokeWidth={3} />
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {platforms.map((p) => (
          <span
            key={p}
            className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[var(--color-ink)] shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:text-white dark:ring-white/10"
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
