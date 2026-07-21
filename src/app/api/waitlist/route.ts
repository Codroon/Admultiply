import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* Waitlist storage. Requires two env vars (server-only, set in Vercel):
   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
   Table: waitlist — see docs/backend-mvp-plan.md checklist.

   create table if not exists waitlist (
     id uuid default gen_random_uuid() primary key,
     email text unique not null,
     company text not null,
     business_type text,
     ad_spend text,
     platforms text[],
     challenge text,
     beta_access boolean,
     survey_completed boolean default false,
     created_at timestamptz default now(),
     updated_at timestamptz default now()
   );
*/

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const company = String(body?.company ?? "").trim();

  if (!EMAIL_RE.test(email) || company.length < 1) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email and company name." },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    // Local preview only: allow the flow to continue in development so the
    // UI can be reviewed. Production still refuses rather than drop leads.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[waitlist] DEV: Supabase not configured — submission NOT stored:", email);
      return NextResponse.json({ ok: true, stored: false });
    }
    console.error("[waitlist] Supabase env vars missing — submission NOT stored:", email);
    return NextResponse.json(
      { ok: false, error: "We couldn't save your signup right now. Please try again in a moment." },
      { status: 503 }
    );
  }

  const { error } = await supabase
    .from("waitlist")
    .upsert(
      { email, company, updated_at: new Date().toISOString() },
      { onConflict: "email" }
    );

  if (error) {
    console.error("[waitlist] insert failed:", error.message);
    return NextResponse.json(
      { ok: false, error: "We couldn't save your signup right now. Please try again in a moment." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[waitlist] DEV: Supabase not configured — survey NOT stored:", email);
      return NextResponse.json({ ok: true, stored: false });
    }
    console.error("[waitlist] Supabase env vars missing — survey NOT stored:", email);
    // Email was already captured (or attempted) at step 1; don't block the UX here.
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const { error } = await supabase
    .from("waitlist")
    .update({
      business_type: body?.business_type ?? null,
      ad_spend: body?.ad_spend ?? null,
      platforms: Array.isArray(body?.platforms) ? body.platforms : null,
      challenge: body?.challenge ?? null,
      beta_access: typeof body?.beta_access === "boolean" ? body.beta_access : null,
      survey_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email);

  if (error) {
    console.error("[waitlist] survey update failed:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
