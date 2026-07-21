"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LogoMark } from "@/components/logo";
import { SocialButtons } from "@/components/auth/social-buttons";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { OrDivider } from "@/components/auth/or-divider";

const item = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export default function SignupPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
      }}
      className="flex flex-col gap-6"
    >
      <motion.div variants={item}>
        <LogoMark size={36} />
      </motion.div>

      <motion.div variants={item} className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Multiply your best-performing ads.
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          Create your free AdMultiply account and start generating
          high-converting micro variations in minutes.
        </p>
      </motion.div>

      <motion.form variants={item} className="flex flex-col gap-3">
        <FormField
          label="Work email"
          id="email"
          type="email"
          placeholder="name@company.com"
          autoComplete="email"
        />
        <p className="-mt-1 text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          Use an organization email to easily collaborate with teammates.
        </p>
        <SubmitButton>Continue</SubmitButton>
      </motion.form>

      <motion.div variants={item}>
        <OrDivider label="or continue with" />
      </motion.div>

      <motion.div variants={item}>
        <SocialButtons mode="Sign up" />
      </motion.div>

      <motion.p variants={item} className="text-center text-xs">
        Existing user?{" "}
        <Link href="/login" className="font-bold text-brand-500 hover:text-brand-600">
          Log in
        </Link>
      </motion.p>

      <motion.p
        variants={item}
        className="text-center text-[11px] leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
      >
        By continuing, you acknowledge that you understand and agree to our{" "}
        <a href="#" className="underline underline-offset-2">
          Terms &amp; Conditions
        </a>{" "}
        and{" "}
        <a href="#" className="underline underline-offset-2">
          Privacy Policy
        </a>
        .
      </motion.p>
    </motion.div>
  );
}
