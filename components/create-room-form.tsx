"use client";
import { useHydrated } from "@/hooks/use-hydrated";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, LoaderCircle, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { isConfigured } from "@/lib/supabase/config";
import { getSupabase } from "@/lib/supabase/client";
import { extractYouTubeId } from "@/lib/watch/youtube-url";
import { SetupNotice } from "./ui/setup-notice";
import { VideoField } from "./video-field";
export function CreateRoomForm() {
  const hydrated = useHydrated();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(isConfigured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const handleTitle = useCallback((value: string) => setVideoTitle(value), []);
  useEffect(() => {
    // The draft belongs to browser session storage and is restored after hydration.
    const restoreDraft = () => {
      const saved = sessionStorage.getItem("watch-draft");
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          setUrl(draft.url || "");
          setTitle(draft.title || "");
        } catch {
          sessionStorage.removeItem("watch-draft");
        }
      }
    };
    restoreDraft();
    if (!isConfigured) return;
    const supabase = getSupabase();
    supabase.auth
      .getUser()
      .then(({ data: { user } }: { data: { user: User | null } }) => {
        setAuthenticated(!!user && !user.is_anonymous);
        setChecking(false);
      })
      .catch((error: unknown) => {
        console.error("Session check failed", error);
        setChecking(false);
        setError("We couldn’t check your account. Refresh to try again.");
      });
  }, []);
  async function create(e: FormEvent) {
    e.preventDefault();
    const id = extractYouTubeId(url);
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const { data, error } = await getSupabase().rpc("create_watch_room", {
        p_title: title.trim() || videoTitle || "Our little movie night",
        p_video_id: id,
      });
      if (error) throw error;
      sessionStorage.removeItem("watch-draft");
      router.push(`/room/${data.id}`);
    } catch (error) {
      console.error("Create room failed", error);
      setError(
        "We couldn’t create your room. Make sure you’re signed in and try again.",
      );
      setBusy(false);
    }
  }
  function saveDraft() {
    sessionStorage.setItem("watch-draft", JSON.stringify({ url, title }));
  }
  return (
    <>
      {!isConfigured && <SetupNotice />}
      <form onSubmit={create}>
        <VideoField value={url} onChange={setUrl} onTitle={handleTitle} />
        <div className="field">
          <label htmlFor="room-title">
            Give the night a name <span className="muted">(optional)</span>
          </label>
          <input
            disabled={!hydrated}
            id="room-title"
            placeholder="Our little movie night"
            value={title}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        {error && (
          <p className="error-notice" role="alert">
            {error}
          </p>
        )}
        {isConfigured && !checking && !authenticated ? (
          <Link
            className="button button-primary full-width"
            href="/sign-in?next=/create"
            onClick={saveDraft}
          >
            Sign in to create your room <ArrowUpRight size={17} />
          </Link>
        ) : (
          <button
            className="button button-primary full-width"
            disabled={
              busy || checking || !isConfigured || !extractYouTubeId(url)
            }
          >
            {busy || checking ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <ArrowUpRight size={17} />
            )}{" "}
            {busy ? "Creating your little cinema…" : "Create Room"}
          </button>
        )}
        <div className="form-foot">
          <LockKeyhole
            size={12}
            style={{ display: "inline", marginRight: 5 }}
          />{" "}
          Private by default. Only people you invite can join.
        </div>
      </form>
    </>
  );
}
