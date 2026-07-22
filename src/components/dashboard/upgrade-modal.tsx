"use client";

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useDashboard } from "./dashboard-provider";

/* Contextual paywall — opens only on intent (HD download click on a free
   tier). Names the exact capability being unlocked; the already-rendered
   assets un-gate on upgrade with no re-render and no token cost. */
export function UpgradeModal() {
  const { upgradeOpen, closeUpgrade } = useDashboard();

  return (
    <Modal open={upgradeOpen} onClose={closeUpgrade}>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/30">
          <Sparkles size={22} />
        </span>

        <h2 className="mt-4 text-xl font-bold tracking-tight">
          Unlock HD downloads
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          You&apos;ve discovered a paid feature. Upgrading unlocks HD,
          watermark-free downloads of{" "}
          <span className="font-semibold text-[var(--color-ink)] dark:text-white">
            everything you&apos;ve already generated
          </span>{" "}
          — no extra tokens, no re-rendering.
        </p>

        <ul className="mt-5 w-full space-y-2 text-left">
          {[
            "HD 1080p, watermark-free exports",
            "All current + future variations unlocked",
            "More monthly tokens to multiply more ads",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <Check size={12} strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex w-full flex-col gap-2">
          <Link href="/dashboard/billing" onClick={closeUpgrade} className="w-full">
            <Button size="lg" className="w-full">
              See plans — from $9/mo
            </Button>
          </Link>
          <Button variant="ghost" size="md" onClick={closeUpgrade}>
            Keep watermarked previews
          </Button>
        </div>
      </div>
    </Modal>
  );
}
