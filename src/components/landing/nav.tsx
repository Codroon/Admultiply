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

/* The bar is transparent over the hero at the top and fades into a blurred
   themed bar once you scroll.

   There used to be a light-on-dark branch here, because the hero stage was
   near-black whatever the theme was, so the links had to be white over it even
   in light mode. The hero follows the theme now, which means the transparent
   state and the scrolled state sit on the same colour as each other and one
   set of themed link colours covers both. The branch is gone with it. */
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
          {/* Two actions now that accounts exist. Returning customers are the
              quieter of the two: they already know where they are going, and
              the loud button belongs to the people who do not. It stays on a
              phone as well, tighter, because sending someone who already pays
              us through a signup screen to find the way back in is rude. */}
          <a
            href="/login"
            className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-2 text-sm font-medium text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:text-white sm:px-3"
          >
            Log in
          </a>
          <a
            href="/signup"
            className="inline-flex items-center whitespace-nowrap rounded-full bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-500/30 transition-all hover:bg-brand-600 hover:shadow-md sm:px-4"
          >
            Get started
          </a>
        </div>
      </div>
    </motion.header>
  );
}
