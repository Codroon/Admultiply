"use client";

/* Right-hand slide-over for detail views.

   A drawer rather than a separate page so the operator keeps their place in
   the list — you triage twenty failed jobs without losing your filters.
   Below sm it becomes a near-full-height sheet, since a 420px panel on a
   phone is unusable. */

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-[min(30rem,100vw)] flex-col bg-white shadow-2xl dark:bg-[var(--color-surface-dark-muted)]"
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] px-5 py-4 dark:border-[var(--color-border-dark-subtle)]">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold tracking-tight">{title}</div>
                {subtitle && (
                  <div className="mt-0.5 truncate text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                    {subtitle}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition-colors hover:bg-black/5 hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X size={15} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

            {footer && (
              <footer
                className="shrink-0 border-t border-[var(--color-border-subtle)] px-5 py-3.5 dark:border-[var(--color-border-dark-subtle)]"
                style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}
              >
                {footer}
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
