"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { firstHdPlan } from "@/lib/plans";

/* Pricing FAQ, at the client's request, for people reading the plan grid and
 * hesitating.
 *
 * NOTE FOR REVIEW: the answers below are drawn from how the product actually
 * behaves today, but three of them are policy rather than code and need the
 * client's sign-off before launch: whether unused tokens roll over (the answer
 * here matches the landing FAQ, which says they do not), whether there will
 * ever be a pay-per-video option, and the refund position, which is why no
 * refund question is answered here rather than guessed at.
 *
 * One item is deliberately absent from her reference screenshot's list:
 * "Can I see a demo of the product" is answered by the free tier, so it points
 * there rather than at a sales call we do not run.
 */

const entry = firstHdPlan();

const FAQS: { q: string; a: string }[] = [
  {
    q: "Can I see a demo of the product?",
    a: "The Free plan is the demo. It gives you three tokens a month, which is three winning ads turned into nine micro-ads, with no card required. The only limits are lower resolution and an AdMultiply watermark.",
  },
  {
    q: "What happens if I go over my plan's monthly limit?",
    a: "Nothing breaks and nothing is charged. You simply cannot start a new upload until your tokens refresh at the start of your next cycle, or until you move to a plan with more of them. Everything already in your library stays available to download.",
  },
  {
    q: "Do unused tokens roll over into the next month?",
    a: "No. Tokens refresh at the start of each billing cycle and unused ones do not carry over, so it is worth picking the plan that matches what you actually upload rather than the largest one.",
  },
  {
    q: "Can I upgrade my account at any time?",
    a: "Yes, and it applies immediately. Upgrading also unlocks everything you have already generated, so your existing micro-ads become hi-res and watermark free without being re-cut and without costing another token.",
  },
  {
    q: "Can I pay per video?",
    a: "Not at the moment. AdMultiply is sold as a monthly plan, and each plan shows its effective cost per repurposed video so you can see what you are paying either way.",
  },
  {
    q: "Can I cancel at any time?",
    a: "Yes. You can upgrade, downgrade or cancel whenever you like from this page. There is no lock-in and no cancellation fee, and you keep access until the end of the period you have paid for.",
  },
  {
    q: "How do I get rid of the watermark?",
    a: `Move to ${entry.name} or above. ${
      entry.price === 0
        ? "It costs nothing, and it also switches your exports to hi-res."
        : `It starts at $${entry.price} a month, and it also switches your exports to hi-res.`
    }`,
  },
];

export function PricingFaq() {
  // First one open, so the section reads as something to use rather than a
  // row of closed doors.
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section>
      <h2 className="mb-3 text-base font-bold">Pricing FAQ</h2>

      {/* overflow-hidden so a row's hover tint is clipped by the rounded corners. */}
      <Card className="overflow-hidden divide-y divide-[var(--color-border-subtle)] dark:divide-[var(--color-border-dark-subtle)]">
        {FAQS.map((faq, i) => {
          const isOpen = open === i;
          return (
            <div key={faq.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              >
                <span className="text-sm font-semibold">{faq.q}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                    isOpen
                      ? "bg-brand-500 text-white"
                      : "text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
                  }`}
                >
                  <ChevronDown size={15} strokeWidth={2.5} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-sm leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </Card>
    </section>
  );
}
