"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Nav } from "./nav";
import { HeroMockup } from "./hero-mockup";

/* The stage the page opens on.

   This used to be near-black in both themes, as deliberate art direction: the
   hero shows footage and footage reads honestly against dark. The client's
   call is that light mode should be light, so the stage now follows the theme
   and every piece of it has both appearances.

   That is more than a background. Everything here was written white-on-dark,
   so the pill, both buttons, the grid overlay, the seam into the section below
   and all of the type carry a light counterpart. The grid line colour goes
   through a `--grid` custom property because it lives in an inline style,
   which Tailwind variants cannot reach.

   The headline is centred and very large. The two-column "copy left, product
   panel right" shape is what every B2B site has looked like since 2019, and
   it caps the headline at whatever fits in half the viewport. */
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[var(--color-surface)] pb-20 pt-28 transition-colors dark:bg-[#09090B] sm:pt-32 lg:pb-28">
      <Nav />

      {/* Stage lighting. Warmer and softer on white, where a glow at the dark
          mode's strength would read as an orange wash rather than light. */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-14rem] h-[26rem] w-[30rem] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[110px] dark:bg-brand-500/18 sm:top-[-12rem] sm:h-[34rem] sm:w-[52rem] sm:bg-brand-500/14 sm:dark:bg-brand-500/25 sm:blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 hidden h-72 w-72 rounded-full bg-amber-400/15 blur-[120px] dark:bg-amber-500/10 sm:block" />
        <div
          className="absolute inset-0 opacity-[0.05] [--grid:#0a0a0a] dark:opacity-[0.07] dark:[--grid:#ffffff]"
          style={{
            backgroundImage:
              "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 60% 50% at 50% 0%, black, transparent)",
            WebkitMaskImage:
              "radial-gradient(ellipse 60% 50% at 50% 0%, black, transparent)",
          }}
        />
        {/* The seam into the page below */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[var(--color-surface)] dark:to-[#09090B]" />
      </div>

      <div className="mx-auto max-w-5xl px-6 text-center">
        <motion.a
          href="#how-it-works"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full bg-black/[0.04] px-3.5 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] ring-1 ring-black/[0.07] backdrop-blur transition-colors hover:bg-black/[0.07] hover:text-[var(--color-ink)] dark:bg-white/[0.06] dark:text-white/70 dark:ring-white/10 dark:hover:bg-white/[0.1] dark:hover:text-white"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          AI that re-cuts your winning ads
          <ArrowRight size={12} className="opacity-50" />
        </motion.a>

        {/* Line by line, each rising out of its own mask */}
        <h1 className="display mt-7 text-[var(--color-ink)] dark:text-white">
          <span className="reveal-line">
            <span style={{ animationDelay: "0.08s" }}>Multiply what</span>
          </span>
          <span className="reveal-line">
            <span style={{ animationDelay: "0.2s" }} className="text-brand-500">
              already works.
            </span>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-[var(--color-ink-muted)] dark:text-white/60 sm:text-lg"
        >
          Upload one ad that&apos;s already converting. Get three vertical cuts
          built from its strongest moments, ready for TikTok, Reels and Shorts
          in about a minute.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.62 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <a
            href="/waitlist"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_8px_28px_-10px_rgba(249,115,22,0.75)] transition-all hover:bg-brand-600 dark:shadow-[0_8px_32px_-8px_rgba(249,115,22,0.8)] dark:hover:bg-brand-400 sm:w-auto"
          >
            Start for free
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </a>
          <a
            href="#how-it-works"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black/[0.04] px-7 py-3.5 text-sm font-semibold text-[var(--color-ink)] ring-1 ring-black/[0.08] backdrop-blur transition-colors hover:bg-black/[0.07] dark:bg-white/[0.06] dark:text-white dark:ring-white/12 dark:hover:bg-white/[0.12] sm:w-auto"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 dark:bg-white/10">
              <Play
                size={9}
                className="ml-px fill-[var(--color-ink)] dark:fill-white"
              />
            </span>
            See how it works
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.78 }}
          className="mt-6 text-xs text-[var(--color-ink-muted)] opacity-80 dark:text-white/35 dark:opacity-100"
        >
          No credit card
          <span className="mx-2 text-brand-500/70">·</span>
          1 upload = 3 variations
          <span className="mx-2 text-brand-500/70">·</span>
          Cancel any time
        </motion.p>
      </div>

      <div className="mt-10 sm:mt-14">
        <HeroMockup />
      </div>
    </section>
  );
}
