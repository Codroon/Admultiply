"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { viewportOnce } from "@/lib/motion";

export function ScaleCta() {
  return (
    <section className="px-6 py-16 lg:px-12 lg:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportOnce}
        transition={{ duration: 0.6 }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-brand-600 px-6 py-14 text-center shadow-xl shadow-brand-500/25 sm:px-12"
      >
        {/* soft glow accents */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-black/10 blur-3xl" />

        <div className="relative">
          <h2 className="mx-auto max-w-2xl display-sm uppercase text-white">
            Beat ad fatigue. Scale what works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
            Maximise ROI from your best-performing ads with AdMultiply AI.
            Transform winning ads into high-converting micro variations in
            seconds. Helping brands, agencies and creators beat creative
            fatigue and scale profitable campaigns faster.
          </p>

          <motion.a
            href="/signup"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="group mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-brand-600 shadow-lg transition-shadow hover:shadow-xl"
          >
            Get started for Free
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </motion.a>

          <p className="mt-4 text-xs text-white/75">
            3 free tokens every month. 1 token = 1 video processed (up to 90
            seconds).
          </p>

          <p className="mt-8 text-[11px] font-semibold uppercase tracking-wider text-white/60">
            Trusted by Creators and Marketing teams
          </p>
          <p className="mt-3 text-sm text-white/85">
            Try AdMultiply free. Generate up to 9 fresh creative variations
            every month
          </p>
        </div>
      </motion.div>
    </section>
  );
}
