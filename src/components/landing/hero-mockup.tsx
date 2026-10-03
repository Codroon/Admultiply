"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/* The product's one idea, as the hero image: one ad becomes three.

   A static product panel off to the side is what the two-column SaaS hero
   does. This puts the transformation itself centre stage — three vertical
   cuts fanned around a raised middle, playing, with the outer two drifting on
   scroll so the group has depth rather than sitting flat on the page. */

const CUTS = [
  {
    strategy: "Hook-first",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    poster:
      "https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=420&h=750&q=80",
  },
  {
    strategy: "Problem → Solution",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    poster:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=420&h=750&q=80",
  },
  {
    strategy: "Social proof",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    poster:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=420&h=750&q=80",
  },
];

export function HeroMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // The outer cards drift apart and the middle one settles as you scroll past.
  // Both directions are declared here rather than derived per card: these are
  // hooks, so they cannot be created inside the map below.
  const spreadRight = useTransform(scrollYProgress, [0, 0.55], [0, 26]);
  const spreadLeft = useTransform(scrollYProgress, [0, 0.55], [0, -26]);
  const lift = useTransform(scrollYProgress, [0, 0.55], [0, -18]);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-4xl px-6">
      <div className="flex items-end justify-center gap-3 sm:gap-5">
        {CUTS.map((cut, i) => {
          const middle = i === 1;
          return (
            <motion.div
              key={cut.strategy}
              initial={{ opacity: 0, y: 48, rotate: 0 }}
              animate={{
                opacity: 1,
                y: 0,
                rotate: still ? 0 : middle ? 0 : i === 0 ? -3.5 : 3.5,
              }}
              transition={{
                duration: 1,
                delay: 0.55 + i * 0.13,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={
                still
                  ? undefined
                  : {
                      x: middle ? undefined : i === 0 ? spreadLeft : spreadRight,
                      y: middle ? lift : undefined,
                    }
              }
              className={`relative ${
                middle ? "w-[38%] max-w-[230px]" : "w-[31%] max-w-[190px]"
              }`}
            >
              <div
                className={`relative overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/10 ${
                  middle
                    ? "shadow-[0_30px_80px_-20px_rgba(249,115,22,0.45)]"
                    : "shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)]"
                }`}
              >
                <div className="aspect-[9/16]">
                  <video
                    src={cut.src}
                    poster={cut.poster}
                    muted
                    playsInline
                    loop
                    autoPlay
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <span className="pointer-events-none absolute inset-x-2 bottom-2 truncate rounded-lg bg-black/45 px-2 py-1 text-center text-[10px] font-semibold text-white/90 backdrop-blur">
                  {cut.strategy}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* The claim, under the thing it describes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.1 }}
        className="mt-6 flex items-center justify-center gap-3 text-xs font-medium text-white/45"
      >
        <span className="h-px w-8 bg-white/15" />
        One winning ad in, three micro-ads out
        <span className="h-px w-8 bg-white/15" />
      </motion.div>
    </div>
  );
}
