"use client";

import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useWorkspaceTheme } from "./workspace-theme";

/* Same control the marketing nav has, pointed at the workspace's own mode
   instead of the site theme — so switching it here does not silently relight
   the landing page the next time the user goes back to it.

   Unlike the site toggle this needs no `mounted` guard: the workspace mode is
   read through useSyncExternalStore, which gives the server and the first
   client render the same answer. */
export function WorkspaceToggle() {
  const { mode, setMode } = useWorkspaceTheme();
  const isDark = mode === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle workspace mode"
      aria-pressed={isDark}
      onClick={() => setMode(isDark ? "light" : "dark")}
      className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-1 transition-colors dark:border-[var(--color-border-dark-subtle)] dark:bg-white/[0.06]"
    >
      <motion.span
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm dark:bg-brand-500 dark:text-white"
        animate={{ x: isDark ? 24 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {isDark ? <Moon size={14} /> : <Sun size={14} />}
      </motion.span>
    </button>
  );
}
