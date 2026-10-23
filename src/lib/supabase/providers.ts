import { SUPABASE_ANON_KEY, SUPABASE_URL, isAuthConfigured } from "./env";

/* Which sign in methods this project actually has switched on.
 *
 * Asked at render rather than hard coded, so the Google button appears the
 * moment the provider is enabled in the Supabase dashboard and never before.
 * A button that reliably errors is worse than no button, and this is a
 * question the server can answer for free.
 */
export async function enabledProviders(): Promise<{ google: boolean }> {
  if (!isAuthConfigured) return { google: false };
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      // Settings change when someone edits the dashboard, not per request.
      next: { revalidate: 300 },
    });
    if (!res.ok) return { google: false };
    const body = (await res.json()) as { external?: Record<string, boolean> };
    return { google: Boolean(body.external?.google) };
  } catch {
    // Never let a sign in page fail because this lookup did.
    return { google: false };
  }
}
