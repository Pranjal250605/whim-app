-- ════════════════════════════════════════════════════════════════════════
-- Whim · hardening
--   1. profiles.display_name gets a length cap (and the signup trigger clamps
--      it, so an oversized value can never fail signup).
--   2. edge_usage + bump_edge_usage(): per-user daily rate caps for the billed
--      Edge Functions (search-place / transit-route). Service-role only.
--   3. Indexes + purge helper so the geocode/transit caches can't grow forever.
-- Apply BEFORE redeploying the Edge Functions (they call bump_edge_usage,
-- though they fail open with a warning if it's missing).
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. display_name cap ──────────────────────────────────────────────────
update public.profiles
  set display_name = left(display_name, 60)
  where char_length(display_name) > 60;

alter table public.profiles
  drop constraint if exists profiles_display_name_len;
alter table public.profiles
  add constraint profiles_display_name_len
  check (display_name is null or char_length(display_name) <= 60);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), 60)
  );
  return new;
end;
$$;

-- ── 2. per-user daily usage counters for billed Edge Functions ───────────
-- RLS ON with NO policies → only the service role (inside Edge Functions)
-- can touch it. Clients can neither read nor inflate counters.
create table if not exists public.edge_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  fn      text not null,
  calls   int  not null default 0,
  primary key (user_id, day, fn)
);

alter table public.edge_usage enable row level security;

-- Atomically count a call and report whether the caller is still under cap.
create or replace function public.bump_edge_usage(p_user uuid, p_fn text, p_cap int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_calls int;
begin
  insert into public.edge_usage (user_id, day, fn, calls)
  values (p_user, (now() at time zone 'utc')::date, p_fn, 1)
  on conflict (user_id, day, fn)
  do update set calls = public.edge_usage.calls + 1
  returning calls into v_calls;
  return v_calls <= p_cap;
end;
$$;

-- callable by the service role only — never from the client. (Revoking from
-- PUBLIC also strips service_role's implicit grant, so re-grant explicitly:
-- service_role bypasses RLS but NOT function execute privileges.)
revoke all on function public.bump_edge_usage(uuid, text, int) from public, anon, authenticated;
grant execute on function public.bump_edge_usage(uuid, text, int) to service_role;

-- ── 3. cache growth control ──────────────────────────────────────────────
create index if not exists geocode_cache_fetched_idx on public.geocode_cache (fetched_at);
create index if not exists transit_cache_fetched_idx on public.transit_cache (fetched_at);

-- Delete expired cache rows + usage counters older than a week. The Edge
-- Functions call this opportunistically (~2% of requests), so no cron needed.
create or replace function public.purge_expired_caches()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.geocode_cache where fetched_at < now() - interval '30 days';
  delete from public.transit_cache where fetched_at < now() - interval '90 days';
  delete from public.edge_usage    where day        < (now() at time zone 'utc')::date - 7;
end;
$$;

revoke all on function public.purge_expired_caches() from public, anon, authenticated;
grant execute on function public.purge_expired_caches() to service_role;
