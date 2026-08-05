-- ============================================================
-- MyBuilderVault — DB change script 013: The Field Spine
-- (FIELD-SPINE.md APPROVED by Brice 2026-08-05, all 5 rulings)
--   work_orders — ONE spine, money included: dispatch unit AND
--     financial artifact. Job + structure + cost code + discipline;
--     assignable to a named member, a discipline pool, or a sub
--     participant. Sub amount = their contract price (AP-match
--     artifact from birth; purchasing module still deferred).
--     kind work|punch (ruling 4). Dates on the WO; schedule
--     engine is the NEXT subsystem (ruling 1). Per-job numbering
--     via the 009 trigger pattern.
--   work_order_items — checklists w/ photo proof (punch rides this).
--   work_order_events — audit + comments w/ visibility; SUB
--     ACCEPTANCE IS AN EVENT (kind acceptance|decline) that a
--     trigger folds into WO status — subs never get UPDATE on
--     work_orders, so money fields stay staff-only under RLS.
--   daily_logs + daily_log_entries — per job/day/author, segmented
--     (staff|sub) rolling up; TYPED entries so the auto-assembled
--     draft (thesis 1) stays possible; weather jsonb slot, manual
--     v1 (ruling 5).
--   time_entries — clock|manual, pending→approved; approval posts
--     hours × org_members.labor_rate into actuals as source
--     'labor' via trigger (ruling 3; allowance-sync pattern).
--     labor_rate + discipline added to org_members here; actuals
--     source check widened by shape (005/011 pattern).
-- Crew discipline visibility is a UI default filter; RLS keeps the
-- org boundary (L1) + strict sub isolation, per the access model.
-- Run on: mybuildervault-dev FIRST. Prod via release ritual.
-- ============================================================

-- ---------- 1. org_members: discipline + labor rate ----------
alter table org_members add column if not exists discipline text
  check (discipline is null or discipline in
    ('sitework','foundation_concrete','framing','roofing','masonry',
     'electrical','plumbing','hvac','insulation','drywall','paint',
     'trim','flooring','tile','cabinets','low_voltage','gutters',
     'landscape_irrigation','pool','well_septic','punch_clean'));
alter table org_members add column if not exists labor_rate numeric(10,2);

