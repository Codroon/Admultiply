"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Coins,
  CreditCard,
  Home,
  Library,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { DashboardProvider, useDashboard } from "./dashboard-provider";
import { UpgradeModal } from "./upgrade-modal";
import { getPlan } from "@/lib/plans";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/library", label: "My Library", icon: Library },
  { href: "/dashboard/billing", label: "Billing & Plan", icon: CreditCard },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Home",
  "/dashboard/library": "My Library",
  "/dashboard/billing": "Billing & Plan",
  "/dashboard/settings": "Settings",
};

const SIDEBAR_KEY = "admultiply-sidebar-collapsed";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <DashboardProvider>
        <ShellInner>{children}</ShellInner>
        <UpgradeModal />
      </DashboardProvider>
    </ToastProvider>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { userName, email, plan, tokens } = useDashboard();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex min-h-dvh bg-[var(--color-surface-muted)] dark:bg-[var(--color-surface-dark)]">
      {/* Desktop sidebar — collapsible to an icon rail */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[var(--color-border-subtle)] bg-white py-5 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-[var(--color-border-dark-subtle)] dark:bg-[var(--color-surface-dark-muted)] lg:flex ${
          collapsed ? "w-[76px] px-3" : "w-60 px-4"
        }`}
      >
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between px-2"}`}>
          {collapsed ? (
            <Link href="/dashboard" aria-label="AdMultiply home">
              <LogoMark size={30} />
            </Link>
          ) : (
            <Link href="/dashboard">
              <Logo />
            </Link>
          )}
          {!collapsed && (
            <button
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition-colors hover:bg-black/5 hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:bg-white/10 dark:hover:text-white"
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            className="mx-auto mt-4 flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition-colors hover:bg-black/5 hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:bg-white/10 dark:hover:text-white"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}

        <nav className={`flex flex-col gap-1 ${collapsed ? "mt-4" : "mt-8"}`}>
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center rounded-xl text-sm font-medium transition-colors ${
                  collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
                } ${
                  active
                    ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                    : "text-[var(--color-ink-muted)] hover:bg-black/[0.04] hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                <item.icon size={18} strokeWidth={2} />
                {!collapsed && item.label}
                {collapsed && (
                  <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-white dark:text-zinc-900">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={`mt-auto flex flex-col ${collapsed ? "items-center gap-4" : "gap-3"}`}>
          {collapsed ? (
            <ThemeToggle />
          ) : (
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-medium text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                Appearance
              </span>
              <ThemeToggle />
            </div>
          )}
          <AccountMenu
            name={userName}
            email={email}
            planName={getPlan(plan).name}
            collapsed={collapsed}
          />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-[var(--color-border-subtle)] bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-[var(--color-border-dark-subtle)] dark:bg-[var(--color-surface-dark-muted)]/90 lg:hidden">
        <Link href="/dashboard">
          <LogoMark size={30} />
        </Link>
        <div className="flex items-center gap-2">
          <TokenChip tokens={tokens} />
          <ThemeToggle />
        </div>
      </header>

      {/* Main column */}
      <div
        className={`flex min-w-0 flex-1 flex-col pb-20 pt-16 transition-[margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:pb-0 lg:pt-0 ${
          collapsed ? "lg:ml-[76px]" : "lg:ml-60"
        }`}
      >
        {/* Desktop topbar — page context left, tokens right */}
        <div className="sticky top-0 z-30 hidden items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]/80 px-8 py-3.5 backdrop-blur-xl dark:border-[var(--color-border-dark-subtle)] dark:bg-[var(--color-surface-dark)]/80 lg:flex">
          <span className="text-sm font-semibold text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            {PAGE_TITLES[pathname] ?? "Dashboard"}
          </span>
          <div className="flex items-center gap-3">
            <TokenChip tokens={tokens} />
            <Link
              href="/dashboard/billing"
              className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              Get more
            </Link>
          </div>
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-[var(--color-border-subtle)] bg-white/95 backdrop-blur-xl dark:border-[var(--color-border-dark-subtle)] dark:bg-[var(--color-surface-dark-muted)]/95 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {[...NAV, { href: "/dashboard/settings", label: "Settings", icon: Settings }].map(
          (item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                isActive(item.href)
                  ? "text-brand-500"
                  : "text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
              }`}
            >
              <item.icon size={19} strokeWidth={2} />
              {item.label === "Billing & Plan"
                ? "Billing"
                : item.label === "My Library"
                  ? "Library"
                  : item.label}
            </Link>
          )
        )}
      </nav>
    </div>
  );
}

function TokenChip({ tokens }: { tokens: number }) {
  const empty = tokens <= 0;
  return (
    <Link
      href="/dashboard/billing"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-colors ${
        empty
          ? "bg-red-500/10 text-red-600 ring-red-500/20 dark:text-red-400"
          : "bg-brand-500/10 text-brand-600 ring-brand-500/20 hover:bg-brand-500/15 dark:text-brand-400"
      }`}
    >
      <Coins size={13} />
      {tokens} {tokens === 1 ? "token" : "tokens"}
    </Link>
  );
}

function AccountMenu({
  name,
  email,
  planName,
  collapsed,
}: {
  name: string;
  email: string;
  planName: string;
  collapsed: boolean;
}) {
  const avatar = (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold uppercase text-white">
      {name.charAt(0)}
    </span>
  );

  return (
    <Dropdown
      side="top"
      align="start"
      trigger={
        collapsed ? (
          <div className="flex justify-center py-1">{avatar}</div>
        ) : (
          <div className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/5">
            {avatar}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{name}</span>
              <span className="block truncate text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                {planName} plan
              </span>
            </span>
          </div>
        )
      }
    >
      <div className="border-b border-[var(--color-border-subtle)] px-3 py-2 dark:border-[var(--color-border-dark-subtle)]">
        <p className="truncate text-xs font-semibold">{email}</p>
      </div>
      <div className="pt-1">
        <Link href="/dashboard/billing">
          <DropdownItem icon={<Sparkles size={14} />}>Upgrade plan</DropdownItem>
        </Link>
        <Link href="/dashboard/settings">
          <DropdownItem icon={<Settings size={14} />}>Settings</DropdownItem>
        </Link>
        <DropdownItem icon={<LogOut size={14} />} danger>
          Log out
        </DropdownItem>
      </div>
    </Dropdown>
  );
}
