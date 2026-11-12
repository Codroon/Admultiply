import Link from "next/link";
import { Logo } from "@/components/logo";

/* The frame around Terms and Privacy.

   Deliberately not the landing page's nav and footer. Those are built from
   anchors into the landing page (#pricing, #faq), which lead nowhere from
   here, and a legal page has one job that a marketing header only distracts
   from. A way home at the top, the two documents and a contact at the bottom,
   and the text in between. */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)]">
      <header className="border-b border-[var(--color-border-subtle)] dark:border-[var(--color-border-dark-subtle)]">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5 sm:px-6">
          <Link href="/" aria-label="AdMultiply home">
            <Logo size={28} />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:text-white"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--color-border-subtle)] dark:border-[var(--color-border-dark-subtle)]">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-6 text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)] sm:px-6">
          <span>© {new Date().getFullYear()} AdMultiply</span>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/terms" className="hover:text-[var(--color-ink)] dark:hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-[var(--color-ink)] dark:hover:text-white">
              Privacy
            </Link>
            <a
              href="mailto:hello@admultiply.io"
              className="hover:text-[var(--color-ink)] dark:hover:text-white"
            >
              hello@admultiply.io
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
