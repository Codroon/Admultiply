"use client";

/* Bar chart with an actual y-axis, gridlines and hover readout.

   The Figma version had none of those — a bar chart you can't read a value
   off is decoration, not instrumentation. Failures stack on top of successes
   so a bad day is visible at a glance rather than hidden in an average. */

import { useState } from "react";
import { motion } from "framer-motion";
import type { DayBucket } from "@/lib/admin-stats";

export function DailyBars({
  data,
  height = 160,
}: {
  data: DayBucket[];
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.total), 1);
  // Round the axis up to something legible (nearest 5/10/25/50…).
  const step = niceStep(max);
  const ceiling = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: ceiling / step + 1 }, (_, i) => i * step).reverse();

  const active = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      {/* Hover readout — pinned so it never shifts the layout */}
      <div className="mb-2 flex h-9 items-start justify-between gap-3">
        {active ? (
          <div>
            <p className="text-[11px] font-bold">{active.label}</p>
            <p className="text-[11px] tabular-nums text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              {active.total} processed
              {active.failed > 0 && (
                <span className="text-red-500"> · {active.failed} failed</span>
              )}
              <span> · ${(active.costCents / 100).toFixed(2)} spend</span>
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            Hover a bar for the day&apos;s detail
          </p>
        )}
      </div>

      <div className="flex gap-2">
        {/* Y axis */}
        <div
          className="flex shrink-0 flex-col justify-between pb-5 text-right text-[10px] tabular-nums text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
          style={{ height: height + 20 }}
        >
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height }}>
            {/* Gridlines */}
            {ticks.map((t, i) => (
              <span
                key={t}
                className="absolute inset-x-0 border-t border-dashed border-black/[0.06] dark:border-white/[0.08]"
                style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
              />
            ))}

            <div className="absolute inset-0 flex items-end gap-[3px]">
              {data.map((d, i) => {
                const okH = ((d.total - d.failed) / ceiling) * 100;
                const failH = (d.failed / ceiling) * 100;
                const isToday = i === data.length - 1;
                return (
                  <div
                    key={d.day}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    className="group flex h-full min-w-0 flex-1 cursor-default flex-col justify-end"
                  >
                    {failH > 0 && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${failH}%` }}
                        transition={{ duration: 0.5, delay: i * 0.015, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full rounded-t-[3px] bg-red-500/80"
                      />
                    )}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${okH}%` }}
                      transition={{ duration: 0.5, delay: i * 0.015, ease: [0.22, 1, 0.36, 1] }}
                      className={`w-full transition-colors ${failH > 0 ? "" : "rounded-t-[3px]"} ${
                        isToday
                          ? "bg-brand-500"
                          : hover === i
                            ? "bg-brand-400"
                            : "bg-brand-500/30 group-hover:bg-brand-400"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-1.5 flex justify-between text-[10px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            <span>{data[0]?.label}</span>
            <span className="font-semibold text-brand-600 dark:text-brand-400">Today</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-[10px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        <Legend className="bg-brand-500/40" label="Processed" />
        <Legend className="bg-red-500/80" label="Failed" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-[2px] ${className}`} />
      {label}
    </span>
  );
}

function niceStep(max: number) {
  const candidates = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000];
  return candidates.find((c) => max / c <= 5) ?? 2000;
}

/* -------------------------------------------------------------------------- */

/** Horizontal share bar — provider cost split, plan mix, strategy win-rates. */
export function ShareBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
      {segments.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ width: 0 }}
          animate={{ width: `${(s.value / total) * 100}%` }}
          transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
          className={s.color}
          title={`${s.label} — ${((s.value / total) * 100).toFixed(1)}%`}
        />
      ))}
    </div>
  );
}
