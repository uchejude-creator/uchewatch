-- Replace the bingo card UI with private scene picks and unanimous, once-only scoring.
create or replace function private.fun_action(p_room uuid,p_action text,p_data jsonb,p_request uuid)
returns public.room_fun language plpgsql security definer set search_path='' as $$
declare
  r public.watch_rooms; f public.room_fun; s jsonb; entry jsonb; items jsonb; round_data jsonb;
  actor text := auth.uid()::text; other text; txt text; kind text; ident text; new_round_id uuid;
  now_at timestamptz := clock_timestamp(); pos double precision; submitted jsonb; answer_map jsonb;
begin
  if auth.uid() is null or not private.is_member(p_room) then raise exception 'Room access required'; end if;
  if p_request is null or p_action is null or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>6000 then raise exception 'Invalid action'; end if;
  select * into r from public.watch_rooms where id=p_room and is_active for update;
  if r.id is null then raise exception 'Room has ended'; end if;
  insert into public.room_fun(room_id) values(p_room) on conflict do nothing;
  select * into f from public.room_fun where room_id=p_room for update;
  s:=f.state;
  if (s->'recent') ? p_request::text then return f; end if;
  if not private.allow_action('fun',30,10) then raise exception 'Take a little breath and try again'; end if;
  pos:=least(604800,r.playback_position+case when r.is_playing then greatest(0,extract(epoch from now_at-r.playback_updated_at)) else 0 end);
  txt:=trim(coalesce(p_data->>'text',''));
  ident:=coalesce(p_data->>'id','');
  other:=coalesce(p_data->>'other','');
  kind:=coalesce(p_data->>'kind','');
  if p_action in ('burst','kiss','note','popcorn') then
    if p_action='note' and char_length(txt) not between 1 and 180 then raise exception 'Write a note of 1–180 characters'; end if;
    entry:=jsonb_build_object('id',p_request,'kind',p_action,'by',actor,'at',now_at,'text',case when p_action='note' then txt else '' end);
    if p_action='kiss' then
      if other=actor or not exists(select 1 from public.room_participants where room_id=p_room and user_id::text=other) then raise exception 'Choose your person'; end if;
      entry:=entry||jsonb_build_object('to',other);
    end if;
    select coalesce(jsonb_agg(value),'[]') into items from (select value from jsonb_array_elements(s->'events') with ordinality e(value,n) where n>greatest(0,jsonb_array_length(s->'events')-11)) e;
    s:=jsonb_set(s,'{events}',items||jsonb_build_array(entry));
    if p_action='popcorn' then s:=jsonb_set(s,array['popcorn'],(s->'popcorn')||jsonb_build_object(actor,least(999,coalesce((s#>>array['popcorn',actor])::integer,0)+1))); end if;
  elsif p_action='mood' then
    if txt not in ('rose','midnight','violet') then raise exception 'Unknown mood'; end if;
    s:=s||jsonb_build_object('mood',txt);
  elsif p_action='status' then
    if txt not in ('here','snacks') then raise exception 'Unknown status'; end if;
    s:=jsonb_set(s,'{statuses}',(s->'statuses')||jsonb_build_object(actor,txt));
  elsif p_action='nickname' then
    if char_length(txt) not between 1 and 32 or not exists(select 1 from public.room_participants where room_id=p_room and user_id::text=other) then raise exception 'Choose a person and a short name'; end if;
    s:=jsonb_set(s,'{aliases}',(s->'aliases')||jsonb_build_object(other,txt));
  elsif p_action in ('queue_add','song') then
    if ident !~ '^[A-Za-z0-9_-]{11}$' or char_length(txt) not between 1 and 100 or char_length(coalesce(p_data->>'note',''))>180 then raise exception 'Add a YouTube video and a short title'; end if;
    entry:=jsonb_build_object('id',p_request,'video',ident,'title',txt,'note',coalesce(p_data->>'note',''),'by',actor,'surprise',coalesce((p_data->>'surprise')::boolean,false));
    if p_action='song' then s:=s||jsonb_build_object('song',entry);
    else
      if jsonb_array_length(s->'queue')>=30 then raise exception 'Your playlist has 30 videos; remove one first'; end if;
      s:=jsonb_set(s,'{queue}',(s->'queue')||jsonb_build_array(entry));
    end if;
  elsif p_action in ('queue_remove','queue_reveal') then
    select value into entry from jsonb_array_elements(s->'queue') where value->>'id'=ident;
    if entry is null or (entry->>'by'<>actor and r.host_user_id<>auth.uid()) then raise exception 'Only the chooser or host can change this pick'; end if;
    select coalesce(jsonb_agg(case when value->>'id'=ident then value||'{"surprise":false}'::jsonb else value end),'[]') into items from jsonb_array_elements(s->'queue') where p_action<>'queue_remove' or value->>'id'<>ident;
    s:=jsonb_set(s,'{queue}',items);
  elsif p_action in ('queue_play','random','song_play') then
    if r.host_user_id<>auth.uid() then raise exception 'The host starts the next video'; end if;
    if p_action='song_play' then entry:=s->'song';
    elsif p_action='random' then select value into entry from jsonb_array_elements(s->'queue') order by random() limit 1;
    else select value into entry from jsonb_array_elements(s->'queue') where value->>'id'=ident;
    end if;
    if entry is null then raise exception 'Add a video first'; end if;
    update public.watch_rooms set video_id=entry->>'video',playback_position=0,is_playing=false,playback_updated_at=now_at,revision=revision+1,last_actor_id=auth.uid(),last_action='video' where id=p_room;
    s:=s||jsonb_build_object('picked',entry||'{"surprise":false}'::jsonb,'round',null,'night',null);
    if p_action<>'song_play' then
      select coalesce(jsonb_agg(value),'[]') into items from jsonb_array_elements(s->'queue') where value->>'id'<>entry->>'id';
      s:=jsonb_set(s,'{queue}',items);
    end if;
    delete from private.fun_answers where room_id=p_room;
  elsif p_action='moment' then
    if char_length(txt) not between 1 and 120 or jsonb_array_length(s->'moments')>=40 then raise exception 'Use a short note; each room holds 40 moments'; end if;
    entry:=jsonb_build_object('id',p_request,'video',r.video_id,'position',floor(pos),'text',txt,'by',actor);
    s:=jsonb_set(s,'{moments}',(s->'moments')||jsonb_build_array(entry));
  elsif p_action in ('moment_play','moment_remove') then
    select value into entry from jsonb_array_elements(s->'moments') where value->>'id'=ident;
    if entry is null then raise exception 'Moment not found'; end if;
    if p_action='moment_remove' then
      if entry->>'by'<>actor and r.host_user_id<>auth.uid() then raise exception 'Only the author or host can remove a moment'; end if;
      select coalesce(jsonb_agg(value),'[]') into items from jsonb_array_elements(s->'moments') where value->>'id'<>ident;
      s:=jsonb_set(s,'{moments}',items);
    else
      if entry->>'video'<>r.video_id and r.host_user_id<>auth.uid() then raise exception 'Ask the host to revisit this video'; end if;
      update public.watch_rooms set video_id=entry->>'video',playback_position=(entry->>'position')::double precision,is_playing=false,playback_updated_at=now_at,revision=revision+1,last_actor_id=auth.uid(),last_action=case when video_id=entry->>'video' then 'seek' else 'video' end where id=p_room;
      s:=s||jsonb_build_object('round',null);
    end if;
  elsif p_action='ticket' then
    if char_length(txt) not between 1 and 100 or char_length(coalesce(p_data->>'names','')) not between 1 and 100 or char_length(coalesce(p_data->>'note',''))>180 then raise exception 'Add names and a title for your ticket'; end if;
    if (p_data->>'at')::timestamptz is null or (p_data->>'at')::timestamptz<now_at-interval '1 day' or (p_data->>'at')::timestamptz>now_at+interval '2 years' then raise exception 'Choose a date within the next two years'; end if;
    s:=s||jsonb_build_object('ticket',jsonb_build_object('title',txt,'names',p_data->>'names','note',coalesce(p_data->>'note',''),'at',(p_data->>'at')::timestamptz));
  elsif p_action='bingo' then
    if ident !~ '^[0-8]$' then raise exception 'Unknown bingo square'; end if;
    items:=coalesce(s#>array['bingo',actor],'[]');
    if items ? ident then select coalesce(jsonb_agg(value),'[]') into items from jsonb_array_elements(items) where value<>to_jsonb(ident);
    else items:=items||jsonb_build_array(ident); end if;
    s:=jsonb_set(s,'{bingo}',(s->'bingo')||jsonb_build_object(actor,items));
  elsif p_action='round_start' then
    if kind not in ('ready','compliment','prediction','rating','rather','thisthat','truths','favorite','goodnight','bingo') or other=actor or not exists(select 1 from public.room_participants where room_id=p_room and user_id::text=other) then raise exception 'Choose your person and an activity'; end if;
    round_data:=s->'round';
    if round_data is not null and round_data<>'null'::jsonb and (round_data->'answers' is null or (round_data->>'kind'='bingo' and round_data->>'winner' is null)) and (round_data->>'at')::timestamptz>now_at-interval '15 minutes' then raise exception 'Finish or cancel the current activity first'; end if;
    if char_length(txt)>180 then raise exception 'Keep the question short'; end if;
    delete from private.fun_answers where room_id=p_room;
    new_round_id:=p_request;
    round_data:=jsonb_build_object('id',new_round_id,'kind',kind,'prompt',txt,'users',jsonb_build_array(actor,other),'submitted','[]'::jsonb,'at',now_at);
    if kind='ready' then
      insert into private.fun_answers values(p_room,new_round_id,auth.uid(),'Ready');
      round_data:=round_data||jsonb_build_object('submitted',jsonb_build_array(actor));
    end if;
    s:=s||jsonb_build_object('round',round_data,'night',null);
    if kind in ('ready','prediction','bingo') then
      update public.watch_rooms set is_playing=false,playback_position=pos,playback_updated_at=now_at,revision=revision+1,last_actor_id=auth.uid(),last_action='pause' where id=p_room;
    end if;
  elsif p_action='round_answer' then
    round_data:=s->'round';
    if round_data is null or round_data='null'::jsonb or round_data->>'id'<>ident or not (round_data->'users') ? actor or round_data->'answers' is not null then raise exception 'This activity is no longer accepting answers'; end if;
    if char_length(txt) not between 1 and 300 then raise exception 'Write a short answer'; end if;
    if round_data->>'kind'='bingo' and txt not in ('Romantic','Funny','Sad','Shocking','Tense') then raise exception 'Choose a scene description'; end if;
    if round_data->>'kind'='rating' and txt not in ('❤️','😂','😮','🔥','😭') then raise exception 'Choose a reaction'; end if;
    if round_data->>'kind'='truths' then
      if p_data->>'lie' not in ('1','2','3') or p_data->>'lie' is null or char_length(txt)>240 then raise exception 'Choose which of your three statements is the lie'; end if;
      txt:=jsonb_build_object('text',txt,'lie',p_data->>'lie')::text;
    end if;
    insert into private.fun_answers values(p_room,(round_data->>'id')::uuid,auth.uid(),txt) on conflict do nothing;
    select jsonb_agg(user_id::text),jsonb_object_agg(user_id::text,answer) into submitted,answer_map from private.fun_answers where room_id=p_room and round_id=(round_data->>'id')::uuid;
    round_data:=round_data||jsonb_build_object('submitted',submitted);
    if jsonb_array_length(submitted)=2 then
      if round_data->>'kind'='truths' then
        select jsonb_object_agg(user_id::text,answer::jsonb->>'text') into answer_map from private.fun_answers where room_id=p_room and round_id=(round_data->>'id')::uuid;
      end if;
      round_data:=round_data||jsonb_build_object('answers',answer_map,'revealed_at',now_at);
      if round_data->>'kind'='ready' then
        -- Both players use this future authoritative instant, not two client timers.
        update public.watch_rooms set is_playing=true,playback_position=pos,playback_updated_at=now_at+interval '4 seconds',revision=revision+1,last_actor_id=auth.uid(),last_action='play' where id=p_room;
        round_data:=round_data||jsonb_build_object('starts_at',now_at+interval '4 seconds');
      elsif round_data->>'kind'='goodnight' then
        update public.watch_rooms set is_playing=false,playback_position=pos,playback_updated_at=now_at,revision=revision+1,last_actor_id=auth.uid(),last_action='pause' where id=p_room;
        s:=s||jsonb_build_object('night',jsonb_build_object('at',now_at,'messages',answer_map));
      end if;
      if round_data->>'kind'<>'truths' then delete from private.fun_answers where room_id=p_room; end if;
    end if;
    s:=s||jsonb_build_object('round',round_data);
  elsif p_action='bingo_accept' then
    round_data:=s->'round';
    if round_data->>'id' is distinct from ident or round_data->>'kind' is distinct from 'bingo'
      or not coalesce((round_data->'users') ? actor,false) or round_data->'answers' is null
      or round_data->>'winner' is not null or txt not in ('Romantic','Funny','Sad','Shocking','Tense') then
      raise exception 'This bingo round cannot accept a decision';
    end if;
    -- Each player accepts a description. Changing a vote replaces only their own vote.
    items:=coalesce(round_data->'accepted','{}')||jsonb_build_object(actor,txt);
    round_data:=round_data||jsonb_build_object('accepted',items);
    if (select count(*) from jsonb_each_text(items))=2
      and (select count(distinct value) from jsonb_each_text(items))=1 then
      round_data:=round_data||jsonb_build_object('winner',txt,'scored_at',now_at);
      answer_map:=coalesce(s->'bingo_scores','{}');
      for entry in select value from jsonb_array_elements(round_data->'users') loop
        other:=entry#>>'{}';
        if round_data#>>array['answers',other]=txt then
          answer_map:=answer_map||jsonb_build_object(other,coalesce((answer_map->>other)::integer,0)+1);
        end if;
      end loop;
      s:=s||jsonb_build_object('bingo_scores',answer_map);
    end if;
    s:=s||jsonb_build_object('round',round_data);
  elsif p_action='truth_guess' then
    round_data:=s->'round';
    if round_data->>'id' is distinct from ident or round_data->>'kind' is distinct from 'truths' or not coalesce((round_data->'users') ? actor,false) or round_data->'answers' is null or round_data->'lies' is not null or txt not in ('1','2','3') then raise exception 'This guessing round is not available'; end if;
    items:=coalesce(round_data->'guesses','{}');
    if not items ? actor then items:=items||jsonb_build_object(actor,txt); end if;
    round_data:=round_data||jsonb_build_object('guesses',items);
    if (select count(*) from jsonb_object_keys(items))=2 then
      select jsonb_object_agg(user_id::text,answer::jsonb->>'lie') into answer_map from private.fun_answers where room_id=p_room and round_id=(round_data->>'id')::uuid;
      round_data:=round_data||jsonb_build_object('lies',answer_map);
      delete from private.fun_answers where room_id=p_room;
    end if;
    s:=s||jsonb_build_object('round',round_data);
  elsif p_action='round_cancel' then
    round_data:=s->'round';
    if not coalesce((round_data->'users') ? actor,false) and r.host_user_id<>auth.uid() then raise exception 'Only the players or host can cancel'; end if;
    if round_data->>'kind'='ready' and r.is_playing and r.playback_updated_at>now_at then
      update public.watch_rooms set is_playing=false,playback_updated_at=now_at,revision=revision+1,last_actor_id=auth.uid(),last_action='pause' where id=p_room;
    end if;
    s:=s||jsonb_build_object('round',null);
    delete from private.fun_answers where room_id=p_room;
  elsif p_action='night_clear' then s:=s||jsonb_build_object('night',null);
  else raise exception 'Unknown activity';
  end if;
  select coalesce(jsonb_agg(value),'[]') into items from (select value from jsonb_array_elements(s->'recent') with ordinality e(value,n) where n>greatest(0,jsonb_array_length(s->'recent')-31)) e;
  s:=jsonb_set(s,'{recent}',items||jsonb_build_array(p_request::text));
  update public.room_fun set state=s,revision=revision+1,updated_at=now_at where room_id=p_room returning * into f;
  return f;
end; $$;
