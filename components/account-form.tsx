"use client";
import { useHydrated } from "@/hooks/use-hydrated";
import { useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Avatar } from "./ui/avatar";
export function AccountForm({ initialName }: { initialName: string }) {
  const hydrated = useHydrated();
  const [name, setName] = useState(initialName);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const { error } = await getSupabase().rpc("update_display_name", {
        p_name: name.trim(),
      });
      if (error) throw error;
      setFeedback("Looking good. Your display name is saved.");
    } catch (error) {
      console.error("Profile save failed", error);
      setError("Your name couldn’t be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    const { error } = await getSupabase().auth.signOut();
    if (error) {
      setError("Sign-out failed. Please try again.");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Avatar name={name} />
      </div>
      <form onSubmit={save}>
        <div className="field">
          <label htmlFor="profile-name">Display name</label>
          <input
            disabled={!hydrated}
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            required
          />
        </div>
        <button
          className="button button-primary full-width"
          disabled={busy || !name.trim()}
        >
          Save your name
        </button>
      </form>
      {feedback && (
        <p role="status" className="notice success-notice">
          {feedback}
        </p>
      )}
      {error && (
        <p role="alert" className="error-notice">
          {error}
        </p>
      )}
      <button className="text-button" onClick={signOut} disabled={busy}>
        Sign out
      </button>
    </>
  );
}
