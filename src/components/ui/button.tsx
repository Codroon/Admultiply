"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white shadow-sm shadow-brand-500/30 hover:bg-brand-600 hover:shadow-md hover:shadow-brand-500/30",
  secondary:
    "bg-white text-[var(--color-ink)] ring-1 ring-black/10 hover:bg-black/[0.03] dark:bg-white/5 dark:text-white dark:ring-white/10 dark:hover:bg-white/10",
  ghost:
    "text-[var(--color-ink-muted)] hover:bg-black/5 hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:bg-white/10 dark:hover:text-white",
  danger: "bg-red-500 text-white hover:bg-red-600",
  dark: "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-sm gap-2",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", loading, className = "", children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
});
