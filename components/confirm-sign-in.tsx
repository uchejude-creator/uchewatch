"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import { isConfigured } from "@/lib/supabase/config";
import { authErrorMessage } from "@/lib/auth/errors";
import { useHydrated } from "@/hooks/use-hydrated";
export function ConfirmSignIn() {
  const hydrated = useHydrated();
  return hydrated ? <ReadyConfirmation /> : <p role="status">Preparing your sign-in…</p>;
}
function ReadyConfirmation() {
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get("token_hash") || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    // The fragment never reaches our server. Remove it from browser history too.
    history.replaceState(null, "", location.pathname);
  }, []);
  async function confirm() {
    if (!token || busy) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await getSupabase().auth.verifyOtp({
        token_hash: token,
        type: "email",
      });
      if (error) throw error;
      location.replace("/create");
    } catch (error) {
      setError(authErrorMessage(error, true));
      setBusy(false);
    }
  }
  return (
    <>
      <p>
        One more tap and you’re in. Continue only if you requested this sign-in
        email.
      </p>
      {!token ? (
        <p role="alert" className="error-notice">
          This link is missing its sign-in details. Request a fresh email, or
          enter its code on the sign-in page.
        </p>
      ) : (
        <button
          className="button button-primary full-width"
          disabled={!isConfigured || busy}
          onClick={confirm}
        >
          {busy ? "Signing you in…" : "Continue to your cinema"}
        </button>
      )}
      {error && (
        <p className="error-notice" role="alert">
          {error}
        </p>
      )}
      <p className="form-foot">
        Links work once. You’ll stay signed in on this browser after continuing.
      </p>
      <Link className="text-button" href="/sign-in">
        Request a fresh email or use a code
      </Link>
    </>
  );
}
