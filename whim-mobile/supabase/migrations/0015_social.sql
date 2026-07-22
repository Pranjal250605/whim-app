-- ════════════════════════════════════════════════════════════════════════
-- Social layer: @usernames, a follow graph, and tiered city badges.
--
--  • username: a public handle so people can find each other.
--  • public_profiles: a view exposing ONLY (id, username, display_name) so the
--    app can search/show other users without opening the profiles table (which
--    stays read-own so is_admin etc. never leak).
--  • follows: asymmetric (Strava-style) — you follow someone and immediately
--    see their badges + activity; no approval.
--  • badges: one row per (user, city), auto-maintained by a trigger on
--    check-ins. Tier climbs Bronze→Silver→Gold with the number of spots.
--    Readable by the owner and their followers, which powers the friends feed.
-- ════════════════════════════════════════════════════════════════════════

-- ── usernames ────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists username text;
alter table public.profiles drop constraint if exists profiles_username_fmt;
alter table public.profiles
  add constraint profiles_username_fmt
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

-- Public, column-limited view of profiles. Runs as owner (bypasses profiles
-- RLS) but exposes only these three columns — the app reads this for search
-- and to show other people's handles/names.
create or replace view public.public_profiles as
  select id, username, display_name from public.profiles;
grant select on public.public_profiles to authenticated, anon;

-- ── follows (asymmetric) ─────────────────────────────────────────────────
create table if not exists public.follows (
  follower   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  followee   uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
alter table public.follows enable row level security;
create policy "follows: see own edges" on public.follows for select
  using (follower = auth.uid() or followee = auth.uid());
create policy "follows: follow as self" on public.follows for insert
  with check (follower = auth.uid());
create policy "follows: unfollow own" on public.follows for delete
  using (follower = auth.uid());

-- ── badges ───────────────────────────────────────────────────────────────
create table if not exists public.badges (
  user_id    uuid not null references auth.users (id) on delete cascade,
  city       text not null,
  spot_count int  not null default 0,
  tier       smallint not null default 1,   -- 1 bronze · 2 silver · 3 gold
  earned_at  timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, city)
);
alter table public.badges enable row level security;
-- read your own badges, or those of anyone you follow (powers the friends feed)
create policy "badges: own or followed" on public.badges for select
  using (
    user_id = auth.uid()
    or exists (select 1 from public.follows f where f.follower = auth.uid() and f.followee = public.badges.user_id)
  );
-- no client writes — the trigger below is the only writer
create index if not exists badges_feed_idx on public.badges (user_id, updated_at desc);

create or replace function public.badge_tier(n int)
returns smallint language sql immutable as $$
  select (case when n >= 5 then 3 when n >= 3 then 2 else 1 end)::smallint;
$$;

-- Keep a user's city badge in sync with their check-in count. Recomputes from
-- scratch on every insert/delete so un-checking-in can't leave a stale badge.
create or replace function public.sync_badge()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_city text;
  v_count int;
begin
  if tg_op = 'DELETE' then v_user := old.user_id; v_city := old.city;
  else v_user := new.user_id; v_city := new.city; end if;
  if v_city is null then return coalesce(new, old); end if;

  select count(*) into v_count from public.checkins where user_id = v_user and city = v_city;
  if v_count = 0 then
    delete from public.badges where user_id = v_user and city = v_city;
    return coalesce(new, old);
  end if;

  insert into public.badges (user_id, city, spot_count, tier, earned_at, updated_at)
    values (v_user, v_city, v_count, public.badge_tier(v_count), now(), now())
  on conflict (user_id, city) do update
    set spot_count = excluded.spot_count,
        tier       = excluded.tier,
        updated_at = case
          when public.badges.tier <> excluded.tier or public.badges.spot_count <> excluded.spot_count
          then now() else public.badges.updated_at end;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_sync_badge on public.checkins;
create trigger trg_sync_badge after insert or delete on public.checkins
  for each row execute function public.sync_badge();

-- backfill from existing check-ins
insert into public.badges (user_id, city, spot_count, tier, earned_at, updated_at)
  select user_id, city, count(*)::int, public.badge_tier(count(*)::int), min(created_at), max(created_at)
  from public.checkins where city is not null
  group by user_id, city
on conflict (user_id, city) do update
  set spot_count = excluded.spot_count, tier = excluded.tier;
