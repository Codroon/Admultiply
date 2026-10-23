import { supabaseServer } from "./server";

/* The signed-in person, as the product thinks of them.
 *
 * Identity lives in auth.users, which Supabase owns. Everything else, the
 * plan and the token balance, lives in public.profiles, created by a trigger
 * the moment an account appears. See supabase/migrations/0001_profiles.sql.
 *
 * Every failure here returns null rather than throwing. The dashboard has a
 * working demo path, and a missing table while the migration is still waiting
 * to be run should land someone in that rather than on an error page.
 */

export type Account = {
  id: string;
  email: string;
  name: string;
  plan: string;
  tokens: number;
  /* 'admin' is set by hand in the database. Nothing in the product grants
     it, which is the point. */
  role: string;
};

export async function currentAccount(): Promise<Account | null> {
  const supabase = await supabaseServer();
  if (!supabase) return null;

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;
  const user = auth.user;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, tokens, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    // Almost always the migration not having been run yet. Say which, once,
    // rather than leaving a blank dashboard and no explanation.
    console.error(
      `[account] could not read profile for ${user.id}: ${error.message}. ` +
        "Has supabase/migrations/0001_profiles.sql been run?"
    );
  }

  const fallbackName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    (user.email ?? "there").split("@")[0];

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    name: profile?.full_name ?? fallbackName,
    plan: profile?.plan ?? "free",
    // Three is what the migration gives a new account. Showing it when the
    // profile cannot be read keeps the dashboard honest-looking rather than
    // claiming zero, and spending still fails safely against the database.
    tokens: profile?.tokens ?? 3,
    // Fails closed. No profile row means no admin, so a missing migration
    // cannot hand the admin area to whoever happens to be signed in.
    role: profile?.role ?? "user",
  };
}
