"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Link2,
  LockKeyhole,
  Maximize2,
  MessageCircle,
  Minimize2,
  Radio,
  WifiOff,
  X,
} from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { Modal } from "@/components/ui/modal";
import { ReactionPicker } from "./reaction-picker";
import { VideoPlayer } from "./video-player";
import { SocialPanel } from "./social-panel";
import { InviteModal } from "./invite-modal";
import { ChangeVideoModal } from "./change-video-modal";
import { useFun } from "@/hooks/use-fun";
import { FunCorner } from "./fun/fun-corner";
import { FunOverlays } from "./fun/overlays";
import { useRoom } from "@/hooks/use-room";
import { getSupabase } from "@/lib/supabase/client";
import { type WatchRoom as Room } from "@/types/watch";
export function WatchRoom({
  initialRoom,
  userId,
}: {
  initialRoom: Room;
  userId: string;
}) {
  const router = useRouter();
  const state = useRoom(initialRoom, userId);
  const [invite, setInvite] = useState(false);
  const [change, setChange] = useState(false);
  const [cinema, setCinema] = useState(false);
  const [chat, setChat] = useState(false);
  const [end, setEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState("");
  const connected = state.connection === "connected";
  const host = state.room.host_user_id === userId;
  const fun = useFun(initialRoom.id, connected);
  const personName = (id: string) =>
    fun.state.aliases[id] ||
    state.people.find((p) => p.user_id === id)?.display_name ||
    (id === userId ? "You" : "Your person");
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCinema(false);
        setChat(false);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  async function endRoom() {
    setEnding(true);
    const { error } = await getSupabase().rpc("end_watch_room", {
      p_room_id: state.room.id,
    });
    if (error) {
      console.error("End room failed", error);
      setEndError("The room couldn’t be closed. Please try again.");
      setEnding(false);
    } else router.push("/");
  }
  if (!state.room.is_active)
    return (
      <div className="form-page">
        <Brand />
        <main id="main-content" className="form-card glass">
          <div className="form-icon">
            <Heart />
          </div>
          <h1>Until the next movie night.</h1>
          <p>
            The host has closed this room. The good memories are yours to keep.
          </p>
          <Link href="/create" className="button button-primary full-width">
            Plan another night
          </Link>
        </main>
      </div>
    );
  return (
    <div
      className={`room-page room-mood-${fun.state.mood} ${fun.state.night ? "night-mode" : ""} ${cinema ? "cinema-mode" : ""} ${chat ? "chat-open" : ""}`}
    >
      <header className="room-header">
        <Brand />
        <div className="room-header-right">
          <Link href="/account">Your profile</Link>
          <Link className="button button-secondary button-small" href="/">
            <ArrowLeft size={14} /> Leave room
          </Link>
        </div>
      </header>
      {!connected && (
        <div className="connection-banner" role="status">
          {state.connection === "offline" ? (
            <WifiOff size={16} />
          ) : (
            <Radio size={16} />
          )}{" "}
          {state.connection === "offline"
            ? "You’re offline. We’ll reconnect when you’re back."
            : state.connection === "connecting"
              ? "Connecting your little cinema…"
              : "Reconnecting… we’ll bring you back to the same moment."}
        </div>
      )}
      <main id="main-content" className="room-main">
        <div className="room-topbar">
          <div className="room-title">
            <span>
              <LockKeyhole size={11} /> YOUR PRIVATE CINEMA
            </span>
            <h1>{state.room.title}</h1>
          </div>
          <div className="room-controls">
            <span className={`sync-pill ${connected ? "" : "syncing"}`}>
              <span className="status-dot" />
              {connected ? "Together, live" : "Connecting…"}
            </span>
            <button
              className="icon-button"
              onClick={() => setCinema(!cinema)}
              aria-label={cinema ? "Exit cinema mode" : "Enter cinema mode"}
            >
              {cinema ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              className="button button-primary button-small"
              onClick={() => setInvite(true)}
            >
              <Link2 size={16} /> Invite
            </button>
          </div>
        </div>
        {state.error && (
          <div className="error-notice" role="alert">
            <span style={{ flex: 1 }}>{state.error}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={state.clearError}
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="room-layout">
          <div className="watch-column">
            <VideoPlayer
              key={state.room.video_id}
              room={state.room}
              offset={state.offset}
              connected={connected}
              reactions={state.reactions}
              onPlayback={state.playback}
              onCinema={() => setCinema(!cinema)}
              overlay={
                <FunOverlays
                  state={fun.state}
                  offset={state.offset}
                  name={personName}
                  startsAt={
                    state.room.is_playing
                      ? state.room.playback_updated_at
                      : undefined
                  }
                />
              }
            />
            <div className="room-video-info">
              <div>
                <h2>The same screen. A little closer.</h2>
                <p>YouTube · Everyone can play, pause, and seek.</p>
              </div>
              {host && (
                <button className="text-button" onClick={() => setChange(true)}>
                  Change video ↗
                </button>
              )}
            </div>
            <ReactionPicker connected={connected} onReact={state.react} />
            <FunCorner
              state={fun.state}
              act={fun.act}
              busy={fun.busy}
              loaded={fun.loaded}
              error={fun.error}
              connected={connected}
              people={state.people}
              userId={userId}
              host={host}
              name={personName}
            />
            {connected && state.people.length < 2 && (
              <div className="waiting-card">
                <Heart size={23} />
                <div>
                  <h3>Waiting for your person…</h3>
                  <p>Share an invitation. Their seat is ready when they are.</p>
                </div>
                <button className="text-button" onClick={() => setInvite(true)}>
                  Send an invite →
                </button>
              </div>
            )}
            <div className="room-footer-note">
              <LockKeyhole size={11} /> A private space for shared moments.
              {host && (
                <button
                  className="text-button"
                  style={{ marginLeft: "auto", fontSize: 10 }}
                  onClick={() => setEnd(true)}
                >
                  End room
                </button>
              )}
            </div>
          </div>
          <SocialPanel
            messages={state.messages.map((m) => ({
              ...m,
              display_name: fun.state.aliases[m.user_id] || m.display_name,
            }))}
            people={state.people.map((p) => ({
              ...p,
              display_name:
                personName(p.user_id) +
                (fun.state.statuses[p.user_id] === "snacks"
                  ? " · 🍪 snack break"
                  : ""),
            }))}
            userId={userId}
            hostId={state.room.host_user_id}
            connected={connected}
            onSend={state.sendMessage}
          />
        </div>
      </main>
      {cinema && (
        <button
          className="icon-button cinema-chat-toggle"
          aria-label={chat ? "Hide chat" : "Show chat"}
          onClick={() => setChat(!chat)}
        >
          {chat ? <X size={20} /> : <MessageCircle size={20} />}
        </button>
      )}
      {invite && (
        <InviteModal
          id={state.room.id}
          code={state.room.room_code}
          onClose={() => setInvite(false)}
        />
      )}{" "}
      {change && (
        <ChangeVideoModal
          onClose={() => setChange(false)}
          onChange={(id) => state.playback("video", 0, id)}
        />
      )}{" "}
      {end && (
        <Modal title="Call it a night?" onClose={() => setEnd(false)}>
          <p>
            This closes the room for everyone. You can always start another
            movie night.
          </p>
          {endError && (
            <p role="alert" className="error-notice">
              {endError}
            </p>
          )}
          <button
            className="button button-danger full-width"
            onClick={endRoom}
            disabled={ending}
          >
            {ending ? "Closing the room…" : "End this watch party"}
          </button>
        </Modal>
      )}
    </div>
  );
}
