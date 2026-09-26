"use client";
import { useEffect, useRef, useState } from "react";
import type { FunState } from "@/lib/fun/types";
export type RunFun = (
  action: string,
  data?: Record<string, unknown>,
) => Promise<boolean>;
export function LittleMoments({
  state,
  userId,
  buddy,
  name,
  run,
}: {
  state: FunState;
  userId: string;
  buddy: string;
  name: (id: string) => string;
  run: RunFun;
}) {
  const [note, setNote] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sent = useRef(false);
  const [holding, setHolding] = useState(false);
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <div className="fun-stack">
      <div className="fun-quick-grid">
        <button
          type="button"
          className={`fun-tile burst-trigger ${holding ? "holding" : ""}`}
          aria-label="Send a love burst"
          onPointerDown={() => {
            sent.current = false;
            setHolding(true);
            timer.current = setTimeout(() => {
              sent.current = true;
              setHolding(false);
              void run("burst");
            }, 600);
          }}
          onPointerUp={cancel}
          onPointerCancel={cancel}
          onPointerLeave={cancel}
          onClick={() => {
            if (!sent.current) void run("burst");
            sent.current = false;
          }}
        >
          <span>💖</span>
          <strong>Love burst</strong>
          <small>Tap or hold for a shower of hearts</small>
        </button>
        <button
          type="button"
          className="fun-tile"
          disabled={!buddy}
          onClick={() => void run("kiss", { other: buddy })}
        >
          <span>💋</span>
          <strong>A kiss for you</strong>
          <small>
            {buddy
              ? `Across the screen to ${name(buddy)}`
              : "Your person’s seat is waiting"}
          </small>
        </button>
        <button
          type="button"
          className="fun-tile"
          onClick={() =>
            void run("status", {
              text: state.statuses[userId] === "snacks" ? "here" : "snacks",
            })
          }
        >
          <span>{state.statuses[userId] === "snacks" ? "👋" : "🍪"}</span>
          <strong>
            {state.statuses[userId] === "snacks" ? "I’m back" : "Snack break"}
          </strong>
          <small>Let your person know</small>
        </button>
        <button
          type="button"
          className="fun-tile popcorn-bucket"
          onClick={() => void run("popcorn")}
        >
          <span>🍿</span>
          <strong>Steal some popcorn</strong>
          <small>
            {Object.values(state.popcorn).reduce((a, b) => a + b, 0)} little
            handfuls together
          </small>
        </button>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run("note", { text: note })) setNote("");
        }}
        className="fun-inline-form"
      >
        <label htmlFor="love-note">A little note on their screen</label>
        <input
          id="love-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Wish I could steal your blanket right now…"
          maxLength={180}
          required
        />
        <button className="button button-secondary" disabled={!note.trim()}>
          Send a little love
        </button>
      </form>
      <div>
        <h3 className="fun-label">Set our mood</h3>
        <div className="mood-options">
          {(["rose", "midnight", "violet"] as const).map((mood) => (
            <button
              key={mood}
              type="button"
              aria-pressed={state.mood === mood}
              className={`mood-choice mood-${mood}`}
              onClick={() => void run("mood", { text: mood })}
            >
              <i />
              {mood}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
