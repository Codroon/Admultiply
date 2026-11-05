"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

/* "Brands and companies that use AdMultiply", a scrolling logo strip.
 *
 * This replaced "Made with AdMultiply", which played other customers' finished
 * micro-ads. The client's reason for pulling it was confidentiality: the
 * footage people upload is their own paid media and we will not have the right
 * to show it to strangers. Logos are the version of that section we can
 * actually ship.
 *
 * THE LOGOS BELOW ARE PLACEHOLDERS. They are typeset names, not real
 * customers, and they are here so the section can be designed and reviewed
 * before anyone has sent artwork. Each entry takes either `src`, a file in
 * /public/brands, or falls back to its name set in type. Swap them for real
 * logos before launch: a strip of invented customers on a live product is a
 * claim we have not earned.
 *
 * The rules agreed with the client for the old section still stand if customer
 * work is ever shown again:
 *   1. Consent. A customer's output only appears if they have explicitly
 *      opted in (`share_publicly` on the user/video, default OFF) plus a
 *      toggle in Settings to turn it off again at any time.
 *   2. Volume. The section only activates once there is enough real material
 *      (~50 to 100). Keep that number configurable, not hardcoded.
 */

type Brand = {
  name: string;
  /** A real logo once there is one. Without it the name is set in type. */
  src?: string;
};

const BRANDS: Brand[] = [
  { name: "Placeholder One" },
  { name: "Placeholder Two" },
  { name: "Placeholder Three" },
  { name: "Placeholder Four" },
  { name: "Placeholder Five" },
  { name: "Placeholder Six" },
];

export function BrandStrip() {
  if (BRANDS.length === 0) return null;

  return (
    <section>
      <p className="mb-5 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        Brands and companies that use AdMultiply
      </p>

      {/* Two identical halves, so the -50% loop meets itself seamlessly.
          Pauses on hover, because a moving logo is hard to read. */}
      <div className="group marquee-mask flex overflow-hidden">
        {[0, 1].map((half) => (
          <div
            key={half}
            aria-hidden={half === 1}
            className="animate-marquee flex shrink-0 items-center gap-10 pr-10 group-hover:[animation-play-state:paused] sm:gap-16 sm:pr-16"
            style={{ animationDuration: "34s" }}
          >
            {BRANDS.map((brand, i) => (
              <BrandLogo key={`${half}-${i}`} brand={brand} />
            ))}
          </div>
        ))}
      </div>

      {/* Cue into the upload zone */}
      <div className="mt-7 flex flex-col items-center gap-2">
        <motion.span
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/10 text-brand-500"
        >
          <ArrowDown size={15} strokeWidth={2.5} />
        </motion.span>
        <p className="text-xs font-semibold text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          Your turn. Upload your winning ad
        </p>
      </div>
    </section>
  );
}

/* Greyscale at rest and colour on hover is the convention for a customer
   strip: it keeps six different brand palettes from fighting the page. */
function BrandLogo({ brand }: { brand: Brand }) {
  if (brand.src) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={brand.src}
        alt={brand.name}
        className="h-7 w-auto shrink-0 opacity-45 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 dark:invert sm:h-8"
      />
    );
  }

  return (
    <span className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight text-[var(--color-ink-muted)] opacity-45 transition-opacity duration-300 hover:opacity-80 dark:text-[var(--color-ink-dark-muted)] sm:text-lg">
      {brand.name}
    </span>
  );
}
