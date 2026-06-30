-- ════════════════════════════════════════════════════════════════════════
-- Whim · initial schema
-- Paste this whole file into Supabase → SQL Editor → Run.
-- Every table has RLS ENABLED with explicit policies (default-deny otherwise).
-- ════════════════════════════════════════════════════════════════════════

-- ── profiles ────────────────────────────────────────────────────────────
-- One row per auth user. Created automatically by a trigger on signup.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- a user may read & update ONLY their own profile
create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- ── spots (curated catalogue) ────────────────────────────────────────────
-- Read-only to clients. Writes happen only from the server (secret key /
-- Edge Function), so there is NO insert/update/delete policy here.
create table if not exists public.spots (
  id          text primary key,           -- e.g. 'senso'
  city        text not null,
  vibes       text[] not null default '{}',-- which vibes this spot belongs to
  title       text not null,
  kind        text,
  area        text,
  hours       text,
  tone        text,                        -- placeholder colour until imagery
  photo       text,                        -- image URL / description
  tags        text[] not null default '{}',
  description text,
  lat         double precision,
  lng         double precision,
  nearby      jsonb not null default '[]'::jsonb, -- MicroActivity[]
  created_at  timestamptz not null default now()
);

alter table public.spots enable row level security;

-- anyone (even anon) may read the catalogue; nobody may write from the client
create policy "spots: public read"
  on public.spots for select
  using (true);

-- ── saved_spots (the Hitlist / bucket list) ───────────────────────────────
-- Maps directly to the app's BucketAnchor: one anchor spot + the micro-activity
-- ids the user toggled on.
create table if not exists public.saved_spots (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  spot_id            text not null references public.spots (id) on delete cascade,
  micro_activity_ids text[] not null default '{}',
  city               text,
  vibe               text,
  created_at         timestamptz not null default now(),
  unique (user_id, spot_id)               -- can't save the same spot twice
);

alter table public.saved_spots enable row level security;

-- a user may do anything ONLY with their own saved rows
create policy "saved_spots: own rows"
  on public.saved_spots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists saved_spots_user_idx on public.saved_spots (user_id);

-- ── auto-create a profile on signup ──────────────────────────────────────
-- SECURITY DEFINER so it can insert into profiles regardless of RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
