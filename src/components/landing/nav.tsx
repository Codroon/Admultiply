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

/* A floating island, not a bar across the top.

   This was a full width bar: transparent over the hero, fading to a blurred
   strip once you scrolled. The island is the shape the client asked for, and
   the reason it works better here is that it stops competing with the hero.
   A bar runs edge to edge and draws a line under itself, which cuts the page
   in two at exactly the point the headline is trying to own. A pill sits on
   top of the page instead of slicing it, so the hero reads as one thing with
   the navigation floating over it.

   It is visible at every scroll position rather than fading in, because an
   island that appears from nothing is a jump rather than a transition. What
   changes on scroll is the shadow: shallow at the top where there is nothing
   underneath it, deeper once content is passing beneath. */
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
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4"
    >
      {/* pr is tighter than pl on purpose: the right end finishes on a filled
          pill, which carries its own visual padding, so matching the left
          would leave the button marooned in the middle of a gap. */}
      <div
        className={`mx-auto flex h-14 max-w-[1120px] items-center justify-between rounded-full border border-black/[0.06] bg-[var(--color-surface)]/85 pl-4 pr-2 backdrop-blur-xl transition-shadow duration-300 dark:border-white/[0.08] dark:bg-[var(--color-surface-dark-muted)]/85 sm:pl-5 ${
          scrolled
            ? "shadow-[0_10px_30px_-12px_rgba(21,18,16,0.3)] dark:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)]"
            : "shadow-[0_6px_20px_-14px_rgba(21,18,16,0.22)] dark:shadow-[0_6px_20px_-14px_rgba(0,0,0,0.7)]"
        }`}
      >
        <Logo size={28} />

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Hidden on a phone. Measured at 393px the logo and this toggle
              met at exactly the same pixel with no gap between them, and a
              wordmark touching a control reads as broken even when nothing
              technically overlaps. Of the things in this row the toggle is
              the one a first time visitor needs least. The cost is real
              though: the site opens in light for everyone (the theme
              provider is set to light with system following off), so on a
              phone there is no way to switch this page to dark. Signed in
              users still can, from Settings. Log in stays, for the reason
              below. */}
          <span className="hidden sm:flex">
            <ThemeToggle />
          </span>
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
            className="inline-flex h-10 items-center whitespace-nowrap rounded-full bg-brand-500 px-4 text-sm font-semibold text-white shadow-sm shadow-brand-500/30 transition-all hover:bg-brand-600 hover:shadow-md sm:px-5"
          >
            Get started
          </a>
        </div>
      </div>
    </motion.header>
  );
}
