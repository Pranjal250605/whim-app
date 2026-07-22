-- ════════════════════════════════════════════════════════════════════════
-- Custom, build-your-own trips. Until now a published itinerary was a list of
-- curated spot ids (stop_spot_ids). To let people build a trip for ANY place
-- (e.g. Goa) from their own searched locations — and to let anyone remix a
-- sample into their own editable copy — a trip can now instead carry an
-- embedded, ordered list of stops.
--
--   stops jsonb = [ { title, placeId?, spotId?, lat, lng, kind, area, day } … ]
--
-- The trip view renders from `stops` when present, else resolves stop_spot_ids
-- (existing curated/editor trips). Exactly one of the two is set.
-- ════════════════════════════════════════════════════════════════════════

alter table public.published_itineraries alter column stop_spot_ids drop not null;
alter table public.published_itineraries add column if not exists stops jsonb;
-- one representation or the other must be present
alter table public.published_itineraries drop constraint if exists published_itineraries_has_stops;
alter table public.published_itineraries
  add constraint published_itineraries_has_stops
  check (stop_spot_ids is not null or stops is not null);
