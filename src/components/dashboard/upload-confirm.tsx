"use client";

import { Captions, Coins, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";

/* The moment a token gets spent.

   This used to be a single row: filename on the left, metadata under it, and
   "Replace" and "Multiply this ad" side by side on the right at the same
   visual weight. The client's words were that it does not catch your
   attention, and they were right, because nothing on screen said this was the
   decision point. It looked like a file attachment, not a commitment.

   So it is a decision now. Their video is on screen at a size where they can
   confirm it is the right one, the facts are next to it, the one option that
   changes the output sits underneath, and the primary action is a single full
   width button that is impossible to mistake for anything else. Changing your
   mind is a quiet text link, because that is the rare path. */

type Picked = {
  file: File;
  url: string;
  duration: number;
  width: number;
  height: number;
};

export function UploadConfirm({
  picked,
  hd,
  captions,
  onToggleCaptions,
  onUpgrade,
  onReplace,
  onSubmit,
  fmtDuration,
  fmtSize,
  tokens,
}: {
  picked: Picked;
  hd: boolean;
  captions: boolean;
  onToggleCaptions: () => void;
  onUpgrade: () => void;
  onReplace: () => void;
  onSubmit: () => void;
  fmtDuration: (s: number) => string;
  fmtSize: (b: number) => string;
  tokens: number;
}) {
  const portrait = picked.height > picked.width;
  const noTokens = tokens <= 0;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--color-border-subtle)] px-5 py-3 dark:border-[var(--color-border-dark-subtle)]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
          Ready when you are
        </p>
      </div>

      <div className="p-5">
        {/* Thumbnail beside the facts, then the choice and the action full
            width below. Stacking these on a phone pushed the primary button
            under the fold, which is the exact complaint this panel exists to
            answer. */}
        <div className="flex gap-4 sm:gap-6">
        {/* Their video, big enough to be sure it is the right file. */}
        <div
          className={`shrink-0 ${
            portrait ? "w-[96px] sm:w-[150px]" : "w-[150px] sm:w-[260px]"
          }`}
        >
          <div
            className={`overflow-hidden rounded-xl bg-black ring-1 ring-black/10 dark:ring-white/10 ${
              portrait ? "aspect-[9/16]" : "aspect-video"
            }`}
          >
            <video
              src={picked.url}
              muted
              playsInline
              loop
              autoPlay
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{picked.file.name}</p>
          <p className="mt-1 text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            {fmtDuration(picked.duration)} · {picked.width}×{picked.height} ·{" "}
            {fmtSize(picked.file.size)}
          </p>

          <p className="mt-3 text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            We will watch this ad, pick its three strongest angles, and cut a
            vertical micro-ad for each. It usually takes a minute or two.
          </p>
        </div>
        </div>

          {/* The one choice that changes what comes out. */}
          <button
            type="button"
            onClick={hd ? onToggleCaptions : onUpgrade}
            className="mt-4 flex w-full items-start gap-3 rounded-xl border border-[var(--color-border-subtle)] p-3 text-left transition-colors hover:border-brand-500/40 dark:border-[var(--color-border-dark-subtle)]"
          >
            <Captions
              size={17}
              className={`mt-0.5 shrink-0 ${
                hd && captions
                  ? "text-brand-500"
                  : "text-[var(--color-ink-muted)] opacity-60"
              }`}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-semibold">
                Add captions
                {!hd && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                    <Lock size={9} />
                    Plus
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                {hd
                  ? "Word synced captions burned into each cut. Leave this off if your ad already has them."
                  : "Word synced captions burned into each cut. Available on paid plans."}
              </span>
            </span>
            <span
              role="switch"
              aria-checked={hd && captions}
              aria-label="Add captions"
              className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
                hd && captions ? "bg-brand-500" : "bg-black/15 dark:bg-white/20"
              } ${hd ? "" : "opacity-60"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  hd && captions ? "left-[22px]" : "left-0.5"
                }`}
              />
            </span>
          </button>

          <div className="mt-5">
            <button
              type="button"
              onClick={onSubmit}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-500 px-6 py-4 text-base font-bold text-white shadow-[0_8px_28px_-10px_rgba(249,115,22,0.9)] transition-all hover:bg-brand-600 active:scale-[0.995]"
            >
              Multiply this ad
              <span className="flex items-center gap-1 rounded-full bg-black/15 px-2.5 py-1 text-xs font-bold">
                <Coins size={12} />
                {noTokens ? "No tokens left" : "1 token"}
              </span>
            </button>

            <div className="mt-2.5 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={onReplace}
                className="font-medium text-[var(--color-ink-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:text-white"
              >
                Choose a different video
              </button>
              <span className="text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                {tokens} token{tokens === 1 ? "" : "s"} left
              </span>
            </div>
          </div>
      </div>
    </Card>
  );
}
