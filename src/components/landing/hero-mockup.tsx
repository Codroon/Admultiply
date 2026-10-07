"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/* The product, as the hero image.

   This used to be three 9:16 cards playing Google's public sample clips
   behind Unsplash posters: a picture of the idea rather than a picture of the
   thing. The client's note was to show the actual dashboard, the actual
   video, and the work actually being done, so this is a real screenshot of
   the workspace with three finished cuts in it.

   It tilts very slightly and settles as you scroll, which gives the frame
   depth without turning it into a gimmick. */
export function HeroMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const lift = useTransform(scrollYProgress, [0, 0.6], [26, -14]);
  const tilt = useTransform(scrollYProgress, [0, 0.6], [5.5, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.6], [0.95, 1]);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-5xl px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={
          still
            ? undefined
            : { y: lift, rotateX: tilt, scale, transformPerspective: 1600 }
        }
        className="relative"
      >
        {/* The glow the frame sits in */}
        <div className="pointer-events-none absolute -inset-x-10 -top-8 bottom-0 -z-10 rounded-[2rem] bg-brand-500/12 blur-[90px] dark:bg-brand-500/20" />

        <div className="overflow-hidden rounded-xl shadow-[0_30px_90px_-30px_rgba(0,0,0,0.35)] ring-1 ring-black/10 dark:shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] dark:ring-white/12 sm:rounded-2xl">
          <Image
            src="/product/step-4-results.png"
            alt="The AdMultiply workspace with three finished micro-ads ready to download"
            width={2720}
            height={1760}
            priority
            sizes="(min-width: 1024px) 60rem, 100vw"
            className="h-auto w-full"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.1 }}
        className="mt-6 flex items-center justify-center gap-3 text-xs font-medium text-[var(--color-ink-muted)] dark:text-white/45"
      >
        <span className="h-px w-8 bg-black/15 dark:bg-white/15" />
        One winning ad in, three micro-ads out
        <span className="h-px w-8 bg-black/15 dark:bg-white/15" />
      </motion.div>
    </div>
  );
}
