-- ════════════════════════════════════════════════════════════════════════
-- Whim · Group Rooms moderation (App Store Guideline 1.2 for UGC)
-- A room shows other members' display names — user-generated content. Apple
-- requires: report objectionable content, block abusive users, and leave.
-- ════════════════════════════════════════════════════════════════════════

-- ── reports: a member flags another member (offensive name / behaviour) ──
create table if not exists public.room_reports (
  id               uuid primary key default gen_random_uuid(),
  room_id          uuid not null references public.rooms (id) on delete cascade,
  reporter_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reported_user_id uuid not null references auth.users (id) on delete cascade,
  reason           text,
  created_at       timestamptz not null default now()
);
alter table public.room_reports enable row level security;

-- a member may file a report for a room they're in; nobody reads from the
-- client (RLS has no select policy) → only the service role sees the queue
create policy "room_reports: members file own"
  on public.room_reports for insert
  with check (auth.uid() = reporter_id and public.is_room_member(room_id));

create index if not exists room_reports_open_idx on public.room_reports (created_at);

-- ── blocks: a personal block list; you stop seeing blocked users ─────────
create table if not exists public.blocked_users (
  blocker_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocked_users enable row level security;

create policy "blocked_users: own rows"
  on public.blocked_users for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

-- ── leaving a room: let a member delete their OWN membership ─────────────
-- (room_members previously had no delete policy — this enables "Leave room")
drop policy if exists "room_members: leave own" on public.room_members;
create policy "room_members: leave own"
  on public.room_members for delete
  using (auth.uid() = user_id);
