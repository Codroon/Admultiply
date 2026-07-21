"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { StepCapture } from "./step-capture";
import { StepSurvey, type SurveyAnswers } from "./step-survey";
import { StepSuccess } from "./step-success";

type Step = "capture" | "survey" | "success";

export function WaitlistFlow() {
  const [step, setStep] = useState<Step>("capture");
  const [email, setEmail] = useState("");

  const handleCaptured = (capturedEmail: string) => {
    setEmail(capturedEmail);
    setStep("survey");
  };

  const handleSurveyComplete = async (answers: SurveyAnswers) => {
    // Best-effort enrichment — the email is already stored; never block the
    // success moment on this call.
    try {
      await fetch("/api/waitlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...answers }),
      });
    } catch {
      // logged server-side; user experience continues
    }
    setStep("success");
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Ambient background — same visual vocabulary as the landing hero */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-brand-500/[0.14] blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] h-72 w-72 rounded-full bg-amber-400/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-ink) 1px, transparent 1px), linear-gradient(90deg, var(--color-ink) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 70% 55% at 50% 0%, black, transparent)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 55% at 50% 0%, black, transparent)",
          }}
        />
      </div>

      {/* Minimal chrome: logo home-link + theme toggle, nothing else */}
      <header className="flex items-center justify-between px-6 py-5 lg:px-10">
        <Link href="/" aria-label="AdMultiply home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16 pt-4">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {step === "capture" && (
              <motion.div
                key="capture"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <StepCapture onCaptured={handleCaptured} />
              </motion.div>
            )}

            {step === "survey" && (
              <motion.div
                key="survey"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <StepSurvey onComplete={handleSurveyComplete} />
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <StepSuccess />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
