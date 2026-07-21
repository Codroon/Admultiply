"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { viewportOnce } from "@/lib/motion";

// NOTE: draft FAQ copy — confirm/refine wording with client. The training-data
// answer in particular should be reviewed alongside the Terms & Privacy policy.
const faqs = [
  {
    q: "How does AdMultiply work?",
    a: "Upload one of your best-performing video ads and AdMultiply AI generates three fresh, high-converting micro variations in seconds — no editing skills required.",
  },
  {
    q: "What is a video token?",
    a: "Each token lets you repurpose one winning ad into new micro variations. Tokens refresh every month based on your plan, and unused tokens don't roll over.",
  },
  {
    q: "What video formats and lengths are supported?",
    a: "You can upload standard formats like MP4 and MOV, up to roughly 1.5 minutes long. We recommend uploading your highest-performing creative for the best results.",
  },
  {
    q: "Will my videos have a watermark?",
    a: "Only on the Free plan. Every paid plan exports hi-res, watermark-free videos ready to run across TikTok, Reels and YouTube Shorts.",
  },
  {
    q: "Can I cancel or change my plan anytime?",
    a: "Yes. You can upgrade, downgrade or cancel at any time from your billing settings — no lock-in, no hidden fees.",
  },
  {
    q: "Do you use my content to train your AI?",
    a: "We may use uploaded content to improve the quality of AdMultiply's outputs, always in line with our Terms and Privacy Policy. Enterprise customers can opt out of this entirely.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="px-6 py-20 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)] sm:text-base">
            Everything you need to know about repurposing ads with AdMultiply.
          </p>
        </motion.div>

        <div className="mt-10 flex flex-col gap-3">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportOnce}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="overflow-hidden rounded-2xl bg-[var(--color-surface-muted)] ring-1 ring-black/5 dark:bg-[var(--color-surface-dark-card)] dark:ring-white/5"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="text-sm font-semibold sm:text-base">
                    {faq.q}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                      isOpen
                        ? "bg-brand-500 text-white"
                        : "bg-brand-500/10 text-brand-500"
                    }`}
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
