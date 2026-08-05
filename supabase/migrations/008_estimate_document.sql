-- ============================================================
-- MyBuilderVault — DB change script 008: The Estimate Document
-- Financial spine part 1 of 3 (ARCHITECTURE §2.3, APPROVED):
--   estimates (versioned, ingested|authored)
--   estimate_lines (cost-coded, structure-scoped, Brije-format
--     client_state, sort preserves THEIR grouping — LEARNINGS §7)
--   conditions (dated time-bombs on lines or jobs)
--   contracts (immutable snapshot of the accepted version — the
--     baseline all variance measures against; no UPDATE/DELETE
--     policies exist, immutability via RLS default-deny)
--   accept_estimate() — transactional acceptance: snapshot,
--     supersede siblings, write the job_event
-- Part 2 (009): change_orders + allowances. Part 3 (010):
-- selections + actuals + computed budget view.
-- Run on: mybuildervault-dev FIRST. Prod via release ritual.
-- ============================================================

-- ---------- 1. estimates — versioned documents per job ----------
create table if not exists estimates (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references builder_orgs(id) on delete cascade,
  job_id     uuid not null references jobs(id) on delete cascade,
  version    int  not null default 1,
  source     text not null default 'authored'
             check (source in ('ingested','authored')),
  status     text not null default 'draft'
             check (status in ('draft','presented','accepted','superseded')),
  title      text not null default 'Estimate',
  notes      text,
  ingested_doc_url text,          -- the original Excel/PDF (BOARD-014 on-ramp)
  created_by uuid references people(id),
  created_at timestamptz not null default now(),
  unique (job_id, version)
);

-- ---------- 2. estimate_lines — the atoms of the spine ----------
create table if not exists estimate_lines (
  id           uuid primary key default gen_random_uuid(),
  estimate_id  uuid not null references estimates(id) on delete cascade,
  structure_id uuid references structures(id),        -- house vs shop (Jaggars proof)
  cost_code_id uuid references cost_codes(id),        -- null until mapped at ingestion
  raw_category text,                                  -- THEIR label, preserved verbatim
  kind         text not null default 'base'
               check (kind in ('base','fee','allowance','structural_option','upgrade')),
  description  text not null,
  price        numeric(12,2) not null default 0,
  client_state text not null default 'pending'        -- Brije's own doc format
               check (client_state in ('pending','approved','disapproved')),
  sort         int not null default 0,                -- preserves THEIR grouping
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists estimate_lines_estimate_idx on estimate_lines (estimate_id, sort);

-- ---------- 3. conditions — dated time-bombs, surfaced before they detonate ----------
create table if not exists conditions (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references builder_orgs(id) on delete cascade,
  job_id           uuid references jobs(id) on delete cascade,
  estimate_line_id uuid references estimate_lines(id) on delete cascade,
  text             text not null,
  type             text not null default 'assumption'
                   check (type in ('regulatory','contingency','assumption','other')),
  trigger_date     date,
  status           text not null default 'open'
                   check (status in ('open','cleared','triggered')),
  created_at       timestamptz not null default now(),
  check (job_id is not null or estimate_line_id is not null)
);

-- ---------- 4. contracts — the immutable baseline ----------
create table if not exists contracts (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references builder_orgs(id) on delete cascade,
  job_id           uuid not null references jobs(id) on delete cascade,
  estimate_id      uuid not null references estimates(id),
  snapshot         jsonb not null,     -- estimate + lines, frozen at acceptance
  contract_total   numeric(12,2) not null default 0,
  executed_doc_url text,
  executed_at      date,
  created_by       uuid references people(id),
  created_at       timestamptz not null default now()
);

-- ---------- 5. accept_estimate — acceptance is a transaction ----------
-- Snapshot the estimate + lines, mark accepted, supersede any sibling
-- previously-accepted version, write the job_event. Caller must be
-- owner/admin of the org (checked inside; security definer).
create or replace function accept_estimate(p_estimate uuid, p_executed_doc_url text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_est  estimates%rowtype;
  v_snap jsonb;
  v_total numeric(12,2);
  v_contract uuid;
begin
  select * into v_est from estimates where id = p_estimate;
  if v_est.id is null then
    raise exception 'accept_estimate: estimate % not found', p_estimate;
  end if;
  if org_role(v_est.org_id) not in ('owner','admin') and not is_platform_staff() then
    raise exception 'accept_estimate: only org owners/admins may accept';
  end if;
  if v_est.status = 'accepted' then
    raise exception 'accept_estimate: estimate is already accepted';
  end if;

  select coalesce(sum(price), 0) into v_total
    from estimate_lines where estimate_id = p_estimate;

  v_snap := jsonb_build_object(
    'estimate', to_jsonb(v_est),
    'lines', coalesce((select jsonb_agg(to_jsonb(l) order by l.sort)
                         from estimate_lines l
                        where l.estimate_id = p_estimate), '[]'::jsonb),
    'snapshot_at', now());

  insert into contracts (org_id, job_id, estimate_id, snapshot, contract_total,
                         executed_doc_url, created_by)
  values (v_est.org_id, v_est.job_id, p_estimate, v_snap, v_total,
          p_executed_doc_url, auth.uid())
  returning id into v_contract;

  update estimates set status = 'superseded'
   where job_id = v_est.job_id and status = 'accepted' and id <> p_estimate;
  update estimates set status = 'accepted' where id = p_estimate;

  insert into job_events (job_id, kind, actor, metadata)
  values (v_est.job_id, 'note', auth.uid(),
          jsonb_build_object('event', 'estimate_accepted',
                             'estimate_id', p_estimate,
                             'contract_id', v_contract,
                             'contract_total', v_total));
  return v_contract;
end $$;

-- ---------- 6. RLS at birth ----------
alter table estimates      enable row level security;
alter table estimate_lines enable row level security;
alter table conditions     enable row level security;
alter table contracts      enable row level security;

-- Estimates: staff read all; estimating is sales+pm work; clients see only
-- presented/accepted documents on their own jobs — never drafts.
drop policy if exists est_select on estimates;
create policy est_select on estimates for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id)
         or (status in ('presented','accepted') and is_job_participant(job_id)));
