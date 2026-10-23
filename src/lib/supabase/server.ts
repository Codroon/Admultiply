import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isAuthConfigured } from "./env";

/* The server's Supabase client, bound to this request's cookies.
 *
 * `cookies()` is async in Next 16, hence the await. Writing cookies is also
 * forbidden while rendering a Server Component, and the only place a write is
 * genuinely needed is a token refresh, which proxy.ts already does on every
 * request. So the setter swallows that specific failure rather than crashing a
 * page that merely wanted to know who was signed in.
 */
export async function supabaseServer() {
  if (!isAuthConfigured) return null;
  const store = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Render phase: proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

/** The signed-in user, or null. Never throws, so callers can branch simply. */
export async function currentUser() {
  const supabase = await supabaseServer();
  if (!supabase) return null;
  // getUser revalidates against Supabase rather than trusting the cookie,
  // which is the difference that matters for anything behind a login.
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}
