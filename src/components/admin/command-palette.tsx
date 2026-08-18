"use client";

/* ⌘K — jump to any user, job or screen without touching the mouse.

   This is the difference between an admin panel and a *tool*. The support
   loop is "customer emails → find them → find their job → fix it", and typing
   an email beats three clicks and a filter every time.

   The body mounts only while open, so the query and cursor reset naturally
   each time it's summoned. */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CreditCard,
  Film,
  Gauge,
  ListChecks,
  Search,
  User,
  Users,
} from "lucide-react";
import { useAdmin } from "./admin-provider";

type Item = {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  href: string;
  group: string;
};

const PAGES: Item[] = [
  { id: "p-overview", label: "Overview", hint: "Platform pulse & alerts", icon: <Gauge size={15} />, href: "/admin", group: "Go to" },
  { id: "p-users", label: "Users", hint: "Accounts, tokens, suspension", icon: <Users size={15} />, href: "/admin/users", group: "Go to" },
  { id: "p-jobs", label: "Jobs", hint: "Pipeline, failures, retries", icon: <Film size={15} />, href: "/admin/jobs", group: "Go to" },
  { id: "p-ai", label: "AI Usage & Cost", hint: "Spend, tokens, flywheel", icon: <BarChart3 size={15} />, href: "/admin/ai-usage", group: "Go to" },
  { id: "p-billing", label: "Billing", hint: "MRR, plans, Stripe", icon: <CreditCard size={15} />, href: "/admin/billing", group: "Go to" },
  { id: "p-waitlist", label: "Waitlist", hint: "Pre-launch signups", icon: <ListChecks size={15} />, href: "/admin/waitlist", group: "Go to" },
];

const SHORTCUTS: Item[] = [
  { id: "s-failed", label: "Failed jobs", hint: "Triage the pipeline", icon: <Film size={15} />, href: "/admin/jobs?filter=failed", group: "Actions" },
  { id: "s-unrefunded", label: "Unrefunded failures", hint: "Customers owed a token", icon: <Film size={15} />, href: "/admin/jobs?filter=unrefunded", group: "Actions" },
  { id: "s-suspended", label: "Suspended accounts", hint: "Blocked users", icon: <Users size={15} />, href: "/admin/users?status=suspended", group: "Actions" },
];

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useAdmin();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, setPaletteOpen]);

  return (
    <AnimatePresence>
      {paletteOpen && <PaletteBody onClose={() => setPaletteOpen(false)} />}
    </AnimatePresence>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const { users, jobs } = useAdmin();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...PAGES, ...SHORTCUTS];

    const matchedPages = [...PAGES, ...SHORTCUTS].filter((p) =>
      `${p.label} ${p.hint}`.toLowerCase().includes(q)
    );

    const matchedUsers: Item[] = users
      .filter((u) => `${u.name} ${u.email} ${u.id}`.toLowerCase().includes(q))
      .slice(0, 6)
      .map((u) => ({
        id: `u-${u.id}`,
        label: u.name,
        hint: u.email,
        icon: <User size={15} />,
        href: `/admin/users?user=${u.id}`,
        group: "Users",
      }));

    const matchedJobs: Item[] = jobs
      .filter((j) => `${j.id} ${j.fileName}`.toLowerCase().includes(q))
      .slice(0, 5)
      .map((j) => ({
        id: `j-${j.id}`,
        label: j.id,
        hint: j.fileName,
        icon: <Film size={15} />,
        href: `/admin/jobs?job=${j.id}`,
        group: "Jobs",
      }));

    return [...matchedPages, ...matchedUsers, ...matchedJobs];
  }, [query, users, jobs]);

  const go = (item: Item) => {
    onClose();
    router.push(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && items[cursor]) {
      e.preventDefault();
      go(items[cursor]);
    }
  };

  // Keep the highlighted row in view while arrowing.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  let lastGroup = "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 dark:bg-[var(--color-surface-dark-card)] dark:ring-white/10"
      >
        <div className="flex items-center gap-2.5 border-b border-[var(--color-border-subtle)] px-4 dark:border-[var(--color-border-dark-subtle)]">
          <Search size={15} className="shrink-0 text-[var(--color-ink-muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search users, jobs, or jump to a screen…"
            className="w-full bg-transparent py-3.5 text-base outline-none placeholder:text-[var(--color-ink-muted)] sm:text-sm"
          />
        </div>

        <div ref={listRef} className="max-h-[min(24rem,50vh)] overflow-y-auto p-1.5">
          {items.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              Nothing matches “{query}”
            </p>
          )}
          {items.map((item, i) => {
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <div key={item.id}>
                {showGroup && (
                  <p className="px-2.5 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                    {item.group}
                  </p>
                )}
                <button
                  type="button"
                  data-idx={i}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(item)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                    cursor === i
                      ? "bg-brand-500/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                      : ""
                  }`}
                >
                  <span
                    className={
                      cursor === i
                        ? "text-brand-500"
                        : "text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
                    }
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">
                      {item.label}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                      {item.hint}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-[var(--color-border-subtle)] px-4 py-2 text-[10px] text-[var(--color-ink-muted)] dark:border-[var(--color-border-dark-subtle)] dark:text-[var(--color-ink-dark-muted)]">
          <Key>↑↓</Key> navigate
          <Key>↵</Key> open
          <Key>esc</Key> close
        </div>
      </motion.div>
    </motion.div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-black/10 bg-black/[0.04] px-1.5 py-0.5 font-sans text-[10px] font-semibold dark:border-white/15 dark:bg-white/10">
      {children}
    </kbd>
  );
}
