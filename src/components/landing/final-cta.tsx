"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { viewportOnce } from "@/lib/motion";

export function FinalCta() {
  return (
    <section className="bg-gradient-to-b from-brand-50 to-brand-100 px-6 py-20 dark:from-brand-500/10 dark:to-brand-500/5 lg:px-12 lg:py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportOnce}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Extend the lifespan of your winning creatives.
          <br />
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewportOnce}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-brand-500"
          >
            Multiply what works.
          </motion.span>
        </h2>

        <motion.a
          href="/waitlist"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5, delay: 0.45 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
          className="group mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-shadow hover:shadow-xl hover:shadow-brand-500/40"
        >
          Start for Free
          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </motion.a>
      </motion.div>
    </section>
  );
}
