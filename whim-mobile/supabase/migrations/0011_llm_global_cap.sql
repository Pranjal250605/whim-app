-- ════════════════════════════════════════════════════════════════════════
-- Global (all-users) daily circuit-breaker for the paid-AI Edge Functions.
--
-- The per-user caps in 0006 stop one account from running up the bill. They
-- do NOT stop someone farming many accounts to multiply a paid LLM budget
-- (submit-places calls Anthropic on real money). This adds a hard ceiling on
-- total calls per function per UTC day, independent of who makes them — a
-- catastrophe brake, set well above honest usage.
--
-- Apply BEFORE redeploying submit-places (it calls bump_global_usage, but
-- fails open with a warning if this migration isn't applied yet).
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.edge_usage_global (
  day   date not null,
  fn    text not null,
  calls int  not null default 0,
  primary key (day, fn)
);

-- RLS ON with NO policies → only the service role (inside Edge Functions) can
-- read or write. Clients can neither inspect nor reset the global counter.
alter table public.edge_usage_global enable row level security;

-- Atomically count one call for this function (per UTC day) and report whether
-- the day is still under `p_cap`. Same row-lock serialization as bump_edge_usage,
-- so concurrent bursts can't overshoot the ceiling.
create or replace function public.bump_global_usage(p_fn text, p_cap int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_calls int;
begin
  insert into public.edge_usage_global (day, fn, calls)
  values ((now() at time zone 'utc')::date, p_fn, 1)
  on conflict (day, fn)
  do update set calls = public.edge_usage_global.calls + 1
  returning calls into v_calls;
  return v_calls <= p_cap;
end;
$$;

-- service role only — never callable from the client.
revoke all on function public.bump_global_usage(text, int) from public, anon, authenticated;
grant execute on function public.bump_global_usage(text, int) to service_role;
