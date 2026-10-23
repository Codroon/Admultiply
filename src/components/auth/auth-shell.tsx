"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ReactNode } from "react";

/* The frame around signing in.
 *
 * This was a cream panel with a 200px logo floating in the middle of it,
 * drawn before the landing page was rebuilt, so arriving here from the site
 * felt like leaving it. It now speaks the landing's language: the same lit
 * stage, the same display type, and a real screenshot of the product rather
 * than a logo, because the one thing worth saying on the way to a login is
 * what is waiting on the other side.
 *
 * It follows the theme. An earlier version of the hero stayed near-black in
 * light mode as deliberate art direction and the client disagreed, so nothing
 * here repeats that argument.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-[var(--color-surface)] p-4 transition-colors dark:bg-[#09090B] sm:p-6 lg:p-8">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6 lg:right-8 lg:top-8">
        <ThemeToggle />
      </div>

      {/* The subtracted height has to track the padding above, or the page
          grows taller than the viewport and picks up a scrollbar with nothing
          below the fold to scroll to. */}
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] max-w-[1400px] grid-cols-1 gap-8 sm:min-h-[calc(100dvh-3rem)] lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-2 lg:gap-12">
        {/* The stage. Hidden on a phone, where the form is the whole job and
            a decorative panel would only push it under the fold. */}
        <motion.aside
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative hidden overflow-hidden rounded-3xl bg-[var(--color-surface-muted)] transition-colors dark:bg-black lg:flex lg:flex-col lg:justify-between"
        >
          {/* Same lighting as the hero: a warm glow, softer on white where
              the dark mode's strength would read as an orange wash. */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-[-10rem] h-[26rem] w-[34rem] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[110px] dark:bg-brand-500/20" />
            <div
              className="absolute inset-0 opacity-[0.05] [--grid:#0a0a0a] dark:opacity-[0.07] dark:[--grid:#ffffff]"
              style={{
                backgroundImage:
                  "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)",
                backgroundSize: "56px 56px",
                maskImage:
                  "radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent)",
              }}
            />
          </div>

          <div className="relative px-10 pt-10">
            <Link href="/" className="inline-flex items-center gap-2">
              <LogoMark size={26} />
              <span className="text-base font-bold tracking-tight">
                AdMultiply
              </span>
            </Link>

            <h2 className="display-sm mt-10 max-w-sm">
              Multiply what
              <br />
              <span className="text-brand-500">already works.</span>
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--color-ink-muted)] dark:text-white/55">
              Upload one ad that is already converting. Get three vertical cuts
              built from its strongest moments, ready for TikTok, Reels and
              Shorts.
            </p>
          </div>

          {/* The product, cropped by the panel edge so it reads as a window
              into the app rather than a pasted-in picture. */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative mt-10 ml-10 overflow-hidden rounded-tl-2xl shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/10 dark:ring-white/10"
          >
            <Image
              src="/product/step-4-results.png"
              alt="Three finished micro-ads in the AdMultiply workspace"
              width={2720}
              height={1760}
              priority
              sizes="(min-width: 1024px) 40rem, 0px"
              className="h-auto w-full"
            />
          </motion.div>
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center py-8"
        >
          <div className="w-full max-w-sm">
            {/* The mark only shows where the stage is hidden, so a phone still
                knows whose login this is. */}
            <Link href="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
              <LogoMark size={24} />
              <span className="text-base font-bold tracking-tight">
                AdMultiply
              </span>
            </Link>
            {children}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
