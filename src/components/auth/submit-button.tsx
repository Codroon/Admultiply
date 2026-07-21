"use client";

import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type SubmitButtonProps = {
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function SubmitButton({ children, ...props }: SubmitButtonProps) {
  return (
    <motion.button
      type="submit"
      whileHover={{ y: -1, boxShadow: "0 12px 28px -8px rgba(249,115,22,0.5)" }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
      {...(props as Record<string, unknown>)}
      className="w-full rounded-full bg-gradient-to-r from-brand-300 via-brand-500 to-brand-400 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-shadow"
    >
      {children}
    </motion.button>
  );
}
