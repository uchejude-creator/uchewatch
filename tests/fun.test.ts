import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { activeEvents, countdownSeconds, hasBingo } from "../lib/fun/catalog";
import { ticketSvg } from "../lib/fun/ticket";
import type { FunRecord } from "../lib/fun/types";

test("Date-night utilities: expired effects, countdown, bingo and safe ticket export", () => {
  assert.equal(
    countdownSeconds(
      "2026-09-27T00:00:04Z",
      Date.parse("2026-09-27T00:00:01.1Z"),
    ),
    3,
  );
  assert.equal(
    countdownSeconds(
      "2026-09-27T00:00:00Z",
      Date.parse("2026-09-27T00:00:05Z"),
    ),
    0,
  );
  assert.equal(
    activeEvents(
      [{ at: "2026-09-27T00:00:00Z" }],
      Date.parse("2026-09-27T00:00:20Z"),
    ).length,
    0,
  );
  assert.ok(hasBingo(["0", "4", "8"]));
  assert.ok(!hasBingo(["0", "1", "8"]));
  const svg = ticketSvg(
    {
      names: "<script>alert(1)</script>",
      title: '"&<',
      note: "♥",
      at: "2026-09-27T00:00:00Z",
    },
    "UcheWatch",
  );
  assert.ok(!svg.includes("<script>"));
  assert.ok(svg.includes("&lt;script&gt;"));
});

