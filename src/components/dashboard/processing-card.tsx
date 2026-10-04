"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, Check, Clapperboard, Layers, ListVideo, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayer } from "@/components/ui/video-player";
import { useDashboard, type Job, type Stage } from "./dashboard-provider";

/* The wait.

   This screen runs for one to two minutes, and what it used to show was a row
   of stepper pills and a spinner — the same wait any upload form gives you,
   which tells the customer nothing and quietly invites them to wonder whether
   a token just disappeared into a progress bar.

   Two things changed. Their own ad plays here, so the wait is visibly about
   their footage rather than a generic job. And the brief is surfaced as it
   lands: what we think the ad is selling, what kind of ad it is, and the three
   angles with the reasoning behind each. That reasoning already existed — the
   planner returns a title and a logline per angle — and the old card threw it
   away in favour of a truncated two-word caption.

   The result is that by the time the renders arrive the customer has already
   read why these three, which is the question the client asked us to answer. */

const STAGES: { key: Stage; label: string; icon: typeof Layers }[] = [
  { key: "queued", label: "Queued", icon: ListVideo },
  { key: "analyzing", label: "Watching your ad", icon: BrainCircuit },
  { key: "planning", label: "Choosing 3 angles", icon: Layers },
  { key: "rendering", label: "Cutting the edits", icon: Clapperboard },
];

const order: Stage[] = ["queued", "analyzing", "planning", "rendering", "ready"];

export function ProcessingCard({ job }: { job: Job }) {
  const { hd, markPreviewPlayed } = useDashboard();
  /* Source ads arrive in any shape. Forcing a portrait ad into a 16:9 frame
     buries it in pillarbox, so the frame follows the footage — read off the
     element itself rather than threaded through the Job, since this is the
     only place that cares. */
  const [portrait, setPortrait] = useState(false);
  const stageIdx = order.indexOf(job.stage);
  // Loglines arrive with the plan; before that the slots are genuinely unknown.
  const planned = job.variations.some((v) => v.blurb);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:gap-6">
        {/* Their ad, playing. The objectURL does not survive a reload by
            design, so fall back to the poster and then to a plain skeleton. */}
        <div className="lg:w-[38%] lg:shrink-0">
          <Label>The ad you uploaded</Label>
          <div
            className={`relative mx-auto overflow-hidden rounded-xl bg-black ring-1 ring-black/10 dark:ring-white/10 ${
              portrait ? "w-[62%] max-w-[210px]" : "w-full"
            }`}
          >
            <div className={portrait ? "aspect-[9/16]" : "aspect-video"}>
              {job.sourceUrl ? (
                <video
                  src={job.sourceUrl}
                  muted
                  playsInline
                  loop
                  autoPlay
                  onLoadedMetadata={(e) =>
                    setPortrait(
                      e.currentTarget.videoHeight > e.currentTarget.videoWidth
                    )
                  }
                  className="h-full w-full object-cover"
                />
              ) : job.sourcePoster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={job.sourcePoster}
                  alt=""
                  className="h-full w-full object-cover opacity-70"
                />
              ) : (
                <Skeleton className="absolute inset-0" />
              )}
            </div>
            {/* A scanning sweep, tied to nothing but the fact that we are
                still working — honest as ambience, not as progress. */}
            {job.stage !== "ready" && (
              <motion.span
                aria-hidden
                initial={{ y: "-100%" }}
                animate={{ y: "100%" }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                className="pointer-events-none absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-brand-500/20 to-transparent"
              />
            )}
          </div>
          <p className="mt-2 truncate text-xs font-medium text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            {job.fileName} · {job.duration}
          </p>
        </div>

        {/* What we understood, and where we are */}
        <div className="min-w-0 flex-1">
          <Label>What we understood</Label>

          <dl className="space-y-2.5">
            <Fact
              term="Selling"
              value={job.product}
              pending="Still watching the ad…"
            />
            <Fact
              term="Format"
              value={
                job.category && job.category !== "Analysing…" ? job.category : null
              }
              pending="Still watching the ad…"
            />
          </dl>

          {/* Stage stepper */}
          <div className="mt-5 flex flex-col gap-1.5">
            {STAGES.map((s, i) => {
              const done = stageIdx > i;
              const active = stageIdx === i;
              return (
                <div
                  key={s.key}
                  className={`flex items-center gap-2.5 text-xs font-semibold transition-colors ${
                    active
                      ? "text-brand-600 dark:text-brand-400"
                      : done
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-[var(--color-ink-muted)] opacity-50 dark:text-[var(--color-ink-dark-muted)]"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      done
                        ? "bg-emerald-500 text-white"
                        : active
                          ? "bg-brand-500 text-white"
                          : "bg-black/5 dark:bg-white/10"
                    }`}
                  >
                    {done ? (
                      <Check size={12} strokeWidth={3} />
                    ) : active ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <s.icon size={12} strokeWidth={2.2} />
                    )}
                  </span>
                  {s.label}
                </div>
              );
            })}
          </div>

          {/* Live narration from the pipeline */}
          <div className="mt-3 flex h-5 items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
            <AnimatePresence mode="wait">
              <motion.span
                key={job.substatus}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="truncate text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
              >
                {job.substatus}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* The three angles, with the reasoning, filling in as renders land */}
      <div className="border-t border-[var(--color-border-subtle)] p-5 dark:border-[var(--color-border-dark-subtle)]">
        <Label>
          {planned ? "Why these three" : "Three angles, being chosen"}
        </Label>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {job.variations.map((v, i) => (
            <div key={v.id} className="flex min-w-0 flex-col gap-2">
              {v.status === "ready" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <VideoPlayer
                    src={v.src}
                    poster={v.poster}
                    watermarked={!hd}
                    duration={v.duration}
                    onPlay={markPreviewPlayed}
                    className="aspect-[9/16]"
                  />
                </motion.div>
              ) : (
                <div className="relative aspect-[9/16]">
                  <Skeleton className="absolute inset-0 rounded-xl" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    {v.status === "rendering" ? (
                      <Loader2 size={18} className="animate-spin text-brand-500" />
                    ) : (
                      <span className="display-xs text-[var(--color-ink-muted)] opacity-25 dark:text-[var(--color-ink-dark-muted)]">
                        {i + 1}
                      </span>
                    )}
                  </span>
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-brand-600 dark:text-brand-400">
                  {v.strategy}
                </p>
                {v.label && v.label !== v.strategy && (
                  <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-snug">
                    {v.label}
                  </p>
                )}
                {v.blurb && (
                  <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                    {v.blurb}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
      {children}
    </p>
  );
}

/* A fact we either know or are honest about not knowing yet. */
function Fact({
  term,
  value,
  pending,
}: {
  term: string;
  value: string | null;
  pending: string;
}) {
  return (
    <div className="flex gap-3 text-sm">
      <dt className="w-16 shrink-0 text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        {term}
      </dt>
      <dd className="min-w-0 flex-1 font-semibold">
        {value ? (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="block"
          >
            {value}
          </motion.span>
        ) : (
          <span className="font-normal italic text-[var(--color-ink-muted)] opacity-70 dark:text-[var(--color-ink-dark-muted)]">
            {pending}
          </span>
        )}
      </dd>
    </div>
  );
}
