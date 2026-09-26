"use client";
import { useHydrated } from "@/hooks/use-hydrated";
import { useState, type FormEvent } from "react";
import { ArrowRight, Mail, Check, LoaderCircle } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { isConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "./ui/setup-notice";
export function AuthForm({
  next,
  callbackError,
}: {
  next: string;
  callbackError: boolean;
}) {
  const hydrated = useHydrated();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(
    callbackError
      ? "That sign-in link has expired or could not be verified. Please request a new one."
      : "",
  );
  async function submit(e: FormEvent) {
    e.preventDefault();
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
    } catch (error) {
      console.error("Magic link request failed", error);
      setError(
        "We couldn’t send your sign-in link. Check your email address and try again in a moment.",
      );
    } finally {
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
        <div className="notice success-notice" role="status">
          <Check size={22} />
          <div>
            <strong>Check your inbox.</strong>
            <p>
              We sent a sign-in link to {email}. Open it in this browser to
              finish signing in.
            </p>
            <button className="text-button" onClick={() => setSent(false)}>
              Use a different email
            </button>
          </div>
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
            disabled={busy || !isConfigured || !name.trim()}
            className="button button-primary full-width"
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Mail size={17} />
            )}{" "}
            Send me a sign-in link <ArrowRight size={17} />
          </button>
          <p className="form-foot">
            No password to remember. Just a little magic.
          </p>
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