-- ---------- 2. work_orders ----------
create table if not exists work_orders (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references builder_orgs(id) on delete cascade,
  job_id                  uuid not null references jobs(id) on delete cascade,
  structure_id            uuid references structures(id),
  cost_code_id            uuid references cost_codes(id),
  origin_line_id          uuid references estimate_lines(id),  -- derive, never re-key
  number                  int,                                 -- per-job, trigger-assigned
  kind                    text not null default 'work'
                          check (kind in ('work','punch')),
  discipline              text
                          check (discipline is null or discipline in
                            ('sitework','foundation_concrete','framing','roofing','masonry',
                             'electrical','plumbing','hvac','insulation','drywall','paint',
                             'trim','flooring','tile','cabinets','low_voltage','gutters',
                             'landscape_irrigation','pool','well_septic','punch_clean')),
  title                   text not null,
  scope                   text,
  status                  text not null default 'draft'
                          check (status in ('draft','issued','accepted','declined',
                                            'in_progress','complete','verified',
                                            'closed','cancelled')),
  priority                text not null default 'normal'
                          check (priority in ('low','normal','high','urgent')),
  assignee_kind           text not null default 'discipline'
                          check (assignee_kind in ('member','discipline','sub')),
  assigned_person         uuid references people(id),           -- kind = member
  assigned_participant_id uuid references job_participants(id), -- kind = sub
  amount                  numeric(12,2),                        -- sub contract price
  is_variance             boolean not null default false,       -- builder variance flag
  planned_start           date,
  planned_end             date,
  actual_start            date,
  actual_end              date,
  accepted_at             timestamptz,
  accepted_by             uuid references people(id),
  created_by              uuid references people(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (job_id, number),
  check (assignee_kind <> 'member' or assigned_person is not null),
  check (assignee_kind <> 'sub'    or assigned_participant_id is not null),
  check (assignee_kind <> 'discipline' or discipline is not null)
);
create index if not exists wo_job_idx  on work_orders (job_id);
create index if not exists wo_org_status_idx on work_orders (org_id, status);
create index if not exists wo_planned_idx on work_orders (org_id, planned_start);

create or replace function assign_wo_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.number is null then
    select coalesce(max(number), 0) + 1 into new.number
      from work_orders where job_id = new.job_id;
  end if;
  return new;
end $$;
drop trigger if exists work_orders_number on work_orders;
create trigger work_orders_number before insert on work_orders
  for each row execute function assign_wo_number();

drop trigger if exists work_orders_touch on work_orders;
create trigger work_orders_touch before update on work_orders
  for each row execute function touch_jobs_updated_at();

-- ---------- 3. work_order_items (checklist + photo proof) ----------
create table if not exists work_order_items (
  id            uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  label         text not null,
  sort          int  not null default 0,
  done          boolean not null default false,
  done_by       uuid references people(id),
  done_at       timestamptz,
  photo_url     text
);
create index if not exists woi_wo_idx on work_order_items (work_order_id);

-- ---------- 4. work_order_events (audit, comments, ACCEPTANCE) ----------
create table if not exists work_order_events (
  id            uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  kind          text not null
                check (kind in ('comment','status_change','acceptance',
                                'decline','photo','system')),
  body          text,
  photo_url     text,
  visibility    text not null default 'internal'
                check (visibility in ('internal','all')),
  actor         uuid references people(id),
  created_at    timestamptz not null default now(),
  check (kind = 'system' or actor is not null)   -- system rows via service role only
);
create index if not exists woe_wo_idx on work_order_events (work_order_id, created_at);

-- Acceptance events fold into WO status. Only issued WOs can be
-- accepted/declined; stale events on other statuses are inert audit.
create or replace function apply_wo_acceptance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'acceptance' then
    update work_orders
       set status = 'accepted', accepted_at = new.created_at, accepted_by = new.actor
     where id = new.work_order_id and status = 'issued';
  elsif new.kind = 'decline' then
    update work_orders set status = 'declined'
     where id = new.work_order_id and status = 'issued';
  end if;
  return new;
end $$;
drop trigger if exists woe_acceptance on work_order_events;
create trigger woe_acceptance after insert on work_order_events
  for each row execute function apply_wo_acceptance();

-- ---------- 5. daily logs (segmented: staff + sub) ----------
create table if not exists daily_logs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references builder_orgs(id) on delete cascade,
  job_id      uuid not null references jobs(id) on delete cascade,
  log_date    date not null default current_date,
  author_kind text not null default 'staff'
              check (author_kind in ('staff','sub')),
  weather     jsonb,          -- manual v1; API auto-capture later (ruling 5)
  notes       text,
  created_by  uuid not null references people(id),
  created_at  timestamptz not null default now(),
  unique (job_id, log_date, created_by)
);
create index if not exists dl_job_date_idx on daily_logs (job_id, log_date);

create table if not exists daily_log_entries (
  id            uuid primary key default gen_random_uuid(),
  daily_log_id  uuid not null references daily_logs(id) on delete cascade,
  kind          text not null
                check (kind in ('note','delay','delivery','crew_count',
                                'photo','safety','inspection')),
  body          text,
  qty           numeric(10,2),          -- crew_count etc.
  photo_url     text,
  work_order_id uuid references work_orders(id),
  visibility    text not null default 'internal'
                check (visibility in ('internal','client')),
  created_at    timestamptz not null default now()
);
create index if not exists dle_log_idx on daily_log_entries (daily_log_id);

