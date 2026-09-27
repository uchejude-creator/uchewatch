"use client";
import { useState } from "react";
import { Heart, ChevronDown, Sparkles } from "lucide-react";
import { LittleMoments, type RunFun } from "./little-moments";
import { Playlist } from "./playlist";
import { Games } from "./games";
import { Keepsakes } from "./keepsakes";
import type { FunAction, FunState } from "@/lib/fun/types";
import type { Participant } from "@/types/watch";
export function FunCorner({
  state,
  act,
  busy,
  loaded,
  error,
  connected,
  people,
  userId,
  host,
  name,
}: {
  state: FunState;
  act: FunAction;
  busy: boolean;
  loaded: boolean;
  error: string;
  connected: boolean;
  people: Participant[];
  userId: string;
  host: boolean;
  name: (id: string) => string;
}) {
  const [open, setOpen] = useState(false),
    [tab, setTab] = useState("moments"),
    [chosen, setChosen] = useState("");
  const others = people.filter((p) => p.user_id !== userId);
  const buddy = others.some((p) => p.user_id === chosen)
    ? chosen
    : others[0]?.user_id || "";
  const run: RunFun = async (action, data) => {
    try {
      await act(action, data);
      return true;
    } catch {
      return false; /* useFun renders the actionable error below. */
    }
  };
  const needAnswer =
    state.round?.users.includes(userId) &&
    !state.round.answers &&
    !state.round.submitted.includes(userId);
  return (
    <section className="fun-corner" aria-label="Our date-night corner">
      <div className="fun-corner-heading">
        <button
          type="button"
          className="fun-open"
          aria-expanded={open}
          aria-controls="date-night-corner"
          onClick={() => setOpen(!open)}
        >
          <span className="fun-heading-icon">
            <Sparkles size={20} />
          </span>
          <span>
            <strong>Our little extras</strong>
            <small>A little play. A lot of us.</small>
          </span>
          <ChevronDown size={18} />
        </button>
        <button
          type="button"
          className="button button-secondary button-small"
          disabled={
            !connected ||
            !loaded ||
            busy ||
            !buddy ||
            !!(
              state.round &&
              (!state.round.answers ||
                (state.round.kind === "bingo" && !state.round.winner))
            )
          }
          onClick={async () => {
            if (
              await run("round_start", {
                kind: "ready",
                other: buddy,
                text: "Ready to watch together?",
              })
            ) {
              setOpen(true);
              setTab("games");
            }
          }}
        >
          <Heart size={14} /> Ready, baby?
        </button>
      </div>
      {error && (
        <p className="error-notice" role="alert">
          {error}
        </p>
      )}
      {!loaded && (
        <p className="fun-help" role="status">
          Getting your little extras ready…
        </p>
      )}
      {needAnswer && (
        <button
          type="button"
          className="round-invitation"
          onClick={() => {
            setOpen(true);
            setTab("games");
          }}
        >
          💌 Your person started a little moment. Come join them →
        </button>
      )}
      {Object.entries(state.statuses)
        .filter(([, status]) => status === "snacks")
        .map(([id]) => (
          <p className="snack-status" role="status" key={id}>
            🍪 {name(id)} is getting snacks. Save their seat.
          </p>
        ))}
      {state.night && (
        <div className="goodnight-card">
          <span aria-hidden="true">🌙</span>
          <h3>Goodnight, favorite person.</h3>
          <p>The movie is paused. The lights are low.</p>
          {Object.entries(state.night.messages).map(([id, message]) => (
            <blockquote key={id}>
              <small>{name(id)}</small>
              <p>{message}</p>
            </blockquote>
          ))}
          <button
            type="button"
            className="button button-secondary"
            disabled={busy || !connected}
            onClick={() => void run("night_clear")}
          >
            Stay a little longer
          </button>
        </div>
      )}
      {open && (
        <div id="date-night-corner">
          <nav className="fun-tabs" aria-label="Date-night activities">
            {[
              ["moments", "Little moments"],
              ["playlist", "Up next"],
              ["games", "Play together"],
              ["keepsakes", "Keepsakes"],
            ].map(([id, label]) => (
              <button
                type="button"
                key={id}
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          {others.length > 1 && (
            <div className="fun-person">
              <label htmlFor="activity-person">
                For this two-person activity
              </label>
              <select
                id="activity-person"
                value={buddy}
                onChange={(e) => setChosen(e.target.value)}
              >
                {others.map((p) => (
                  <option value={p.user_id} key={p.user_id}>
                    {name(p.user_id)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <fieldset
            className="fun-content"
            disabled={!connected || !loaded || busy}
            aria-busy={busy}
          >
            <legend className="sr-only">Date-night controls</legend>
            {tab === "moments" && (
              <LittleMoments
                state={state}
                userId={userId}
                buddy={buddy}
                name={name}
                run={run}
              />
            )}
            {tab === "playlist" && (
              <Playlist
                state={state}
                userId={userId}
                host={host}
                name={name}
                run={run}
              />
            )}
            {tab === "games" && (
              <Games
                state={state}
                userId={userId}
                buddy={buddy}
                name={name}
                run={run}
              />
            )}
            {tab === "keepsakes" && (
              <Keepsakes
                state={state}
                userId={userId}
                buddy={buddy}
                name={name}
                host={host}
                run={run}
              />
            )}
          </fieldset>
          <p className="fun-connection" role="status">
            {!connected
              ? "Reconnecting. We’ll bring your shared moments back."
              : busy
                ? "Sending your little moment…"
                : "Private to this room. Made for the two of you."}
          </p>
        </div>
      )}
    </section>
  );
}
