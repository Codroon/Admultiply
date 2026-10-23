import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { isAuthConfigured } from "@/lib/supabase/env";
import { enabledProviders } from "@/lib/supabase/providers";

export const metadata: Metadata = {
  title: "Create your account · AdMultiply",
  robots: { index: false, follow: false },
};

export default async function SignupPage() {
  const { google } = await enabledProviders();
  return (
    <Suspense>
      <AuthForm mode="signup" googleEnabled={google} configured={isAuthConfigured} />
    </Suspense>
  );
}
