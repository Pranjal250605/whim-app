-- ════════════════════════════════════════════════════════════════════════
-- Top-3 improvements: (1) analytics + crash logging, (2) real place photos,
-- (3) push-notification plumbing.
-- ════════════════════════════════════════════════════════════════════════

-- 1a. product analytics — funnel events. Users insert their own; only the
--     service role (a dashboard/export) can read. Write-only from the client.
create table if not exists public.analytics_events (
  id         bigint generated always as identity primary key,
  user_id    uuid default auth.uid() references auth.users (id) on delete set null,
  event      text not null,
  props      jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.analytics_events enable row level security;
create policy "analytics: insert own" on public.analytics_events for insert
  with check (user_id is null or user_id = auth.uid());
create index if not exists analytics_events_idx on public.analytics_events (event, created_at desc);

-- 1b. crash / error logs — same shape, write-only from the client.
create table if not exists public.error_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid default auth.uid() references auth.users (id) on delete set null,
  message    text not null,
  stack      text,
  fatal      boolean not null default false,
  context    jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.error_logs enable row level security;
create policy "errors: insert own" on public.error_logs for insert
  with check (user_id is null or user_id = auth.uid());
create index if not exists error_logs_idx on public.error_logs (created_at desc);

-- 2. real place photos: store a resolved Google place_id per curated spot so the
--    app can render the live (cached) Google photo instead of a stock image.
alter table public.spots add column if not exists place_id text;

-- 3. push tokens — one per device, owned by the user; a trigger reads these to
--    notify followers when someone earns a badge.
create table if not exists public.push_tokens (
  user_id    uuid not null references auth.users (id) on delete cascade,
  token      text not null,
  platform   text,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);
alter table public.push_tokens enable row level security;
create policy "push_tokens: own rows" on public.push_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
