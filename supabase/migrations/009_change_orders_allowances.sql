-- ============================================================
-- MyBuilderVault — DB change script 009: Change Orders + Allowances
-- Financial spine part 2 of 3 (ARCHITECTURE §2.3, APPROVED):
--   change_orders — the Ocala portal's PROVEN status workflow
--     carried forward verbatim: tbd → discussed → considering →
--     approved → in_build, plus included (green, $0, excluded
--     from awaiting-quote), rejected, archived. Per-job numbering
--     via trigger.
--   change_order_lines — derive from estimate_lines or create new
--     scope; NEVER re-keyed duplicates (JobTread lesson).
--   allowances — the emotional center of the product: budgeted
--     amounts client-visible BY DEFAULT (they signed them);
--     actual/variance revealed per-allowance when the BUILDER
--     decides (variance_visible flag) via v_client_allowances —
--     the $9K well overage gets a conversation before a portal
--     surprise. Column-level reveal is done with an owner-rights
--     view because RLS is row-level only.
-- Excel export (Brije 3-column) + CO email reports are app-side.
-- Part 3 (010): selections + actuals + computed budget view.
-- Run on: mybuildervault-dev FIRST. Prod via release ritual.
-- ============================================================

-- ---------- 1. change_orders ----------
create table if not exists change_orders (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references builder_orgs(id) on delete cascade,
  job_id       uuid not null references jobs(id) on delete cascade,
  structure_id uuid references structures(id),
  number       int,                       -- per-job sequence, trigger-assigned
  title        text not null,
  description  text,
  status       text not null default 'tbd'
               check (status in ('tbd','discussed','considering','approved',
                                 'in_build','included','rejected','archived')),
  approved_at  timestamptz,
  approved_by  uuid references people(id),
  created_by   uuid references people(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (job_id, number)
);

create or replace function assign_co_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.number is null then
    select coalesce(max(number), 0) + 1 into new.number
      from change_orders where job_id = new.job_id;
  end if;
  return new;
end $$;
drop trigger if exists change_orders_number on change_orders;
create trigger change_orders_number before insert on change_orders
  for each row execute function assign_co_number();

drop trigger if exists change_orders_touch on change_orders;
create trigger change_orders_touch before update on change_orders
  for each row execute function touch_jobs_updated_at();  -- same updated_at toucher

-- ---------- 2. change_order_lines — derive, never re-key ----------
create table if not exists change_order_lines (
  id               uuid primary key default gen_random_uuid(),
  change_order_id  uuid not null references change_orders(id) on delete cascade,
  estimate_line_id uuid references estimate_lines(id),  -- set = derived from budget line
  cost_code_id     uuid references cost_codes(id),
  structure_id     uuid references structures(id),
  description      text not null,
  price            numeric(12,2) not null default 0,
  sort             int not null default 0,
  notes            text,
  created_at       timestamptz not null default now()
);
create index if not exists co_lines_co_idx on change_order_lines (change_order_id, sort);

-- ---------- 3. allowances — the variance lifecycle ----------
create table if not exists allowances (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references builder_orgs(id) on delete cascade,
  job_id           uuid not null references jobs(id) on delete cascade,
  structure_id     uuid references structures(id),
  estimate_line_id uuid references estimate_lines(id),  -- origin line (kind='allowance')
  name             text not null,
  budgeted         numeric(12,2) not null default 0,
  actual           numeric(12,2),
  variance         numeric(12,2) generated always as
                   (case when actual is null then null else actual - budgeted end) stored,
  status           text not null default 'open'
                   check (status in ('open','quoted','actual_known','reconciled')),
  variance_visible boolean not null default false,  -- the builder-controlled reveal
  notes            text,
  created_at       timestamptz not null default now()
);

-- ---------- 4. RLS at birth ----------
alter table change_orders      enable row level security;
alter table change_order_lines enable row level security;
alter table allowances         enable row level security;

-- Staff surfaces. Client-facing CO approval + allowance portal cards are
-- Phase C surface decisions; the client's ONLY window today is
-- v_client_allowances below, exactly as §2.3 prescribes.
drop policy if exists co_select on change_orders;
create policy co_select on change_orders for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id));
drop policy if exists co_write on change_orders;
create policy co_write on change_orders for all
  using (org_role(org_id) in ('owner','admin','pm'))
  with check (org_role(org_id) in ('owner','admin','pm'));

drop policy if exists col_select on change_order_lines;
create policy col_select on change_order_lines for select
  using (exists (select 1 from change_orders co where co.id = change_order_id
                 and (is_org_member(co.org_id) or is_jsh_support_active(co.org_id))));
drop policy if exists col_write on change_order_lines;
create policy col_write on change_order_lines for all
  using (exists (select 1 from change_orders co where co.id = change_order_id
                 and org_role(co.org_id) in ('owner','admin','pm')))
  with check (exists (select 1 from change_orders co where co.id = change_order_id
                 and org_role(co.org_id) in ('owner','admin','pm')));

drop policy if exists alw_select on allowances;
create policy alw_select on allowances for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id));
drop policy if exists alw_write on allowances;
create policy alw_write on allowances for all
  using (org_role(org_id) in ('owner','admin','pm'))
  with check (org_role(org_id) in ('owner','admin','pm'));

-- ---------- 5. v_client_allowances — column-level reveal ----------
-- Owner-rights view (NO security_invoker): bypasses base RLS by design and
-- does its own scoping via is_job_participant. Clients always see budgeted
-- amounts and status (they signed them); actual + variance appear only when
-- the builder flips variance_visible on that allowance.
drop view if exists v_client_allowances;
create view v_client_allowances as
select a.id, a.job_id, a.structure_id, a.name, a.budgeted, a.status,
       case when a.variance_visible then a.actual   end as actual,
       case when a.variance_visible then a.variance end as variance
  from allowances a
 where is_job_participant(a.job_id);
grant select on v_client_allowances to authenticated;

-- ---------- 6. Reload PostgREST ----------
notify pgrst, 'reload schema';

-- ---------- 7. PROVE-IT ----------
-- PASS conditions (mybuildervault-dev):
--   new_tables    = 3   (all RLS-enabled)
--   co_statuses   = 8
--   alw_statuses  = 4
--   client_view   = 1
--   co_numbering  = 1
select
  (select count(*) from pg_tables where schemaname='public' and rowsecurity
     and tablename in ('change_orders','change_order_lines','allowances')) as new_tables,
  (select count(*)
     from unnest(array['tbd','discussed','considering','approved','in_build',
                       'included','rejected','archived']) v
     where exists (select 1 from pg_constraint
                   where conrelid='change_orders'::regclass and contype='c'
                     and pg_get_constraintdef(oid) like '%' || v || '%')) as co_statuses,
  (select count(*)
     from unnest(array['open','quoted','actual_known','reconciled']) v
     where exists (select 1 from pg_constraint
                   where conrelid='allowances'::regclass and contype='c'
                     and pg_get_constraintdef(oid) like '%' || v || '%')) as alw_statuses,
  (select count(*) from pg_views
     where schemaname='public' and viewname='v_client_allowances') as client_view,
  (select count(*) from pg_trigger
     where tgrelid='change_orders'::regclass and tgname='change_orders_number') as co_numbering;
