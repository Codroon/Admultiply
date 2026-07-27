"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Layers, Loader2, UploadCloud } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VideoPlayer } from "@/components/ui/video-player";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { useDashboard, type Job } from "@/components/dashboard/dashboard-provider";

/* One status taxonomy: Queued / Processing / Ready / Failed */
const statusOf = (job: Job): { label: string; tone: BadgeTone } => {
  if (job.stage === "ready") return { label: "Ready", tone: "success" };
  if (job.stage === "failed") return { label: "Failed", tone: "danger" };
  if (job.stage === "queued") return { label: "Queued", tone: "neutral" };
  return { label: "Processing", tone: "brand" };
};

export default function LibraryPage() {
  const { jobs, hd, markPreviewPlayed } = useDashboard();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Library</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          Every upload with its generated variations, grouped by source ad.
        </p>
      </div>

      {jobs.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-brand-500/40 text-brand-500">
            <Layers size={24} />
          </span>
          <h2 className="mt-4 text-base font-bold">No videos in your library yet</h2>
          <p className="mt-1.5 max-w-sm text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            Upload a video and your 3 AI-generated micro-ad clips will be stored
            here for download anytime.
          </p>
          <Link href="/dashboard" className="mt-5">
            <Button size="lg">
              <UploadCloud size={15} />
              Upload your first video
            </Button>
          </Link>
        </Card>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-4"
        >
          {jobs.map((job) => {
            const s = statusOf(job);
            const processing = s.label === "Processing" || s.label === "Queued";
            return (
              <motion.div key={job.id} variants={fadeUp}>
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{job.fileName}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                        Uploaded{" "}
                        {new Date(job.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {job.duration} · {job.category}
                      </p>
                    </div>
                    <Badge tone={s.tone}>
                      {processing && <Loader2 size={10} className="animate-spin" />}
                      {s.label}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2.5 sm:max-w-md">
                    {job.variations.map((v) =>
                      v.status === "ready" ? (
                        <div key={v.id} className="flex flex-col gap-1">
                          <VideoPlayer
                            src={v.src}
                            poster={v.poster}
                            watermarked={!hd}
                            duration={v.duration}
                            onPlay={markPreviewPlayed}
                            className="aspect-[9/16]"
                          />
                          <p className="truncate text-center text-[10px] font-semibold text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                            {v.strategy}
                            {v.downloaded && " · ↓"}
                          </p>
                        </div>
                      ) : (
                        <div
                          key={v.id}
                          className="flex aspect-[9/16] items-center justify-center rounded-xl bg-black/[0.04] dark:bg-white/[0.06]"
                        >
                          <Loader2 size={16} className="animate-spin text-brand-500/60" />
                        </div>
                      )
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
