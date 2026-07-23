-- ════════════════════════════════════════════════════════════════════════
-- Scale prep: indexes for the hot query paths + a Storage bucket to cache
-- Google Places photos so the same photo isn't re-fetched from Google for
-- every user (see the place-photo Edge Function).
-- ════════════════════════════════════════════════════════════════════════

-- follower-count / "who follows me" lookups (PK already covers follower→…)
create index if not exists follows_followee_idx on public.follows (followee);

-- community-spot bounding-box lookups (Near me), only over the rows we read
create index if not exists community_spots_geo_idx
  on public.community_spots (lat, lng) where status = 'approved';

-- public bucket that caches resolved Places photos (written by the service role
-- inside the Edge Function; readable for CDN delivery)
insert into storage.buckets (id, name, public)
values ('place-photos', 'place-photos', true)
on conflict (id) do nothing;