-- ---------- 6. time entries ----------
create table if not exists time_entries (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references builder_orgs(id) on delete cascade,
  person_id     uuid not null references people(id),
  job_id        uuid not null references jobs(id) on delete cascade,
  cost_code_id  uuid references cost_codes(id),
  work_order_id uuid references work_orders(id),
  worked_on     date not null default current_date,
  clock_in      timestamptz,
  clock_out     timestamptz,
  hours         numeric(6,2) not null check (hours >= 0),
  entry_source  text not null default 'manual'
                check (entry_source in ('clock','manual')),
  status        text not null default 'pending'
                check (status in ('pending','approved','rejected')),
  notes         text,
  approved_by   uuid references people(id),
  approved_at   timestamptz,
  actual_id     uuid references actuals(id),   -- machine-maintained; never hand-edit
  created_at    timestamptz not null default now()
);
create index if not exists te_org_status_idx on time_entries (org_id, status);
create index if not exists te_person_idx on time_entries (person_id, worked_on);
create index if not exists te_job_idx on time_entries (job_id);

-- ---------- 7. actuals.source gains 'labor' (005/011 shape pattern) ----------
do $$
declare c record;
begin
  for c in select conname from pg_constraint
    where conrelid = 'actuals'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%source%'
      and pg_get_constraintdef(oid) like '%manual%'
  loop
    execute format('alter table actuals drop constraint %I', c.conname);
  end loop;
end $$;
alter table actuals add constraint actuals_source_check
  check (source in ('manual','ingested','labor'));

-- ---------- 8. approval posts labor into actuals ----------
-- BEFORE trigger (sets new.actual_id). Approved hours × labor_rate → one
-- actuals row per entry; re-approval/edits re-post; un-approve/delete
-- removes. Null labor_rate = no auto-post (honest, like null line cost).
create or replace function post_time_entry_actual()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_rate numeric; v_actual uuid;
begin
  if tg_op in ('UPDATE','DELETE') and old.actual_id is not null
     and (tg_op = 'DELETE'
          or new.status <> 'approved'
          or new.hours        is distinct from old.hours
          or new.cost_code_id is distinct from old.cost_code_id
          or new.job_id       is distinct from old.job_id) then
    delete from actuals where id = old.actual_id;
    if tg_op = 'UPDATE' then new.actual_id := null; end if;
  end if;
  if tg_op in ('INSERT','UPDATE') and new.status = 'approved'
     and new.actual_id is null then
    select labor_rate into v_rate from org_members
     where org_id = new.org_id and person_id = new.person_id;
    if v_rate is not null then
      insert into actuals (org_id, job_id, cost_code_id, description,
                           amount, source, incurred_on, created_by)
      values (new.org_id, new.job_id, new.cost_code_id,
              'Labor: ' || new.hours || ' hrs',
              round(new.hours * v_rate, 2), 'labor',
              new.worked_on, new.approved_by)
      returning id into v_actual;
      new.actual_id := v_actual;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists te_post_actual on time_entries;
create trigger te_post_actual before insert or update or delete on time_entries
  for each row execute function post_time_entry_actual();

-- ---------- 9. RLS helper: is the signed-in user this WO's sub? ----------
create or replace function is_wo_assignee(p_wo uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from work_orders w
    join job_participants jp on jp.id = w.assigned_participant_id
    join contact_members cm
      on cm.contact_id = jp.contact_id
     and (jp.contact_member_id is null or jp.contact_member_id = cm.id)
    where w.id = p_wo and cm.person_id = auth.uid());
$$;

-- ---------- 10. RLS at birth — every table, no exceptions ----------
alter table work_orders       enable row level security;
alter table work_order_items  enable row level security;
alter table work_order_events enable row level security;
alter table daily_logs        enable row level security;
alter table daily_log_entries enable row level security;
alter table time_entries      enable row level security;

-- work_orders: org staff read their org; subs read ONLY their own WOs
-- (their amount is their contract — visible to them, invisible to every
-- other external party). Writes: owner/admin/pm/super manage; field crew
-- may update WOs (progress) but never gains insert/delete; subs get NO
-- update — acceptance rides events.
drop policy if exists wo_select on work_orders;
create policy wo_select on work_orders for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id)
         or is_wo_assignee(id));
