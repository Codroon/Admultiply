"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function Dropdown({
  trigger,
  children,
  align = "end",
  side = "top",
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="block w-full">
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: side === "top" ? 6 : -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === "top" ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            onClick={() => setOpen(false)}
            className={`absolute z-50 min-w-44 overflow-hidden rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-black/10 dark:bg-[var(--color-surface-dark-card)] dark:ring-white/10 ${
              side === "top" ? "bottom-full mb-2" : "top-full mt-2"
            } ${align === "end" ? "right-0" : "left-0"}`}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DropdownItem({
  onClick,
  icon,
  children,
  danger = false,
}: {
  onClick?: () => void;
  icon?: ReactNode;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
        danger
          ? "text-red-600 hover:bg-red-500/10 dark:text-red-400"
          : "text-[var(--color-ink)] hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
