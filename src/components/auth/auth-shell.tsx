"use client";

import { motion } from "framer-motion";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh p-6 lg:p-10">
      {/* Floating theme toggle */}
      <div className="absolute right-6 top-6 z-20 lg:right-10 lg:top-10">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-[calc(100dvh-3rem)] max-w-[1400px] grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
        {/* Decorative left panel */}
        <motion.aside
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden items-center justify-center overflow-hidden rounded-3xl bg-[#fef5eb] dark:bg-[#231a13] lg:flex"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <LogoMark size={200} />
          </motion.div>

          {/* Subtle radial vignette for depth */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.06)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.3)_100%)]" />
        </motion.aside>

        {/* Right form area */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center"
        >
          <div className="w-full max-w-md">{children}</div>
        </motion.section>
      </div>
    </div>
  );
}
