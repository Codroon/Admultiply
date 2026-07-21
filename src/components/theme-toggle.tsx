"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative inline-flex h-8 w-14 items-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-1 transition-colors dark:border-[var(--color-border-dark-subtle)] dark:bg-[var(--color-surface-dark-muted)]"
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
