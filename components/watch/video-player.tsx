"use client";
import { useState } from "react";
import { Maximize, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { useSyncedPlayer } from "@/hooks/use-synced-player";
import { formatTime } from "@/lib/watch/youtube-url";
import type { PlaybackAction, Reaction, WatchRoom } from "@/types/watch";
export function VideoPlayer({
  room,
  offset,
  connected,
  reactions,
  onPlayback,
  onCinema,
}: {
  room: WatchRoom;
  offset: number;
  connected: boolean;
  reactions: Reaction[];
  onPlayback: (action: PlaybackAction, position: number) => Promise<WatchRoom>;
  onCinema: () => void;
}) {
  const {
    mountRef,
    ready,
    error,
    blocked,
    position,
    duration,
    playing,
    inSync,
    toggle,
    seek,
    unlock,
    setVolume,
    reload,
  } = useSyncedPlayer(room, offset, connected, onPlayback);
  const [scrub, setScrub] = useState<number | null>(null);
  return (
    <>
      <div className="player-frame">
        <div ref={mountRef} className="player-mount" />
        {!ready && !error && (
          <div className="player-loading">
            <span className="loading-orbit" />
            <span>Getting the screen ready…</span>
          </div>
        )}
        {error && (
          <div className="player-overlay-error" role="alert">
            <p>{error}</p>
            <button className="button button-secondary" onClick={reload}>
              <RotateCcw size={16} /> Reload player
            </button>
          </div>
        )}
        <div className="reaction-stage" aria-hidden="true">
          {reactions.map((r, i) => (
            <span
              key={r.id}
              className="floating-reaction"
              style={{ left: `${65 + (i % 5) * 5}%` }}
            >
              {r.emoji}
            </span>
          ))}
        </div>
      </div>
      {blocked && (
        <div className="notice">
          <Play size={18} />
          <div>
            <strong>One tap, then we’re together.</strong>
            <p>Your browser needs you to start playback on this device.</p>
            <button className="text-button" onClick={unlock}>
              Tap to enable playback
            </button>
          </div>
        </div>
      )}
      <div className="player-toolbar">
        <button
          className="icon-button"
          aria-label={playing ? "Pause for everyone" : "Play for everyone"}
          onClick={toggle}
          disabled={!ready || !connected}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <div className="seek-control">
          <input
            aria-label="Seek video for everyone"
            type="range"
            min={0}
            max={Math.max(duration, 1)}
            step={0.1}
            value={scrub ?? Math.min(position, duration || 1)}
            disabled={!ready || !connected || !duration}
            onChange={(e) => setScrub(Number(e.target.value))}
            onPointerUp={(e) => {
              seek(Number(e.currentTarget.value));
              setScrub(null);
            }}
            onKeyUp={(e) => {
              if (
                [
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                  "Home",
                  "End",
                ].includes(e.key)
              ) {
                seek(Number(e.currentTarget.value));
                setScrub(null);
              }
            }}
            onBlur={() => setScrub(null)}
          />
          <span>
            {formatTime(scrub ?? position)} / {formatTime(duration)}
          </span>
        </div>
        <label className="volume-label">
          <Volume2 size={17} />
          <input
            aria-label="Your volume"
            type="range"
            min={0}
            max={100}
            defaultValue={100}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </label>
        <button
          className="icon-button"
          aria-label="Toggle cinema mode"
          onClick={onCinema}
        >
          <Maximize size={17} />
        </button>
      </div>
      <div className="room-footer-note" role="status">
        <span className={`status-dot ${inSync ? "" : "violet"}`} />
        {!connected
          ? "Waiting for your connection…"
          : inSync
            ? "Playback is in sync"
            : ready
              ? "Aligning your shared moment…"
              : "Waiting for the player…"}
      </div>
    </>
  );
}