drop policy if exists wo_insert on work_orders;
create policy wo_insert on work_orders for insert
  with check (org_role(org_id) in ('owner','admin','pm','super'));
drop policy if exists wo_update on work_orders;
create policy wo_update on work_orders for update
  using (org_role(org_id) in ('owner','admin','pm','super','field'))
  with check (org_role(org_id) in ('owner','admin','pm','super','field'));
drop policy if exists wo_delete on work_orders;
create policy wo_delete on work_orders for delete
  using (org_role(org_id) in ('owner','admin','pm'));

-- items: staff work them; the assigned sub may check off + photo-proof.
drop policy if exists woi_select on work_order_items;
create policy woi_select on work_order_items for select
  using (exists (select 1 from work_orders w where w.id = work_order_id
                 and (is_org_member(w.org_id) or is_jsh_support_active(w.org_id)
                      or is_wo_assignee(w.id))));
drop policy if exists woi_write on work_order_items;
create policy woi_write on work_order_items for all
  using (exists (select 1 from work_orders w where w.id = work_order_id
                 and (org_role(w.org_id) in ('owner','admin','pm','super','field')
                      or is_wo_assignee(w.id))))
  with check (exists (select 1 from work_orders w where w.id = work_order_id
                 and (org_role(w.org_id) in ('owner','admin','pm','super','field')
                      or is_wo_assignee(w.id))));

-- events: staff see all; subs see visibility='all' on their WOs and may
-- insert (comment/acceptance/decline/photo) as themselves. system kind is
-- service-role only (actor-null check above + human insert requires actor).
drop policy if exists woe_select on work_order_events;
create policy woe_select on work_order_events for select
  using (exists (select 1 from work_orders w where w.id = work_order_id
                 and (is_org_member(w.org_id) or is_jsh_support_active(w.org_id)
                      or (is_wo_assignee(w.id) and visibility = 'all'))));
drop policy if exists woe_insert on work_order_events;
create policy woe_insert on work_order_events for insert
  with check (actor = auth.uid()
              and exists (select 1 from work_orders w where w.id = work_order_id
                          and (is_org_member(w.org_id) or is_wo_assignee(w.id)))
              and (kind <> 'status_change'
                   or exists (select 1 from work_orders w where w.id = work_order_id
                              and is_org_member(w.org_id))));

-- daily logs: staff author staff logs; subs (job participants) author their
-- own segmented logs. Clients get NO direct read v1 (weekly digest is a
-- future comms-rail surface over visibility='client' entries).
drop policy if exists dl_select on daily_logs;
create policy dl_select on daily_logs for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id)
         or (created_by = auth.uid() and is_job_participant(job_id)));
drop policy if exists dl_insert on daily_logs;
create policy dl_insert on daily_logs for insert
  with check (created_by = auth.uid()
              and ((author_kind = 'staff' and is_org_member(org_id))
                   or (author_kind = 'sub' and is_job_participant(job_id))));
drop policy if exists dl_update on daily_logs;
create policy dl_update on daily_logs for update
  using (created_by = auth.uid()
         or org_role(org_id) in ('owner','admin','pm','super'))
  with check (created_by = auth.uid()
         or org_role(org_id) in ('owner','admin','pm','super'));

drop policy if exists dle_select on daily_log_entries;
create policy dle_select on daily_log_entries for select
  using (exists (select 1 from daily_logs d where d.id = daily_log_id
                 and (is_org_member(d.org_id) or is_jsh_support_active(d.org_id)
                      or (d.created_by = auth.uid() and is_job_participant(d.job_id)))));
