-- All permanent data is member-only. Invitation redemption is the sole entry point.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 32),
  avatar_url text, created_at timestamptz not null default now()
);
create table public.watch_rooms (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  room_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  video_provider text not null default 'youtube' check (video_provider = 'youtube'),
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  created_at timestamptz not null default now(), is_active boolean not null default true,
  playback_position double precision not null default 0 check (playback_position >= 0 and playback_position <= 604800),
  is_playing boolean not null default false, playback_updated_at timestamptz not null default now(),
  revision bigint not null default 0, last_actor_id uuid references auth.users(id) on delete set null,
  last_action text not null default 'pause' check (last_action in ('play','pause','seek','video'))
);
create table public.room_participants (
  room_id uuid not null references public.watch_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 32),
  avatar_url text, joined_at timestamptz not null default now(),
  primary key(room_id,user_id)
);
create table public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.watch_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null, message text not null check (char_length(message) between 1 and 1000),
  created_at timestamptz not null default clock_timestamp()
);
create table private.action_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null, window_start timestamptz not null, attempts integer not null default 0,
  primary key (user_id,action)
);
alter table public.profiles enable row level security;
alter table public.watch_rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.room_messages enable row level security;
alter table private.action_limits enable row level security;
create index rooms_host_idx on public.watch_rooms(host_user_id);
create index rooms_actor_idx on public.watch_rooms(last_actor_id);
create index participants_user_idx on public.room_participants(user_id,room_id);
create index messages_room_time_idx on public.room_messages(room_id,created_at desc);
create index messages_user_idx on public.room_messages(user_id);

-- Definer functions are isolated in an unexposed schema, with fixed search_path.
-- Public wrappers run as invoker. Never add private to PostgREST exposed schemas.
create function private.is_member(p_room uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.room_participants where room_id=p_room and user_id=auth.uid());
$$;
create function private.allow_action(p_action text,p_max integer,p_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare count_now integer;
begin
  if auth.uid() is null then return false; end if;
  insert into private.action_limits(user_id,action,window_start,attempts) values(auth.uid(),p_action,clock_timestamp(),1)
  on conflict(user_id,action) do update set
    attempts=case when private.action_limits.window_start < clock_timestamp()-make_interval(secs=>p_seconds) then 1 else private.action_limits.attempts+1 end,
    window_start=case when private.action_limits.window_start < clock_timestamp()-make_interval(secs=>p_seconds) then clock_timestamp() else private.action_limits.window_start end
  returning attempts into count_now;
  return count_now <= p_max;
end; $$;
create policy own_profile on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy member_rooms on public.watch_rooms for select to authenticated using(private.is_member(id));
create policy member_participants on public.room_participants for select to authenticated using(private.is_member(room_id));
create policy member_messages on public.room_messages for select to authenticated using(private.is_member(room_id));
revoke all on public.profiles,public.watch_rooms,public.room_participants,public.room_messages from anon,authenticated;
grant select on public.profiles,public.watch_rooms,public.room_participants,public.room_messages to authenticated;

create function private.update_display_name(p_name text) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or char_length(trim(p_name)) not between 1 and 32 then raise exception 'Invalid display name'; end if;
  insert into public.profiles(id,display_name) values(auth.uid(),trim(p_name)) on conflict(id) do update set display_name=excluded.display_name;
  update public.room_participants set display_name=trim(p_name) where user_id=auth.uid();
end; $$;
create function public.update_display_name(p_name text) returns void language sql security invoker set search_path='' as $$select private.update_display_name(p_name);$$;

create function private.create_watch_room(p_title text,p_video_id text) returns public.watch_rooms language plpgsql security definer set search_path='' as $$
declare result public.watch_rooms; person_name text;
begin
  if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and is_anonymous=false) then raise exception 'Sign in to create a room'; end if;
  if not private.allow_action('create',10,86400) then raise exception 'Room creation limit reached'; end if;
  if char_length(trim(p_title)) not between 1 and 100 or p_video_id !~ '^[A-Za-z0-9_-]{11}$' then raise exception 'Invalid room details'; end if;
  select display_name into person_name from public.profiles where id=auth.uid();
  if person_name is null then
    select left(coalesce(nullif(trim(raw_user_meta_data->>'display_name'),''),nullif(trim(raw_user_meta_data->>'full_name'),''),'Movie lover'),32) into person_name from auth.users where id=auth.uid();
    insert into public.profiles(id,display_name) values(auth.uid(),person_name);
  end if;
  insert into public.watch_rooms(host_user_id,title,video_id) values(auth.uid(),trim(p_title),p_video_id) returning * into result;
  insert into public.room_participants(room_id,user_id,display_name) values(result.id,auth.uid(),person_name);
  return result;
end; $$;
create function public.create_watch_room(p_title text,p_video_id text) returns public.watch_rooms language sql security invoker set search_path='' as $$ select private.create_watch_room(p_title,p_video_id); $$;

create function private.join_watch_room(p_invite text,p_display_name text) returns public.watch_rooms language plpgsql security definer set search_path='' as $$
declare result public.watch_rooms;
begin
  if auth.uid() is null then raise exception 'Guest session required'; end if;
  -- Invalid lookups return null instead of raising, so attempts persist on commit.
  if not private.allow_action('join',6,60) then return null; end if;
  if char_length(trim(p_display_name)) not between 1 and 32 then raise exception 'Invalid display name'; end if;
  select * into result from public.watch_rooms where is_active and (id::text=lower(trim(p_invite)) or room_code=upper(trim(p_invite))) for update;
  if result.id is null then return null; end if;
  if (select count(*) from public.room_participants where room_id=result.id) >= 20 and not private.is_member(result.id) then return null; end if;
  insert into public.profiles(id,display_name) values(auth.uid(),trim(p_display_name)) on conflict(id) do nothing;
  insert into public.room_participants(room_id,user_id,display_name) values(result.id,auth.uid(),trim(p_display_name))
  on conflict(room_id,user_id) do update set display_name=excluded.display_name;
  return result;
