"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, Check, Clapperboard, Layers, ListVideo, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer } from "@/components/ui/video-player";
import { useDashboard, type Job, type Stage } from "./dashboard-provider";

const STAGES: { key: Stage; label: string; icon: typeof Layers }[] = [
  { key: "queued", label: "Queued", icon: ListVideo },
  { key: "analyzing", label: "Analyzing your ad", icon: BrainCircuit },
  { key: "planning", label: "Writing 3 strategies", icon: Layers },
  { key: "rendering", label: "Rendering variations", icon: Clapperboard },
];

const order: Stage[] = ["queued", "analyzing", "planning", "rendering", "ready"];

export function ProcessingCard({ job }: { job: Job }) {
  const { hd, markPreviewPlayed } = useDashboard();
  const stageIdx = order.indexOf(job.stage);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--color-border-subtle)] p-5 dark:border-[var(--color-border-dark-subtle)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <Loader2 size={17} className="animate-spin" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{job.fileName}</p>
              <p className="text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                Usually takes 1–2 minutes — feel free to keep browsing, we&apos;ll
                notify you.
              </p>
            </div>
          </div>
          <Badge tone="brand">Detected: {job.category}</Badge>
        </div>

        {/* Stage stepper */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STAGES.map((s, i) => {
            const done = stageIdx > i;
            const active = stageIdx === i;
            return (
              <div
                key={s.key}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                    : done
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-[var(--color-ink-muted)] opacity-60 dark:text-[var(--color-ink-dark-muted)]"
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
                  ) : (
                    <s.icon size={12} strokeWidth={2.2} />
                  )}
                </span>
                <span className="truncate">{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Live narration from the pipeline */}
        <div className="mt-3 flex h-5 items-center gap-2 pl-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
          <AnimatePresence mode="wait">
            <motion.span
              key={job.substatus}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
            >
              {job.substatus}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Progressive reveal: three slots fill in as renders land */}
      <div className="grid grid-cols-3 gap-3 p-5">
        {job.variations.map((v) => (
          <div key={v.id} className="flex flex-col gap-2">
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
                {v.status === "rendering" && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={18} className="animate-spin text-brand-500" />
                  </span>
                )}
              </div>
            )}
            <p
              className={`truncate text-center text-[11px] font-semibold ${
                v.status === "ready"
                  ? ""
                  : "text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
              }`}
            >
              {v.strategy}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
