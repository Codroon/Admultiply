"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Nav } from "./nav";
import { HeroMockup } from "./hero-mockup";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-28 pb-16 sm:pt-32 lg:pt-36 lg:pb-24">
      <Nav />

      {/* Background: brand glow blobs + faint grid */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px] dark:bg-brand-500/15" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-amber-400/15 blur-[120px] dark:bg-amber-500/10" />
        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-ink) 1px, transparent 1px), linear-gradient(90deg, var(--color-ink) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent)",
          }}
        />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-8 lg:px-12">
        {/* Left: copy */}
        <div className="flex flex-col items-start">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-600 ring-1 ring-brand-500/20 dark:text-brand-400"
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-brand-500">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-brand-500" />
            </span>
            Powered by AdMultiply AI
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.35rem]"
          >
            Multiply your best-performing ads.{" "}
            <span className="bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer">
              Maximise your ROI.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-5 max-w-lg text-base text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)] sm:text-lg"
          >
            Turn your best-performing ads into multiple high-converting micro
            variations in seconds with AdMultiply AI — helping you beat creative
            fatigue by extending the lifespan of your winning creatives.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <a
              href="/waitlist"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:bg-brand-600 hover:shadow-brand-500/40"
            >
              Start for Free
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </a>
            <a
              href="#how-it-works"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[var(--color-ink)] shadow-sm ring-1 ring-black/10 transition-all hover:bg-black/[0.02] dark:bg-white/5 dark:text-white dark:ring-white/10 dark:hover:bg-white/10"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                <Play size={10} className="fill-brand-500" />
              </span>
              Watch our 60-sec Demo
            </a>
          </motion.div>

          {/* Honest microcopy (replaces fabricated stats) */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-6 text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
          >
            No credit card required
            <span className="mx-2 text-brand-500">·</span>
            1 winning ad video = 3 new creative variations
            <span className="mx-2 text-brand-500">·</span>
            Subscribe &amp; save
          </motion.p>
        </div>

        {/* Right: animated product mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <HeroMockup />
        </motion.div>
      </div>
    </section>
  );
}
