-- ════════════════════════════════════════════════════════════════════════
-- Read the funnel. analytics_events is write-only from the client (no select
-- policy), so this admin-only function returns an aggregated summary the in-app
-- dashboard renders — you can see the funnel without touching SQL.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.admin_analytics(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin  boolean;
  v_events jsonb;
  v_dau    jsonb;
  v_errors int;
  v_users  int;
begin
  select is_admin into v_admin from public.profiles where id = auth.uid();
  if not coalesce(v_admin, false) then
    return jsonb_build_object('error', 'admins only');
  end if;

  -- events over the window, with how many distinct people did each
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_events from (
    select event, count(*)::int as count, count(distinct user_id)::int as users
    from public.analytics_events
    where created_at > now() - make_interval(days => p_days)
    group by event
    order by count(*) desc
  ) t;

  -- daily active users, last 14 days
  select coalesce(jsonb_agg(row_to_json(d) order by (d).day), '[]'::jsonb) into v_dau from (
    select (created_at at time zone 'utc')::date as day, count(distinct user_id)::int as users
    from public.analytics_events
    where created_at > now() - interval '14 days'
    group by (created_at at time zone 'utc')::date
  ) d;

  select count(*)::int into v_errors from public.error_logs where created_at > now() - make_interval(days => p_days);
  select count(*)::int into v_users  from public.profiles;

  return jsonb_build_object('events', v_events, 'dau', v_dau, 'errors', v_errors, 'users', v_users, 'days', p_days);
end $$;

revoke all on function public.admin_analytics(int) from public, anon;
grant execute on function public.admin_analytics(int) to authenticated;
