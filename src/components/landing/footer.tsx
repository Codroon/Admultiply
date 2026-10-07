"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { viewportOnce } from "@/lib/motion";

/* The close of the page.

   What was here was a brand paragraph on the left, four links in a column on
   the right, and a copyright line: the default footer every site has had since
   about 2015, and it sat under a page that had just been rebuilt around big
   display type and real product screenshots. It undid the last impression the
   page made.

   Three decisions.

   It follows the theme, matching the hero so the page opens and closes on the
   same surface. Both were near-black in either theme at first, as art
   direction; the client's call is that light mode should be light, so every
   part of this carries both appearances. The wordmark's fill goes through a
   `--wm` custom property because it is set in an inline style, which Tailwind
   variants cannot reach.

   The links are grouped and honest. Everything under Product is a real anchor
   on this page. Contact is a real mailto. Legal is the only placeholder and it
   is marked as one below, because those pages have to exist before the product
   takes money.

   The wordmark at the bottom is the closing flourish, set in the display face
   at viewport scale and almost invisible. It gives the footer presence without
   adding another thing to read. */

const GROUPS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Company",
    links: [{ label: "Contact", href: "mailto:hello@admultiply.com" }],
  },
  {
    /* TODO before launch: both of these need real pages. Stripe will not let
       the product take payments without terms and a privacy policy. */
    title: "Legal",
    links: [
      { label: "Terms", href: "#" },
      { label: "Privacy", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-[var(--color-surface-muted)] px-6 pt-16 transition-colors dark:bg-[#09090B] lg:px-12 lg:pt-20">
      {/* The same warm light the hero sits in, coming back up from the floor */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-72">
        <div className="absolute left-1/2 top-1/3 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[120px] sm:w-[56rem]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportOnce}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-7xl"
      >
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <LogoMark size={26} />
              <span className="text-base font-bold tracking-tight text-[var(--color-ink)] dark:text-white">
                AdMultiply
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)] dark:text-white/50">
              One winning ad in, three micro-ads out. Built for teams who would
              rather scale what already works than start from nothing.
            </p>
            <a
              href="/waitlist"
              className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
            >
              Join the waitlist
              <ArrowUpRight
                size={15}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </div>

          <div className="grid grid-cols-3 gap-8 sm:gap-14">
            {GROUPS.map((group) => (
              <nav key={group.title} className="flex flex-col gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink-muted)] opacity-70 dark:text-white/35 dark:opacity-100">
                  {group.title}
                </span>
                {group.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-sm font-medium text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] dark:text-white/65 dark:hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-2 border-t border-black/10 pt-6 text-xs text-[var(--color-ink-muted)] opacity-80 dark:border-white/10 dark:text-white/35 dark:opacity-100 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} AdMultiply. All rights reserved.</span>
          <span>Cuts sized for TikTok, Reels and Shorts.</span>
        </div>
      </motion.div>

      {/* The wordmark, clipped by the bottom of the page */}
      <div
        aria-hidden
        className="pointer-events-none mt-8 select-none overflow-hidden"
      >
        <svg
          viewBox="0 0 1200 272"
          className="w-full [--wm:rgba(10,10,10,0.055)] dark:[--wm:rgba(255,255,255,0.05)]"
          role="presentation"
        >
          <text
            x="600"
            y="202"
            textAnchor="middle"
            textLength="1176"
            lengthAdjust="spacing"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 248,
              fill: "var(--wm)",
            }}
          >
            AdMultiply
          </text>
        </svg>
      </div>
    </footer>
  );
}
