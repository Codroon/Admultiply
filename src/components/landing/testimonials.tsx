"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";

const testimonials = [
  {
    name: "Jerry Tang",
    role: "Founder, LeadCrafts",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=200&q=80",
    quote:
      "I used to spend hours scraping LinkedIn manually. Now I get a fully filtered, high-quality lead list in under 10 minutes. AdMultiply cut my outreach prep time by 80%.",
  },
  {
    name: "Serina Saui",
    role: "B2B Growth Marketer",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=200&q=80",
    quote:
      "This tool is a game-changer. The lead scoring alone helped us double our cold email response rate. It's fast, intuitive, and just works.",
  },
  {
    name: "Stevano Albert",
    role: "Head of Sales, StartupStack",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=200&q=80",
    quote:
      "No more spreadsheets, no more guesswork. AdMultiply made it insanely easy to find decision-makers for our SaaS launch campaign.",
  },
];

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="px-6 py-20 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-xl text-center text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Trusted by Creators &amp; Marketing Teams
        </motion.h2>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="mt-14 grid grid-cols-1 items-center gap-6 md:grid-cols-3"
        >
          {testimonials.map((t, i) => {
            const isActive = i === activeIndex;
            const rotateClass =
              i === 0 ? "md:-rotate-2" : i === 2 ? "md:rotate-2" : "";

            return (
              <motion.article
                key={t.name}
                variants={fadeUp}
                animate={{
                  scale: isActive ? 1.06 : 1,
                  y: isActive ? -6 : 0,
                }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: isActive ? -10 : -4 }}
                className={`${rotateClass} rounded-2xl p-7 transition-colors duration-500 ${
                  isActive
                    ? "bg-brand-500 text-white shadow-xl shadow-brand-500/30 ring-1 ring-brand-400"
                    : "bg-[var(--color-surface-muted)] text-[var(--color-ink)] ring-1 ring-black/5 dark:bg-[var(--color-surface-dark-card)] dark:text-white dark:ring-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full ring-2 ring-white/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p
                      className={`text-xs transition-colors duration-500 ${
                        isActive
                          ? "text-white/80"
                          : "text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
                      }`}
                    >
                      {t.role}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      size={14}
                      className={`transition-colors duration-500 ${
                        isActive
                          ? "fill-white text-white"
                          : "fill-brand-500 text-brand-500"
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-xs font-semibold">5.0</span>
                </div>

                <p className="mt-4 text-sm leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </motion.article>
            );
          })}
        </motion.div>

        {/* Active indicator dots */}
        <div className="mt-10 flex items-center justify-center gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Highlight testimonial ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-6 bg-brand-500"
                  : "w-1.5 bg-[var(--color-border-subtle)] dark:bg-[var(--color-border-dark-subtle)]"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
