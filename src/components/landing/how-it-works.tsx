"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  Upload,
  Eye,
  Layers,
  Rocket,
  Check,
} from "lucide-react";
import { viewportOnce } from "@/lib/motion";

/* Real screenshots of the real workspace, one per step. Captured from the
   running product rather than drawn, which is the whole point of them. The
   ad inside them is a neutral clip generated for the purpose, so nothing
   here publishes a customer's footage. */
const SHOTS = {
  upload: "/product/step-1-upload.png",
  analyse: "/product/step-3-working.png",
  generate: "/product/step-4-results.png",
  launch: "/product/step-5-library.png",
} as const;

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
    icon: Eye,
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
            From one ad to three, in seconds
          </span>
          <h2 className="mt-4 display-sm">
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
        <div className="relative aspect-[17/11] overflow-hidden rounded-2xl shadow-2xl shadow-black/15 ring-1 ring-black/10 dark:shadow-black/40 dark:ring-white/10">
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

        <h3 className="mt-4 display-sm">
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

/* The screenshot fills its frame edge to edge. The frame's 17:11 is the exact
   shape of the capture, so object-cover crops nothing. */
function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(min-width: 1024px) 34rem, 90vw"
      className="object-cover"
    />
  );
}

function UploadVisual() {
  return (
    <Shot
      src={SHOTS.upload}
      alt="The AdMultiply upload panel, showing one landscape slot for your ad and three vertical slots for the cuts it will produce"
    />
  );
}

function AnalyzeVisual() {
  return (
    <Shot
      src={SHOTS.analyse}
      alt="AdMultiply working through an upload, showing what it understood about the ad and which stage it has reached"
    />
  );
}

function GenerateVisual() {
  return (
    <Shot
      src={SHOTS.generate}
      alt="Three finished micro-ads in the AdMultiply workspace, each with the angle it was cut for"
    />
  );
}

function LaunchVisual() {
  return (
    <Shot
      src={SHOTS.launch}
      alt="The AdMultiply library, with every cut kept and ready to download"
    />
  );
}
