"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { authCallbackUrl } from "@/lib/supabase/env";

/* Signing in and signing up, which are the same form with different words.
 *
 * A emailed code is the default, on purpose, and it is a code rather than a
 * link because of where a link leaves you. Tapping a link in a mail app opens
 * the sign in inside that app's browser, which is not the browser you started
 * in, so you end up back in the first one still logged out, pressing "back"
 * and wondering what happened. A code never leaves the tab you are already in.
 *
 * The same mail still carries a link, so either route works. Typing the code
 * is simply the one the screen asks for.
 *
 * Anyone who would rather keep a password is one tap away, and Google sits
 * above both for people who never wanted either. The Google button only
 * appears when the provider is actually switched on in Supabase: a button
 * that reliably returns an error is worse than no button, and the server
 * knows the answer before the page is sent.
 */

type Mode = "login" | "signup";
type Method = "password" | "code";
/* "form" is the email step, "code" is the six digits. Every route in, with a
   password or without one, finishes on the same code screen. */
type Stage = "form" | "code";

/* How long a code can be. Not a single fixed number, because Supabase does not
   issue a single fixed number: the length is a per project setting, and
   depending on when a project was created it sends six digits or eight. This
   field used to cut everything to six and submit on the sixth digit, so an
   eight digit code was truncated and rejected every time, on signup and login
   alike, while the email itself arrived perfectly. Accept the whole range and
   let Supabase decide what is valid. */
const CODE_MIN = 6;
const CODE_MAX = 10;
const RESEND_SECONDS = 30;

/* Supabase files the same six digits under different token types depending on
   how they were asked for, and a type that does not match comes back with the
   very same "token has expired or is invalid" as a genuinely dead code. There
   is no way to tell from the outside which one we are holding, so try each in
   turn. A failed attempt does not consume the token. */
const VERIFY_TYPES = ["email", "magiclink", "signup"] as const;

/* Whether a failure is worth retrying under the next type. A rate limit or a
   dropped connection will fail identically three times over, so only a token
   complaint earns another go. */
