-- ════════════════════════════════════════════════════════════════════════
-- Whim · geocode cache
-- Backs the cache-aside strategy: Mapbox is queried once per place, then served
-- from here. RLS is ON with NO client policies, so only the Edge Function
-- (service role, which bypasses RLS) can read/write it — clients never touch it.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.geocode_cache (
  query      text primary key,        -- normalised lookup key
  result     jsonb not null,          -- raw Mapbox response we reuse
  fetched_at timestamptz not null default now()
);

alter table public.geocode_cache enable row level security;
-- (intentionally no policies → locked to service role only)
