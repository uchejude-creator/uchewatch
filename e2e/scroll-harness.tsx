// Isolated layout fixture: actual player/layout, with the external YouTube API stubbed.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { WatchLayout } from "../components/watch/watch-layout";
import { VideoPlayer } from "../components/watch/video-player";
import { FunCorner } from "../components/watch/fun/fun-corner";
import { EMPTY_FUN } from "../lib/fun/types";
import type { WatchRoom } from "../types/watch";
const initial: WatchRoom = {
  id: "test",
  host_user_id: "a",
  title: "Scroll check",
  room_code: "TEST",
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
  const [room, setRoom] = useState(initial),
    [cinema, setCinema] = useState(false);
  return (
    <div className={`room-page ${cinema ? "cinema-mode" : ""}`}>
      <header className="room-header">Layout verification</header>
      <main className="room-main">
        <div className="room-topbar">
          <h1>Watch and play</h1>
        </div>
        <WatchLayout
          cinema={cinema}
          video={
            <VideoPlayer
              room={room}
              offset={0}
              connected
              reactions={[]}
              onCinema={() => setCinema(!cinema)}
              onPlayback={async (action, position) => {
                const next = {
                  ...room,
                  playback_position: position,
                  is_playing: action === "play",
                  last_action: action,
                  revision: room.revision + 1,
                  playback_updated_at: new Date().toISOString(),
                };
                setRoom(next);
                return next;
              }}
            />
          }
          info={
            <div className="room-video-info">Your movie stays with you.</div>
          }
          activities={
            <>
              <FunCorner
                state={EMPTY_FUN}
                act={async () => {}}
                busy={false}
                loaded
                error=""
                connected
                people={[]}
                userId="a"
                host
                name={() => "You"}
              />
              <div style={{ height: 650 }} />
              <label>
                Last game answer
                <input aria-label="Last game answer" />
              </label>
            </>
          }
          social={
            <aside className="social-panel">
              <h2>Conversation</h2>
            </aside>
          }
        />
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
