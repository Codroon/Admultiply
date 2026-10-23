import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { isAuthConfigured } from "@/lib/supabase/env";
import { currentAccount } from "@/lib/supabase/account";

export const metadata: Metadata = {
  title: "Dashboard · AdMultiply",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* The real gate.
   *
   * proxy.ts also redirects people without a session, but Next's own guidance
   * is that it is an optimistic check and not a security boundary. This runs
   * next to the data, on the server, and is what actually decides.
   *
   * When Supabase is not configured at all there is nothing to check and the
   * dashboard runs its simulated pipeline, which is what keeps local demos and
   * preview builds working without keys.
   */
  const account = isAuthConfigured ? await currentAccount() : null;
  if (isAuthConfigured && !account) redirect("/login?next=/dashboard");

  return <DashboardShell account={account}>{children}</DashboardShell>;
}
