"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Coins, Plus } from "lucide-react";

/* The upload moment.

   What was here was a 340px-tall dashed rectangle with a gradient cloud icon
   in the middle of it, the single most generic element in the product, and
   the shape every file uploader on the web has had for a decade. It also
   wasted the most valuable screen in the app: this is the one moment where
   the customer is about to commit a token, and it told them nothing about
   what they were about to get.

   This shows the transformation instead. One landscape slot for the ad they
   have, three vertical slots for the ads they are about to get, and the
   arrow between them. The whole panel is still the drop target and the click
   target; the dashed affordance survives, shrunk down to the one slot where
   it means "put the file here" rather than wrapping the entire page.

   The three output slots breathe on a stagger so the panel reads as something
   waiting to run rather than an empty state. */

type Props = {
  dragging: boolean;
  onPick: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
};

export function UploadBay({
  dragging,
  onPick,
  onDragOver,
  onDragLeave,
  onDrop,
}: Props) {
  const still = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onPick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      whileHover={still ? undefined : { y: -2 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative isolate block w-full overflow-hidden rounded-3xl border p-5 text-left transition-colors duration-300 sm:p-7 ${
        dragging
          ? "border-brand-500 bg-brand-500/[0.06] shadow-xl shadow-brand-500/10"
          : "border-[var(--color-border-subtle)] bg-white hover:border-brand-500/50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-brand-500/40"
      }`}
    >
      {/* Light from above, brightening on hover and full on drag */}
      <span
        className={`pointer-events-none absolute left-1/2 top-[-9rem] -z-10 h-64 w-[34rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[90px] transition-opacity duration-500 ${
          dragging ? "opacity-100" : "opacity-0 group-hover:opacity-70"
        }`}
      />

      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:gap-6">
        {/* What they bring */}
        <div className="sm:w-[40%]">
          <SlotLabel>Your winning ad</SlotLabel>
          <div
            className={`relative flex aspect-video items-center justify-center rounded-xl border border-dashed transition-colors ${
              dragging
                ? "border-brand-500 bg-brand-500/10"
                : "border-black/15 bg-black/[0.03] group-hover:border-brand-500/50 dark:border-white/15 dark:bg-black/30"
            }`}
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 ${
                dragging
                  ? "scale-110 bg-brand-500 text-white"
                  : "bg-brand-500/12 text-brand-500 group-hover:scale-105 group-hover:bg-brand-500 group-hover:text-white"
              }`}
            >
              <Plus size={20} strokeWidth={2.5} />
            </span>
            <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-medium text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              16:9 · up to 1:30
            </span>
          </div>
        </div>

        {/* The transformation */}
        <div className="flex shrink-0 items-center justify-center gap-2 sm:self-center">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-brand-500/40 sm:w-5" />
          <ArrowRight
            size={16}
            className="shrink-0 rotate-90 text-brand-500 sm:rotate-0"
            strokeWidth={2.5}
          />
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-brand-500/40 sm:w-5" />
        </div>

        {/* What they get */}
        <div className="min-w-0 flex-1">
          <SlotLabel>Three micro-ads, three angles</SlotLabel>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={
                  still
                    ? undefined
                    : { opacity: [0.45, 0.85, 0.45], y: [0, -3, 0] }
                }
                transition={{
                  duration: 2.8,
                  delay: i * 0.22,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative flex aspect-[9/16] items-center justify-center rounded-lg border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-black/30"
              >
                {/* The numeral does more work than an icon here: the panel's
                    whole job is to say "three". */}
                <span className="display-xs text-[var(--color-ink-muted)] opacity-25 dark:text-[var(--color-ink-dark-muted)]">
                  {i + 1}
                </span>
                <span className="absolute bottom-1.5 text-[9px] font-bold text-[var(--color-ink-muted)] opacity-60 dark:text-[var(--color-ink-dark-muted)]">
                  9:16
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* The commitment, stated plainly */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-4 dark:border-white/10">
        <p className="text-sm font-semibold">
          {dragging ? (
            <span className="text-brand-500">
              Drop it, we&apos;ll take it from here
            </span>
          ) : (
            <>
              Drop your ad here, or{" "}
              <span className="text-brand-500 underline decoration-brand-500/30 underline-offset-4">
                browse
              </span>
              <span className="ml-2 font-normal text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                MP4, MOV or AVI
              </span>
            </>
          )}
        </p>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-500/10 px-3.5 py-1.5 text-[11px] font-bold text-brand-600 ring-1 ring-brand-500/20 dark:text-brand-400">
          <Coins size={11} />1 token = 3 variations
        </span>
      </div>
    </motion.button>
  );
}

function SlotLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
      {children}
    </p>
  );
}
