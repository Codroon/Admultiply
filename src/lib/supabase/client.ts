"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isAuthConfigured } from "./env";

/* The browser's Supabase client.
 *
 * Returns null rather than throwing when auth is not configured, so a build
 * without Supabase keys still renders every page; the forms disable
 * themselves instead of exploding on first paint.
 *
 * `createBrowserClient` keeps the session in cookies rather than local
 * storage, which is the whole point: the server can read the same session on
 * the next request, so a page can be protected before it is ever sent.
 */
export function supabaseBrowser() {
  if (!isAuthConfigured) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
