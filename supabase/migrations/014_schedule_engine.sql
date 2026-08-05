-- ============================================================
-- MyBuilderVault — DB change script 014: The Schedule Engine
-- (SCHEDULE.md APPROVED by Brice 2026-08-05, all 6 rulings)
--   schedule_items — the plan. Separate from work_orders (ruling 1):
--     the item is the plan, the WO is dispatch + money, FK-linked,
--     0..n WOs per item inheriting dates by default.
--   schedule_deps — FS-only with lag in workdays (ruling 2). dep_type
--     is a constrained column so SS/FF later is a constraint widen,
--     not a schema change.
--   Working calendar — org workdays mask (ISO dow) + excluded dates,
--     per-item ignore_workdays override (weekend pours).
--   recalc_schedule — THE CASCADE LIVES IN THE DATABASE (ruling 3):
--     topological walk, workday-aware, trigger-invoked from item/dep
--     changes AND from WO completion. The field advances the
--     schedule: completed WOs set actual_end and successors follow
--     coalesce(actual_end, end_date). No PM re-dragging Gantt bars.
--   Baseline — columns stamped at PUBLISH (ruling 4); shift reasons
--     land in schedule_events, not jsonb snapshots.
--   Selections FK + moving decision deadline (ruling 5): 010's
--     waiting columns get their FK; deadline = item start − lag
--     workdays, recomputed on every cascade.
--   Notifications — in-app state only (ruling 6): schedule_events IS
--     the in-app record; notices join the comms rail at BOARD-007.
--   Templates — Day-N relative catalog (JobTread model); import onto
--     a job + start date computes real dates; Magnolia first (seed).
-- Run on: mybuildervault-dev FIRST. Prod via release ritual.
-- ============================================================

-- ---------- 1. Working calendar: org mask + excluded dates ----------
alter table builder_orgs add column if not exists workdays smallint[]
  not null default '{1,2,3,4,5}';   -- ISO dow: 1=Mon .. 7=Sun

create table if not exists org_excluded_dates (
  org_id uuid not null references builder_orgs(id) on delete cascade,
  day    date not null,
  label  text,
  primary key (org_id, day)
);

-- ---------- 2. Draft → publish gate on the job ----------
alter table jobs add column if not exists schedule_status text
  not null default 'draft'
  check (schedule_status in ('draft','published'));

