import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";

/* Unlisted pre-launch. Role-based guarding (users.role = 'admin') lands with
   the Supabase Auth wiring — until then this is a mocked clickable demo. */
export const metadata: Metadata = {
  title: "Admin — AdMultiply",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
