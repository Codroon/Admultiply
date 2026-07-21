"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/logo";
import { viewportOnce } from "@/lib/motion";

const links = [
  { label: "About Us", href: "#" },
  { label: "Pricing", href: "#pricing" },
  { label: "T&C's / Privacy", href: "#" },
  { label: "Contact Us", href: "#" },
];

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={viewportOnce}
      transition={{ duration: 0.6 }}
      className="border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-6 py-14 dark:border-[var(--color-border-dark-subtle)] dark:bg-[var(--color-surface-dark-muted)] lg:px-12"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:items-start">
          {/* Brand + tagline */}
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              AdMultiply helps brands, agencies and creators transform winning
              ads into high-converting micro variations, so they can beat
              creative fatigue, maximise ROI and scale what works.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-col gap-3 md:items-end">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              Company
            </span>
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-[var(--color-ink)] transition-colors hover:text-brand-500 dark:text-white dark:hover:text-brand-400"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-6 text-xs text-[var(--color-ink-muted)] dark:border-[var(--color-border-dark-subtle)] dark:text-[var(--color-ink-dark-muted)] sm:flex-row">
          <span>© {new Date().getFullYear()} AdMultiply. All rights reserved.</span>
          <span>Multiply what works.</span>
        </div>
      </div>
    </motion.footer>
  );
}
