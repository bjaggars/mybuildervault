-- ============================================================
-- MyBuilderVault — DB change script 012: save_dashboard_prefs
-- WHY a function: org_members has no self-UPDATE policy on
-- purpose (it would let a member edit their own ROLE). This
-- security-definer function updates ONLY dashboard_prefs, only
-- on the caller's own seat. Raises on zero effect (LEARNINGS #10).
-- Run on: mybuildervault-dev. Prod via release ritual.
-- ============================================================

create or replace function save_dashboard_prefs(p_org uuid, p_prefs jsonb)
returns text language plpgsql security definer set search_path = public as $$
begin
  update org_members
     set dashboard_prefs = p_prefs
   where org_id = p_org and person_id = auth.uid();
  if not found then
    raise exception 'save_dashboard_prefs: no seat for caller in org %', p_org;
  end if;
  return 'saved';
end $$;

notify pgrst, 'reload schema';

-- PROVE-IT · PASS: fn = 1 · self_scoped = 1
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname='save_dashboard_prefs') as fn,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname='save_dashboard_prefs'
      and p.prosrc like '%person_id = auth.uid()%') as self_scoped;
