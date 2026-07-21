"use client";

import { motion } from "framer-motion";
import type { InputHTMLAttributes } from "react";

type FormFieldProps = {
  label: string;
  id: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function FormField({ label, id, ...props }: FormFieldProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-1.5"
    >
      <label htmlFor={id} className="text-xs font-semibold">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="w-full rounded-md border border-[var(--color-border-subtle)] bg-transparent px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-[var(--color-border-dark-subtle)] dark:text-white dark:placeholder:text-[var(--color-ink-dark-muted)] sm:text-sm"
      />
    </motion.div>
  );
}
