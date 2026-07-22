import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl bg-white ring-1 ring-black/5 dark:bg-[var(--color-surface-dark-card)] dark:ring-white/5 ${className}`}
      {...props}
    />
  );
}