test("Date-night SQL: membership, simultaneous reveals, countdown, queue, games and goodnight", async () => {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema realtime;
  create table auth.users(id uuid primary key,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
  grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
  create table realtime.messages(id bigint,extension text,topic text);alter table realtime.messages enable row level security;
  create function realtime.topic() returns text language sql stable as $$select current_setting('realtime.topic',true);$$;
  grant usage on schema realtime to authenticated;grant select,insert on realtime.messages to authenticated;create publication supabase_realtime;`);
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  const host = randomUUID(),
    guest = randomUUID(),
    outsider = randomUUID();
  await db.query(
    "insert into auth.users(id,is_anonymous) values($1,false),($2,true),($3,true)",
    [host, guest, outsider],
  );
  async function as(id: string) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  }
  await as(host);
  const room = (
    await db.query<{ id: string; room_code: string }>(
      "select * from public.create_watch_room('Our night','dQw4w9WgXcQ')",
    )
  ).rows[0];
  const act = async (
    action: string,
    data: Record<string, unknown> = {},
    request = randomUUID(),
  ) =>
    (
      await db.query<FunRecord>(
        "select * from public.fun_action($1,$2,$3::jsonb,$4)",
        [room.id, action, JSON.stringify(data), request],
      )
    ).rows[0].state;
  await as(outsider);
  await assert.rejects(act("mood", { text: "rose" }), /Room access/);
  await as(guest);
  await db.query("select public.join_watch_room($1,'Partner')", [
    room.room_code,
  ]);
  await as(host);
  let s = await act("round_start", {
    kind: "compliment",
    other: guest,
    text: "A secret",
  });
  const rid = s.round!.id;
  s = await act("round_answer", { id: rid, text: "You make me happy" });
  assert.equal(s.round!.answers, undefined);
  await as(guest);
  const hidden = (
    await db.query<FunRecord>(
      "select * from public.room_fun where room_id=$1",
      [room.id],
    )
  ).rows[0];
  assert.ok(!JSON.stringify(hidden).includes("You make me happy"));
  await assert.rejects(
    db.query("select * from private.fun_answers"),
    /permission denied/,
  );
  await assert.rejects(
    db.query("update public.room_fun set state='{}'"),
    /permission denied/,
  );
  s = await act("round_answer", { id: rid, text: "And you make me smile" });
  assert.equal(s.round!.answers![host], "You make me happy");
  await assert.rejects(
    act("round_answer", { id: rid, text: "Changing it" }),
    /no longer accepting/,
  );
  await as(host);
  s = await act("round_start", { kind: "ready", other: guest, text: "Ready?" });
  await as(guest);
  s = await act("round_answer", { id: s.round!.id, text: "Ready" });
  const playback = (
    await db.query<{ is_playing: boolean; playback_updated_at: Date }>(
      "select is_playing,playback_updated_at from public.watch_rooms where id=$1",
      [room.id],
    )
  ).rows[0];
  assert.equal(playback.is_playing, true);
  assert.ok(Date.parse(String(playback.playback_updated_at)) > Date.now());
  await act("round_cancel");
  assert.equal(
    (
      await db.query<{ is_playing: boolean }>(
        "select is_playing from public.watch_rooms where id=$1",
        [room.id],
      )
    ).rows[0].is_playing,
    false,
  );
  const request = randomUUID();
  s = await act(
    "queue_add",
    {
      id: "M7lc1UVf-VE",
      text: "Our next video",
      note: "For you",
      surprise: true,
    },
    request,
  );
  s = await act(
    "queue_add",
    { id: "M7lc1UVf-VE", text: "Our next video" },
    request,
  );
  assert.equal(s.queue.length, 1);
  await assert.rejects(act("queue_play", { id: s.queue[0].id }), /host/);
  await as(host);
  s = await act("random");
  assert.equal(s.queue.length, 0);
  assert.equal(s.picked!.surprise, false);
  assert.equal(
    (
      await db.query<{ video_id: string }>(
        "select video_id from public.watch_rooms where id=$1",
        [room.id],
      )
    ).rows[0].video_id,
    "M7lc1UVf-VE",
  );
  s = await act("song", { id: "dQw4w9WgXcQ", text: "Our song" });
  await act("song_play");
  s = await act("moment", { text: "Best bit" });
  assert.equal(s.moments[0].video, "dQw4w9WgXcQ");
  await act("moment_play", { id: s.moments[0].id });
  s = await act("mood", { text: "rose" });
  assert.equal(s.mood, "rose");
  s = await act("nickname", { other: guest, text: "My person" });
  assert.equal(s.aliases[guest], "My person");
  s = await act("burst");
  assert.equal(s.events.at(-1)!.by, host);
  s = await act("kiss", { other: guest });
  assert.equal(s.events.at(-1)!.to, guest);
  s = await act("note", { text: "Wish you were here" });
  assert.equal(s.events.at(-1)!.text, "Wish you were here");
  s = await act("popcorn");
  assert.equal(s.popcorn[host], 1);
  s = await act("bingo", { id: "0" });
  assert.deepEqual(s.bingo[host], ["0"]);
  s = await act("bingo", { id: "0" });
  assert.deepEqual(s.bingo[host], []);
  await as(guest);
  s = await act("status", { text: "snacks" });
  assert.equal(s.statuses[guest], "snacks");
  s = await act("ticket", {
    text: "Movie night",
    names: "Us",
    at: new Date(Date.now() + 86400000).toISOString(),
    note: "Bring snacks",
  });
  assert.equal(s.ticket!.names, "Us");
  s = await act("round_start", {
    kind: "truths",
    other: host,
    text: "Guess the lie",
  });
  s = await act("round_answer", {
    id: s.round!.id,
    text: "1. One\n2. Two\n3. Three",
    lie: "2",
  });
  await as(host);
  s = await act("round_answer", {
    id: s.round!.id,
    text: "1. A\n2. B\n3. C",
    lie: "3",
  });
  assert.equal(s.round!.lies, undefined);
  assert.equal(s.round!.answers![guest], "1. One\n2. Two\n3. Three");
  s = await act("truth_guess", { id: s.round!.id, text: "2" });
  assert.equal(s.round!.lies, undefined);
  await as(guest);
  s = await act("truth_guess", { id: s.round!.id, text: "1" });
  assert.equal(s.round!.lies![host], "3");
  s = await act("round_start", {
    kind: "goodnight",
    other: host,
    text: "Goodnight",
  });
  s = await act("round_answer", { id: s.round!.id, text: "Sleep well" });
  await as(host);
  s = await act("round_answer", { id: s.round!.id, text: "Sweet dreams" });
  assert.equal(s.night!.messages[guest], "Sleep well");
  assert.equal(
    (
      await db.query<{ is_playing: boolean }>(
        "select is_playing from public.watch_rooms where id=$1",
        [room.id],
      )
    ).rows[0].is_playing,
    false,
  );
  await as(outsider);
  assert.equal(
    (await db.query("select * from public.room_fun")).rows.length,
    0,
  );
  await as(host);
  await db.query("select public.end_watch_room($1)", [room.id]);
  await assert.rejects(act("burst"), /ended/);
  await db.exec("reset role;set role anon");
  await assert.rejects(act("burst"), /permission denied/);
  await db.close();
});
