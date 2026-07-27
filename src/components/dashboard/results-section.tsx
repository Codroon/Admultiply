"use client";

import { motion } from "framer-motion";
import { Check, Download, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VideoPlayer } from "@/components/ui/video-player";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { useDashboard, type Job } from "./dashboard-provider";

export function ResultsSection({ job, title }: { job: Job; title?: string }) {
  const { hd, download, markPreviewPlayed } = useDashboard();

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">
            {title ?? "Your 3 new micro-ads are ready"}
          </h2>
          <p className="mt-0.5 truncate text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            From {job.fileName}
          </p>
        </div>
        <Badge tone="brand">Detected: {job.category}</Badge>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {job.variations.map((v) => (
          <motion.div key={v.id} variants={fadeUp}>
            <Card className="flex h-full flex-col overflow-hidden p-3">
              <VideoPlayer
                src={v.src}
                poster={v.poster}
                watermarked={!hd}
                duration={v.duration}
                onPlay={markPreviewPlayed}
                className="aspect-[9/16]"
              />
              <div className="flex flex-1 flex-col p-2 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">{v.strategy}</h3>
                  {v.downloaded ? (
                    <Badge tone="success">
                      <Check size={10} strokeWidth={3} />
                      Downloaded
                    </Badge>
                  ) : (
                    <Badge tone="neutral">{v.label}</Badge>
                  )}
                </div>
                <p className="mt-1.5 flex-1 text-xs leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                  {v.blurb}
                </p>

                <div className="mt-3 flex flex-col gap-1.5">
                  <Button
                    size="md"
                    className="w-full"
                    onClick={() => download(job.id, v.id, "hd")}
                  >
                    {hd ? <Download size={14} /> : <Lock size={13} />}
                    Download HD
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => download(job.id, v.id, "preview")}
                  >
                    <Download size={12} />
                    Watermarked preview{hd ? "" : " (free)"}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
