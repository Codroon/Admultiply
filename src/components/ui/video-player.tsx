"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { LogoMark } from "@/components/logo";

/* The player.

   What was here could play and pause and nothing else. No scrubber, no time,
   no volume, no way to make it bigger. In the library that player renders at
   about 140px wide, and you cannot judge whether a cut works at 140px with no
   way to scrub to the part you want to check. This is the screen where the
   customer decides whether the product did its job, so it needs real
   controls.

   Sound stays on by default. Play is always user initiated here, so browsers
   allow it, and the whole point is hearing whether the cuts land. The mute
   control exists for when it is not.

   The enlarged view is portalled to the body on purpose. Several of these sit
   inside framer-motion cards, and an animated ancestor creates a containing
   block, which would trap a position-fixed overlay inside the card instead of
   covering the screen. */

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

type Props = {
  src: string;
  poster?: string;
  watermarked?: boolean;
  /** Formatted fallback, used until the real metadata loads. */
  duration?: string;
  /** Shown in the enlarged view so you know which cut you are looking at. */
  title?: string;
  onPlay?: () => void;
  expandable?: boolean;
  className?: string;
};

export function VideoPlayer({
  src,
  poster,
  watermarked = false,
  duration,
  title,
  onPlay,
  expandable = true,
  className = "",
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Surface
        src={src}
        poster={poster}
        watermarked={watermarked}
        duration={duration}
        onPlay={onPlay}
        className={className}
        onExpand={expandable ? () => setExpanded(true) : undefined}
      />

      {expandable && (
        <Lightbox
          open={expanded}
          onClose={() => setExpanded(false)}
          src={src}
          poster={poster}
          watermarked={watermarked}
          title={title}
          onPlay={onPlay}
        />
      )}
    </>
  );
}

/* The video plus its control bar. Used at card size and again, larger, inside
   the enlarged view. */
function Surface({
  src,
  poster,
  watermarked,
  duration,
  onPlay,
  onExpand,
  className = "",
  big = false,
  autoPlay = false,
}: {
  src: string;
  poster?: string;
  watermarked?: boolean;
  duration?: string;
  onPlay?: () => void;
  onExpand?: () => void;
  className?: string;
  big?: boolean;
  autoPlay?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [total, setTotal] = useState(0);

  const toggle = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      onPlay?.();
    } else {
      v.pause();
    }
  }, [onPlay]);

  const seek = (value: number) => {
    const v = ref.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = value;
    setTime(value);
  };

  const shown = total || 0;
  const pct = shown ? (time / shown) * 100 : 0;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl bg-zinc-950 ${className}`}
    >
      <video
        ref={ref}
        src={src}
        poster={poster}
        playsInline
        loop
        autoPlay={autoPlay}
        preload="metadata"
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setTotal(e.currentTarget.duration)}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        className={`h-full w-full cursor-pointer ${big ? "object-contain" : "object-cover"}`}
      />

      {watermarked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex rotate-[-24deg] items-center gap-1.5 opacity-40">
            <LogoMark size={big ? 28 : 16} />
            <span
              className={`font-bold tracking-wide text-white drop-shadow ${big ? "text-xl" : "text-xs"}`}
            >
              AdMultiply
            </span>
          </div>
        </div>
      )}

      {/* Big centre affordance while paused, so a still frame always reads as
          something you can start. */}
      <button
        type="button"
        aria-label={playing ? "Pause" : "Play"}
        onClick={toggle}
        className={`absolute inset-0 flex items-center justify-center transition-opacity ${
          playing ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <span
          className={`flex items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur ${
            big ? "h-16 w-16" : "h-11 w-11"
          }`}
        >
          <Play
            size={big ? 24 : 15}
            className="ml-0.5 fill-brand-500 text-brand-500"
          />
        </span>
      </button>

      {/* Control bar. Always visible on touch, where there is no hover to
          reveal it; fades in on pointer devices so it does not sit over the
          picture the whole time. */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2 pb-2 pt-6 transition-opacity ${
          big ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        } ${playing ? "" : "sm:opacity-100"}`}
      >
        <input
          type="range"
          min={0}
          max={shown || 0}
          step={0.01}
          value={time}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
          className="player-range w-full"
          style={{ "--pct": `${pct}%` } as React.CSSProperties}
        />

        <div className="mt-1 flex items-center gap-1.5 text-white">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/15"
          >
            {playing ? (
              <Pause size={14} className="fill-white" />
            ) : (
              <Play size={14} className="ml-px fill-white" />
            )}
          </button>

          <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/80">
            {fmt(time)} / {shown ? fmt(shown) : (duration ?? "0:00")}
          </span>

          <span className="flex-1" />

          <button
            type="button"
            onClick={() => {
              const v = ref.current;
              if (v) v.muted = !v.muted;
            }}
            aria-label={muted ? "Unmute" : "Mute"}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/15"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              aria-label="Enlarge"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/15"
            >
              <Maximize2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Lightbox({
  open,
  onClose,
  src,
  poster,
  watermarked,
  title,
  onPlay,
}: {
  open: boolean;
  onClose: () => void;
  src: string;
  poster?: string;
  watermarked?: boolean;
  title?: string;
  onPlay?: () => void;
}) {
  // Escape to close, and the page behind must not scroll while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={title ?? "Video"}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 p-4 backdrop-blur-sm sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-full w-full max-w-[min(420px,92vw)] flex-col"
          >
            {title && (
              <p className="mb-2 shrink-0 truncate text-sm font-semibold text-white">
                {title}
              </p>
            )}
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-0 flex-1"
            >
              <Surface
                src={src}
                poster={poster}
                watermarked={watermarked}
                onPlay={onPlay}
                big
                autoPlay
                className="aspect-[9/16] max-h-[78vh] w-full"
              />
            </motion.div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 sm:right-6 sm:top-6"
          >
            <X size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
