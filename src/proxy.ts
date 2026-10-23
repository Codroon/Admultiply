import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isAuthConfigured } from "@/lib/supabase/env";

/* Session refresh, and a first look at who is asking.
 *
 * This file is `proxy.ts`, not `middleware.ts`. Next 16 renamed it; the old
 * name is simply not picked up, so a session refresh written the way every
 * Supabase guide still shows it would never run, and people would be signed
 * out seemingly at random as their tokens expired.
 *
 * Two jobs:
 *
 *   1. Refresh the access token and write it back. Server Components cannot
 *      set cookies, so if this did not happen here it would not happen at all.
 *   2. An optimistic redirect, logged out away from /dashboard, logged in away
 *      from /login. Optimistic is the operative word: Next's own guidance is
 *      that this is a redirect for the common case and not a security
 *      boundary. The real check lives in the dashboard layout, next to the
 *      data it protects.
 */

const PROTECTED = ["/dashboard"];
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  // No Supabase configured means no accounts: leave every route alone so the
  // demo dashboard and the landing pages keep working.
  if (!isAuthConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Must be getUser, not getSession: it verifies with Supabase rather than
  // trusting a cookie that anyone could have written.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && PROTECTED.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Remember where they were headed so the login can finish the journey.
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_PAGES.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Everything except static assets and image files. The negative lookahead is
  // what keeps this off the hot path for the hundreds of chunks a page pulls.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)"],
};
