"use client";
import { useHydrated } from "@/hooks/use-hydrated";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Mail, Check, LoaderCircle } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { isConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "./ui/setup-notice";
import { authErrorMessage } from "@/lib/auth/errors";
export function AuthForm({
  next,
  callbackError,
}: {
  next: string;
  callbackError: boolean;
}) {
  const hydrated = useHydrated();
  const codesEnabled = process.env.NEXT_PUBLIC_EMAIL_CODES_ENABLED === "true";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState("");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(
      () => setCooldown((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  const [error, setError] = useState(
    callbackError
      ? "That sign-in link has expired or could not be verified. Please request a new one."
      : "",
  );
  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (busy || cooldown) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await getSupabase().auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: { display_name: name.trim() },
        },
      });
      if (error) throw error;
      setSent(true);
      setToken("");
      setCooldown(60);
    } catch (error) {
      setError(authErrorMessage(error));
      setCooldown(60);
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await getSupabase().auth.verifyOtp({
        email: email.trim(),
        token: token.replace(/\s/g, ""),
        type: "email",
      });
      if (error) throw error;
      location.assign(next);
    } catch (error) {
      setError(authErrorMessage(error, true));
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    setError("");
    try {
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Google sign-in failed", error);
      setError(
        "Google sign-in isn’t available right now. Please use an email link.",
      );
      setBusy(false);
    }
  }
  return (
    <>
      {!isConfigured && <SetupNotice />}
      {sent ? (
        <div>
          <div className="notice success-notice" role="status">
            <Check size={22} />
            <div>
              <strong>Check your inbox.</strong>
              <p>
                We sent a sign-in email to {email}. Open the latest link in this
                browser to finish signing in.
                {codesEnabled && " You can also enter the code from your email below."}
              </p>
            </div>
          </div>
          {codesEnabled && <form onSubmit={verify}>
            <div className="field">
              <label htmlFor="sign-in-code">Email code</label>
              <input
                id="sign-in-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,10}"
                maxLength={10}
                placeholder="Your email code"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\s/g, ""))}
                required
                disabled={busy}
              />
            </div>
            <button
              className="button button-primary full-width"
              disabled={busy || !/^[0-9]{6,10}$/.test(token)}
            >
              {busy ? "Signing you in…" : "Sign in with code"}
            </button>
          </form>}
          <p className="form-foot">
            Sign in once and we’ll remember you on this browser. Next time,
            open UcheWatch directly—there’s no need to reuse the email link.
          </p>
          <button
            type="button"
            className="text-button"
            disabled={busy || cooldown > 0}
            onClick={() => void submit()}
          >
            {cooldown
              ? `Send another email in ${cooldown}s`
              : "Send a fresh email"}
          </button>
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setToken("");
              setError("");
            }}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="display-name">What should we call you?</label>
            <input
              disabled={!hydrated}
              id="display-name"
              autoComplete="nickname"
              placeholder="Your first name"
              required
              minLength={1}
              maxLength={32}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              disabled={!hydrated}
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button
            disabled={busy || cooldown > 0 || !isConfigured || !name.trim()}
            className="button button-primary full-width"
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Mail size={17} />
            )}{" "}
            {cooldown ? `Try again in ${cooldown}s` : "Send me a sign-in email"}{" "}
            <ArrowRight size={17} />
          </button>
          <p className="form-foot">
            One account. Sign in once and stay signed in on this browser.
          </p>
          {codesEnabled && <button
            type="button"
            className="text-button"
            disabled={busy || !email.trim() || !isConfigured}
            onClick={() => {
              setSent(true);
              setError("");
            }}
          >
            I already have an email code
          </button>}
        </form>
      )}
      {error && (
        <p role="alert" className="error-notice">
          {error}
        </p>
      )}
      {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && (
        <>
          <div className="form-divider">or settle in with</div>
          <button
            className="button button-secondary full-width"
            onClick={google}
            disabled={busy || !isConfigured}
          >
            Continue with Google
          </button>
        </>
      )}
    </>
  );
}
