-- ════════════════════════════════════════════════════════════════════════
-- Admin approval: close the UGC loop. An admin can approve a community spot
-- into the official curated `spots` deck (done server-side by the promote-spot
-- Edge Function, which checks is_admin). A promoted spot leaves the community
-- feed (status 'promoted') and appears in the curated deck instead.
-- ════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- allow the new 'promoted' status on community spots
alter table public.community_spots
  drop constraint if exists community_spots_status_check;
alter table public.community_spots
  add constraint community_spots_status_check
  check (status in ('pending', 'approved', 'rejected', 'promoted'));
