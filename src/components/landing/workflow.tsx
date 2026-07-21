"use client";

import { motion } from "framer-motion";
import { UploadCloud, Play, Download, Copy } from "lucide-react";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";

const stats = [
  { label: "Winning Ads Repurposed", value: "184" },
  { label: "Micro Variations Generated", value: "552" },
  { label: "Monthly Tokens Remaining", value: "38" },
  { label: "Current Plan", value: "Pro", action: "Manage Billing" },
];

const adThumbnails = [
  "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1581090700227-1e37b190418e?auto=format&fit=crop&w=400&q=80",
];

export function Workflow() {
  return (
    <section className="px-6 py-20 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-500">
            One Workflow. Zero Friction.
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Upload.{" "}
            <span className="bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer">
              Multiply.
            </span>{" "}
            Launch.
          </h2>
          <p className="mt-4 text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)] sm:text-base">
            Everything you need to upload winning ads, generate high-converting
            micro variations and manage your monthly usage — all in one place.
          </p>
        </motion.div>

        {/* App mockup */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl bg-[var(--color-surface-muted)] p-3 shadow-2xl ring-1 ring-black/10 dark:bg-[var(--color-surface-dark-card)] dark:ring-white/10 sm:p-5"
        >
          {/* Outcome-oriented stat cards */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            {stats.map((s) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                className="relative rounded-xl bg-white p-4 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/5"
              >
                <Copy
                  size={12}
                  className="absolute right-3 top-3 text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
                />
                <p className="pr-4 text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                  {s.label}
                </p>
                <p className="mt-2 text-2xl font-bold sm:text-3xl">{s.value}</p>
                {s.action && (
                  <button className="mt-1 text-[10px] font-semibold text-brand-500 hover:underline">
                    {s.action}
                  </button>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Upload area */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-4 rounded-xl bg-white p-5 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/5"
          >
            <p className="text-center text-sm font-semibold">
              Upload your winning ad to get started
            </p>
            <div className="mt-3 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border-subtle)] py-6 dark:border-[var(--color-border-dark-subtle)]">
              <UploadCloud
                size={20}
                className="text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
              />
              <p className="mt-2 text-xs font-medium">
                Drag &amp; drop your video, or click to browse
              </p>
            </div>
          </motion.div>

          {/* Generated variations — compact, responsive thumbnails */}
          <div className="mt-5">
            <p className="text-center text-sm font-semibold">
              Your 3 new micro-ads are ready
            </p>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              className="mt-4 flex justify-center gap-3"
            >
              {adThumbnails.map((src, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  whileHover={{ y: -3 }}
                  className="w-20 overflow-hidden rounded-lg bg-white ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/5 sm:w-28"
                >
                  <div className="relative aspect-[9/16]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Ad variation ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow backdrop-blur">
                        <Play size={10} className="fill-brand-500 text-brand-500" />
                      </div>
                    </div>
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[8px] font-semibold text-white backdrop-blur">
                      Ad {i + 1}
                    </span>
                  </div>
                  <div className="p-1.5">
                    <button className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-brand-500 px-2 py-1 text-[9px] font-semibold text-white">
                      <Download size={9} />
                      Download
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
