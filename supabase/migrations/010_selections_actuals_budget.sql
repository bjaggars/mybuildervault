-- ============================================================
-- MyBuilderVault — DB change script 010: Selections + Actuals +
-- the Computed Budget. Financial spine part 3 of 3 (§2.3).
--   selections — accretive capture (link | photo | library),
--     scraped title/image/price at capture, room + structure
--     scope, optional allowance link, proposed → shown → approved
--     with approval evidence, decision deadline + lag fields
--     (the schedule-item FK arrives WITH the schedule tables in
--     the Phase C collaboration port — fields exist now so the
--     deadline logic has a home), normalized_product for the
--     best-effort AI fill (never blocking).
--   actuals — v1 deliberately light: cost entries per cost code /
--     allowance, manual or ingested. NO PO/bill module in v1
--     (finance posture awaits the Brije back-office answer).
--     A trigger keeps allowances.actual = sum of its actuals
--     whenever actuals reference it; unreferenced allowances keep
--     hand-entered values.
--   v_job_budget — Buildertrend's arithmetic, our transparency:
--     contract baseline + approved COs + allowance variance =
--     revised price. Computed, never hand-maintained.
--     approved_selections_total rides along informationally and
--     is NOT added into revised_price (selection dollars reach
--     the budget through allowance actuals / COs — avoiding
--     double-count; revisit when real Brije data flows).
-- Run on: mybuildervault-dev FIRST. Prod via release ritual.
-- ============================================================

-- ---------- 1. selections — accretive capture ----------
create table if not exists selections (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references builder_orgs(id) on delete cascade,
  job_id             uuid not null references jobs(id) on delete cascade,
  structure_id       uuid references structures(id),
  allowance_id       uuid references allowances(id),
  room               text,
  capture_kind       text not null default 'link'
                     check (capture_kind in ('link','photo','library')),
  url                text,
  title              text not null,
  image_url          text,
  price              numeric(12,2),                 -- scraped/entered at capture
  status             text not null default 'proposed'
                     check (status in ('proposed','shown','approved')),
  approved_at        timestamptz,
  approval_evidence  jsonb,                         -- who approved, how, artifact ref
  decision_deadline  date,                          -- schedule-item FK lands with the
  deadline_lag_days  int,                           -- schedule tables (Phase C port)
  normalized_product jsonb,                         -- AI best-effort: brand/model/category
  notes              text,
  sort               int not null default 0,
  created_by         uuid references people(id),
  created_at         timestamptz not null default now()
);
create index if not exists selections_job_idx on selections (job_id, sort);

-- ---------- 2. actuals — deliberately light v1 ----------
create table if not exists actuals (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references builder_orgs(id) on delete cascade,
  job_id       uuid not null references jobs(id) on delete cascade,
  structure_id uuid references structures(id),
  cost_code_id uuid references cost_codes(id),
  allowance_id uuid references allowances(id),
  description  text not null,
  amount       numeric(12,2) not null,
  source       text not null default 'manual'
               check (source in ('manual','ingested')),
  incurred_on  date,
  doc_url      text,
  created_by   uuid references people(id),
  created_at   timestamptz not null default now()
);
create index if not exists actuals_job_idx on actuals (job_id);
create index if not exists actuals_allowance_idx on actuals (allowance_id) where allowance_id is not null;

-- Keep allowances.actual = sum of referencing actuals. Fires only on actuals
-- changes, so allowances with no actuals rows keep hand-entered values.
create or replace function sync_allowance_actual()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_allowance uuid;
begin
  foreach v_allowance in array
    array(select distinct x from unnest(array[new.allowance_id, old.allowance_id]) x
           where x is not null)
  loop
    update allowances a
       set actual = (select sum(amount) from actuals where allowance_id = v_allowance)
     where a.id = v_allowance;
  end loop;
  return coalesce(new, old);
end $$;
drop trigger if exists actuals_sync_allowance on actuals;
create trigger actuals_sync_allowance
  after insert or update or delete on actuals
  for each row execute function sync_allowance_actual();

-- ---------- 3. RLS at birth ----------
alter table selections enable row level security;
alter table actuals    enable row level security;

-- Selections: staff full; clients read selections on their jobs that have
-- been SHOWN or APPROVED (proposed drafts stay builder-side). Client
-- approval action itself is a Phase C portal surface.
drop policy if exists sel_select on selections;
create policy sel_select on selections for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id)
         or (status in ('shown','approved') and is_job_participant(job_id)));
drop policy if exists sel_write on selections;
create policy sel_write on selections for all
  using (org_role(org_id) in ('owner','admin','pm','sales'))
  with check (org_role(org_id) in ('owner','admin','pm','sales'));

-- Actuals: builder money data — staff only, owner/admin/pm write.
drop policy if exists act_select on actuals;
create policy act_select on actuals for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id));
drop policy if exists act_write on actuals;
create policy act_write on actuals for all
  using (org_role(org_id) in ('owner','admin','pm'))
  with check (org_role(org_id) in ('owner','admin','pm'));

-- ---------- 4. v_job_budget — the computed spine ----------
-- security_invoker: staff RLS flows through the base tables. A client
-- querying it sees their RLS-filtered slice (baseline they can read,
-- zeroed CO/variance columns) — the portal budget surface is Phase C.
drop view if exists v_job_budget;
create view v_job_budget with (security_invoker = true) as
select
  j.id as job_id,
  j.org_id,
  j.name,
  j.status,
  c.contract_total                                   as contract_baseline,
  coalesce(co.total, 0)                              as approved_change_orders,
  coalesce(av.variance_total, 0)                     as allowance_variance,
  c.contract_total + coalesce(co.total, 0)
                   + coalesce(av.variance_total, 0)  as revised_price,
  coalesce(sel.approved_total, 0)                    as approved_selections_total
from jobs j
left join lateral (
  select contract_total from contracts
   where job_id = j.id order by created_at desc limit 1) c on true
left join lateral (
  select sum(l.price) as total
    from change_orders o join change_order_lines l on l.change_order_id = o.id
   where o.job_id = j.id and o.status in ('approved','in_build','included')) co on true
left join lateral (
  select sum(variance) as variance_total
    from allowances where job_id = j.id and variance is not null) av on true
left join lateral (
  select sum(price) as approved_total
    from selections where job_id = j.id and status = 'approved') sel on true
where c.contract_total is not null;

-- ---------- 5. Reload PostgREST ----------
notify pgrst, 'reload schema';

-- ---------- 6. PROVE-IT ----------
-- PASS conditions (mybuildervault-dev):
--   new_tables    = 2  (RLS-enabled)
--   budget_view   = 1
--   capture_kinds = 3
--   sel_statuses  = 3
--   alw_sync_trig = 1
select
  (select count(*) from pg_tables where schemaname='public' and rowsecurity
     and tablename in ('selections','actuals')) as new_tables,
  (select count(*) from pg_views
     where schemaname='public' and viewname='v_job_budget') as budget_view,
  (select count(*)
     from unnest(array['link','photo','library']) v
     where exists (select 1 from pg_constraint
                   where conrelid='selections'::regclass and contype='c'
                     and pg_get_constraintdef(oid) like '%' || v || '%')) as capture_kinds,
  (select count(*)
     from unnest(array['proposed','shown','approved']) v
     where exists (select 1 from pg_constraint
                   where conrelid='selections'::regclass and contype='c'
                     and pg_get_constraintdef(oid) like '%' || v || '%')) as sel_statuses,
  (select count(*) from pg_trigger
     where tgrelid='actuals'::regclass and tgname='actuals_sync_allowance') as alw_sync_trig;
