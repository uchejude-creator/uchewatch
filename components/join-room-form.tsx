"use client";
import { useHydrated } from "@/hooks/use-hydrated";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { isConfigured } from "@/lib/supabase/config";
import { getSupabase } from "@/lib/supabase/client";
import { SetupNotice } from "./ui/setup-notice";
export function JoinRoomForm({
  invitation,
  onJoined,
}: {
  invitation?: string;
  onJoined?: () => void;
}) {
  const hydrated = useHydrated();
  const [code, setCode] = useState(invitation || "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function join(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const supabase = getSupabase();
      let {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        const { data, error } = await supabase.auth.signInAnonymously({
          options: { data: { display_name: name.trim() } },
        });
        if (error) throw error;
        user = data.user;
      }
      if (!user) throw new Error("No guest session");
      const { data, error } = await supabase.rpc("join_watch_room", {
        p_invite: code.trim(),
        p_display_name: name.trim(),
      });
      if (error) throw error;
      if (!data) {
        setError(
          "We couldn’t find that room. Check the invitation, or try again in a minute if you’ve made several attempts.",
        );
        return;
      }
      if (onJoined) onJoined();
      else router.push(`/room/${data.id}`);
    } catch (error) {
      console.error("Joining room failed", error);
      setError(
        "We couldn’t join right now. Check your connection and try again. Guest access must be enabled by the room’s app owner.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!isConfigured && <SetupNotice />}
      <form onSubmit={join}>
        {!invitation && (
          <div className="field">
            <label htmlFor="room-code">Room code or invitation link</label>
            <input
              disabled={!hydrated}
              id="room-code"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="e.g. NIGHT8AB"
              value={code}
              maxLength={200}
              required
              onChange={(e) => {
                const value = e.target.value;
                try {
                  setCode(
                    new URL(value).pathname.split("/").filter(Boolean).pop() ||
                      value,
                  );
                } catch {
                  setCode(value);
                }
              }}
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="guest-name">Your display name</label>
          <input
            disabled={!hydrated}
            id="guest-name"
            placeholder="What should we call you?"
            autoComplete="nickname"
            value={name}
            maxLength={32}
            required
            onChange={(e) => setName(e.target.value)}
          />
          <small>No account needed. Just bring yourself.</small>
        </div>
        {error && (
          <div className="error-notice" role="alert">
            {error}
          </div>
        )}
        <button
          className="button button-primary full-width"
          disabled={busy || !isConfigured || !name.trim() || !code.trim()}
        >
          {busy ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <ArrowRight size={17} />
          )}{" "}
          {busy ? "Saving your seat…" : "Join Watch Party"}
        </button>
      </form>
    </>
  );
}