-- ---------- 3. schedule_items — the plan ----------
create table if not exists schedule_items (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references builder_orgs(id) on delete cascade,
  job_id          uuid not null references jobs(id) on delete cascade,
  phase           text,
  title           text not null,
  discipline      text
                  check (discipline is null or discipline in
                    ('sitework','foundation_concrete','framing','roofing','masonry',
                     'electrical','plumbing','hvac','insulation','drywall','paint',
                     'trim','flooring','tile','cabinets','low_voltage','gutters',
                     'landscape_irrigation','pool','well_septic','punch_clean')),
  duration_days   int  not null default 1 check (duration_days >= 0),  -- workdays
  milestone       boolean not null default false,
  start_date      date,             -- engine-computed; root anchor when no preds
  end_date        date,             -- engine-computed
  manual_start    date,             -- start-no-earlier-than (drag on a dependent item)
  actual_start    date,
  actual_end      date,             -- field completion; successors follow this
  ignore_workdays boolean not null default false,   -- per-item override
  client_visible  boolean not null default true,
  color           text,
  sort            int  not null default 0,
  status          text not null default 'pending'
                  check (status in ('pending','in_progress','complete')),
  baseline_start  date,             -- stamped at publish, never by hand
  baseline_end    date,
  created_by      uuid references people(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (milestone = false or duration_days = 0)
);
create index if not exists si_job_idx  on schedule_items (job_id, sort);
create index if not exists si_org_idx  on schedule_items (org_id, start_date);

-- ---------- 4. schedule_deps — FS + lag (workdays) ----------
create table if not exists schedule_deps (
  id             uuid primary key default gen_random_uuid(),
  successor_id   uuid not null references schedule_items(id) on delete cascade,
  predecessor_id uuid not null references schedule_items(id) on delete cascade,
  dep_type       text not null default 'FS' check (dep_type = 'FS'),
  lag_days       int  not null default 0,   -- workdays after predecessor finish
  unique (successor_id, predecessor_id),
  check (successor_id <> predecessor_id)
);
create index if not exists sd_succ_idx on schedule_deps (successor_id);
create index if not exists sd_pred_idx on schedule_deps (predecessor_id);

-- ---------- 5. Templates — Day-N relative catalog ----------
create table if not exists schedule_templates (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references builder_orgs(id) on delete cascade,
  name        text not null,
  build_style text,
  notes       text,
  created_by  uuid references people(id),
  created_at  timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists schedule_template_items (
  id             uuid primary key default gen_random_uuid(),
  template_id    uuid not null references schedule_templates(id) on delete cascade,
  title          text not null,
  phase          text,
  discipline     text
                 check (discipline is null or discipline in
                   ('sitework','foundation_concrete','framing','roofing','masonry',
                    'electrical','plumbing','hvac','insulation','drywall','paint',
                    'trim','flooring','tile','cabinets','low_voltage','gutters',
                    'landscape_irrigation','pool','well_septic','punch_clean')),
  day_offset     int not null default 0 check (day_offset >= 0),  -- workdays from start
  duration_days  int not null default 1 check (duration_days >= 0),
  milestone      boolean not null default false,
  client_visible boolean not null default true,
  color          text,
  sort           int not null default 0,
  check (milestone = false or duration_days = 0)
);
create index if not exists sti_tpl_idx on schedule_template_items (template_id, sort);

create table if not exists schedule_template_deps (
  id               uuid primary key default gen_random_uuid(),
  template_id      uuid not null references schedule_templates(id) on delete cascade,
  successor_item   uuid not null references schedule_template_items(id) on delete cascade,
  predecessor_item uuid not null references schedule_template_items(id) on delete cascade,
  lag_days         int not null default 0,
  unique (successor_item, predecessor_item),
  check (successor_item <> predecessor_item)
);

-- ---------- 6. schedule_events — one change, one reason ----------
create table if not exists schedule_events (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references builder_orgs(id) on delete cascade,
  job_id     uuid not null references jobs(id) on delete cascade,
  item_id    uuid references schedule_items(id) on delete set null,
  kind       text not null
             check (kind in ('publish','shift','import','status','baseline')),
  reason     text,
  metadata   jsonb,
  actor      uuid references people(id),   -- null = system (field/cascade)
  created_at timestamptz not null default now()
);
create index if not exists se_job_idx on schedule_events (job_id, created_at desc);

-- ---------- 7. Linkage: WOs and selections join the spine ----------
alter table work_orders add column if not exists schedule_item_id uuid
  references schedule_items(id) on delete set null;
create index if not exists wo_schedule_idx on work_orders (schedule_item_id);

alter table selections add column if not exists schedule_item_id uuid
  references schedule_items(id) on delete set null;
create index if not exists sel_schedule_idx on selections (schedule_item_id);

-- ---------- 8. Workday math ----------
create or replace function is_workday(p_org uuid, p_day date, p_ignore boolean default false)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_mask smallint[];
begin
  if p_ignore then return true; end if;
  select workdays into v_mask from builder_orgs where id = p_org;
  if v_mask is null or array_length(v_mask, 1) is null then v_mask := '{1,2,3,4,5}'; end if;
  if not (extract(isodow from p_day)::smallint = any (v_mask)) then return false; end if;
  return not exists (select 1 from org_excluded_dates where org_id = p_org and day = p_day);
end $$;

create or replace function next_workday(p_org uuid, p_day date, p_ignore boolean default false)
returns date language plpgsql stable security definer set search_path = public as $$
declare v date := p_day; i int := 0;
begin
  while not is_workday(p_org, v, p_ignore) loop
    v := v + 1; i := i + 1;
    if i > 3660 then
      raise exception 'next_workday: no working day within 10 years of % — check the org calendar', p_day;
    end if;
  end loop;
  return v;
end $$;

-- The p_n-th working day strictly AFTER p_from (p_n <= 0 returns p_from).
create or replace function add_workdays(p_org uuid, p_from date, p_n int, p_ignore boolean default false)
returns date language plpgsql stable security definer set search_path = public as $$
declare v date := p_from; k int := 0; i int := 0;
begin
  if p_from is null or p_n <= 0 then return p_from; end if;
  while k < p_n loop
    v := v + 1;
    if is_workday(p_org, v, p_ignore) then k := k + 1; end if;
    i := i + 1;
    if i > 36600 then raise exception 'add_workdays: runaway — check the org calendar'; end if;
  end loop;
  return v;
end $$;

-- The p_n-th working day strictly BEFORE p_from (selection deadlines).
create or replace function sub_workdays(p_org uuid, p_from date, p_n int, p_ignore boolean default false)
returns date language plpgsql stable security definer set search_path = public as $$
declare v date := p_from; k int := 0; i int := 0;
begin
  if p_from is null or p_n <= 0 then return p_from; end if;
  while k < p_n loop
    v := v - 1;
    if is_workday(p_org, v, p_ignore) then k := k + 1; end if;
    i := i + 1;
    if i > 36600 then raise exception 'sub_workdays: runaway — check the org calendar'; end if;
  end loop;
  return v;
end $$;

-- ---------- 9. The recalc engine (ruling 3: cascade in the DB) ----------
-- Topological walk (Kahn): an item computes only after every same-job
-- predecessor has. Roots anchor on coalesce(manual_start, start_date, today).
-- Dependents: floor = max over preds of add_workdays(effective_end, 1 + lag),
-- where effective_end = coalesce(actual_end, end_date) — THE FIELD ADVANCES
-- THE SCHEDULE. manual_start acts as start-no-earlier-than. Complete items
-- keep their dates frozen. Linked not-yet-started WOs inherit shifted dates.
-- Linked selection deadlines move: deadline = item start − lag workdays.
-- A cycle raises — never silently drops items.
create or replace function recalc_schedule(p_job uuid, p_reason text default null, p_actor uuid default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_total int;
  v_processed uuid[] := '{}';
  v_moved int := 0;
  v_guard int := 0;
  v_progress boolean;
  r record;
  v_floor date; v_start date; v_end date;
begin
  select org_id into v_org from jobs where id = p_job;
  if v_org is null then return 0; end if;
  select count(*) into v_total from schedule_items where job_id = p_job;

  while coalesce(array_length(v_processed, 1), 0) < v_total loop
    v_guard := v_guard + 1;
    if v_guard > v_total + 1 then
      raise exception 'recalc_schedule: dependency cycle detected on job %', p_job;
    end if;
    v_progress := false;

    for r in
      select si.* from schedule_items si
      where si.job_id = p_job
        and not (si.id = any (v_processed))
        and not exists (
          select 1
            from schedule_deps d
            join schedule_items p on p.id = d.predecessor_id
           where d.successor_id = si.id
             and p.job_id = p_job                      -- same-job deps only
             and not (d.predecessor_id = any (v_processed)))
      order by si.sort, si.created_at
    loop
      v_progress := true;

      if r.status = 'complete' then
        v_processed := v_processed || r.id;            -- frozen; effective end feeds successors
        continue;
      end if;

      select max(add_workdays(v_org, coalesce(p.actual_end, p.end_date),
                              1 + d.lag_days, r.ignore_workdays))
        into v_floor
        from schedule_deps d
        join schedule_items p on p.id = d.predecessor_id
       where d.successor_id = r.id and p.job_id = p_job
         and coalesce(p.actual_end, p.end_date) is not null;

      if v_floor is null then
        v_start := next_workday(v_org,
                     coalesce(r.manual_start, r.start_date, current_date),
                     r.ignore_workdays);
      else
        v_start := next_workday(v_org,
                     greatest(v_floor, coalesce(r.manual_start, v_floor)),
                     r.ignore_workdays);
      end if;
      v_end := case when r.duration_days <= 0 then v_start
                    else add_workdays(v_org, v_start, r.duration_days - 1, r.ignore_workdays) end;

      if v_start is distinct from r.start_date or v_end is distinct from r.end_date then
        update schedule_items
           set start_date = v_start, end_date = v_end, updated_at = now()
         where id = r.id;
        update work_orders
           set planned_start = v_start, planned_end = v_end
         where schedule_item_id = r.id
           and status in ('draft','issued','accepted');
        v_moved := v_moved + 1;
      end if;
      v_processed := v_processed || r.id;
    end loop;

    if not v_progress and coalesce(array_length(v_processed, 1), 0) < v_total then
      raise exception 'recalc_schedule: dependency cycle detected on job %', p_job;
    end if;
  end loop;

  -- Moving decision deadlines (ruling 5) — 010's await, closed.
  update selections s
     set decision_deadline = sub_workdays(v_org, si.start_date, coalesce(s.deadline_lag_days, 0))
    from schedule_items si
   where si.id = s.schedule_item_id
     and si.job_id = p_job
     and si.start_date is not null
     and s.decision_deadline is distinct from
         sub_workdays(v_org, si.start_date, coalesce(s.deadline_lag_days, 0));

  if v_moved > 0 then
    insert into schedule_events (org_id, job_id, kind, reason, metadata, actor)
    values (v_org, p_job, 'shift', p_reason,
            jsonb_build_object('items_moved', v_moved), p_actor);
  end if;
  return v_moved;
end $$;

-- ---------- 10. Cascade triggers (depth-guarded reentry) ----------
-- Engine functions (shift/import/publish) set a transaction-local GUC so
-- THEY own the single reasoned recalc — otherwise the row trigger fires
-- first, cascades with a null reason, and the reasoned pass finds nothing
-- left to move (caught by the recalc smoke, scenario 3).
create or replace function schedule_items_recalc_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if pg_trigger_depth() > 1
     or current_setting('mbv.suppress_recalc', true) = '1' then
    return coalesce(new, old);       -- engine-owned pass or recalc's own writes
  end if;
  perform recalc_schedule(coalesce(new.job_id, old.job_id),
                          null, auth.uid());
  return coalesce(new, old);
end $$;
drop trigger if exists si_recalc on schedule_items;
create trigger si_recalc
  after insert or delete
     or update of duration_days, manual_start, start_date,
                  ignore_workdays, milestone, actual_end, status
  on schedule_items
  for each row execute function schedule_items_recalc_trg();

create or replace function schedule_deps_recalc_trg()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_job uuid;
begin
  if pg_trigger_depth() > 1
     or current_setting('mbv.suppress_recalc', true) = '1' then
    return coalesce(new, old);
  end if;
  select job_id into v_job from schedule_items
   where id = coalesce(new.successor_id, old.successor_id);
  if v_job is not null then
    perform recalc_schedule(v_job, null, auth.uid());
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists sd_recalc on schedule_deps;
create trigger sd_recalc
  after insert or update or delete on schedule_deps
  for each row execute function schedule_deps_recalc_trg();

-- ---------- 11. The field advances the schedule (WO completion) ----------
-- A WO reaching in_progress starts its item; the LAST open WO reaching
-- complete/verified completes the item with actual_end = today and the
-- cascade runs — successors follow the actual finish, early or late.
create or replace function advance_schedule_from_wo()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_open int; v_item uuid := new.schedule_item_id;
begin
  if v_item is null or new.status = old.status then return new; end if;

  if new.status = 'in_progress' then
    update schedule_items
       set status = 'in_progress',
           actual_start = coalesce(actual_start, current_date),
           updated_at = now()
     where id = v_item and status = 'pending';

  elsif new.status in ('complete','verified')
        and old.status not in ('complete','verified','closed') then
    select count(*) into v_open from work_orders
     where schedule_item_id = v_item
       and status not in ('complete','verified','closed','cancelled','declined');
    if v_open = 0 then
      update schedule_items
         set status = 'complete',
             actual_start = coalesce(actual_start, current_date),
             actual_end = current_date,
             updated_at = now()
       where id = v_item and status <> 'complete';
      if found then
        perform recalc_schedule(new.job_id,
          'Advanced from the field: WO #' || coalesce(new.number::text, '?') || ' complete',
          null);
        insert into schedule_events (org_id, job_id, item_id, kind, reason, actor)
        values (new.org_id, new.job_id, v_item, 'status',
                'Item completed by WO #' || coalesce(new.number::text, '?') || ' in the field',
                null);
      end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists wo_advance_schedule on work_orders;
create trigger wo_advance_schedule after update on work_orders
  for each row execute function advance_schedule_from_wo();

-- New WOs on a scheduled item inherit its dates by default (ruling 1).
create or replace function inherit_wo_schedule_dates()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.schedule_item_id is not null and new.planned_start is null then
    select start_date, coalesce(new.planned_end, end_date)
      into new.planned_start, new.planned_end
      from schedule_items where id = new.schedule_item_id;
  end if;
  return new;
end $$;
drop trigger if exists wo_inherit_dates on work_orders;
create trigger wo_inherit_dates before insert on work_orders
  for each row execute function inherit_wo_schedule_dates();

-- ---------- 12. Publish: baseline in one act (ruling 4) ----------
create or replace function publish_schedule(p_job uuid)
returns int language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_n int;
begin
  select org_id into v_org from jobs where id = p_job;
  if v_org is null then raise exception 'publish_schedule: job % not found', p_job; end if;
  if org_role(v_org) not in ('owner','admin','pm') then
    raise exception 'publish_schedule: owner/admin/pm only';
  end if;
  perform set_config('mbv.suppress_recalc', '1', true);   -- this fn owns the cascade
  perform recalc_schedule(p_job, null, auth.uid());
  update jobs set schedule_status = 'published' where id = p_job;
  update schedule_items
     set baseline_start = start_date, baseline_end = end_date, updated_at = now()
   where job_id = p_job;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'publish_schedule: no schedule items on job %', p_job; end if;
  insert into schedule_events (org_id, job_id, kind, reason, metadata, actor)
  values (v_org, p_job, 'publish', 'Schedule published — baseline set',
          jsonb_build_object('items', v_n), auth.uid());
  return v_n;
end $$;

-- ---------- 13. Template import: Day-N → real dates ----------
create or replace function import_schedule_template(p_job uuid, p_template uuid, p_start date)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_org uuid; v_anchor date; v_n int := 0;
  v_src uuid[] := '{}'; v_dst uuid[] := '{}';
  t record; d record; v_new uuid;
begin
  select org_id into v_org from jobs where id = p_job;
  if v_org is null then raise exception 'import_schedule_template: job % not found', p_job; end if;
  if org_role(v_org) not in ('owner','admin','pm') then
    raise exception 'import_schedule_template: owner/admin/pm only';
  end if;
  if not exists (select 1 from schedule_templates
                  where id = p_template and org_id = v_org) then
    raise exception 'import_schedule_template: template not in this org';
  end if;
  v_anchor := next_workday(v_org, coalesce(p_start, current_date));
  perform set_config('mbv.suppress_recalc', '1', true);   -- this fn owns the cascade

  for t in select * from schedule_template_items
            where template_id = p_template order by sort loop
    insert into schedule_items
      (org_id, job_id, title, phase, discipline, duration_days, milestone,
       client_visible, color, sort, start_date, created_by)
    values
      (v_org, p_job, t.title, t.phase, t.discipline, t.duration_days, t.milestone,
       t.client_visible, t.color, t.sort,
       add_workdays(v_org, v_anchor, t.day_offset), auth.uid())
    returning id into v_new;
    v_src := v_src || t.id; v_dst := v_dst || v_new;
    v_n := v_n + 1;
  end loop;

  insert into schedule_deps (successor_id, predecessor_id, lag_days)
  select ds.dst, dp.dst, td.lag_days
    from schedule_template_deps td
    join unnest(v_src, v_dst) as ds(src, dst) on ds.src = td.successor_item
    join unnest(v_src, v_dst) as dp(src, dst) on dp.src = td.predecessor_item
   where td.template_id = p_template;

  perform recalc_schedule(p_job, 'Template imported', auth.uid());
  insert into schedule_events (org_id, job_id, kind, reason, metadata, actor)
  values (v_org, p_job, 'import', 'Schedule template imported',
          jsonb_build_object('items', v_n, 'start', v_anchor), auth.uid());
  return v_n;
end $$;

-- UI drag: one shift, one reason, cascade in the same act.
create or replace function shift_schedule_item(p_item uuid, p_new_start date, p_reason text)
returns int language plpgsql security definer set search_path = public as $$
declare v_job uuid; v_org uuid; v_has_preds boolean;
begin
  select job_id, org_id into v_job, v_org from schedule_items where id = p_item;
  if v_job is null then raise exception 'shift_schedule_item: item not found'; end if;
  if org_role(v_org) not in ('owner','admin','pm','super') then
    raise exception 'shift_schedule_item: owner/admin/pm/super only';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'shift_schedule_item: a reason is required — one change, one reason';
  end if;
  perform set_config('mbv.suppress_recalc', '1', true);   -- this fn owns the cascade
  select exists (select 1 from schedule_deps where successor_id = p_item) into v_has_preds;
  if v_has_preds then
    update schedule_items set manual_start = p_new_start, updated_at = now()
     where id = p_item;                      -- start-no-earlier-than; deps still win
  else
    update schedule_items set start_date = p_new_start, manual_start = null, updated_at = now()
     where id = p_item;                      -- root anchor moves outright
  end if;
  return recalc_schedule(v_job, p_reason, auth.uid());
end $$;

-- ---------- 14. RLS at birth — every table, no exceptions ----------
alter table org_excluded_dates      enable row level security;
alter table schedule_items          enable row level security;
alter table schedule_deps           enable row level security;
alter table schedule_templates      enable row level security;
alter table schedule_template_items enable row level security;
alter table schedule_template_deps  enable row level security;
alter table schedule_events         enable row level security;

drop policy if exists oed_select on org_excluded_dates;
create policy oed_select on org_excluded_dates for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id));
drop policy if exists oed_write on org_excluded_dates;
create policy oed_write on org_excluded_dates for all
  using (org_role(org_id) in ('owner','admin','pm'))
  with check (org_role(org_id) in ('owner','admin','pm'));

-- items: staff read; clients read client_visible items once PUBLISHED
-- (portal surface is Phase C; the read path is schema-ready now).
drop policy if exists si_select on schedule_items;
create policy si_select on schedule_items for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id)
         or (client_visible
             and is_job_participant(job_id)
             and exists (select 1 from jobs j
                          where j.id = job_id and j.schedule_status = 'published')));
