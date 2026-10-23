/* Supabase configuration, read once and checked honestly.
 *
 * The product has to keep working when these are absent: the dashboard runs a
 * simulated pipeline for demos, and the landing and waitlist have nothing to
 * do with accounts. So nothing here throws on a missing key. Callers ask
 * `isAuthConfigured` and take the other path.
 *
 * The anon key is public by design. It identifies the project, it does not
 * grant anything, and row level security is what protects the data. The
 * service role key is the opposite and must never reach the browser, which is
 * why it has no NEXT_PUBLIC_ prefix.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isAuthConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Where Supabase sends people back to after a magic link or Google. */
export function authCallbackUrl(origin: string, next = "/dashboard"): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", next);
  return url.toString();
}
