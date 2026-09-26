import type { WatchRoom } from "@/types/watch";
export const SYNC = {
  ignoreBelow: 0.5,
  hardSeekAbove: 2.5,
  intervalMs: 5000,
  remoteGuardMs: 1500,
} as const;
export function expectedPosition(
  room: Pick<
    WatchRoom,
    "playback_position" | "is_playing" | "playback_updated_at"
  >,
  serverNow: number,
): number {
  const elapsed = room.is_playing
    ? Math.max(0, (serverNow - Date.parse(room.playback_updated_at)) / 1000)
    : 0;
  return Math.max(0, room.playback_position + elapsed);
}
export function driftDecision(
  actual: number,
  expected: number,
  consecutive: number,
): "ignore" | "observe" | "seek" {
  const delta = Math.abs(actual - expected);
  if (delta < SYNC.ignoreBelow) return "ignore";
  if (delta >= SYNC.hardSeekAbove || consecutive >= 1) return "seek";
  return "observe";
}
