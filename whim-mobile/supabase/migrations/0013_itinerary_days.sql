-- ════════════════════════════════════════════════════════════════════════
-- Multi-day itineraries. Adds an optional per-stop day number parallel to
-- stop_spot_ids, so an itinerary can be grouped into Day 1 / Day 2 / Day 3.
--
--   stop_spot_ids = ['a','b','c','d']
--   stop_days     = [ 1,  1,  2,  3 ]   -- a,b are Day 1; c is Day 2; d is Day 3
--
-- NULL = a single flat list (how user-published trips stay). The trip view
-- groups by day when this is present and gives each day its own Maps route,
-- which also keeps every Google Maps link under its waypoint limit.
-- ════════════════════════════════════════════════════════════════════════

alter table public.published_itineraries
  add column if not exists stop_days smallint[];
