import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { currentAccount } from "@/lib/supabase/account";

/* The account's own endpoint.
 *
 * Tokens move here and nowhere else. The browser used to hold the balance in
 * local storage, which meant a refresh could undo a spend and anyone could
 * award themselves more by editing it. Both movements go through database
 * functions that check and change in one statement, so two tabs cannot spend
 * the same last token.
 */

export async function GET() {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, account });
}

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "");

  if (action !== "spend" && action !== "refund") {
    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc(
    action === "spend" ? "spend_token" : "refund_token"
  );

  if (error) {
    const outOfTokens = error.message.includes("no tokens remaining");
    if (!outOfTokens) console.error(`[account] ${action} failed:`, error.message);
    return NextResponse.json(
      {
        ok: false,
        error: outOfTokens
          ? "You have no tokens left this month."
          : "We could not update your balance. Please try again.",
      },
      { status: outOfTokens ? 409 : 500 }
    );
  }

  return NextResponse.json({ ok: true, tokens: data as number });
}

export async function PATCH(request: NextRequest) {
  const supabase = await supabaseServer();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => null);
  const plan = String(body?.plan ?? "");
  // Switching plan is still the demo control it always was; real plan changes
  // arrive with Stripe. Row level security limits this to the caller's own row.
  if (!["free", "plus", "starter", "creator", "pro", "business"].includes(plan)) {
    return NextResponse.json({ ok: false, error: "Unknown plan" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ plan, updated_at: new Date().toISOString() })
    .eq("id", auth.user.id);

  if (error) {
    console.error("[account] plan change failed:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, plan });
}
