// Isolated browser fixture. This file is never an application route.
import React, { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { ReactionPicker } from "../components/watch/reaction-picker";
import type { Reaction } from "../types/watch";
import { VideoPlayer } from "../components/watch/video-player";
import { SocialPanel } from "../components/watch/social-panel";
import { InviteModal } from "../components/watch/invite-modal";
import type { WatchRoom, PlaybackAction, ChatMessage } from "../types/watch";
const initial: WatchRoom = {
  id: "11111111-1111-4111-8111-111111111111",
  host_user_id: "host",
  title: "Browser test",
  room_code: "42ABCD1234",
  video_provider: "youtube",
  video_id: "M7lc1UVf-VE",
  created_at: new Date().toISOString(),
  is_active: true,
  playback_position: 0,
  is_playing: false,
  playback_updated_at: new Date().toISOString(),
  revision: 0,
  last_actor_id: null,
  last_action: "pause",
};
function Harness() {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [room, setRoom] = useState(initial);
  const [commands, setCommands] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [fail, setFail] = useState(false);
  const [invite, setInvite] = useState(false);
  const playback = useCallback(
    async (action: PlaybackAction, position: number) => {
      const next = {
        ...room,
        is_playing:
          action === "play"
            ? true
            : action === "pause"
              ? false
              : room.is_playing,
        playback_position: position,
        playback_updated_at: new Date().toISOString(),
        revision: room.revision + 1,
        last_action: action,
      };
      setCommands((n) => n + 1);
      setRoom(next);
      return next;
    },
    [room],
  );
  return (
    <main>
      <ReactionPicker
        connected
        onReact={async (emoji) => {
          setReactions((r) => [
            ...r,
            { id: crypto.randomUUID(), emoji, user_id: "host" },
          ]);
        }}
      />
      <button
        onClick={() =>
          setRoom((r) => ({
            ...r,
            is_playing: true,
            playback_updated_at: new Date(Date.now() + 1800).toISOString(),
            revision: r.revision + 1,
          }))
        }
      >
        Schedule shared start
      </button>
      <h1>Isolated component test — no live backend</h1>
      <output aria-label="Playback command count">{commands}</output>
      <button
        onClick={() =>
          setRoom((r) => ({
            ...r,
            playback_position: 42,
            playback_updated_at: new Date().toISOString(),
            revision: r.revision + 1,
          }))
        }
      >
        Simulate remote seek
      </button>
      <button onClick={() => setInvite(true)}>Open invitation</button>
      <label>
        <input
          type="checkbox"
          checked={fail}
          onChange={(e) => setFail(e.target.checked)}
        />{" "}
        Simulate send failure
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {["Host", "Guest"].map((name) => (
          <section aria-label={`${name} player`} key={name}>
            <VideoPlayer
              room={room}
              offset={0}
              connected
              reactions={reactions}
              onPlayback={playback}
              onCinema={() => {}}
            />
          </section>
        ))}
      </div>
      <SocialPanel
        messages={messages}
        people={[{ user_id: "host", display_name: "Host", avatar_url: null }]}
        userId="host"
        hostId="host"
        connected
        onSend={async (message, id) => {
          if (fail)
            throw new Error("Your message wasn’t sent. Please try again.");
          setMessages((m) => [
            ...m,
            {
              id,
              room_id: room.id,
              user_id: "host",
              display_name: "Host",
              message,
              created_at: new Date().toISOString(),
            },
          ]);
        }}
      />
      {invite && (
        <InviteModal
          id={room.id}
          code={room.room_code}
          onClose={() => setInvite(false)}
        />
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
