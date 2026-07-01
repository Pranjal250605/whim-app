-- ════════════════════════════════════════════════════════════════════════
-- Whim · check-ins (the "Passport")
-- One row per spot the user has visited. RLS: own rows only.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  spot_id    text not null references public.spots (id) on delete cascade,
  city       text,
  created_at timestamptz not null default now(),
  unique (user_id, spot_id)
);

alter table public.checkins enable row level security;

create policy "checkins own rows"
  on public.checkins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists checkins_user_idx on public.checkins (user_id);
