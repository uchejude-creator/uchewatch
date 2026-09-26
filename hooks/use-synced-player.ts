"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaybackAction, WatchRoom } from "@/types/watch";
import type { VideoProvider } from "@/lib/watch/providers/types";
import { driftDecision, expectedPosition, SYNC } from "@/lib/watch/sync";
export function useSyncedPlayer(
  room: WatchRoom,
  offset: number,
  connected: boolean,
  onPlayback: (action: PlaybackAction, position: number) => Promise<WatchRoom>,
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const provider = useRef<VideoProvider | null>(null);
  const current = useRef({ room, offset, connected, onPlayback });
  const guardUntil = useRef(0);
  const pending = useRef(false);
  const loadedVideo = useRef("");
  const readyRef = useRef(false);
  const sample = useRef({ time: 0, at: 0 });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [inSync, setInSync] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    current.current = { room, offset, connected, onPlayback };
  }, [room, offset, connected, onPlayback]);
  const apply = useCallback((force = false) => {
    const p = provider.current;
    const c = current.current;
    if (!p || !readyRef.current || pending.current) return;
    guardUntil.current = Date.now() + SYNC.remoteGuardMs;
    const target = expectedPosition(c.room, Date.now() + c.offset);
    if (loadedVideo.current !== c.room.video_id) {
      p.load(c.room.video_id);
      loadedVideo.current = c.room.video_id;
      force = true;
    }
    const bounded = p.getDuration()
      ? Math.min(target, p.getDuration())
      : target;
    if (force || Math.abs(p.getCurrentTime() - bounded) > 0.5) p.seek(bounded);
    if (c.room.is_playing) {
      if (p.getState() !== "playing") p.play();
    } else p.pause();
    sample.current = { time: p.getCurrentTime(), at: Date.now() };
  }, []);
  const publish = useCallback(
    async (action: PlaybackAction, time: number) => {
      if (!current.current.connected || pending.current) return;
      pending.current = true;
      guardUntil.current = Date.now() + SYNC.remoteGuardMs;
      try {
        const authoritative = await current.current.onPlayback(action, time);
        if (authoritative.revision >= current.current.room.revision) {
          current.current = { ...current.current, room: authoritative };
        }
      } catch {
        /* useRoom exposes actionable feedback. Restore authoritative state below. */
      } finally {
        pending.current = false;
        guardUntil.current = Date.now() + SYNC.remoteGuardMs;
        apply();
      }
    },
    [apply],
  );
  useEffect(() => {
    let disposed = false;
    let player: VideoProvider | null = null;
    let moderateDrifts = 0;
    let poll: ReturnType<typeof setInterval> | undefined;
    let drift: ReturnType<typeof setInterval> | undefined;
    async function mount() {
      try {
        const { YouTubeProvider } =
          await import("@/lib/watch/providers/youtube");
        if (disposed || !mountRef.current) return;
        player = new YouTubeProvider();
        provider.current = player;
        const element = document.createElement("div");
        mountRef.current.replaceChildren(element);
        await player.mount(element, current.current.room.video_id, {
          onState: (state) => {
            if (disposed) return;
            setPlaying(state === "playing");
            if (state === "playing") setBlocked(false);
            if (
              !readyRef.current ||
              Date.now() < guardUntil.current ||
              pending.current ||
              !current.current.connected
            )
              return;
            if (
              state === "playing" ||
              state === "paused" ||
              state === "ended"
            ) {
              const c = current.current;
              const isPlay = state === "playing";
              if (
                isPlay !== c.room.is_playing ||
                Math.abs(
                  (player?.getCurrentTime() || 0) -
                    expectedPosition(c.room, Date.now() + c.offset),
                ) > 1
              ) {
                void publish(
                  isPlay === c.room.is_playing
                    ? "seek"
                    : isPlay
                      ? "play"
                      : "pause",
                  player?.getCurrentTime() || 0,
                );
              }
            }
          },
          onError: (message) => {
            if (!disposed) {
              setError(message);
              setInSync(false);
            }
          },
          onAutoplayBlocked: () => {
            if (!disposed) {
              setBlocked(true);
              setInSync(false);
            }
          },
        });
        if (disposed) return;
        readyRef.current = true;
        loadedVideo.current = current.current.room.video_id;
        setReady(true);
        setError("");
        apply(true);
        poll = setInterval(() => {
          if (!player || disposed) return;
          const now = Date.now();
          const time = player.getCurrentTime();
          const state = player.getState();
          const old = sample.current;
          const elapsed = (now - old.at) / 1000;
          setPosition(time);
          setDuration(player.getDuration());
          setPlaying(state === "playing");
          // YouTube has no seek event. Detect native scrubbing from discontinuities,
          // while ignoring buffering, remote commands, and background tab wakeups.
          if (
            old.at &&
            elapsed < 1.5 &&
            state !== "buffering" &&
            state !== "unstarted" &&
            now > guardUntil.current &&
            !pending.current &&
            current.current.connected
          ) {
            const expected = old.time + (state === "playing" ? elapsed : 0);
            if (Math.abs(time - expected) > 1.25) void publish("seek", time);
          }
          sample.current = { time, at: now };
        }, 500);
        drift = setInterval(() => {
          if (
            !player ||
            disposed ||
            pending.current ||
            Date.now() < guardUntil.current ||
            !current.current.connected ||
            player.getState() === "buffering"
          )
            return;
          const c = current.current;
          const target = expectedPosition(c.room, Date.now() + c.offset);
          const bounded = player.getDuration()
            ? Math.min(target, player.getDuration())
            : target;
          const decision = driftDecision(
            player.getCurrentTime(),
            bounded,
            moderateDrifts,
          );
          const stateMatches =
            (player.getState() === "playing") === c.room.is_playing;
          setInSync(decision === "ignore" && stateMatches);
          if (decision === "seek" || !stateMatches) {
            apply();
            moderateDrifts = 0;
          } else
            moderateDrifts = decision === "observe" ? moderateDrifts + 1 : 0;
        }, SYNC.intervalMs);
      } catch (error) {
        if (!disposed) {
          console.error("Player initialization failed", error);
          setError(
            error instanceof Error
              ? error.message
              : "The player couldn’t load.",
          );
        }
      }
    }
    void mount();
    return () => {
      disposed = true;
      readyRef.current = false;
      clearInterval(poll);
      clearInterval(drift);
      player?.destroy();
      provider.current = null;
    };
  }, [retry, apply, publish]);
  useEffect(() => {
    if (ready && connected) apply();
  }, [room.revision, ready, connected, apply]);
  const toggle = () => {
    const p = provider.current;
    if (!p || !ready || !connected) return;
    guardUntil.current = Date.now() + SYNC.remoteGuardMs;
    const next = p.getState() !== "playing";
    if (next) p.play();
    else p.pause();
    setBlocked(false);
    void publish(next ? "play" : "pause", p.getCurrentTime());
  };
  const seek = (time: number) => {
    if (!provider.current || !connected) return;
    guardUntil.current = Date.now() + SYNC.remoteGuardMs;
    provider.current.seek(time);
    setPosition(time);
    void publish("seek", time);
  };
  const unlock = () => {
    const p = provider.current;
    if (!p) return;
    guardUntil.current = Date.now() + SYNC.remoteGuardMs;
    p.play();
    setBlocked(false);
    if (!current.current.room.is_playing)
      void publish("play", p.getCurrentTime());
    else apply(true);
  };
  return {
    mountRef,
    ready,
    error,
    blocked,
    position,
    duration,
    playing,
    inSync: inSync && connected && !blocked,
    toggle,
    seek,
    unlock,
    setVolume: (n: number) => provider.current?.setVolume(n),
    reload: () => {
      setReady(false);
      setError("");
      setRetry((r) => r + 1);
    },
  };
}
