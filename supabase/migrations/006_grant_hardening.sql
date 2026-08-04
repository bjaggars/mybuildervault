-- ============================================================
-- MyBuilderVault — DB change script 006: grant_platform_owner
-- hardening. WHY (incident 2026-08-04): the 002 version matched
-- email case-sensitively and returned void — called before the
-- auth user existed, it no-oped silently and the founder landed
-- on "No workspace yet" instead of Mission Control. Now: case-
-- insensitive match, raises on zero matches, reports what it did.
-- Run on: mybuildervault-dev. Prod via release ritual.
-- ============================================================

create or replace function grant_platform_owner(p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  select id into v_id from people where lower(email) = lower(p_email);
  if v_id is null then
    raise exception 'grant_platform_owner: no people row for % — create the auth user first (the 001 trigger populates people)', p_email;
  end if;
  insert into platform_staff (person_id, role)
  values (v_id, 'owner')
  on conflict (person_id) do update set role = 'owner';
  return 'owner granted to ' || p_email;
end $$;
revoke execute on function grant_platform_owner(text) from public, anon, authenticated;

notify pgrst, 'reload schema';

-- PROVE-IT · PASS: src_has_lower = 1 · src_raises = 1
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'grant_platform_owner'
      and p.prosrc like '%lower(email)%') as src_has_lower,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'grant_platform_owner'
      and p.prosrc like '%raise exception%') as src_raises;
