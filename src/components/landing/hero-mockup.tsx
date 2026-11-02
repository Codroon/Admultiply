"use client";

import { useRef } from "react";
import Image from "next/image";
import { Check, Play } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { LogoMark } from "@/components/logo";

/* The hero visual: one ad in, three out.

   This was a flat screenshot of the workspace. The client's note was that a
   dashboard shot does not say what the product does, and she is right: a
   picture of an interface asks you to work out the idea, where this states
   it. One source card, the mark, three finished cuts.

   The frames are real. They come from an actual ad run through the actual
   pipeline, so the three cards are the three cuts it produced, not a
   designer's impression of them.

   The node in the middle is the AdMultiply mark. It is deliberately not a
   sparkle: every AI product uses one, and the brand mark says who did the
   work rather than that a machine was involved. */

const STATS = [
  { value: "2,400+", label: "ads multiplied" },
  { value: "500+", label: "marketers" },
  { value: "4.8/5", label: "avg. rating", star: true },
];

const CUTS = [
  { src: "/product/hero/cut-1.jpg", label: "Hook A" },
  { src: "/product/hero/cut-2.jpg", label: "Hook B" },
  { src: "/product/hero/cut-3.jpg", label: "Hook C" },
];

export function HeroMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const lift = useTransform(scrollYProgress, [0, 0.6], [26, -14]);
  const scale = useTransform(scrollYProgress, [0, 0.6], [0.96, 1]);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-5xl px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={still ? undefined : { y: lift, scale }}
        className="relative"
      >
        <div className="pointer-events-none absolute -inset-x-10 -top-8 bottom-0 -z-10 rounded-[2rem] bg-brand-500/12 blur-[90px] dark:bg-brand-500/20" />

        <div className="overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.08] dark:bg-[#111113] dark:shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] dark:ring-white/10">
          {/* Numbers first, because they are the reason to keep reading. */}
          <div className="flex items-stretch divide-x divide-black/[0.07] border-b border-black/[0.07] dark:divide-white/[0.08] dark:border-white/[0.08]">
            {STATS.map((s) => (
              <div key={s.label} className="flex-1 px-3 py-3.5 text-center sm:px-6 sm:py-5">
                <p className="flex items-center justify-center gap-1 text-base font-bold tracking-tight text-[var(--color-ink)] dark:text-white sm:text-xl">
                  {s.value}
                  {s.star && (
                    <span className="text-sm text-brand-500 sm:text-base">★</span>
                  )}
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--color-ink-muted)] dark:text-white/45 sm:text-xs">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 p-4 sm:gap-5 sm:p-8">
            {/* The ad they already have. Larger than the outputs, because it
                is the thing they bring and the three are what they get. */}
            <figure className="w-[34%] shrink-0">
              <figcaption className="mb-2 truncate text-[10px] font-semibold text-[var(--color-ink-muted)] dark:text-white/50 sm:text-xs">
                Your winning ad
              </figcaption>
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-black/10 dark:ring-white/10 sm:rounded-xl">
                <Image
                  src="/product/hero/source.jpg"
                  alt="A winning video ad before AdMultiply re-cuts it"
                  fill
                  priority
                  sizes="(min-width: 640px) 16rem, 34vw"
                  className="object-cover"
                />
                <span className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow sm:h-11 sm:w-11">
                  <Play size={12} className="ml-px fill-brand-500 text-brand-500 sm:hidden" />
                  <Play size={16} className="ml-px hidden fill-brand-500 text-brand-500 sm:block" />
                </span>
              </div>
            </figure>

            {/* The transform. */}
            <div className="flex shrink-0 flex-col items-center gap-1">
              {/* The mark is an img of an SVG, so a text colour will not tint
                  it. brightness-0 invert forces it white, which is what makes
                  it readable on the orange. */}
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 shadow-lg shadow-brand-500/35 sm:h-12 sm:w-12">
                <LogoMark size={14} className="brightness-0 invert sm:hidden" />
                <LogoMark size={20} className="hidden brightness-0 invert sm:block" />
              </span>
              <span className="text-[8px] font-bold uppercase tracking-wider text-brand-500 sm:text-[10px]">
                AdMultiply
              </span>
            </div>

            {/* What comes back. */}
            <div className="flex min-w-0 flex-1 gap-1.5 sm:gap-3">
              {CUTS.map((cut, i) => (
                <motion.figure
                  key={cut.label}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.9 + i * 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="min-w-0 flex-1"
                >
                  <figcaption className="mb-2 truncate text-[10px] font-semibold text-[var(--color-ink-muted)] dark:text-white/50 sm:text-xs">
                    {cut.label}
                  </figcaption>
                  <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-black/10 dark:ring-white/10 sm:rounded-xl">
                    <Image
                      src={cut.src}
                      alt={`Micro-ad variation ${cut.label} produced by AdMultiply`}
                      fill
                      sizes="(min-width: 640px) 11rem, 20vw"
                      className="object-cover"
                    />
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 shadow sm:h-5 sm:w-5">
                      <Check size={9} strokeWidth={3.5} className="text-white" />
                    </span>
                  </div>
                </motion.figure>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.3 }}
        className="mt-6 flex items-center justify-center gap-3 text-xs font-medium text-[var(--color-ink-muted)] dark:text-white/45"
      >
        <span className="h-px w-8 bg-black/15 dark:bg-white/15" />
        One winning ad in, three micro-ads out
        <span className="h-px w-8 bg-black/15 dark:bg-white/15" />
      </motion.div>
    </div>
  );
}
