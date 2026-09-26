"use client";
import { useState } from "react";
import { extractYouTubeId } from "@/lib/watch/youtube-url";
import type { FunState, Pick } from "@/lib/fun/types";
import type { RunFun } from "./little-moments";
export function Playlist({
  state,
  userId,
  host,
  name,
  run,
}: {
  state: FunState;
  userId: string;
  host: boolean;
  name: (id: string) => string;
  run: RunFun;
}) {
  const [url, setUrl] = useState(""),
    [title, setTitle] = useState(""),
    [note, setNote] = useState(""),
    [surprise, setSurprise] = useState(false),
    [song, setSong] = useState(false);
  const id = extractYouTubeId(url);
  function pick(item: Pick, isSong = false) {
    const hidden = item.surprise && item.by !== userId;
    return (
      <article className="playlist-pick" key={item.id}>
        <div className="pick-art" aria-hidden="true">
          {hidden ? "🎁" : isSong ? "🎶" : "▶"}
        </div>
        <div className="pick-copy">
          <strong>{hidden ? "A surprise, just for you" : item.title}</strong>
          <small>
            Chosen by {name(item.by)}
            {item.surprise ? " · unrevealed" : ""}
          </small>
          {item.note && !hidden && <p>“{item.note}”</p>}
        </div>
        <div className="pick-actions">
          {host && (
            <button
              type="button"
              className="text-button"
              onClick={() =>
                void run(isSong ? "song_play" : "queue_play", { id: item.id })
              }
            >
              {hidden ? "Reveal & load" : "Load together"}
            </button>
          )}
          {!isSong && (host || item.by === userId) && (
            <>
              {item.surprise && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void run("queue_reveal", { id: item.id })}
                >
                  Reveal title
                </button>
              )}
              <button
                type="button"
                className="text-button"
                aria-label={`Remove ${hidden ? "surprise pick" : item.title}`}
                onClick={() => void run("queue_remove", { id: item.id })}
              >
                Remove
              </button>
            </>
          )}
        </div>
      </article>
    );
  }
  return (
    <div className="fun-stack">
      {state.picked && (
        <div className="fun-notice">
          <span>ON OUR SCREEN</span>
          <strong>{state.picked.title}</strong>
          {state.picked.note && (
            <p>
              “{state.picked.note}” — {name(state.picked.by)}
            </p>
          )}
        </div>
      )}
      {state.song && (
        <section>
          <h3 className="fun-label">Our song</h3>
          {pick(state.song, true)}
        </section>
      )}
      <div className="fun-section-heading">
        <div>
          <h3>Our playlist</h3>
          <p>Take turns choosing something for each other.</p>
        </div>
        <button
          type="button"
          className="button button-secondary button-small"
          disabled={!host || state.queue.length === 0}
          onClick={() => void run("random")}
        >
          🎲 Pick for us
        </button>
      </div>
      {!host && (
        <p className="fun-help">
          Both of you can add picks. The host loads the next video, paused and
          ready.
        </p>
      )}
      {state.queue.length ? (
        state.queue.map((item) => pick(item))
      ) : (
        <div className="fun-empty">
          A song, a silly clip, a little adventure.
          <br />
          Your next shared moment goes here.
        </div>
      )}
      <form
        className="fun-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            id &&
            (await run(song ? "song" : "queue_add", {
              id,
              text: title,
              note,
              surprise: song ? false : surprise,
            }))
          ) {
            setUrl("");
            setTitle("");
            setNote("");
          }
        }}
      >
        <label htmlFor="pick-url">YouTube link</label>
        <input
          id="pick-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube link"
          required
        />
        {url && !id && (
          <small className="error-notice">
            Use a valid YouTube video link.
          </small>
        )}
        <label htmlFor="pick-title">Give your pick a name</label>
        <input
          id="pick-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="This song always makes me think of you"
          required
        />
        <label htmlFor="pick-note">
          This reminded me of you… <span>(optional)</span>
        </label>
        <input
          id="pick-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={180}
          placeholder="A little dedication"
        />
        <label className="fun-check">
          <input
            type="checkbox"
            checked={song}
            onChange={(e) => setSong(e.target.checked)}
          />{" "}
          Save as our special song
        </label>
        {!song && (
          <label className="fun-check">
            <input
              type="checkbox"
              checked={surprise}
              onChange={(e) => setSurprise(e.target.checked)}
            />{" "}
            Keep the title a surprise until the reveal
          </label>
        )}
        <button
          className="button button-primary"
          disabled={!id || !title.trim()}
        >
          {song ? "Save our song" : "Add to our night"}
        </button>
      </form>
    </div>
  );
}
