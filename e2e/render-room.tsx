import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { WatchRoom } from "../components/watch/watch-room";
import type { WatchRoom as Room } from "../types/watch";
const room: Room = {
  id: "11111111-1111-4111-8111-111111111111",
  host_user_id: "host",
  title: "Our little movie night",
  room_code: "A42BC83D71",
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
const router = {
  bfcacheId: "test",
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch: async () => {},
  hmrRefresh() {},
};

process.stdout.write(
  renderToStaticMarkup(
    <AppRouterContext.Provider value={router}>
      <WatchRoom initialRoom={room} userId="host" />
    </AppRouterContext.Provider>,
  ),
);
