-- ============================================================
-- MyBuilderVault — DB change script 011: Cost basis + dashboard
-- prefs + persona role expansion (PERSONAS.md v2, approved 8/4).
--   1. cost on estimate_lines + change_order_lines — the internal
--      cost beside the client price. Nullable (unknown is honest;
--      margin math treats null as no-forecast for that line).
--      Contract snapshots pick it up automatically (to_jsonb).
--   2. org_members.dashboard_prefs jsonb — seat-scoped widget
--      layout for the customizable dashboard catalog.
--   3. org_members.role expands: + estimator, selections,
--      warranty, field, accounting, office.
--   4. job_participants.role expands: + architect, engineer,
--      lender, owners_rep.
-- Constraint swaps use the 005 pattern (drop any in-list check by
-- shape, re-add under a known name) so auto-named originals can't
-- conflict. App-side invite dropdown gains the new roles in the
-- dashboard-shell build block.
-- Run on: mybuildervault-dev FIRST. Prod via release ritual.
-- ============================================================

-- ---------- 1. cost basis ----------
alter table estimate_lines     add column if not exists cost numeric(12,2);
alter table change_order_lines add column if not exists cost numeric(12,2);

-- ---------- 2. dashboard prefs ----------
alter table org_members add column if not exists dashboard_prefs jsonb;

-- ---------- 3. org_members role expansion ----------
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'org_members'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%role = ANY%'
  loop
    execute format('alter table org_members drop constraint %I', c.conname);
  end loop;
end $$;
alter table org_members add constraint org_members_role_check
  check (role in ('owner','admin','pm','sales','super',
                  'estimator','selections','warranty','field',
                  'accounting','office'));

-- ---------- 4. job_participants role expansion ----------
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'job_participants'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%role = ANY%'
  loop
    execute format('alter table job_participants drop constraint %I', c.conname);
  end loop;
end $$;
alter table job_participants add constraint job_participants_role_check
  check (role in ('client_primary','client_co','sub','vendor','agent',
                  'architect','engineer','lender','owners_rep'));

-- ---------- 5. Reload PostgREST ----------
notify pgrst, 'reload schema';

-- ---------- 6. PROVE-IT ----------
-- PASS conditions (mybuildervault-dev):
--   cost_cols = 2 · prefs_col = 1 · member_roles = 11 · participant_roles = 9
select
  (select count(*) from information_schema.columns
     where table_schema='public' and column_name='cost'
       and table_name in ('estimate_lines','change_order_lines')) as cost_cols,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='org_members'
       and column_name='dashboard_prefs') as prefs_col,
  (select count(*)
     from unnest(array['owner','admin','pm','sales','super','estimator',
                       'selections','warranty','field','accounting','office']) v
     where exists (select 1 from pg_constraint
                   where conname='org_members_role_check'
                     and pg_get_constraintdef(oid) like '%' || v || '%')) as member_roles,
  (select count(*)
     from unnest(array['client_primary','client_co','sub','vendor','agent',
                       'architect','engineer','lender','owners_rep']) v
     where exists (select 1 from pg_constraint
                   where conname='job_participants_role_check'
                     and pg_get_constraintdef(oid) like '%' || v || '%')) as participant_roles;