end; $$;
create function public.join_watch_room(p_invite text,p_display_name text) returns public.watch_rooms language sql security invoker set search_path='' as $$select private.join_watch_room(p_invite,p_display_name);$$;

create function private.set_playback(p_room_id uuid,p_action text,p_position double precision,p_video_id text default null) returns public.watch_rooms language plpgsql security definer set search_path='' as $$
declare result public.watch_rooms;
begin
  if not private.is_member(p_room_id) then raise exception 'Room access required'; end if;
  if not private.allow_action('playback',40,10) then raise exception 'Please wait before changing playback'; end if;
  if p_action not in ('play','pause','seek','video') or p_position is null or p_position<0 or p_position>604800 or p_position='NaN'::float8 then raise exception 'Invalid playback command'; end if;
  select * into result from public.watch_rooms where id=p_room_id and is_active for update;
  if result.id is null then raise exception 'Room has ended'; end if;
  if p_action='video' and (result.host_user_id<>auth.uid() or p_video_id is null or p_video_id !~ '^[A-Za-z0-9_-]{11}$') then raise exception 'Only the host can change the video'; end if;
  update public.watch_rooms set
    playback_position=case when p_action='video' then 0 else p_position end,
    is_playing=case when p_action='play' then true when p_action in ('pause','video') then false else is_playing end,
    video_id=case when p_action='video' then p_video_id else video_id end,
    playback_updated_at=clock_timestamp(),revision=revision+1,last_actor_id=auth.uid(),last_action=p_action
  where id=p_room_id returning * into result;
  return result;
end; $$;
create function public.set_playback(p_room_id uuid,p_action text,p_position double precision,p_video_id text default null) returns public.watch_rooms language sql security invoker set search_path='' as $$select private.set_playback(p_room_id,p_action,p_position,p_video_id);$$;

create function private.send_room_message(p_room_id uuid,p_message text,p_id uuid) returns public.room_messages language plpgsql security definer set search_path='' as $$
declare result public.room_messages; person_name text;
begin
  if not private.is_member(p_room_id) or not exists(select 1 from public.watch_rooms where id=p_room_id and is_active) then raise exception 'Room access required'; end if;
  -- Idempotency allows a retried request to reuse its client-generated message ID.
  select * into result from public.room_messages where id=p_id and user_id=auth.uid() and room_id=p_room_id;
  if result.id is not null then return result; end if;
  if not private.allow_action('chat',10,10) then raise exception 'Please slow down'; end if;
  if char_length(trim(p_message)) not between 1 and 1000 then raise exception 'Message must contain 1–1000 characters'; end if;
  select display_name into person_name from public.room_participants where room_id=p_room_id and user_id=auth.uid();
  insert into public.room_messages(id,room_id,user_id,display_name,message) values(p_id,p_room_id,auth.uid(),person_name,trim(p_message)) returning * into result;
  return result;
end; $$;
create function public.send_room_message(p_room_id uuid,p_message text,p_id uuid) returns public.room_messages language sql security invoker set search_path='' as $$select private.send_room_message(p_room_id,p_message,p_id);$$;
create function private.end_watch_room(p_room_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.watch_rooms where id=p_room_id and host_user_id=auth.uid()) then raise exception 'Only the host can end the room'; end if;
  update public.watch_rooms set is_active=false,is_playing=false,revision=revision+1 where id=p_room_id;
end; $$;
create function public.end_watch_room(p_room_id uuid) returns void language sql security invoker set search_path='' as $$select private.end_watch_room(p_room_id);$$;
create function public.room_snapshot(p_room_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('room',row_to_json(r),'server_time',clock_timestamp()) from public.watch_rooms r where id=p_room_id;
$$;
-- Explicit allowlist; default Postgres EXECUTE grants must never leak privileged APIs.
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_member(uuid),private.update_display_name(text),private.create_watch_room(text,text),private.join_watch_room(text,text),private.set_playback(uuid,text,double precision,text),private.send_room_message(uuid,text,uuid),private.end_watch_room(uuid) to authenticated;
revoke all on function public.update_display_name(text),public.create_watch_room(text,text),public.join_watch_room(text,text),public.set_playback(uuid,text,double precision,text),public.send_room_message(uuid,text,uuid),public.end_watch_room(uuid),public.room_snapshot(uuid) from public,anon;
grant execute on function public.update_display_name(text),public.create_watch_room(text,text),public.join_watch_room(text,text),public.set_playback(uuid,text,double precision,text),public.send_room_message(uuid,text,uuid),public.end_watch_room(uuid),public.room_snapshot(uuid) to authenticated;

-- Private broadcast/presence authorization. Membership is checked on subscription.
create policy watch_realtime_read on realtime.messages for select to authenticated using (
  extension in ('broadcast','presence') and exists(select 1 from public.room_participants p join public.watch_rooms r on r.id=p.room_id where p.user_id=(select auth.uid()) and 'room:'||p.room_id::text=(select realtime.topic()) and r.is_active)
);
create policy watch_realtime_write on realtime.messages for insert to authenticated with check (
  extension in ('broadcast','presence') and exists(select 1 from public.room_participants p join public.watch_rooms r on r.id=p.room_id where p.user_id=(select auth.uid()) and 'room:'||p.room_id::text=(select realtime.topic()) and r.is_active)
);
-- Persisted playback/chat use Postgres Changes: recipients are filtered by table RLS.
alter publication supabase_realtime add table public.watch_rooms,public.room_messages,public.room_participants;
