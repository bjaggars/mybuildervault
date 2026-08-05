-- ============================================================
-- MyBuilderVault — DB change script 015: Progress drift detection
-- (BOARD-033, Brice 8/5/26 — the "25% done with a week left" sniff
--  test from IT project practice, rebuilt builder-native.)
--
-- The incumbents ASK for percent complete (Buildertrend's per-item
-- Progress field, self-reported — the "90% done for three weeks"
-- number). We DERIVE it:
--   expected_pct  how far along the item SHOULD be — elapsed
--                 workdays over duration, from the 014 calendar.
--   actual_pct    field truth — checklist completion ratio across
--                 the item's linked work orders (013 checkboxes,
--                 checked by crews with names and timestamps).
--                 Falls back to schedule_items.manual_pct for
--                 items with no checklisted WO.
--   drift         expected − actual, only while incomplete.
--   work_behind   drift ≥ 25 points → the item is time-elapsed
--                 but work-behind, BEFORE any date slips.
-- Surfaced on the dashboard health card (red segments, at-risk
-- contribution), the schedule list (Prog column), and the drawer.
-- Run on: mybuildervault-dev FIRST. Prod via release ritual.
-- ============================================================

-- ---------- 1. count_workdays: inclusive workdays in [from, to] ----------
create or replace function count_workdays(p_org uuid, p_from date, p_to date, p_ignore boolean default false)
returns int language plpgsql stable security definer set search_path = public as $$
declare v date; k int := 0; i int := 0;
begin
  if p_from is null or p_to is null or p_to < p_from then return 0; end if;
  v := p_from;
  while v <= p_to loop
    if is_workday(p_org, v, p_ignore) then k := k + 1; end if;
    v := v + 1;
    i := i + 1;
    if i > 36600 then raise exception 'count_workdays: runaway — check the org calendar'; end if;
  end loop;
  return k;
end $$;

-- ---------- 2. Manual fallback for items with no checklisted WO ----------
alter table schedule_items add column if not exists manual_pct int
  check (manual_pct is null or (manual_pct >= 0 and manual_pct <= 100));

-- ---------- 3. The drift view ----------
-- security_invoker: RLS of schedule_items / work_orders / work_order_items
-- applies to the caller — clients see exactly what the base policies allow.
drop view if exists v_schedule_item_progress;
create view v_schedule_item_progress with (security_invoker = true) as
select
  si.id                      as item_id,
  si.job_id,
  si.org_id,
  si.status,
  -- expected: complete → 100; not started → 0; else elapsed/duration
  case
    when si.status = 'complete' then 100
    when si.start_date is null then null
    when si.start_date > current_date then 0
    when si.duration_days <= 0 then 100   -- milestone whose date has arrived
    else least(100, round(
      100.0 * count_workdays(si.org_id, si.start_date,
                             least(current_date, si.end_date), si.ignore_workdays)
            / greatest(si.duration_days, 1)))
  end::int                   as expected_pct,
  -- actual: checklist truth first, manual fallback second
  case
    when si.status = 'complete' then 100
    when cl.total > 0 then round(100.0 * cl.done / cl.total)
    else si.manual_pct
  end::int                   as actual_pct,
  (cl.total > 0)             as from_checklist,
  cl.total                   as checklist_total,
  cl.done                    as checklist_done,
  -- drift + flag: only meaningful mid-flight with a real actual
  case
    when si.status = 'complete' then null
    when si.start_date is null or si.start_date > current_date then null
    when cl.total = 0 and si.manual_pct is null then null
    else
      (case
         when si.duration_days <= 0 then 100
         else least(100, round(
           100.0 * count_workdays(si.org_id, si.start_date,
                                  least(current_date, si.end_date), si.ignore_workdays)
                 / greatest(si.duration_days, 1)))
       end
       - case when cl.total > 0 then round(100.0 * cl.done / cl.total)
              else si.manual_pct end)::int
  end                        as drift,
  coalesce(
    case
      when si.status = 'complete' then false
      when si.start_date is null or si.start_date > current_date then false
      when cl.total = 0 and si.manual_pct is null then false
      else
        (case
           when si.duration_days <= 0 then 100
           else least(100, round(
             100.0 * count_workdays(si.org_id, si.start_date,
                                    least(current_date, si.end_date), si.ignore_workdays)
                   / greatest(si.duration_days, 1)))
         end
         - case when cl.total > 0 then round(100.0 * cl.done / cl.total)
                else si.manual_pct end) >= 25
    end, false)              as work_behind
from schedule_items si
left join lateral (
  select count(woi.id)                          as total,
         count(woi.id) filter (where woi.done)  as done
    from work_orders wo
    join work_order_items woi on woi.work_order_id = wo.id
   where wo.schedule_item_id = si.id
     and wo.status not in ('cancelled','declined')
) cl on true;

-- ---------- 4. Reload PostgREST ----------
notify pgrst, 'reload schema';

-- ---------- 5. PROVE-IT ----------
-- PASS conditions (mybuildervault-dev):
--   drift_view    = 1   (v_schedule_item_progress, security_invoker)
--   count_fn      = 1   (count_workdays)
--   manual_col    = 1   (schedule_items.manual_pct)
--   view_cols     = 10  (item_id, job_id, org_id, status, expected_pct,
--                        actual_pct, from_checklist, checklist_total,
--                        checklist_done, drift, work_behind → 11; the
--                        check below counts the 4 named engine columns)
--   engine_cols   = 4   (expected_pct, actual_pct, drift, work_behind)
select
  (select count(*) from pg_views
     where schemaname = 'public' and viewname = 'v_schedule_item_progress') as drift_view,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'count_workdays')            as count_fn,
  (select count(*) from information_schema.columns
     where table_name = 'schedule_items' and column_name = 'manual_pct')     as manual_col,
  (select count(*) from information_schema.columns
     where table_name = 'v_schedule_item_progress'
       and column_name in ('expected_pct','actual_pct','drift','work_behind')) as engine_cols;
