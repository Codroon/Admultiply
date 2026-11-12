import type { ReactNode } from "react";

/* The building blocks of the legal pages.

   These pages are read by three audiences who never read the rest of the site
   the same way: a customer checking one clause, a payment provider's reviewer
   checking the page exists and says who we are, and a lawyer. So they are
   plain prose at a comfortable measure, with numbered sections that can be
   pointed at, and nothing else. */

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  /** Written out, since "13/11" and "11/13" are different days to half the world. */
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-5 pb-20 pt-10 sm:px-6 sm:pt-14">
      <h1 className="display-sm">{title}</h1>
      <p className="mt-3 text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        Last updated {updated}
      </p>
      <div className="mt-10 flex flex-col gap-10">{children}</div>
    </article>
  );
}

export function Section({
  n,
  title,
  children,
}: {
  n?: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold tracking-tight">
        {n ? `${n}. ` : ""}
        {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3 text-[15px] leading-7 text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        {children}
      </div>
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-brand-500">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/* Emphasis inside a paragraph. Ink rather than muted, so the term being
   defined stands out of the sentence defining it. */
export function Term({ children }: { children: ReactNode }) {
  return (
    <strong className="font-semibold text-[var(--color-ink)] dark:text-white">
      {children}
    </strong>
  );
}

export function Mail({ to }: { to: string }) {
  return (
    <a
      href={`mailto:${to}`}
      className="font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
    >
      {to}
    </a>
  );
}
