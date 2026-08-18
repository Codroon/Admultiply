"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CreditCard,
  ExternalLink,
  Film,
  Gauge,
  ListChecks,
  LogOut,
  Menu,
  Search,
  Users,
  X,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { AdminProvider, useAdmin } from "./admin-provider";
import { CommandPalette } from "./command-palette";
import { StatusDot } from "./primitives";

const NAV = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/jobs", label: "Jobs", icon: Film },
  { href: "/admin/ai-usage", label: "AI Usage & Cost", icon: BarChart3 },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/waitlist", label: "Waitlist", icon: ListChecks },
];

/* Tools we deliberately don't rebuild — the panel links out instead. */
const EXTERNAL = [
  { label: "Stripe", href: "https://dashboard.stripe.com" },
  { label: "PostHog", href: "https://app.posthog.com" },
  { label: "Sentry", href: "https://sentry.io" },
];

const TITLES: Record<string, string> = Object.fromEntries(
  NAV.map((n) => [n.href, n.label])
);

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AdminProvider>
        <ShellInner>{children}</ShellInner>
        <CommandPalette />
      </AdminProvider>
    </ToastProvider>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { admin, services, setPaletteOpen } = useAdmin();
  const [mobileNav, setMobileNav] = useState(false);
  const closeNav = () => setMobileNav(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  const degraded = services.filter((s) => s.status !== "operational").length;

  const navList = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeNav}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
              active
                ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                : "text-[var(--color-ink-muted)] hover:bg-black/[0.04] hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            <item.icon size={16} strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const externalList = (
    <div className="mt-6">
      <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        External tools
      </p>
      {EXTERNAL.map((x) => (
        <a
          key={x.label}
          href={x.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-ink-muted)] transition-colors hover:bg-black/[0.04] hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:bg-white/5 dark:hover:text-white"
        >
          {x.label}
          <ExternalLink size={11} className="opacity-50" />
        </a>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-[var(--color-surface-muted)] dark:bg-[var(--color-surface-dark)]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-[var(--color-border-subtle)] bg-white px-3 py-4 dark:border-[var(--color-border-dark-subtle)] dark:bg-[var(--color-surface-dark-muted)] lg:flex">
        <Link href="/admin" className="flex items-center gap-2 px-2">
          <LogoMark size={26} />
          <span className="text-sm font-bold tracking-tight">AdMultiply</span>
          <span className="rounded bg-brand-500/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
            Admin
          </span>
        </Link>

        <div className="mt-5">{navList}</div>
        {externalList}

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <Link
            href="/admin#health"
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-ink-muted)] transition-colors hover:bg-black/[0.04] dark:text-[var(--color-ink-dark-muted)] dark:hover:bg-white/5"
          >
            <StatusDot status={degraded ? "degraded" : "operational"} pulse />
            {degraded ? `${degraded} service degraded` : "All systems operational"}
          </Link>
          <div className="flex items-center justify-between px-2.5">
            <span className="text-[11px] font-medium text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              View mode
            </span>
            <ThemeToggle />
          </div>
          <AccountMenu name={admin.name} email={admin.email} />
        </div>
      </aside>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNav(false)}
              className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-[71] flex w-64 flex-col overflow-y-auto bg-white px-3 py-4 shadow-2xl dark:bg-[var(--color-surface-dark-muted)] lg:hidden"
            >
              <div className="flex items-center justify-between px-2">
                <Logo />
                <button
                  onClick={() => setMobileNav(false)}
                  aria-label="Close menu"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-ink-muted)] hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mt-5">{navList}</div>
              {externalList}
              <div className="mt-auto flex items-center justify-between px-2.5 pt-4">
                <span className="text-[11px] font-medium text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                  View mode
                </span>
                <ThemeToggle />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-56">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]/85 px-4 py-2.5 backdrop-blur-xl dark:border-[var(--color-border-dark-subtle)] dark:bg-[var(--color-surface-dark)]/85 sm:px-6">
          <button
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition-colors hover:bg-black/5 dark:text-[var(--color-ink-dark-muted)] dark:hover:bg-white/10 lg:hidden"
          >
            <Menu size={17} />
          </button>

          <span className="truncate text-[13px] font-bold tracking-tight">
            {TITLES[pathname] ?? "Admin"}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {/* Honesty label — these figures are generated, not production. */}
            <span className="hidden rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400 sm:inline">
              Sample data
            </span>
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-ink-muted)] transition-colors hover:border-brand-500/50 hover:text-[var(--color-ink)] dark:border-[var(--color-border-dark-subtle)] dark:bg-[var(--color-surface-dark-card)] dark:text-[var(--color-ink-dark-muted)] dark:hover:text-white"
            >
              <Search size={13} />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded border border-black/10 bg-black/[0.04] px-1 py-px text-[10px] font-semibold dark:border-white/15 dark:bg-white/10 sm:inline">
                ⌘K
              </kbd>
            </button>
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function AccountMenu({ name, email }: { name: string; email: string }) {
  return (
    <Dropdown
      side="top"
      align="start"
      trigger={
        <div className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold uppercase text-white">
            {name.charAt(0)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">{name}</span>
            <span className="block truncate text-[10px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              Administrator
            </span>
          </span>
        </div>
      }
    >
      <div className="border-b border-[var(--color-border-subtle)] px-3 py-2 dark:border-[var(--color-border-dark-subtle)]">
        <p className="truncate text-xs font-semibold">{email}</p>
      </div>
      <div className="pt-1">
        <Link href="/dashboard">
          <DropdownItem icon={<ExternalLink size={14} />}>Customer view</DropdownItem>
        </Link>
        <DropdownItem icon={<LogOut size={14} />} danger>
          Log out
        </DropdownItem>
      </div>
    </Dropdown>
  );
}