drop policy if exists si_write on schedule_items;
create policy si_write on schedule_items for all
  using (org_role(org_id) in ('owner','admin','pm','super'))
  with check (org_role(org_id) in ('owner','admin','pm','super'));

drop policy if exists sd_select on schedule_deps;
create policy sd_select on schedule_deps for select
  using (exists (select 1 from schedule_items i where i.id = successor_id
                 and (is_org_member(i.org_id) or is_jsh_support_active(i.org_id))));
drop policy if exists sd_write on schedule_deps;
create policy sd_write on schedule_deps for all
  using (exists (select 1 from schedule_items i where i.id = successor_id
                 and org_role(i.org_id) in ('owner','admin','pm','super')))
  with check (exists (select 1 from schedule_items i where i.id = successor_id
                 and org_role(i.org_id) in ('owner','admin','pm','super')));

drop policy if exists st_select on schedule_templates;
create policy st_select on schedule_templates for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id));
drop policy if exists st_write on schedule_templates;
create policy st_write on schedule_templates for all
  using (org_role(org_id) in ('owner','admin','pm'))
  with check (org_role(org_id) in ('owner','admin','pm'));

drop policy if exists sti_select on schedule_template_items;
create policy sti_select on schedule_template_items for select
  using (exists (select 1 from schedule_templates t where t.id = template_id
                 and (is_org_member(t.org_id) or is_jsh_support_active(t.org_id))));
