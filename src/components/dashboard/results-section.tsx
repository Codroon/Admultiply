"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Download,
  Loader2,
  Lock,
  Scissors,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/ui/video-player";
import {
  MAX_REFINES,
  REFINE_INTENTS,
  useDashboard,
  type Job,
  type Variation,
} from "./dashboard-provider";

/* The three cuts as a deliverable, not a file listing.

   One hero player with the other two as a rail: three equal cards in a row is
   what a folder looks like, and it gives the customer no steer on where to
   start. A selected cut, large, with its reasoning beside it reads as
   something that was made for them. */
export function ResultsSection({ job, title }: { job: Job; title?: string }) {
  // Keyed on the job so a newly finished one remounts with its first cut
  // selected, rather than an effect resetting the index after render.
  return <ResultsInner key={job.id} job={job} title={title} />;
}

function ResultsInner({ job, title }: { job: Job; title?: string }) {
  const { hd, download, markPreviewPlayed } = useDashboard();
  const [selected, setSelected] = useState(0);

  const active = job.variations[Math.min(selected, job.variations.length - 1)];
  if (!active) return null;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display-xs">
            {title ?? "Your 3 new micro-ads are ready"}
          </h2>
          <p className="mt-0.5 truncate text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            From {job.fileName}
          </p>
        </div>
        <Badge tone="brand">{job.category}</Badge>
      </div>

      {/* Which cut */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {job.variations.map((v, i) => {
          const on = i === selected;
          return (
            <button
              key={v.id}
              onClick={() => setSelected(i)}
              className={`relative rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                on
                  ? "text-white"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:text-white"
              }`}
            >
              {on && (
                <motion.span
                  layoutId="resultTab"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-full bg-brand-500"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {v.strategy}
                {v.status === "refining" && (
                  <Loader2 size={11} className="animate-spin" />
                )}
                {v.versions.length > 1 && (
                  <span
                    className={`rounded px-1 text-[9px] font-bold ${
                      on ? "bg-white/25" : "bg-black/10 dark:bg-white/15"
                    }`}
                  >
                    v{v.versions[v.active]?.n ?? 1}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* Hero player */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${active.id}-${active.src}`}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-[320px] lg:mx-0"
          >
            <VideoPlayer
              src={active.src}
              poster={active.poster}
              watermarked={!hd}
              duration={active.duration}
              onPlay={markPreviewPlayed}
              className="aspect-[9/16] shadow-xl shadow-black/10 ring-1 ring-black/5 dark:ring-white/10"
            />
            {active.status === "refining" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/65 backdrop-blur-sm">
                <Loader2 size={22} className="animate-spin text-white" />
                <p className="text-xs font-semibold text-white">Re-cutting…</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Detail + actions */}
        <div className="flex min-w-0 flex-col">
          <h3 className="text-xl font-bold tracking-tight">
            {active.label || active.strategy}
          </h3>
          {active.blurb && (
            <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              {active.blurb}
            </p>
          )}

          <VersionPicker job={job} variation={active} />

          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="md" onClick={() => download(job.id, active.id, "hd")}>
              {hd ? <Download size={14} /> : <Lock size={13} />}
              Download HD
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => download(job.id, active.id, "preview")}
            >
              <Download size={13} />
              Watermarked{hd ? "" : " (free)"}
            </Button>
            {active.downloaded && (
              <span className="inline-flex items-center gap-1.5 self-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Check size={13} strokeWidth={3} />
                Downloaded
              </span>
            )}
          </div>

          <RefinePanel job={job} variation={active} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */

function VersionPicker({ job, variation }: { job: Job; variation: Variation }) {
  const { setVersion } = useDashboard();
  if (variation.versions.length < 2) return null;

  return (
    <div className="mt-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        Versions
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {variation.versions.map((v, i) => {
          const on = i === variation.active;
          return (
            <button
              key={v.n}
              onClick={() => setVersion(job.id, variation.id, v.n)}
              title={v.instruction ? `Asked for: ${v.instruction}` : "The original cut"}
              className={`rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                on
                  ? "bg-brand-500/12 text-brand-600 ring-1 ring-brand-500/30 dark:text-brand-400"
                  : "text-[var(--color-ink-muted)] ring-1 ring-black/10 hover:bg-black/[0.03] dark:text-[var(--color-ink-dark-muted)] dark:ring-white/10 dark:hover:bg-white/5"
              }`}
            >
              v{v.n} · {v.duration}
              <span className="ml-1.5 font-normal opacity-70">
                {v.instruction ?? "original"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function RefinePanel({ job, variation }: { job: Job; variation: Variation }) {
  const { hd, refine, openUpgrade } = useDashboard();
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState<string>("");
  const [note, setNote] = useState("");

  const used = variation.refinesUsed;
  const left = MAX_REFINES - used;
  const busy = variation.status === "refining";
  const spent = left <= 0;

  const send = () => {
    if (!intent && !note.trim()) return;
    refine(job.id, variation.id, intent, note);
    setOpen(false);
    setIntent("");
    setNote("");
  };

  return (
    <div className="mt-6 border-t border-[var(--color-border-subtle)] pt-5 dark:border-[var(--color-border-dark-subtle)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold">
            <Scissors size={15} className="text-brand-500" />
            Not quite right?
            {!hd && (
              <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                Plus &amp; up
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            {spent
              ? `You've re-cut this one ${MAX_REFINES} times. That is the limit.`
              : hd
                ? `Tell us what to change and we'll re-cut it. ${left} left on this variation.`
                : "Tell us what to change and we'll re-cut it. Upgrade to switch this on."}
          </p>
        </div>
        <Button
          variant={open ? "secondary" : "primary"}
          size="sm"
          disabled={busy || spent}
          onClick={() => (hd ? setOpen((o) => !o) : openUpgrade())}
        >
          {busy ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Re-cutting
            </>
          ) : (
            <>{open ? "Cancel" : "Re-cut this one"}</>
          )}
        </Button>
      </div>

      {variation.refineError && (
        <p className="mt-2 text-xs font-medium text-red-500">{variation.refineError}</p>
      )}

      <AnimatePresence initial={false}>
        {open && hd && !spent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              {/* Quick actions first: most people don't know what to ask for,
                  and these map onto how the AI actually picks moments. */}
              <div className="flex flex-wrap gap-1.5">
                {REFINE_INTENTS.map((o) => {
                  const on = intent === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setIntent(on ? "" : o.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        on
                          ? "bg-brand-500 text-white"
                          : "ring-1 ring-black/10 hover:bg-black/[0.03] dark:ring-white/15 dark:hover:bg-white/5"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Or describe it: “open on the product, not the intro”"
                  className="min-w-0 flex-1 rounded-xl border border-[var(--color-border-subtle)] bg-transparent px-3.5 py-2.5 text-base outline-none transition-colors focus:border-brand-500 dark:border-[var(--color-border-dark-subtle)] sm:text-sm"
                />
                <Button size="md" disabled={!intent && !note.trim()} onClick={send}>
                  Re-cut
                </Button>
              </div>

              <p className="mt-2 text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                Your original stays. A re-cut is added as a new version you can
                switch between. It doesn&apos;t cost a token.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
