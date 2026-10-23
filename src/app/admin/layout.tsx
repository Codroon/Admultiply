import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/shell";
import { isAuthConfigured } from "@/lib/supabase/env";
import { currentAccount } from "@/lib/supabase/account";

/* Staff only.
 *
 * These pages show every customer's jobs, spend and billing. They were a
 * clickable mock, unlisted and otherwise open, waiting on auth to exist. It
 * does now, so the guard lands here rather than in the proxy: the proxy is
 * optimistic by Next's own guidance, and this sits next to the data.
 *
 * A visitor without the role gets a 404, not a 403. There is no reason to
 * confirm to a stranger that an admin area exists at this address.
 *
 * Promote someone by hand, once, in the Supabase SQL editor:
 *   update public.profiles set role = 'admin' where email = 'you@example.com';
 */
export const metadata: Metadata = {
  title: "Admin, AdMultiply",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Running locally with no Supabase there are no accounts at all, and this
  // is the clickable mock it has always been. In production it is guarded
  // either way: an unset environment variable must never be the thing
  // standing between a stranger and every customer's billing.
  const openDemo = !isAuthConfigured && process.env.NODE_ENV !== "production";
  if (!openDemo) {
    const account = await currentAccount();
    if (account?.role !== "admin") notFound();
  }

  return <AdminShell>{children}</AdminShell>;
}
