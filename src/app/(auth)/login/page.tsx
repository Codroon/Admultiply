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

export default function LoginPage() {
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
          Welcome back
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          Log in to your AdMultiply account to keep multiplying what works.
        </p>
      </motion.div>

      <motion.form variants={item} className="flex flex-col gap-4">
        <FormField
          label="Work email"
          id="email"
          type="email"
          placeholder="name@company.com"
          autoComplete="email"
        />
        <div className="flex flex-col gap-1.5">
          <FormField
            label="Password"
            id="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
          />
          <Link
            href="/forgot-password"
            className="self-end text-xs font-semibold underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <SubmitButton>Log in</SubmitButton>
      </motion.form>

      <motion.div variants={item}>
        <OrDivider label="or continue with" />
      </motion.div>

      <motion.div variants={item}>
        <SocialButtons mode="Sign In" />
      </motion.div>

      <motion.p variants={item} className="text-center text-xs">
        New to AdMultiply?{" "}
        <Link href="/signup" className="font-bold text-brand-500 hover:text-brand-600">
          Sign up
        </Link>
      </motion.p>
    </motion.div>
  );
}
