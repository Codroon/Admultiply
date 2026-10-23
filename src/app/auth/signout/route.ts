import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/* Signing out is a POST, not a link.
 *
 * A GET would let any page sign someone out by embedding an image pointing at
 * this URL, and browsers prefetch links. A form post cannot be triggered that
 * way.
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin), {
    status: 303, // see other: turns the POST into a GET for the redirect
  });
}
