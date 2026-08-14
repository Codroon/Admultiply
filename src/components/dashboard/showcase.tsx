"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { ArrowDown, Play } from "lucide-react";

/* "Made with AdMultiply" — an auto-scrolling gallery of example micro-ads
   so new users instantly see what good output looks like. Sample clips for
   the demo; swap for real customer output at launch.

   Backend rules agreed with the client (implement when this goes live-data):
   1. Consent — a customer's output only appears here if they have explicitly
      opted in (`share_publicly` on the user/video, default OFF) + a toggle in
      Settings to turn it on/off at any time.
   2. Volume threshold — the section only activates once the library holds
      enough real micro-ads (~50–100). Keep that number configurable (env /
      admin setting), not hardcoded, so it can be tuned without a deploy.
   Until both pass, render nothing rather than a thin/fake gallery. */
const EXAMPLES = [
  {
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    poster: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=300&h=540&q=80",
    tag: "Fitness · Hook-first",
  },
  {
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    poster: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&h=540&q=80",
    tag: "Beauty · Social proof",
  },
  {
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    poster: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=300&h=540&q=80",
    tag: "E-commerce · Problem → Solution",
  },
  {
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    poster: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=300&h=540&q=80",
    tag: "Fashion · Hook-first",
  },
  {
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    poster: "https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=300&h=540&q=80",
    tag: "SaaS · Problem → Solution",
  },
  {
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    poster: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=300&h=540&q=80",
    tag: "Food & Drink · Social proof",
  },
];

export function Showcase() {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-500">
            Made with AdMultiply
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-tight sm:text-xl">
            Micro-ads our AI generated from one winning upload
          </h2>
        </div>
        <span className="hidden shrink-0 text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)] sm:block">
          Hover to play
        </span>
      </div>

      {/* Marquee: two identical halves → seamless -50% loop; pauses on hover */}
      <div className="group marquee-mask flex overflow-hidden">
        {[0, 1].map((half) => (
          <div
            key={half}
            aria-hidden={half === 1}
            className="animate-marquee flex shrink-0 items-center gap-4 pr-4 group-hover:[animation-play-state:paused]"
            style={{ animationDuration: "38s" }}
          >
            {EXAMPLES.map((ex, i) => (
              <ShowcaseCard key={`${half}-${i}`} {...ex} />
            ))}
          </div>
        ))}
      </div>

      {/* Cue into the upload zone */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <motion.span
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/10 text-brand-500"
        >
          <ArrowDown size={15} strokeWidth={2.5} />
        </motion.span>
        <p className="text-xs font-semibold text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          Your turn — upload your winning ad
        </p>
      </div>
    </section>
  );
}

function ShowcaseCard({ src, poster, tag }: { src: string; poster: string; tag: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => ref.current?.play().catch(() => {})}
      onMouseLeave={() => {
        ref.current?.pause();
        if (ref.current) ref.current.currentTime = 0;
      }}
      className="relative w-36 shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-zinc-900 shadow-md ring-1 ring-black/10 dark:ring-white/10 sm:w-40"
    >
      <div className="aspect-[9/16]">
        <video
          ref={ref}
          src={src}
          poster={poster}
          muted
          playsInline
          loop
          preload="none"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
      <span className="pointer-events-none absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur">
        <Play size={10} className="ml-px fill-white" />
      </span>
      <span className="pointer-events-none absolute inset-x-2 bottom-2 truncate rounded-lg bg-black/40 px-2 py-1 text-center text-[10px] font-semibold text-white backdrop-blur">
        {tag}
      </span>
    </motion.div>
  );
}
