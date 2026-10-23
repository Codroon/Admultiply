import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* Keeps the Supabase project from going to sleep.
 *
 * Free Supabase projects pause after about a week without a query, and a
 * paused project stops answering: its hostname stops resolving entirely, the
 * waitlist form on the live site starts returning 500, and nobody finds out
 * until someone tries to sign up. That is exactly what happened here.
 *
 * One cheap read a day is enough to prevent it. vercel.json schedules this.
 * It stops being necessary on a paid Supabase plan, and is harmless there.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, reason: "not configured" }, { status: 503 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  // head + count touches the database without transferring any rows.
  const { error, count } = await supabase
    .from("waitlist")
    .select("email", { count: "exact", head: true });

  if (error) {
    console.error("[keepalive] database unreachable:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  }
  return NextResponse.json({ ok: true, waitlist: count ?? 0 });
}
