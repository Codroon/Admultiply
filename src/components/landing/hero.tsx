"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Nav } from "./nav";
import { HeroMockup } from "./hero-mockup";

/* A dark stage the rest of the page emerges from.

   Deliberate art direction rather than a theme flip, the stage is dark in
   both light and dark mode, and the page opens into the site's normal surface
   below. Every serious video tool is dark because footage reads properly
   against near-black, and the three cuts in the hero are footage.

   The headline is centred and very large. The two-column "copy left, product
   panel right" shape is what every B2B site has looked like since 2019, and
   it caps the headline at whatever fits in half the viewport. */
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#09090B] pb-20 pt-28 sm:pt-32 lg:pb-28">
      <Nav overDark />

      {/* Stage lighting */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-14rem] h-[26rem] w-[30rem] -translate-x-1/2 rounded-full bg-brand-500/18 blur-[110px] sm:top-[-12rem] sm:h-[34rem] sm:w-[52rem] sm:bg-brand-500/25 sm:blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 hidden h-72 w-72 rounded-full bg-amber-500/10 blur-[120px] sm:block" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 60% 50% at 50% 0%, black, transparent)",
            WebkitMaskImage:
              "radial-gradient(ellipse 60% 50% at 50% 0%, black, transparent)",
          }}
        />
        {/* The seam into the page below */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#09090B]" />
      </div>

      <div className="mx-auto max-w-5xl px-6 text-center">
        <motion.a
          href="#how-it-works"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-white/70 ring-1 ring-white/10 backdrop-blur transition-colors hover:bg-white/[0.1] hover:text-white"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          AI that re-cuts your winning ads
          <ArrowRight size={12} className="opacity-50" />
        </motion.a>

        {/* Line by line, each rising out of its own mask */}
        <h1 className="display mt-7 text-white">
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
          className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg"
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
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_8px_32px_-8px_rgba(249,115,22,0.8)] transition-all hover:bg-brand-400 sm:w-auto"
          >
            Start for free
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </a>
          <a
            href="#how-it-works"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white/[0.06] px-7 py-3.5 text-sm font-semibold text-white ring-1 ring-white/12 backdrop-blur transition-colors hover:bg-white/[0.12] sm:w-auto"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
              <Play size={9} className="ml-px fill-white" />
            </span>
            See how it works
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.78 }}
          className="mt-6 text-xs text-white/35"
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
