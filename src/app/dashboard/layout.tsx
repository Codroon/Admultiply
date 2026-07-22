import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";

/* Unlisted pre-launch: the dashboard is a clickable demo (mocked data layer).
   Auth guarding arrives with the Supabase wiring phase. */
export const metadata: Metadata = {
  title: "Dashboard — AdMultiply",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
