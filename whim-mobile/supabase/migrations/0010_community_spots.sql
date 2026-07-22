-- ════════════════════════════════════════════════════════════════════════
-- Whim · community spots (user-submitted "dump your top places")
-- A user pastes their favorite places; the submit-places Edge Function
-- resolves each via Google Places, an LLM sorts it into a Whim vibe + writes
-- a blurb, and it's stored here. Kept SEPARATE from the curated `spots`
-- catalogue so the premium decks stay premium.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.community_spots (
  id           text primary key,                    -- google place_id (storable)
  submitted_by uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  vibe         text not null check (vibe in ('classics', 'matcha', 'nature', 'nightlife')),
  kind         text,
  city         text,
  area         text,
  blurb        text,
  lat          double precision,
  lng          double precision,
  status       text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now()
);

alter table public.community_spots enable row level security;

-- signed-in users may read APPROVED community spots (shared discovery) plus
-- their own submissions regardless of status
create policy "community_spots: read approved or own"
  on public.community_spots for select
  using (status = 'approved' or submitted_by = auth.uid());

-- inserts happen ONLY via the submit-places Edge Function (service role),
-- which validates places + sets submitted_by — so no client insert policy.

create index if not exists community_spots_city_idx on public.community_spots (city, vibe);
create index if not exists community_spots_owner_idx on public.community_spots (submitted_by);

-- reports for community spots (App Store 1.2 UGC) — reuses the moderation
-- pattern; only the service role reads the queue
create table if not exists public.community_reports (
  id           uuid primary key default gen_random_uuid(),
  spot_id      text not null references public.community_spots (id) on delete cascade,
  reporter_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason       text,
  created_at   timestamptz not null default now()
);
alter table public.community_reports enable row level security;
create policy "community_reports: file own"
  on public.community_reports for insert
  with check (auth.uid() = reporter_id);
