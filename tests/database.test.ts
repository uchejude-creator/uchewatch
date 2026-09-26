import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
// Executes the actual migration with Postgres. Only Supabase-owned auth/realtime
// infrastructure is stubbed; application SQL and RLS are unmodified.
test("Database: private access, guest joining, playback, chat, roles, limits, and closure", async () => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema realtime;
    create table auth.users(id uuid primary key,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
    grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
    create table realtime.messages(id bigint,extension text,topic text);alter table realtime.messages enable row level security;
    create function realtime.topic() returns text language sql stable as $$select current_setting('realtime.topic',true);$$;
    grant usage on schema realtime to authenticated;grant select,insert on realtime.messages to authenticated;
    create publication supabase_realtime;`);
  const file = readdirSync("supabase/migrations").find((f) =>
    f.endsWith(".sql"),
  )!;
  await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  const host = "11111111-1111-4111-8111-111111111111",
    guest = "22222222-2222-4222-8222-222222222222",
    outsider = "33333333-3333-4333-8333-333333333333";
  await db.query(
    `insert into auth.users(id,is_anonymous,raw_user_meta_data) values ($1,false,'{"display_name":"Host"}'),($2,true,'{}'),($3,true,'{}')`,
    [host, guest, outsider],
  );
  async function asUser(id: string) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  }
  await asUser(host);
  const create = await db.query<{ id: string; room_code: string }>(
    "select * from public.create_watch_room('Our night','dQw4w9WgXcQ')",
  );
  const room = create.rows[0];
  assert.ok(room.id);
  assert.equal(room.room_code.length, 10);
  assert.equal(
    (await db.query("select * from public.watch_rooms")).rows.length,
    1,
  );
  await asUser(outsider);
  assert.equal(
    (await db.query("select * from public.watch_rooms")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from public.room_participants")).rows.length,
    0,
  );
  await assert.rejects(
    db.query("select public.set_playback($1,'play',0)", [room.id]),
    /Room access required/,
  );
  await assert.rejects(
    db.query("select public.create_watch_room('No','dQw4w9WgXcQ')"),
    /Sign in/,
  );
  await assert.rejects(
    db.query(
      "insert into public.room_participants(room_id,user_id,display_name) values($1,$2,'Intruder')",
      [room.id, outsider],
    ),
    /permission denied/,
  );
  await assert.rejects(
    db.query("select private.allow_action('join',100,1)"),
    /permission denied/,
  );
  await asUser(guest);
  const joined = await db.query<{ id: string }>(
    "select * from public.join_watch_room($1,'Alex')",
    [room.room_code.toLowerCase()],
  );
  assert.equal(joined.rows[0].id, room.id);
  const play = await db.query<{
    revision: number;
    is_playing: boolean;
    last_actor_id: string;
  }>("select * from public.set_playback($1,'play',42)", [room.id]);
  assert.equal(play.rows[0].revision, 1);
  assert.equal(play.rows[0].is_playing, true);
  assert.equal(play.rows[0].last_actor_id, guest);
  const pause = await db.query<{ revision: number; is_playing: boolean }>(
    "select * from public.set_playback($1,'pause',49)",
    [room.id],
  );
  assert.equal(pause.rows[0].revision, 2);
  assert.equal(pause.rows[0].is_playing, false);
  await assert.rejects(
    db.query("select public.set_playback($1,'video',0,'M7lc1UVf-VE')", [
      room.id,
    ]),
    /Only the host/,
  );
  await assert.rejects(
    db.query("select public.set_playback($1,'seek','NaN'::float8)", [room.id]),
    /Invalid playback/,
  );
  const mid = "44444444-4444-4444-8444-444444444444";
  for (let i = 0; i < 2; i++)
    await db.query("select public.send_room_message($1,'Hello together',$2)", [
      room.id,
      mid,
    ]);
  const chat = await db.query<{ display_name: string; message: string }>(
    "select * from public.room_messages",
  );
  assert.equal(chat.rows.length, 1);
  assert.equal(chat.rows[0].display_name, "Alex");
  await db.query("select set_config('realtime.topic',$1,false)", [
    `room:${room.id}`,
  ]);
  await db.query("insert into realtime.messages values (1,'broadcast',$1)", [
    `room:${room.id}`,
  ]);
  await asUser(outsider);
  assert.equal(
    (await db.query("select * from public.room_messages")).rows.length,
    0,
  );
  await assert.rejects(
    db.query("insert into realtime.messages values(2,'broadcast','nope')"),
    /row-level security/,
  );
  for (let i = 0; i < 6; i++)
    await db.query("select public.join_watch_room('INVALID','Stranger')");
  const limited = await db.query<{ result: unknown }>(
    "select public.join_watch_room($1,'Stranger') as result",
    [room.room_code],
  );
  assert.equal(limited.rows[0].result, null);
  await asUser(host);
  await db.query("select public.set_playback($1,'video',0,'M7lc1UVf-VE')", [
    room.id,
  ]);
  await db.query("select public.end_watch_room($1)", [room.id]);
  await asUser(guest);
  await assert.rejects(
    db.query("select public.set_playback($1,'play',0)", [room.id]),
    /Room has ended/,
  );
  await assert.rejects(
    db.query("select public.send_room_message($1,'Late',$2)", [
      room.id,
      "55555555-5555-4555-8555-555555555555",
    ]),
    /Room access/,
  );
  await db.exec("reset role;set role anon");
  await assert.rejects(
    db.query("select * from public.watch_rooms"),
    /permission denied/,
  );
  await assert.rejects(
    db.query("select public.join_watch_room('INVALID','A')"),
    /permission denied/,
  );
  await db.close();
});
