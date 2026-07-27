import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-sm shadow-black/[0.03] ring-1 ring-black/5 dark:bg-[var(--color-surface-dark-card)] dark:shadow-none dark:ring-white/[0.07] ${className}`}
      {...props}
    />
  );
}
