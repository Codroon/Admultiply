"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      {/* At the top: transparent, blends into the hero.
          On scroll: a soft blurred bar fades in. */}
      <div
        className={`absolute inset-0 transition-all duration-300 ${
          scrolled
            ? "border-b border-black/5 bg-[var(--color-surface)]/70 backdrop-blur-xl dark:border-white/5 dark:bg-[var(--color-surface-dark)]/60"
            : "border-b border-transparent bg-transparent"
        }`}
      />

      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-12">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <a
            href="/waitlist"
            className="inline-flex items-center whitespace-nowrap rounded-full bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-500/30 transition-all hover:bg-brand-600 hover:shadow-md sm:px-4"
          >
            <span className="sm:hidden">Join Waitlist</span>
            <span className="hidden sm:inline">Join the Waitlist</span>
          </a>
        </div>
      </div>
    </motion.header>
  );
}
