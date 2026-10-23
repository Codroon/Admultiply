"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { authCallbackUrl } from "@/lib/supabase/env";

/* Signing in and signing up, which are the same form with different words.
 *
 * Three routes in, because they fail for different people: a password for
 * anyone who already has one, a magic link for everyone who will otherwise
 * click "forgot password" in a month, and Google for people who never wanted
 * a password at all.
 *
 * The Google button only appears when the provider is actually switched on in
 * Supabase. A button that reliably returns an error is worse than no button,
 * and the server knows the answer before the page is sent.
 */

type Mode = "login" | "signup";
type Method = "password" | "link";

export function AuthForm({
  mode,
  googleEnabled,
  configured,
}: {
  mode: Mode;
  googleEnabled: boolean;
  configured: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [method, setMethod] = useState<Method>("password");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"" | "email" | "google">("");
  // A link arriving from the callback route carries its own failure.
  const [error, setError] = useState(params.get("error") ?? "");
  const [sent, setSent] = useState<"" | "link" | "confirm">("");

  const isSignup = mode === "signup";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = supabaseBrowser();
    if (!supabase) {
      setError("Accounts are not configured on this environment yet.");
      return;
    }
    setError("");
    setBusy("email");

    try {
      if (method === "link") {
        const { error: err } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: authCallbackUrl(window.location.origin, next),
            // Signing in must not quietly create an account for a mistyped
            // address; signing up is exactly when it should.
            shouldCreateUser: isSignup,
            data: isSignup && name ? { full_name: name } : undefined,
          },
        });
        if (err) throw err;
        setSent("link");
        return;
      }

      if (isSignup) {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: authCallbackUrl(window.location.origin, next),
            data: name ? { full_name: name } : undefined,
          },
        });
        if (err) throw err;
        // With email confirmation on, Supabase returns a user but no session.
        // Saying "check your email" is the honest reading of that.
        if (!data.session) {
          setSent("confirm");
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
      }

      router.push(next);
      router.refresh(); // let the server re-read the session it just gained
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy("");
    }
  };

  const google = async () => {
    const supabase = supabaseBrowser();
    if (!supabase) return;
    setError("");
    setBusy("google");
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authCallbackUrl(window.location.origin, next) },
    });
    if (err) {
      setError(friendly(err));
      setBusy("");
    }
    // On success the browser leaves for Google, so nothing to do here.
  };

  if (sent) {
    return (
      <Sent
        email={email}
        kind={sent}
        onBack={() => {
          setSent("");
          setError("");
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col"
    >
      <h1 className="display-xs">
        {isSignup ? "Start multiplying" : "Welcome back"}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        {isSignup
          ? "Three tokens on the house. One upload becomes three micro-ads."
          : "Log in to pick up where you left off."}
      </p>

      {!configured && (
        <Notice>
          Accounts are not switched on for this environment. The dashboard
          still runs in demo mode.
        </Notice>
      )}

      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={google}
            disabled={!!busy || !configured}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--color-border-subtle)] bg-white px-4 py-3 text-sm font-semibold transition-colors hover:bg-black/[0.03] disabled:opacity-60 dark:border-white/15 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
          >
            {busy === "google" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <GoogleMark />
            )}
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--color-border-subtle)] dark:bg-white/10" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              or
            </span>
            <span className="h-px flex-1 bg-[var(--color-border-subtle)] dark:bg-white/10" />
          </div>
        </>
      )}

      <form onSubmit={submit} className={googleEnabled ? "" : "mt-6"}>
        <div className="flex flex-col gap-3.5">
          {isSignup && (
            <Field
              label="Your name"
              id="name"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Alex Morgan"
              autoComplete="name"
            />
          )}

          <Field
            label="Work email"
            id="email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="name@company.com"
            autoComplete="email"
            required
          />

          {method === "password" && (
            <Field
              label="Password"
              id="password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={isSignup ? "At least 8 characters" : "Your password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={isSignup ? 8 : undefined}
            />
          )}
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <button
          type="submit"
          disabled={!!busy || !configured}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_-10px_rgba(249,115,22,0.8)] transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {busy === "email" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : method === "link" ? (
            <Mail size={15} />
          ) : null}
          {method === "link"
            ? "Email me a link"
            : isSignup
              ? "Create my account"
              : "Log in"}
          {method === "password" && !busy && <ArrowRight size={15} />}
        </button>

        <button
          type="button"
          onClick={() => {
            setMethod(method === "password" ? "link" : "password");
            setError("");
          }}
          className="mt-3 w-full text-center text-xs font-medium text-[var(--color-ink-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:text-white"
        >
          {method === "password"
            ? "Use a one time email link instead"
            : "Use a password instead"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        {isSignup ? "Already have an account?" : "New here?"}{" "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
        >
          {isSignup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </motion.div>
  );
}

/* What we show once an email is on its way. The address is repeated back
   because a typo here is otherwise invisible: the mail simply never arrives
   and the person blames us. */
function Sent({
  email,
  kind,
  onBack,
}: {
  email: string;
  kind: "link" | "confirm";
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
        <Mail size={22} />
      </span>
      <h1 className="display-xs mt-5">Check your email</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        {kind === "link"
          ? "We sent a one time link to "
          : "We sent a confirmation link to "}
        <span className="font-semibold text-[var(--color-ink)] dark:text-white">
          {email}
        </span>
        . Open it on this device and you will be signed straight in.
      </p>
      <p className="mt-4 text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        Nothing after a minute or two? Check spam, or go back and try a
        different address.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 self-start text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
      >
        Back
      </button>
    </motion.div>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  ...props
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
        className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-transparent px-3.5 py-3 text-base transition-colors placeholder:text-[var(--color-ink-muted)] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/12 dark:placeholder:text-[var(--color-ink-dark-muted)] sm:text-sm"
      />
    </div>
  );
}

function Notice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "error";
}) {
  return (
    <p
      role={tone === "error" ? "alert" : undefined}
      className={`mt-4 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
        tone === "error"
          ? "bg-red-500/10 text-red-600 dark:text-red-400"
          : "bg-black/[0.04] text-[var(--color-ink-muted)] dark:bg-white/[0.06] dark:text-[var(--color-ink-dark-muted)]"
      }`}
    >
      {children}
    </p>
  );
}

/* Supabase speaks in API terms. Customers should not have to. */
function friendly(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "That email and password do not match. Try again, or use an email link.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "There is already an account with that email. Log in instead.";
  if (m.includes("email not confirmed"))
    return "Please open the confirmation link we emailed you first.";
  if (m.includes("password should be"))
    return "Please use a password of at least 8 characters.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("signups not allowed"))
    return "New accounts are closed at the moment.";
  if (m.includes("provider is not enabled"))
    return "That sign in method is not switched on yet.";
  if (m.includes("failed to fetch") || m.includes("load failed") || m.includes("network"))
    return "We could not reach the server. Check your connection and try again.";
  return raw || "Something went wrong. Please try again.";
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.0 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.0 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C39.9 36.3 44 31 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}
