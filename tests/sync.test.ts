import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractYouTubeId,
  safeNext,
  formatTime,
} from "../lib/watch/youtube-url";
import { expectedPosition, driftDecision } from "../lib/watch/sync";
test("YouTube URLs parse only exact supported hosts and valid IDs", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30",
    "https://youtu.be/dQw4w9WgXcQ?si=test",
    "youtube.com/shorts/dQw4w9WgXcQ",
    "https://m.youtube.com/live/dQw4w9WgXcQ",
    "dQw4w9WgXcQ",
  ])
    assert.equal(extractYouTubeId(url), "dQw4w9WgXcQ");
  for (const url of [
    "https://youtube.com.attacker.test/watch?v=dQw4w9WgXcQ",
    "https://attacker.test/dQw4w9WgXcQ",
    "javascript:alert(1)",
    "https://youtube.com/watch?v=short",
    "https://youtube.com/playlist?list=abc",
    "",
  ])
    assert.equal(extractYouTubeId(url), null);
});
test("Auth callback destinations cannot leave this origin", () => {
  for (const url of [
    "//evil.test",
    "https://evil.test",
    "/sign-in?next=/sign-in",
    "/auth/callback",
    "/\\evil.test",
    "/\n/evil.test",
    null,
  ])
    assert.equal(safeNext(url), "/create");
  assert.equal(safeNext("/room/abc"), "/room/abc");
});
test("Authoritative playing state compensates elapsed server time; paused state stays still", () => {
  const state = {
    playback_position: 40,
    is_playing: true,
    playback_updated_at: "2026-01-01T00:00:00Z",
  };
  assert.equal(expectedPosition(state, Date.parse("2026-01-01T00:00:03Z")), 43);
  assert.equal(
    expectedPosition(
      { ...state, is_playing: false },
      Date.parse("2026-01-01T00:00:03Z"),
    ),
    40,
  );
  assert.equal(expectedPosition(state, Date.parse("2025-12-31T23:59:59Z")), 40);
});
test("Drift ignores tiny differences, observes moderate drift, and repairs large drift", () => {
  assert.equal(driftDecision(10, 10.4, 0), "ignore");
  assert.equal(driftDecision(10, 11, 0), "observe");
  assert.equal(driftDecision(10, 11, 1), "seek");
  assert.equal(driftDecision(10, 13, 0), "seek");
});
test("Time labels handle invalid and negative values", () => {
  assert.equal(formatTime(125), "2:05");
  assert.equal(formatTime(-1), "0:00");
  assert.equal(formatTime(NaN), "0:00");
});
