-- Re-assert "Leave room" (room_members delete-own) — found broken in prod 2026-09-30.
--
-- 0009 defines this policy, but in production a member's delete of their own
-- room_members row returns 200 with 0 rows (RLS silently filters it), so
-- "Leave room" did nothing. Other 0009 objects (blocked_users) exist, so the
-- migration was likely applied partially. Idempotent — safe to re-run.
--
-- Check before/after:
--   select policyname, cmd, qual from pg_policies
--   where schemaname = 'public' and tablename = 'room_members';
--   select privilege_type from information_schema.role_table_grants
--   where table_name = 'room_members' and grantee = 'authenticated';

alter table public.room_members enable row level security;

drop policy if exists "room_members: leave own" on public.room_members;
create policy "room_members: leave own"
  on public.room_members for delete
  to authenticated
  using (auth.uid() = user_id);

-- RLS policies only filter rows; the role also needs the table privilege.
grant delete on public.room_members to authenticated;