drop policy if exists sti_write on schedule_template_items;
create policy sti_write on schedule_template_items for all
  using (exists (select 1 from schedule_templates t where t.id = template_id
                 and org_role(t.org_id) in ('owner','admin','pm')))
  with check (exists (select 1 from schedule_templates t where t.id = template_id
                 and org_role(t.org_id) in ('owner','admin','pm')));

drop policy if exists std_select on schedule_template_deps;
create policy std_select on schedule_template_deps for select
  using (exists (select 1 from schedule_templates t where t.id = template_id
                 and (is_org_member(t.org_id) or is_jsh_support_active(t.org_id))));
drop policy if exists std_write on schedule_template_deps;
create policy std_write on schedule_template_deps for all
  using (exists (select 1 from schedule_templates t where t.id = template_id
                 and org_role(t.org_id) in ('owner','admin','pm')))
  with check (exists (select 1 from schedule_templates t where t.id = template_id
                 and org_role(t.org_id) in ('owner','admin','pm')));

drop policy if exists se_select on schedule_events;
create policy se_select on schedule_events for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id));
drop policy if exists se_insert on schedule_events;
create policy se_insert on schedule_events for insert
  with check (org_role(org_id) in ('owner','admin','pm','super')
              and actor = auth.uid());

-- ---------- 15. Reload PostgREST ----------
notify pgrst, 'reload schema';