function looksLikeWrongType(err: unknown): boolean {
  const m = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  return m.includes("token") || m.includes("otp") || m.includes("expired");
}

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

  const [method, setMethod] = useState<Method>("code");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"" | "email" | "google" | "code">("");
  // A link arriving from the callback route carries its own failure.
  const [error, setError] = useState(params.get("error") ?? "");
  const [stage, setStage] = useState<Stage>("form");

  const isSignup = mode === "signup";

  /* Supabase hashes the token against the lowercased address, so "Eve@..." on
     the way out and "eve@..." on the way back do not match. Normalise once and
     use this everywhere rather than the raw field. */
  const address = email.trim().toLowerCase();

  /* Verifying twice with the same code is a way to fail while succeeding: the
     first call spends the token and signs you in, the second finds it spent
     and overwrites the screen with an error. A ref, not state, because two
     calls in the same tick would both read a stale state value. */
  const verifying = useRef(false);

  /* Asks Supabase to mail a code. Shared by the first send and by "resend",
     which is why it is not folded into the submit handler. */
  const sendCode = async () => {
    const supabase = supabaseBrowser();
    if (!supabase) {
      setError("Accounts are not configured on this environment yet.");
      return false;
    }
    const { error: err } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        // The same mail still carries a link. Someone who taps it instead of
        // typing the code should still land signed in.
        emailRedirectTo: authCallbackUrl(window.location.origin, next),
        // Signing in must not quietly create an account for a mistyped
        // address; signing up is exactly when it should.
        shouldCreateUser: isSignup,
        data: isSignup && name ? { full_name: name } : undefined,
      },
    });
    if (err) throw err;
    return true;
  };

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
      if (method === "code") {
        await sendCode();
        setCode("");
        setStage("code");
        return;
      }

      if (isSignup) {
        const { data, error: err } = await supabase.auth.signUp({
          email: address,
          password,
          options: {
            emailRedirectTo: authCallbackUrl(window.location.origin, next),
            data: name ? { full_name: name } : undefined,
          },
        });
        if (err) throw err;
        /* With email confirmation on, Supabase returns a user but no session,
           and sends the Confirm signup email. That email carries the same six
           digits as every other one, so this goes to the code screen rather
           than telling someone to look for a link that is no longer in it.
           verify() already tries the signup token type. */
        if (!data.session) {
          setCode("");
          setStage("code");
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

  /* Trading the six digits for a session. See VERIFY_TYPES for why this is a
     loop rather than a single call. */
  const verify = async (value: string) => {
    const supabase = supabaseBrowser();
    if (!supabase) return;
    if (verifying.current) return;
    verifying.current = true;

    setError("");
    setBusy("code");

    try {
      let failure: unknown = null;

      for (const type of VERIFY_TYPES) {
        const { error: err } = await supabase.auth.verifyOtp({
          email: address,
          token: value,
          type,
        });
        if (!err) {
          failure = null;
          break;
        }
        failure = err;
        if (!looksLikeWrongType(err)) break;
      }

      if (failure) throw failure;

      router.push(next);
      router.refresh(); // let the server re-read the session it just gained
      // Deliberately still held: the navigation is on its way, and releasing
      // here would let a stray re-entry fire against a spent token.
    } catch (err) {
      setError(friendly(err));
      setCode("");
      setBusy("");
      verifying.current = false;
    }
  };

  if (stage === "code") {
    return (
      <CodeStep
        email={email}
        code={code}
        busy={busy === "code"}
        error={error}
        onChange={(value) => {
          // Submit by itself only when the whole code lands in one go, which
          // is what a paste or the phone's one-time-code autofill does. While
          // someone is typing digit by digit there is no way to know which
          // keystroke is the last, so that case waits for Continue rather
          // than guessing and firing at six.
          const arrivedWhole = value.length - code.length >= CODE_MIN;
          setCode(value);
          setError("");
          if (arrivedWhole) void verify(value);
        }}
        onSubmit={() => {
          if (code.length >= CODE_MIN) void verify(code);
        }}
        onResend={async () => {
          setError("");
          try {
            await sendCode();
            setCode("");
          } catch (err) {
            setError(friendly(err));
          }
        }}
        onBack={() => {
          setStage("form");
          setCode("");
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
          ) : method === "code" ? (
            <Mail size={15} />
          ) : null}
          {method === "code"
            ? "Email me a code"
            : isSignup
              ? "Create my account"
              : "Log in"}
          {method === "password" && !busy && <ArrowRight size={15} />}
        </button>

        <button
          type="button"
          onClick={() => {
            setMethod(method === "password" ? "code" : "password");
            setError("");
          }}
          className="mt-3 w-full text-center text-xs font-medium text-[var(--color-ink-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:text-white"
        >
          {method === "password"
            ? "Email me a code instead, no password needed"
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

      {/* Terms nobody was shown are terms nobody agreed to. This is the line
          that makes the two documents apply to the account being created,
          and it is also where UK law wants the privacy notice: at the point
          the email address is collected, not buried in a footer. */}
      <p className="mt-4 text-center text-xs leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-[var(--color-ink)] dark:hover:text-white">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-[var(--color-ink)] dark:hover:text-white">
          Privacy Policy
        </Link>
        .
      </p>
    </motion.div>
  );
}

/* The six digit step.
 *
 * One input rather than six boxes. Six boxes are a nicer picture and a worse
 * form: paste lands in the first one, backspace behaves differently at every
 * boundary, and the browser's own code autofill, which is the fastest way
 * through this screen on a phone, targets a single field.
 *
 * The address is repeated back because a typo here is otherwise invisible,
 * the mail simply never arrives and the person blames us. */
function CodeStep({
  email,
  code,
  busy,
  error,
  onChange,
  onSubmit,
  onResend,
  onBack,
}: {
  email: string;
  code: string;
  busy: boolean;
  error: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onResend: () => Promise<void>;
  onBack: () => void;
}) {
  const [left, setLeft] = useState(RESEND_SECONDS);

  // One interval for the life of the screen. It counts to zero and sits
  // there, which is cheaper than tearing one down and building another
  // every second.
  useEffect(() => {
    const id = setInterval(() => {
      setLeft((n) => (n <= 0 ? 0 : n - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const resend = async () => {
    await onResend();
    setLeft(RESEND_SECONDS);
  };

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
      <h1 className="display-xs mt-5">Enter your code</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        We sent a sign in code to{" "}
        <span className="font-semibold text-[var(--color-ink)] dark:text-white">
          {email}
        </span>
        . It expires in about an hour.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="mt-6"
      >
        <label htmlFor="code" className="sr-only">
          Sign in code
        </label>
        <input
          id="code"
          value={code}
          onChange={(e) =>
            onChange(e.target.value.replace(/\D/g, "").slice(0, CODE_MAX))
          }
          disabled={busy}
          autoFocus
          inputMode="numeric"
          pattern="[0-9]*"
          /* The hint that lets iOS and Android offer the code straight from
             the notification, which skips the inbox entirely. */
          autoComplete="one-time-code"
          placeholder="Enter code"
          /* The placeholder drops the mono, the tracking and the size: a row
             of zeros promised a length we cannot know in advance. */
          className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-transparent px-4 py-3.5 text-center font-mono text-2xl font-bold tracking-[0.3em] indent-[0.3em] transition-colors placeholder:indent-0 placeholder:font-sans placeholder:text-base placeholder:font-medium placeholder:tracking-normal placeholder:text-[var(--color-ink-muted)]/60 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-white/12"
        />

        {error && <Notice tone="error">{error}</Notice>}

        <button
          type="submit"
          disabled={busy || code.length < CODE_MIN}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_-10px_rgba(249,115,22,0.8)] transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy ? "Checking" : "Continue"}
          {!busy && <ArrowRight size={15} />}
        </button>
      </form>

      <p className="mt-5 text-xs leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        Nothing after a minute or two? Check your spam folder.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => void resend()}
          disabled={left > 0 || busy}
          className="text-sm font-semibold text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-[var(--color-ink-muted)] disabled:no-underline dark:text-brand-400 dark:disabled:text-[var(--color-ink-dark-muted)]"
        >
          {left > 0 ? `Resend in ${left}s` : "Resend code"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-[var(--color-ink-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-ink)] dark:text-[var(--color-ink-dark-muted)] dark:hover:text-white"
        >
          Use a different email
        </button>
      </div>
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
  /* Supabase says "token has expired or is invalid" for a code that ran out,
     one already spent, and one replaced by a newer request. Saying "expired"
     alone sends people hunting for a clock problem they do not have. */
  if (m.includes("token has expired") || m.includes("otp_expired") ||
      (m.includes("invalid") && (m.includes("token") || m.includes("otp"))))
    return "That code did not work. It may have expired, or been replaced by a newer one. Send yourself a fresh code.";
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
