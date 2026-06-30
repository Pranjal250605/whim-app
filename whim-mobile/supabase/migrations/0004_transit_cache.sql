-- ════════════════════════════════════════════════════════════════════════
-- Whim · transit route cache
-- Backs the transit-route Edge Function: each origin→destination leg is fetched
-- from Google Directions once, then served from here. RLS ON, no client
-- policies → only the Edge Function (service role) touches it.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.transit_cache (
  key        text primary key,        -- "oLat,oLng|dLat,dLng"
  result     jsonb not null,          -- parsed transit segments we reuse
  fetched_at timestamptz not null default now()
);

alter table public.transit_cache enable row level security;
-- (intentionally no policies → locked to the service role only)
