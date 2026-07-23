-- ════════════════════════════════════════════════════════════════════════
-- Cache for "Near me". Without it, every open of Near me is a live (billed)
-- Google searchNearby — so a busy area with many users = many identical Google
-- calls. Keyed by a ~1 km GPS grid + radius so nearby users share one result.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.nearby_cache (
  key        text primary key,
  result     jsonb not null,
  fetched_at timestamptz not null default now()
);
-- RLS on with NO policies → only the service role (inside the Edge Function).
alter table public.nearby_cache enable row level security;
create index if not exists nearby_cache_fetched_idx on public.nearby_cache (fetched_at);

-- fold nearby into the opportunistic cache purge (short-lived — spots/ratings drift)
create or replace function public.purge_expired_caches()
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.geocode_cache where fetched_at < now() - interval '30 days';
  delete from public.transit_cache where fetched_at < now() - interval '90 days';
  delete from public.nearby_cache  where fetched_at < now() - interval '7 days';
end $$;
