import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/* Where Google and magic links come back to.
 *
 * Supabase sends the browser here with a one-time `code`, which is exchanged
 * for a session and written into cookies. Until that exchange happens the
 * person is not signed in, so this route is the only thing standing between a
 * clicked email link and a working dashboard.
 *
 * `next` carries the page they were trying to reach before being sent to log
 * in. It is checked rather than trusted: an absolute URL in a query string is
 * an open redirect, which is how phishing links get to wear your domain.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const raw = searchParams.get("next") ?? "/dashboard";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";

  // Supabase reports its own failures here, an expired link being the common
  // one. Say so plainly rather than bouncing to a login that looks broken.
  const error = searchParams.get("error_description") ?? searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, origin)
    );
  }

  if (!code) return NextResponse.redirect(new URL("/login", origin));

  const supabase = await supabaseServer();
  if (!supabase) return NextResponse.redirect(new URL("/login", origin));

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("That link has expired. Please request a new one.")}`,
        origin
      )
    );
  }

  return NextResponse.redirect(new URL(next, origin));
}
