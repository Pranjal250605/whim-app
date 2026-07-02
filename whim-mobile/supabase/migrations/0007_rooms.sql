-- ════════════════════════════════════════════════════════════════════════
-- Whim · Group Rooms ("swipe places together")
-- Friends join a room by invite code, everyone swipes the same city+vibe
-- deck, and spots EVERYONE likes become group matches.
--
-- Security model:
--   · All tables RLS-enabled. Reads require room membership.
--   · Clients never insert into rooms/room_members directly — creation and
--     joining go through security-definer RPCs (create_room / join_room).
--   · Votes are the only direct client write, own-rows only.
--   · Membership checks use is_room_member() (security definer) to avoid
--     recursive RLS policies.
-- ════════════════════════════════════════════════════════════════════════

-- ── rooms ─────────────────────────────────────────────────────────────────
create table if not exists public.rooms (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,                -- short invite code
  host_id    uuid not null references auth.users (id) on delete cascade,
  name       text,
  city       text not null,
  vibe       text not null check (vibe in ('classics','matcha','nature','nightlife')),
  status     text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
-- (policies added below, after the is_room_member helper exists)

-- ── room_members ──────────────────────────────────────────────────────────
create table if not exists public.room_members (
  room_id   uuid not null references public.rooms (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.room_members enable row level security;

-- ── membership helper (breaks RLS recursion; needs room_members to exist) ─
create or replace function public.is_room_member(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room and user_id = auth.uid()
  );
$$;

-- ── policies (default-deny beyond these) ─────────────────────────────────
create policy "rooms: members read"
  on public.rooms for select
  using (public.is_room_member(id) or host_id = auth.uid());

create policy "rooms: host updates"
  on public.rooms for update
  using (auth.uid() = host_id) with check (auth.uid() = host_id);
-- no insert/delete policies on rooms → writes only via RPCs / cascade

create policy "room_members: members read"
  on public.room_members for select
  using (public.is_room_member(room_id));
-- member inserts only via join_room / create_room RPCs

-- ── room_votes ────────────────────────────────────────────────────────────
create table if not exists public.room_votes (
  room_id    uuid not null references public.rooms (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  spot_id    text not null references public.spots (id) on delete cascade,
  liked      boolean not null,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id, spot_id)
);

alter table public.room_votes enable row level security;

create policy "room_votes: members read"
  on public.room_votes for select
  using (public.is_room_member(room_id));

create policy "room_votes: own insert"
  on public.room_votes for insert
  with check (auth.uid() = user_id and public.is_room_member(room_id));

create policy "room_votes: own update"
  on public.room_votes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists room_votes_room_idx on public.room_votes (room_id, liked);

-- ── RPC: create a room (host auto-joins) ─────────────────────────────────
create or replace function public.create_room(p_city text, p_vibe text, p_name text default null)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_room public.rooms;
  v_code text;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if p_city is null or char_length(p_city) > 60 then raise exception 'Invalid city'; end if;

  loop
    -- 6 chars from an alphabet without lookalikes (no 0/O, 1/I/L)
    select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::int, 1), '')
      into v_code
      from generate_series(1, 6);
    begin
      insert into public.rooms (code, host_id, name, city, vibe)
      values (v_code, v_uid, nullif(left(coalesce(p_name, ''), 40), ''), p_city, p_vibe)
      returning * into v_room;
      exit;
    exception when unique_violation then
      -- code collision — roll again
    end;
  end loop;

  insert into public.room_members (room_id, user_id) values (v_room.id, v_uid);
  return v_room;
end;
$$;

-- ── RPC: join a room by invite code ──────────────────────────────────────
create or replace function public.join_room(p_code text)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_room public.rooms;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;

  select * into v_room
  from public.rooms
  where code = upper(trim(p_code)) and status = 'open';
  if not found then raise exception 'No open room with that code'; end if;

  if (select count(*) from public.room_members where room_id = v_room.id) >= 12 then
    raise exception 'This room is full';
  end if;

  insert into public.room_members (room_id, user_id)
  values (v_room.id, v_uid)
  on conflict do nothing;

  return v_room;
end;
$$;

-- ── RPC: members with display names (profiles stay own-row-only) ─────────
create or replace function public.get_room_members(p_room uuid)
returns table (user_id uuid, display_name text, joined_at timestamptz, is_host boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_room_member(p_room) then raise exception 'Not a member of this room'; end if;
  return query
    select m.user_id, p.display_name, m.joined_at, (m.user_id = r.host_id)
    from public.room_members m
    join public.rooms r on r.id = m.room_id
    left join public.profiles p on p.id = m.user_id
    where m.room_id = p_room
    order by m.joined_at;
end;
$$;

-- ── RPC: group matches — spots EVERY current member liked ────────────────
create or replace function public.get_room_matches(p_room uuid)
returns table (spot_id text, likes bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_room_member(p_room) then raise exception 'Not a member of this room'; end if;
  return query
    select v.spot_id, count(*) as likes
    from public.room_votes v
    where v.room_id = p_room and v.liked
    group by v.spot_id
    having count(*) >= (select count(*) from public.room_members where room_id = p_room)
    order by count(*) desc, v.spot_id;
end;
$$;

-- ── RPC: the caller's rooms (for the hub list) ───────────────────────────
create or replace function public.my_rooms()
returns table (id uuid, code text, host_id uuid, name text, city text, vibe text,
               status text, created_at timestamptz, member_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.code, r.host_id, r.name, r.city, r.vibe, r.status, r.created_at,
         (select count(*) from public.room_members m2 where m2.room_id = r.id)
  from public.rooms r
  join public.room_members m on m.room_id = r.id and m.user_id = auth.uid()
  order by r.created_at desc;
$$;

-- ── grants: signed-in clients only ───────────────────────────────────────
revoke all on function public.is_room_member(uuid) from public, anon;
revoke all on function public.create_room(text, text, text) from public, anon;
revoke all on function public.join_room(text) from public, anon;
revoke all on function public.get_room_members(uuid) from public, anon;
revoke all on function public.get_room_matches(uuid) from public, anon;
revoke all on function public.my_rooms() from public, anon;
grant execute on function public.is_room_member(uuid) to authenticated, service_role;
grant execute on function public.create_room(text, text, text) to authenticated, service_role;
grant execute on function public.join_room(text) to authenticated, service_role;
grant execute on function public.get_room_members(uuid) to authenticated, service_role;
grant execute on function public.get_room_matches(uuid) to authenticated, service_role;
grant execute on function public.my_rooms() to authenticated, service_role;

-- ── realtime: votes + membership stream into subscribed clients ─────────
-- (postgres_changes respects RLS, so only members receive a room's events)
alter publication supabase_realtime add table public.room_votes;
alter publication supabase_realtime add table public.room_members;
