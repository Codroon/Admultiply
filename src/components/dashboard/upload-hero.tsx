"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Clapperboard, RefreshCcw, Sparkles, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useDashboard } from "./dashboard-provider";

const ACCEPTED = ["video/mp4", "video/quicktime", "video/x-msvideo"];
const MAX_SECONDS = 95; // spec: 1 min 30 s (+ small grace)

type Picked = { file: File; duration: number; width: number; height: number };

const fmtDuration = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const fmtSize = (b: number) => `${(b / (1024 * 1024)).toFixed(1)} MB`;

export function UploadHero({ compact = false }: { compact?: boolean }) {
  const { tokens, startJob, openUpgrade } = useDashboard();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inspect = (file: File) => {
    setError(null);
    if (!ACCEPTED.includes(file.type) && !/\.(mp4|mov|avi)$/i.test(file.name)) {
      setError("That format isn't supported — please upload an MP4, MOV or AVI.");
      return;
    }
    // Read the real metadata from the user's file via an off-screen video element.
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      const { duration, videoWidth, videoHeight } = probe;
      URL.revokeObjectURL(url);
      if (duration > MAX_SECONDS) {
        setError(
          `This video is ${fmtDuration(duration)} — the maximum is 1:30. Trim it and try again.`
        );
        return;
      }
      setPicked({ file, duration, width: videoWidth, height: videoHeight });
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      setError("We couldn't read that file. Try a different video.");
    };
    probe.src = url;
  };

  const submit = () => {
    if (!picked) return;
    if (tokens <= 0) {
      openUpgrade();
      return;
    }
    const res = startJob(picked.file, { duration: fmtDuration(picked.duration) });
    if (res === "ok") {
      setPicked(null);
      toast("Upload started — 1 token held", "info");
    }
  };

  return (
    <section className={compact ? "" : "pt-2"}>
      {!compact && (
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Upload your winning ad
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            Turn one best-converting ad into three new micro-ads to test, convert
            and extend ROI.
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".mp4,.mov,.avi,video/mp4,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) inspect(f);
          e.target.value = "";
        }}
      />

      {!picked ? (
        <motion.button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) inspect(f);
          }}
          whileHover={{ scale: 1.003 }}
          className={`group flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors sm:py-16 ${
            dragging
              ? "border-brand-500 bg-brand-500/[0.06]"
              : "border-[var(--color-border-subtle)] bg-white hover:border-brand-500/50 hover:bg-brand-500/[0.03] dark:border-[var(--color-border-dark-subtle)] dark:bg-[var(--color-surface-dark-card)] dark:hover:bg-brand-500/[0.05]"
          }`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500 transition-transform group-hover:-translate-y-0.5">
            <UploadCloud size={26} strokeWidth={2} />
          </span>
          <p className="mt-4 text-base font-semibold">
            Drag &amp; drop your video, or click to browse
          </p>
          <p className="mt-1.5 text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            MP4, MOV or AVI · up to 1 min 30 s
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-1 text-[11px] font-bold text-brand-600 dark:text-brand-400">
            <Sparkles size={11} />
            1 token → 3 variations
          </span>
        </motion.button>
      ) : (
        <Card className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <Clapperboard size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{picked.file.name}</p>
              <p className="mt-0.5 text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                {fmtSize(picked.file.size)} · {picked.width}×{picked.height} ·{" "}
                {fmtDuration(picked.duration)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => inputRef.current?.click()}
              >
                <RefreshCcw size={14} />
                Replace
              </Button>
              <Button size="md" onClick={submit}>
                <Sparkles size={14} />
                Multiply this ad · 1 token
              </Button>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-center text-xs font-medium text-red-500"
        >
          {error}
        </motion.p>
      )}
    </section>
  );
}
