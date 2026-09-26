"use client";
import { useState } from "react";
import { brand } from "@/lib/brand";
import { formatTime } from "@/lib/watch/youtube-url";
import { ticketSvg } from "@/lib/fun/ticket";
import type { FunState } from "@/lib/fun/types";
import type { RunFun } from "./little-moments";
export function Keepsakes({
  state,
  userId,
  buddy,
  name,
  host,
  run,
}: {
  state: FunState;
  userId: string;
  buddy: string;
  name: (id: string) => string;
  host: boolean;
  run: RunFun;
}) {
  const [nickname, setNickname] = useState(""),
    [moment, setMoment] = useState(""),
    [title, setTitle] = useState(""),
    [names, setNames] = useState(""),
    [date, setDate] = useState(""),
    [note, setNote] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  async function shareTicket() {
    if (!state.ticket) return;
    try {
      const details = {
        title: state.ticket.title,
        text: `${state.ticket.names} — ${new Date(state.ticket.at).toLocaleString()}. ${state.ticket.note}`,
        url: `${location.origin}${location.pathname}`,
      };
      if (navigator.share) {
        await navigator.share(details);
        setShareStatus("");
      } else {
        await navigator.clipboard.writeText(`${details.text} ${details.url}`);
        setShareStatus("Your invitation is copied.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus(
        "Sharing didn’t open. Use the room’s Invite button to copy its link.",
      );
    }
  }
  function download() {
    if (!state.ticket) return;
    const url = URL.createObjectURL(
      new Blob([ticketSvg(state.ticket, brand.name)], {
        type: "image/svg+xml",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "our-movie-night.svg";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  return (
    <div className="fun-stack">
      <form
        className="fun-inline-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run("nickname", { other: buddy, text: nickname }))
            setNickname("");
        }}
      >
        <label htmlFor="pet-name">
          A room-only pet name for {buddy ? name(buddy) : "your person"}
        </label>
        <input
          id="pet-name"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={32}
          placeholder="My favorite human"
          required
        />
        <button
          className="button button-secondary"
          disabled={!buddy || !nickname.trim()}
        >
          Save their little name
        </button>
      </form>
      <section>
        <h3 className="fun-label">Our favorite moments</h3>
        <form
          className="fun-inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run("moment", { text: moment })) setMoment("");
          }}
        >
          <label htmlFor="moment-note">Bookmark this moment in the video</label>
          <input
            id="moment-note"
            value={moment}
            onChange={(e) => setMoment(e.target.value)}
            maxLength={120}
            placeholder="The bit that made us both laugh"
            required
          />
          <button className="button button-secondary" disabled={!moment.trim()}>
            Save this moment
          </button>
        </form>
        {state.moments.length ? (
          state.moments.map((m) => (
            <article key={m.id} className="saved-moment">
              <div>
                <strong>{m.text}</strong>
                <small>
                  {formatTime(m.position)} · saved by {name(m.by)}
                </small>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => void run("moment_play", { id: m.id })}
              >
                Revisit
              </button>
              {(m.by === userId || host) && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void run("moment_remove", { id: m.id })}
                >
                  Remove
                </button>
              )}
            </article>
          ))
        ) : (
          <p className="fun-help">
            Your timestamp and note will stay with this room.
          </p>
        )}
      </section>
      <section>
        <h3 className="fun-label">Our date-night ticket</h3>
        {state.ticket && (
          <>
            <article className="date-ticket">
              <span>ADMIT TWO · {brand.name}</span>
              <h3>{state.ticket.names}</h3>
              <p>{state.ticket.title}</p>
              <time dateTime={state.ticket.at}>
                {new Date(state.ticket.at).toLocaleString()}
              </time>
              <p>{state.ticket.note}</p>
              <small>One screen. Two favorite people.</small>
            </article>
            <button type="button" className="text-button" onClick={download}>
              Download our ticket
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => void shareTicket()}
            >
              Share our invitation
            </button>
            {shareStatus && (
              <p className="fun-help" role="status">
                {shareStatus}
              </p>
            )}
          </>
        )}
        <form
          className="fun-form"
          onSubmit={async (e) => {
            e.preventDefault();
            await run("ticket", {
              text: title,
              names,
              at: new Date(date).toISOString(),
              note,
            });
          }}
        >
          <label htmlFor="ticket-names">Your names</label>
          <input
            id="ticket-names"
            value={names}
            onChange={(e) => setNames(e.target.value)}
            maxLength={100}
            placeholder="You + your favorite person"
            required
          />
          <label htmlFor="ticket-title">Tonight’s title</label>
          <input
            id="ticket-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="Our cozy Friday night"
            required
          />
          <label htmlFor="ticket-date">Date and time (your local time)</label>
          <input
            id="ticket-date"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <label htmlFor="ticket-note">A little invitation</label>
          <input
            id="ticket-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={180}
            placeholder="Bring your blanket. I’ll bring the terrible jokes."
          />
          <button className="button button-primary">Make our ticket</button>
        </form>
      </section>
    </div>
  );
}
