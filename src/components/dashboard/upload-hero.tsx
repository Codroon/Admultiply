"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Coins, UploadCloud } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useDashboard } from "./dashboard-provider";
import { UploadBay } from "./upload-bay";
import { UploadConfirm } from "./upload-confirm";

const ACCEPTED = ["video/mp4", "video/quicktime", "video/x-msvideo"];
const MAX_SECONDS = 95; // spec: 1 min 30 s (+ small grace)

type Picked = {
  file: File;
  /** Kept alive so the confirm step can show the video, not just its name. */
  url: string;
  duration: number;
  width: number;
  height: number;
};

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

  /* The preview URL outlives the metadata probe now, so it has to be released
     by hand when it is replaced, submitted, or the screen goes away. Held in a
     ref rather than read back out of state, because a state updater can run
     twice in development and revoking a URL that is still on screen would
     blank the preview. */
  const previewUrl = useRef<string | null>(null);

  const releasePreview = () => {
    if (previewUrl.current) {
      URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = null;
    }
  };

  useEffect(() => releasePreview, []);

  const inspect = (file: File) => {
    setError(null);
    if (!ACCEPTED.includes(file.type) && !/\.(mp4|mov|avi)$/i.test(file.name)) {
      setError("That format isn't supported. Please upload an MP4, MOV or AVI.");
      return;
    }
    // Read the real metadata from the user's file via an off-screen video element.
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      const { duration, videoWidth, videoHeight } = probe;
      if (duration > MAX_SECONDS) {
        URL.revokeObjectURL(url);
        setError(
          `This video is ${fmtDuration(duration)}. The maximum is 1:30, so trim it and try again.`
        );
        return;
      }
      releasePreview();
      previewUrl.current = url;
      setPicked({ file, url, duration, width: videoWidth, height: videoHeight });
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
      // startJob makes its own objectURL for the job, so this one is done with.
      releasePreview();
      setPicked(null);
      toast("Upload started, 1 token held", "info");
    }
  };

  const dragProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) inspect(f);
    },
  };

  return (
    <section>
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

      {picked ? (
        <UploadConfirm
          picked={picked}
          hd={hd}
          captions={captions}
          tokens={tokens}
          onToggleCaptions={() => setCaptions((c) => !c)}
          onUpgrade={openUpgrade}
          onReplace={() => inputRef.current?.click()}
          onSubmit={submit}
          fmtDuration={fmtDuration}
          fmtSize={fmtSize}
        />
      ) : compact ? (
        /* Once there is work on the page the full bay would dominate it, but
           the main action of the product should still not be a thin strip. */
        <motion.button
          type="button"
          onClick={() => inputRef.current?.click()}
          {...dragProps}
          whileHover={{ y: -1 }}
          transition={{ duration: 0.2 }}
          className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors sm:p-5 ${
            dragging
              ? "border-brand-500 bg-brand-500/[0.06]"
              : "border-[var(--color-border-subtle)] bg-white hover:border-brand-500/50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-brand-500/40"
          }`}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
            <UploadCloud size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold sm:text-base">
              {dragging ? "Drop it, we'll take it from here" : "Multiply another ad"}
            </span>
            <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              MP4, MOV or AVI · up to 1 min 30 s
            </span>
          </span>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-500/30 sm:inline-flex">
            Choose a video
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-500/10 px-2.5 py-1.5 text-[11px] font-bold text-brand-600 ring-1 ring-brand-500/20 dark:text-brand-400 sm:hidden">
            <Coins size={11} />1
          </span>
        </motion.button>
      ) : (
        <UploadBay
          dragging={dragging}
          onPick={() => inputRef.current?.click()}
          {...dragProps}
        />
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
