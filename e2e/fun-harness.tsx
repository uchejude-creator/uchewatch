// Isolated test UI. Actions run against the migration in PGlite via Playwright;
// BroadcastChannel replaces only the hosted realtime transport in this fixture.
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { FunCorner } from "../components/watch/fun/fun-corner";
import { FunOverlays } from "../components/watch/fun/overlays";
import { EMPTY_FUN, type FunState } from "../lib/fun/types";
const people = [
  {
    user_id: "11111111-1111-4111-8111-111111111111",
    display_name: "Alex",
    avatar_url: null,
  },
  {
    user_id: "22222222-2222-4222-8222-222222222222",
    display_name: "Sam",
    avatar_url: null,
  },
];
function Harness() {
  const userId =
    new URLSearchParams(location.search).get("user") || people[0].user_id;
  const [state, setState] = useState<FunState>(EMPTY_FUN),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const channel = new BroadcastChannel("fun-fixture");
    channel.onmessage = (e) => setState(e.data);
    return () => channel.close();
  }, []);
  const name = (id: string) =>
    state.aliases[id] ||
    people.find((p) => p.user_id === id)?.display_name ||
    "Your person";
  async function act(action: string, data: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/__test__/fun-api", {
        method: "POST",
        body: JSON.stringify({ action, data, userId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setState(result);
      const channel = new BroadcastChannel("fun-fixture");
      channel.postMessage(result);
      channel.close();
    } catch (e) {
      setError(String(e));
      throw e;
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      className={`room-page room-mood-${state.mood} ${state.night ? "night-mode" : ""}`}
      style={{ padding: 20 }}
    >
      <div className="watch-column" style={{ maxWidth: 800, margin: "auto" }}>
        <div className="player-frame">
          <div style={{ padding: 30 }}>Isolated date-night test screen</div>
          <FunOverlays
            state={state}
            offset={0}
            name={name}
            startsAt={state.round?.starts_at}
          />
        </div>
        <FunCorner
          state={state}
          act={act}
          busy={busy}
          loaded
          connected
          people={people}
          userId={userId}
          host={userId === people[0].user_id}
          name={name}
          error={error}
        />
      </div>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
