-- ════════════════════════════════════════════════════════════════════════
-- Whim · published itineraries (users publish a whole day-plan for others)
--
-- A user builds a trip by saving spots (the private itinerary screen orders +
-- maps them), then PUBLISHES it: title, optional note, and the ordered list of
-- curated spot ids. Others browse these in the community feed and open a
-- read-only trip view that resolves the ids back to full spots.
--
-- Design notes:
--  • stop_spot_ids references the curated `spots` catalogue (storable ids). We
--    keep the ids (not a copy of the spot) so trips stay in sync with the
--    catalogue; cover + stop_count are denormalized so the feed card needs no
--    joins.
--  • author_name is a SNAPSHOT of the publisher's display name. `profiles` is
--    read-own-only (privacy), so a feed can't join to it — snapshotting is how
--    "by <name>" renders without exposing the profiles table.
--  • No external API/LLM here, so unlike community_spots this inserts directly
--    from the client under RLS (author = auth.uid()); size limits are column
--    CHECKs so a client can't stuff huge payloads.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.published_itineraries (
  id            uuid primary key default gen_random_uuid(),
  author        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name   text,
  title         text not null check (char_length(title) between 1 and 80),
  note          text check (note is null or char_length(note) <= 500),
  city          text,
  vibe          text check (vibe is null or vibe in ('classics', 'matcha', 'nature', 'nightlife')),
  stop_spot_ids text[] not null check (array_length(stop_spot_ids, 1) between 1 and 30),
  stop_count    int not null default 0,
  cover         text,
  status        text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  created_at    timestamptz not null default now()
);

alter table public.published_itineraries enable row level security;

-- read APPROVED trips (shared discovery) plus your own regardless of status
create policy "published_itineraries: read approved or own"
  on public.published_itineraries for select
  using (status = 'approved' or author = auth.uid());

-- publish only as yourself
create policy "published_itineraries: insert own"
  on public.published_itineraries for insert
  with check (author = auth.uid());

-- edit / unpublish only your own (author can't be reassigned)
create policy "published_itineraries: update own"
  on public.published_itineraries for update
  using (author = auth.uid()) with check (author = auth.uid());

create policy "published_itineraries: delete own"
  on public.published_itineraries for delete
  using (author = auth.uid());

create index if not exists published_itineraries_feed_idx on public.published_itineraries (status, created_at desc);
create index if not exists published_itineraries_author_idx on public.published_itineraries (author);
create index if not exists published_itineraries_city_idx on public.published_itineraries (city, vibe);

-- reports (App Store 1.2 UGC moderation) — only the service role reads the queue
create table if not exists public.itinerary_reports (
  id            uuid primary key default gen_random_uuid(),
  itinerary_id  uuid not null references public.published_itineraries (id) on delete cascade,
  reporter_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason        text,
  created_at    timestamptz not null default now()
);
alter table public.itinerary_reports enable row level security;
create policy "itinerary_reports: file own"
  on public.itinerary_reports for insert
  with check (auth.uid() = reporter_id);