drop policy if exists dle_write on daily_log_entries;
create policy dle_write on daily_log_entries for all
  using (exists (select 1 from daily_logs d where d.id = daily_log_id
                 and (d.created_by = auth.uid()
                      or org_role(d.org_id) in ('owner','admin','pm','super'))))
  with check (exists (select 1 from daily_logs d where d.id = daily_log_id
                 and (d.created_by = auth.uid()
                      or org_role(d.org_id) in ('owner','admin','pm','super'))));

-- time entries: self-insert as yourself; you + managers read; managers
-- (owner/admin/pm/accounting) approve. actual_id is machine-maintained by
-- the trigger; approvers set status only.
drop policy if exists te_select on time_entries;
create policy te_select on time_entries for select
  using (person_id = auth.uid()
         or org_role(org_id) in ('owner','admin','pm','super','accounting')
         or is_jsh_support_active(org_id));
drop policy if exists te_insert on time_entries;
create policy te_insert on time_entries for insert
  with check (person_id = auth.uid() and is_org_member(org_id));
drop policy if exists te_update on time_entries;
create policy te_update on time_entries for update
  using (   (person_id = auth.uid() and status = 'pending')
         or org_role(org_id) in ('owner','admin','pm','accounting'))
  with check ((person_id = auth.uid() and status = 'pending')
         or org_role(org_id) in ('owner','admin','pm','accounting'));
drop policy if exists te_delete on time_entries;
create policy te_delete on time_entries for delete
  using ((person_id = auth.uid() and status = 'pending')
         or org_role(org_id) in ('owner','admin','pm'));

-- ---------- 11. Reload PostgREST ----------
notify pgrst, 'reload schema';

-- ---------- 12. PROVE-IT ----------
-- PASS conditions (mybuildervault-dev):
--   new_tables      = 6   (all RLS-enabled)
--   wo_statuses     = 9
--   disciplines     = 21  (on work_orders check)
--   wo_numbering    = 1
--   acceptance_trg  = 1
--   labor_trg       = 1
--   labor_source    = 1
--   member_cols     = 2   (discipline, labor_rate)
--   helper_fn       = 1   (is_wo_assignee)
select
  (select count(*) from pg_tables where schemaname='public' and rowsecurity
     and tablename in ('work_orders','work_order_items','work_order_events',
                       'daily_logs','daily_log_entries','time_entries')) as new_tables,
  (select count(*)
     from unnest(array['draft','issued','accepted','declined','in_progress',
                       'complete','verified','closed','cancelled']) v
     where exists (select 1 from pg_constraint
                   where conrelid='work_orders'::regclass and contype='c'
                     and pg_get_constraintdef(oid) like '%status%'
                     and pg_get_constraintdef(oid) like '%' || v || '%')) as wo_statuses,
  (select count(*)
     from unnest(array['sitework','foundation_concrete','framing','roofing',
                       'masonry','electrical','plumbing','hvac','insulation',
                       'drywall','paint','trim','flooring','tile','cabinets',
                       'low_voltage','gutters','landscape_irrigation','pool',
                       'well_septic','punch_clean']) v
     where exists (select 1 from pg_constraint
                   where conrelid='work_orders'::regclass and contype='c'
                     and pg_get_constraintdef(oid) like '%discipline%'
                     and pg_get_constraintdef(oid) like '%' || v || '%')) as disciplines,
  (select count(*) from pg_trigger
     where tgrelid='work_orders'::regclass and tgname='work_orders_number') as wo_numbering,
  (select count(*) from pg_trigger
     where tgrelid='work_order_events'::regclass and tgname='woe_acceptance') as acceptance_trg,
  (select count(*) from pg_trigger
     where tgrelid='time_entries'::regclass and tgname='te_post_actual') as labor_trg,
  (select count(*) from pg_constraint
     where conname='actuals_source_check'
       and pg_get_constraintdef(oid) like '%labor%') as labor_source,
  (select count(*) from information_schema.columns
     where table_name='org_members'
       and column_name in ('discipline','labor_rate')) as member_cols,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname='is_wo_assignee') as helper_fn;