drop policy if exists est_write on estimates;
create policy est_write on estimates for all
  using (org_role(org_id) in ('owner','admin','pm','sales'))
  with check (org_role(org_id) in ('owner','admin','pm','sales'));

drop policy if exists el_select on estimate_lines;
create policy el_select on estimate_lines for select
  using (exists (select 1 from estimates e where e.id = estimate_id
                 and (is_org_member(e.org_id) or is_jsh_support_active(e.org_id)
                      or (e.status in ('presented','accepted')
                          and is_job_participant(e.job_id)))));
drop policy if exists el_write on estimate_lines;
create policy el_write on estimate_lines for all
  using (exists (select 1 from estimates e where e.id = estimate_id
                 and org_role(e.org_id) in ('owner','admin','pm','sales')))
  with check (exists (select 1 from estimates e where e.id = estimate_id
                 and org_role(e.org_id) in ('owner','admin','pm','sales')));

-- Conditions: builder-side surface for now (dashboards before detonation);
-- client visibility is a Phase C portal decision.
drop policy if exists cond_select on conditions;
create policy cond_select on conditions for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id));
drop policy if exists cond_write on conditions;
create policy cond_write on conditions for all
  using (org_role(org_id) in ('owner','admin','pm','sales'))
  with check (org_role(org_id) in ('owner','admin','pm','sales'));

-- Contracts: staff and the clients who signed them may read. There is
-- deliberately NO update or delete policy — the baseline is immutable to
-- every authenticated role; only the service role can correct a mistake.
drop policy if exists contracts_select on contracts;
create policy contracts_select on contracts for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id)
         or is_job_participant(job_id));
drop policy if exists contracts_insert on contracts;
create policy contracts_insert on contracts for insert
  with check (org_role(org_id) in ('owner','admin'));

-- ---------- 7. Reload PostgREST ----------
notify pgrst, 'reload schema';

-- ---------- 8. PROVE-IT ----------
-- PASS conditions (mybuildervault-dev):
--   new_tables      = 4  (all RLS-enabled)
--   accept_fn       = 1
--   line_kinds      = 5
--   contract_frozen = 0  (zero UPDATE/DELETE policies on contracts)
select
  (select count(*) from pg_tables where schemaname='public' and rowsecurity
     and tablename in ('estimates','estimate_lines','conditions','contracts'))
    as new_tables,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname = 'accept_estimate') as accept_fn,
  (select count(*)
     from unnest(array['base','fee','allowance','structural_option','upgrade']) v
     where exists (select 1 from pg_constraint
                   where conrelid='estimate_lines'::regclass and contype='c'
                     and pg_get_constraintdef(oid) like '%' || v || '%'))
    as line_kinds,
  (select count(*) from pg_policies
     where schemaname='public' and tablename='contracts'
       and cmd in ('UPDATE','DELETE')) as contract_frozen;
