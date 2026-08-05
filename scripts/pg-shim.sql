-- ============================================================
-- MyBuilderVault — vanilla-Postgres shim for the recalc smoke
-- (scripts/smoke-recalc.mjs). NOT a DB change script; never runs
-- on Supabase. Provides just enough of the Supabase environment
-- (auth schema, auth.uid(), platform roles) for the REAL
-- migration chain 001..NNN to apply unmodified to a scratch
-- database — the smoke then exercises the committed SQL, not a
-- re-implementation of it (LEARNINGS #14 spirit: one source of
-- truth, tested as committed).
-- ============================================================
create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key,
  email              text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

-- auth.uid() reads the same GUC PostgREST uses; the smoke can
-- impersonate a person with: set request.jwt.claim.sub = '<uuid>';
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;