-- ---------- 16. PROVE-IT ----------
-- PASS conditions (mybuildervault-dev):
--   new_tables     = 7   (all RLS-enabled)
--   workday_fns    = 4   (is_workday, next_workday, add_workdays, sub_workdays)
--   engine_fns     = 4   (recalc_schedule, publish_schedule,
--                         import_schedule_template, shift_schedule_item)
--   cascade_trgs   = 2   (si_recalc, sd_recalc)
--   wo_trgs        = 2   (wo_advance_schedule, wo_inherit_dates)
--   linkage_cols   = 2   (work_orders + selections . schedule_item_id)
--   job_gate       = 1   (jobs.schedule_status draft|published)
--   calendar_mask  = 1   (builder_orgs.workdays)
--   fs_only        = 1   (schedule_deps dep_type constrained to FS)
select
  (select count(*) from pg_tables where schemaname = 'public' and rowsecurity
     and tablename in ('org_excluded_dates','schedule_items','schedule_deps',
                       'schedule_templates','schedule_template_items',
                       'schedule_template_deps','schedule_events')) as new_tables,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('is_workday','next_workday','add_workdays','sub_workdays')) as workday_fns,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('recalc_schedule','publish_schedule',
                         'import_schedule_template','shift_schedule_item')) as engine_fns,
  (select count(*) from pg_trigger
     where tgname in ('si_recalc','sd_recalc') and not tgisinternal) as cascade_trgs,
  (select count(*) from pg_trigger
     where tgrelid = 'work_orders'::regclass
       and tgname in ('wo_advance_schedule','wo_inherit_dates')) as wo_trgs,
  (select count(*) from information_schema.columns
     where column_name = 'schedule_item_id'
       and table_name in ('work_orders','selections')) as linkage_cols,
  (select count(*) from pg_constraint
     where conrelid = 'jobs'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%schedule_status%'
       and pg_get_constraintdef(oid) like '%published%') as job_gate,
  (select count(*) from information_schema.columns
     where table_name = 'builder_orgs' and column_name = 'workdays') as calendar_mask,
  (select count(*) from pg_constraint
     where conrelid = 'schedule_deps'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%dep_type%'
       and pg_get_constraintdef(oid) like '%FS%') as fs_only;
