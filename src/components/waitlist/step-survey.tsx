"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

export type SurveyAnswers = {
  business_type: string | null;
  ad_spend: string | null;
  platforms: string[];
  challenge: string | null;
  beta_access: boolean | null;
};

type Question = {
  key: keyof SurveyAnswers;
  title: string;
  type: "single" | "multi";
  options: string[];
};

const QUESTIONS: Question[] = [
  {
    key: "business_type",
    title: "Which best describes your business?",
    type: "single",
    options: [
      "Brand",
      "Ecommerce business",
      "Marketing agency",
      "Performance marketing team",
      "Freelancer / Consultant",
      "Creator",
      "Other",
    ],
  },
  {
    key: "ad_spend",
    title: "What's your average monthly ad spend?",
    type: "single",
    options: ["Under $5,000", "$5,000–$25,000", "$25,000–$100,000", "$100,000+"],
  },
  {
    key: "platforms",
    title: "Which advertising platforms do you use most?",
    type: "multi",
    options: [
      "Meta (Facebook & Instagram)",
      "TikTok",
      "Google",
      "Google Ads (PPC)",
      "LinkedIn",
      "Pinterest",
      "Other",
    ],
  },
  {
    key: "challenge",
    title: "What's your biggest challenge right now?",
    type: "single",
    options: [
      "Creative fatigue",
      "Producing enough creatives",
      "Testing new creatives efficiently",
      "Improving ROAS",
      "Scaling winning campaigns",
      "Lowering CPA",
      "Other",
    ],
  },
  {
    key: "beta_access",
    title: "Would you like early beta access?",
    type: "single",
    options: ["Yes — I'd love early access", "No — just send me updates"],
  },
];

export function StepSurvey({
  onComplete,
}: {
  onComplete: (answers: SurveyAnswers) => Promise<void>;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [multi, setMulti] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");
  const [answers, setAnswers] = useState<SurveyAnswers>({
    business_type: null,
    ad_spend: null,
    platforms: [],
    challenge: null,
    beta_access: null,
  });
  const [submitting, setSubmitting] = useState(false);

  const q = QUESTIONS[index];
  const isLast = index === QUESTIONS.length - 1;

  const commitAndAdvance = async (value: string | string[]) => {
    const next: SurveyAnswers = { ...answers };
    if (q.key === "platforms") {
      // Fold the free-text "Other" into the stored array: "Other: <text>"
      next.platforms = (value as string[]).map((v) =>
        v === "Other" && otherText.trim() ? `Other: ${otherText.trim()}` : v
      );
    } else if (q.key === "beta_access") {
      next.beta_access = (value as string).startsWith("Yes");
    } else {
      let v = value as string;
      if (v === "Other" && otherText.trim()) v = `Other: ${otherText.trim()}`;
      next[q.key] = v as never;
    }
    setAnswers(next);

    if (isLast) {
      setSubmitting(true);
      await onComplete(next);
      return;
    }

    setIndex(index + 1);
    setSelected(null);
    setMulti([]);
    setOtherText("");
  };

  // Q1 ("business_type") and Q4 ("challenge") pause auto-advance on "Other"
  // so the user can type their own answer.
  const singleOtherPauses = q.key === "business_type" || q.key === "challenge";

  const pickSingle = (option: string) => {
    if (submitting) return;
    if (isLast) {
      // Last question: selection is changeable; the explicit Complete button submits.
      setSelected(option);
      return;
    }
    if (singleOtherPauses && option === "Other") {
      // Show the free-text field + Continue instead of auto-advancing.
      setSelected("Other");
      return;
    }
    // Allow switching away from a paused "Other"; block only mid auto-advance.
    if (selected !== null && selected !== "Other") return;
    setSelected(option);
    setOtherText("");
    // Typeform-style: brief highlight, then advance
    setTimeout(() => commitAndAdvance(option), 350);
  };

  const goBack = () => {
    if (index === 0 || submitting) return;
    setIndex(index - 1);
    setSelected(null);
    setMulti([]);
    setOtherText("");
  };

  return (
    <div>
      {/* Heading */}
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          Thanks! We&apos;d love to learn a little more about you.
        </h2>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          This will help us prioritise early access and shape the product around
          real customer needs.
        </p>
      </div>

      {/* Progress */}
      <div className="mx-auto mt-8 max-w-md">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          <span>
            Question {index + 1} of {QUESTIONS.length}
          </span>
          <span className="text-brand-500">
            {Math.round((index / QUESTIONS.length) * 100)}%
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <motion.div
            animate={{ width: `${((index + 0.001) / QUESTIONS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
          />
        </div>
      </div>

      {/* Question card */}
      <div className="mx-auto mt-8 max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.key}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3 className="text-base font-semibold sm:text-lg">
              {index + 1}. {q.title}
              {q.type === "multi" && (
                <span className="ml-2 text-xs font-medium text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                  (Select all that apply)
                </span>
              )}
            </h3>

            <div className="mt-4 flex flex-col gap-2">
              {q.options.map((option) => {
                const isPicked =
                  q.type === "multi"
                    ? multi.includes(option)
                    : selected === option;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={submitting}
                    onClick={() =>
                      q.type === "multi"
                        ? setMulti((m) =>
                            m.includes(option)
                              ? m.filter((x) => x !== option)
                              : [...m, option]
                          )
                        : pickSingle(option)
                    }
                    className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                      isPicked
                        ? "border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400"
                        : "border-[var(--color-border-subtle)] bg-white/60 hover:border-brand-500/40 hover:bg-brand-500/[0.04] dark:border-[var(--color-border-dark-subtle)] dark:bg-white/5 dark:hover:bg-white/[0.08]"
                    }`}
                  >
                    {option}
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                        isPicked
                          ? "border-brand-500 bg-brand-500 text-white"
                          : "border-[var(--color-border-subtle)] dark:border-[var(--color-border-dark-subtle)]"
                      }`}
                    >
                      {isPicked && <Check size={12} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Free-text field slides in when "Other" is ticked (Q3 multi + Q4 single) */}
            <AnimatePresence initial={false}>
              {((q.type === "multi" && multi.includes("Other")) ||
                (singleOtherPauses && selected === "Other")) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <input
                    type="text"
                    autoFocus
                    maxLength={80}
                    placeholder={
                      q.key === "platforms"
                        ? "Which platform? Tell us…"
                        : q.key === "business_type"
                          ? "How would you describe your business?"
                          : "What's your challenge? Tell us…"
                    }
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-brand-500/40 bg-white/70 px-4 py-3 text-base shadow-sm backdrop-blur placeholder:text-[var(--color-ink-muted)] transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-brand-500/30 dark:bg-white/5 dark:placeholder:text-[var(--color-ink-dark-muted)] sm:text-sm"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Explicit button: multi-select, last question, or a paused "Other" */}
            {(q.type === "multi" ||
              isLast ||
              (singleOtherPauses && selected === "Other")) && (
              <motion.button
                type="button"
                disabled={
                  submitting || (q.type === "multi" ? multi.length === 0 : !selected)
                }
                onClick={() =>
                  commitAndAdvance(q.type === "multi" ? multi : (selected as string))
                }
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isLast ? (
                  "Complete"
                ) : (
                  <>
                    Continue
                    <ArrowRight
                      size={15}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </>
                )}
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>

        {index > 0 && !submitting && (
          <button
            type="button"
            onClick={goBack}
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:text-white"
          >
            <ArrowLeft size={13} />
            Back
          </button>
        )}
      </div>
    </div>
  );
}
