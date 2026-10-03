"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Captions, Clapperboard, RefreshCcw, Sparkles, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useDashboard } from "./dashboard-provider";
import { UploadBay } from "./upload-bay";

const ACCEPTED = ["video/mp4", "video/quicktime", "video/x-msvideo"];
const MAX_SECONDS = 95; // spec: 1 min 30 s (+ small grace)

type Picked = { file: File; duration: number; width: number; height: number };

const fmtDuration = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const fmtSize = (b: number) => `${(b / (1024 * 1024)).toFixed(1)} MB`;

export function UploadHero({ compact = false }: { compact?: boolean }) {
  const { tokens, hd, startJob, openUpgrade } = useDashboard();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Off by default: most ads already carry burned-in captions, and stacking
  // ours on top looks broken. The customer knows their own video; we don't
  // try to detect it. Paid feature, like HD downloads.
  const [captions, setCaptions] = useState(false);

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
    const res = startJob(
      picked.file,
      { duration: fmtDuration(picked.duration) },
      { captions: hd && captions }
    );
    if (res === "ok") {
      setPicked(null);
      toast("Upload started — 1 token held", "info");
    }
  };

  return (
    <section className={compact ? "" : "pt-2"}>
      {!compact && (
        <div className="mb-5 text-center">
          <h2 className="display-xs">
            Upload your winning ad
          </h2>
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
        compact ? (
          /* Once there is work on the page the bay would dominate it, so the
             repeat-upload affordance collapses to a single bar. */
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
            whileHover={{ y: -1 }}
            transition={{ duration: 0.2 }}
            className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
              dragging
                ? "border-brand-500 bg-brand-500/[0.06]"
                : "border-[var(--color-border-subtle)] bg-white hover:border-brand-500/50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-brand-500/40"
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <UploadCloud size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {dragging ? "Drop it — we'll take it from here" : "Multiply another ad"}
              </span>
              <span className="block text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                MP4, MOV or AVI · up to 1 min 30 s
              </span>
            </span>
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-1.5 text-[11px] font-bold text-brand-600 ring-1 ring-brand-500/20 dark:text-brand-400 sm:inline-flex">
              <Sparkles size={11} />1 token → 3 variations
            </span>
          </motion.button>
        ) : (
          <UploadBay
            dragging={dragging}
            onPick={() => inputRef.current?.click()}
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
          />
        )
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

          {/* Options — captions are a paid feature, gated like HD downloads */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-4 dark:border-[var(--color-border-dark-subtle)]">
            <div className="flex items-start gap-3">
              <Captions
                size={18}
                className={`mt-0.5 shrink-0 ${
                  hd ? "text-brand-500" : "text-[var(--color-ink-muted)] opacity-50"
                }`}
              />
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  Add captions
                  {!hd && (
                    <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                      Plus &amp; up
                    </span>
                  )}
                </p>
                <p className="mt-0.5 max-w-md text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                  {hd
                    ? "Word-synced captions burned into each clip. Leave off if your ad already has them."
                    : "Word-synced captions burned into each clip. Upgrade to switch this on."}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hd && captions}
              aria-label="Add captions"
              onClick={() => (hd ? setCaptions((c) => !c) : openUpgrade())}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                hd && captions ? "bg-brand-500" : "bg-black/15 dark:bg-white/20"
              } ${hd ? "" : "cursor-pointer opacity-60"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  hd && captions ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
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
