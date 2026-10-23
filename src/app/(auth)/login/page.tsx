import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { isAuthConfigured } from "@/lib/supabase/env";
import { enabledProviders } from "@/lib/supabase/providers";

export const metadata: Metadata = {
  title: "Log in · AdMultiply",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const { google } = await enabledProviders();
  return (
    // useSearchParams needs a boundary; without it the whole route opts out
    // of static rendering.
    <Suspense>
      <AuthForm mode="login" googleEnabled={google} configured={isAuthConfigured} />
    </Suspense>
  );
}
