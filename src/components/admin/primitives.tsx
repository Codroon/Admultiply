"use client";

/* Admin-specific primitives.

   The product UI is spacious because it sells. Admin is dense because it gets
   read — smaller type, tighter rows, numbers aligned in columns, and brand
   orange reserved for actions and alerts rather than decoration. */

import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ServiceStatus } from "@/lib/admin-types";

/* -------------------------------------------------------------------------- */

export function Panel({
  className = "",
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl bg-white ring-1 ring-black/[0.07] dark:bg-[var(--color-surface-dark-card)] dark:ring-white/[0.08] ${className}`}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3 dark:border-[var(--color-border-dark-subtle)]">
      <div className="min-w-0">
        <h2 className="text-[13px] font-bold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  hint,
  tone = "neutral",
  invertDelta = false,
  series,
  href,
}: {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  hint?: string;
  tone?: "neutral" | "brand" | "danger" | "success";
  /** For metrics where "up" is bad — failures, cost. */
  invertDelta?: boolean;
  series?: number[];
  href?: string;
}) {
  const good = delta === undefined ? null : invertDelta ? delta <= 0 : delta >= 0;
  const valueTone =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "brand"
        ? "text-brand-600 dark:text-brand-400"
        : tone === "success"
          ? "text-emerald-600 dark:text-emerald-400"
          : "";

  const body = (
    <Panel
      className={`flex h-full flex-col p-4 transition-shadow ${
        href ? "hover:shadow-md hover:shadow-black/[0.06]" : ""
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className={`text-2xl font-bold tabular-nums tracking-tight ${valueTone}`}>
          {value}
        </span>
        {series && series.length > 1 && <Sparkline data={series} />}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        {delta !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums ${
              good
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {(invertDelta ? delta < 0 : delta >= 0) ? (
              <ArrowUpRight size={11} strokeWidth={2.5} />
            ) : (
              <ArrowDownRight size={11} strokeWidth={2.5} />
            )}
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
        {(deltaLabel || hint) && (
          <span className="truncate text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            {deltaLabel ?? hint}
          </span>
        )}
      </div>
    </Panel>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

/* -------------------------------------------------------------------------- */

export function Sparkline({ data, className = "" }: { data: number[]; className?: string }) {
  const w = 64;
  const h = 22;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / span) * h).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={`shrink-0 overflow-visible ${className}`}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-brand-500)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */

const STATUS_COLOR: Record<ServiceStatus, string> = {
  operational: "bg-emerald-500",
  degraded: "bg-amber-500",
  down: "bg-red-500",
};

export function StatusDot({ status, pulse = false }: { status: ServiceStatus; pulse?: boolean }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {pulse && status !== "operational" && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${STATUS_COLOR[status]}`}
        />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${STATUS_COLOR[status]}`} />
    </span>
  );
}

/* -------------------------------------------------------------------------- */

export function Meter({
  value,
  max,
  tone = "brand",
  className = "",
}: {
  value: number;
  max: number;
  tone?: "brand" | "danger" | "success" | "neutral";
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const fill = {
    brand: "bg-gradient-to-r from-brand-400 to-brand-600",
    danger: "bg-red-500",
    success: "bg-emerald-500",
    neutral: "bg-zinc-400 dark:bg-zinc-500",
  }[tone];

  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.09] ${className}`}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`h-full rounded-full ${fill}`}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  detail,
  action,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/[0.04] text-[var(--color-ink-muted)] dark:bg-white/[0.06] dark:text-[var(--color-ink-dark-muted)]">
        {icon}
      </span>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        {detail}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/** Label/value row used inside drawers and detail panels. */
export function DetailRow({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        {label}
      </span>
      <span
        className={`min-w-0 truncate text-right text-xs font-semibold tabular-nums ${
          mono ? "font-mono text-[11px]" : ""
        }`}
      >
        {children}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h2 className="text-[13px] font-bold tracking-tight">{children}</h2>
      {hint && (
        <span className="text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          {hint}
        </span>
      )}
    </div>
  );
}
