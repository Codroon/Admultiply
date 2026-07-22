"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { LogoMark } from "@/components/logo";

/* 9:16 (or any aspect) video card player with poster, tap-to-play and an
   optional simulated watermark overlay (the real watermark is burned in by
   FFmpeg at render time — this overlay exists only for the mocked demo). */
export function VideoPlayer({
  src,
  poster,
  watermarked = false,
  duration,
  onPlay,
  className = "",
}: {
  src: string;
  poster?: string;
  watermarked?: boolean;
  duration?: string;
  onPlay?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      onPlay?.();
    } else {
      v.pause();
    }
  };

  return (
    <div
      className={`group relative cursor-pointer overflow-hidden rounded-xl bg-zinc-900 ${className}`}
      onClick={toggle}
    >
      <video
        ref={ref}
        src={src}
        poster={poster}
        playsInline
        loop
        muted
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="h-full w-full object-cover"
      />

      {watermarked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex rotate-[-24deg] items-center gap-1.5 opacity-40">
            <LogoMark size={16} />
            <span className="text-xs font-bold tracking-wide text-white drop-shadow">
              AdMultiply
            </span>
          </div>
        </div>
      )}

      {/* Play / pause affordance */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity ${
          playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
        }`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur">
          {playing ? (
            <Pause size={14} className="fill-brand-500 text-brand-500" />
          ) : (
            <Play size={14} className="ml-0.5 fill-brand-500 text-brand-500" />
          )}
        </span>
      </div>

      {duration && (
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          {duration}
        </span>
      )}
    </div>
  );
}
