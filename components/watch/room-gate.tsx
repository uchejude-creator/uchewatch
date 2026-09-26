"use client";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import Link from "next/link";
import { isConfigured } from "@/lib/supabase/config";
import { getSupabase } from "@/lib/supabase/client";
import { Brand } from "@/components/ui/brand";
import { JoinRoomForm } from "@/components/join-room-form";
import { WatchRoom } from "./watch-room";
import type { WatchRoom as Room } from "@/types/watch";
export function RoomGate({ id }: { id: string }) {
  const [checking, setChecking] = useState(isConfigured);
  const [room, setRoom] = useState<Room | null>(null);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!isConfigured) return;
    let active = true;
    async function check() {
      try {
        const supabase = getSupabase();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError && authError.name !== "AuthSessionMissingError")
          throw authError;
        if (!user) return;
        const { data, error } = await supabase
          .from("watch_rooms")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (active) {
          setRoom(data);
          setUserId(user.id);
        }
      } catch (error) {
        console.error("Room access check failed", error);
        if (active)
          setError(
            "We couldn’t open this invitation. Check your connection and try again.",
          );
      } finally {
        if (active) setChecking(false);
      }
    }
    void check();
    return () => {
      active = false;
    };
  }, [id, attempt]);
  if (checking)
    return (
      <main id="main-content" className="loading-screen">
        <span className="loading-orbit" />
        <p>Finding your seat…</p>
      </main>
    );
  if (room) return <WatchRoom initialRoom={room} userId={userId} />;
  return (
    <div className="form-page">
      <Brand />
      <main id="main-content" className="form-card glass">
        <div className="form-icon">
          <Heart size={25} />
        </div>
        <span className="overline">SOMEONE SAVED YOU A SEAT</span>
        <h1>
          You’re invited to
          <br />
          watch together.
        </h1>
        <p>Get comfortable. Good company is just one tap away.</p>
        {error ? (
          <>
            <p className="error-notice" role="alert">
              {error}
            </p>
            <button
              className="button button-secondary full-width"
              onClick={() => {
                setError("");
                setChecking(true);
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </button>
          </>
        ) : (
          <JoinRoomForm
            invitation={id}
            onJoined={() => {
              setChecking(true);
              setAttempt((n) => n + 1);
            }}
          />
        )}
        <div className="form-foot">
          Wrong invitation? <Link href="/join">Enter a room code</Link>
        </div>
      </main>
    </div>
  );
}
