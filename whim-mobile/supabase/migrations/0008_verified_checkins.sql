-- ════════════════════════════════════════════════════════════════════════
-- Whim · verified check-ins
-- A stamp is "verified" when the device was physically near the spot at
-- check-in time (GPS proximity, checked client-side). Legacy stamps keep
-- working as unverified; public/Strava-style stats will count verified only.
-- ════════════════════════════════════════════════════════════════════════

alter table public.checkins
  add column if not exists verified boolean not null default false;
