"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Download, Layers, Loader2, Lock, UploadCloud } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VideoPlayer } from "@/components/ui/video-player";
import { staggerContainer, fadeUp } from "@/lib/motion";
import {
  useDashboard,
  type Job,
  type Variation,
} from "@/components/dashboard/dashboard-provider";

/* The library.

   Three 9:16 players used to sit inside a 448px row, so each one rendered at
   roughly 140px wide with no controls and a truncated two word caption. You
   cannot tell whether a cut works at that size, which made the screen that is
   supposed to hold the customer's finished work the least useful one in the
   product.

   Now each cut is large enough to judge, carries its own title and length,
   can be enlarged, and can be downloaded from here. That last one matters:
   the empty state promises the clips are "stored here for download anytime"
   and until now there was no way to download them from this page at all.

   On a phone the three cuts become a swipeable row rather than three columns,
   because a third of 345px is 115px and that is the problem we are fixing. */

const statusOf = (job: Job): { label: string; tone: BadgeTone } => {
  if (job.stage === "ready") return { label: "Ready", tone: "success" };
  if (job.stage === "failed") return { label: "Failed", tone: "danger" };
  if (job.stage === "queued") return { label: "Queued", tone: "neutral" };
  return { label: "Processing", tone: "brand" };
};

export default function LibraryPage() {
  const { jobs, hd, markPreviewPlayed, download, openUpgrade } = useDashboard();

  const ready = jobs.filter((j) => j.stage === "ready").length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="display-xs">My Library</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          {jobs.length === 0
            ? "Every upload with its three cuts, kept here for download."
            : `${jobs.length} upload${jobs.length === 1 ? "" : "s"}, ${ready * 3} cut${ready * 3 === 1 ? "" : "s"} ready to download.`}
        </p>
      </div>

      {jobs.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
            <Layers size={24} />
          </span>
          <h2 className="mt-4 text-base font-bold">No videos in your library yet</h2>
          <p className="mt-1.5 max-w-sm text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            Upload a winning ad and the three micro-ads we cut from it are kept
            here, ready to download whenever you need them.
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
            const working = s.label === "Processing" || s.label === "Queued";
            return (
              <motion.div key={job.id} variants={fadeUp}>
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {job.fileName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                        {new Date(job.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                        {" · "}
                        {job.duration}
                        {job.category ? ` · ${job.category}` : ""}
                      </p>
                    </div>
                    <Badge tone={s.tone}>
                      {working && <Loader2 size={10} className="animate-spin" />}
                      {s.label}
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
                  {/* Swipeable on a phone, three across from sm up. */}
                  <div className="-mx-4 flex min-w-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:max-w-2xl sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0">
                    {job.variations.map((v, i) =>
                      v.status === "ready" ? (
                        <LibraryCut
                          key={v.id}
                          jobId={job.id}
                          v={v}
                          hd={hd}
                          onPlay={markPreviewPlayed}
                          onDownload={download}
                          onLocked={openUpgrade}
                        />
                      ) : (
                        <div
                          key={v.id}
                          className="w-[62%] shrink-0 snap-start sm:w-auto"
                        >
                          <div className="flex aspect-[9/16] items-center justify-center rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
                            {working ? (
                              <Loader2
                                size={16}
                                className="animate-spin text-brand-500/60"
                              />
                            ) : (
                              <span className="display-xs text-[var(--color-ink-muted)] opacity-25 dark:text-[var(--color-ink-dark-muted)]">
                                {i + 1}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <JobAside job={job} hd={hd} onDownload={download} onLocked={openUpgrade} />
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

function LibraryCut({
  jobId,
  v,
  hd,
  onPlay,
  onDownload,
  onLocked,
}: {
  jobId: string;
  v: Variation;
  hd: boolean;
  onPlay: () => void;
  onDownload: (jobId: string, variationId: string, kind: "hd" | "preview") => void;
  onLocked: () => void;
}) {
  const version = v.versions[v.active];

  return (
    <div className="w-[62%] shrink-0 snap-start sm:w-auto">
      <VideoPlayer
        src={v.src}
        poster={v.poster}
        watermarked={!hd}
        duration={v.duration}
        title={v.label || v.strategy}
        onPlay={onPlay}
        className="aspect-[9/16]"
      />

      <p className="mt-2 truncate text-xs font-semibold">
        {v.label || v.strategy}
      </p>
      <p className="truncate text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        {v.strategy}
        {v.duration ? ` · ${v.duration}` : ""}
        {version && version.n > 1 ? ` · v${version.n}` : ""}
      </p>

      <button
        type="button"
        onClick={() =>
          hd ? onDownload(jobId, v.id, "hd") : onLocked()
        }
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-black/[0.04] px-2 py-1.5 text-[11px] font-semibold transition-colors hover:bg-black/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/[0.12]"
      >
        {hd ? <Download size={12} /> : <Lock size={12} />}
        {hd ? "Download HD" : "HD on paid plans"}
      </button>

      {!hd && (
        <button
          type="button"
          onClick={() => onDownload(jobId, v.id, "preview")}
          className="mt-1.5 w-full text-center text-[11px] font-medium text-[var(--color-ink-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:text-white"
        >
          Download watermarked
        </button>
      )}
    </div>
  );
}

/* The column beside the cuts. Capping the grid so three 9:16 cards stay a
   readable size leaves room on a wide screen, and what belongs in it is the
   thing the customer came back for: what this upload was, and getting all
   three files without clicking three times. */
function JobAside({
  job,
  hd,
  onDownload,
  onLocked,
}: {
  job: Job;
  hd: boolean;
  onDownload: (jobId: string, variationId: string, kind: "hd" | "preview") => void;
  onLocked: () => void;
}) {
  const ready = job.variations.filter((v) => v.status === "ready");
  if (ready.length === 0) return null;

  const all = () => {
    if (!hd) {
      onLocked();
      return;
    }
    // Browsers drop downloads fired in the same tick, so they are spaced out.
    ready.forEach((v, i) => {
      setTimeout(() => onDownload(job.id, v.id, "hd"), i * 400);
    });
  };

  return (
    <aside className="shrink-0 lg:w-56">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        From this upload
      </p>
      <dl className="mt-2 space-y-1.5 text-xs">
        {job.product && (
          <div>
            <dt className="text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              Selling
            </dt>
            <dd className="font-semibold">{job.product}</dd>
          </div>
        )}
        <div>
          <dt className="text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            Source
          </dt>
          <dd className="font-semibold">
            {job.duration}
            {job.category ? ` · ${job.category}` : ""}
          </dd>
        </div>
      </dl>

      <Button size="md" className="mt-4 w-full" onClick={all}>
        {hd ? <Download size={14} /> : <Lock size={14} />}
        {hd ? `Download all ${ready.length}` : "Unlock HD downloads"}
      </Button>
    </aside>
  );
}
