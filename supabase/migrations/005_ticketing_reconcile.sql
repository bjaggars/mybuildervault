-- ============================================================
-- MyBuilderVault — DB change script 005: Ticketing reconciliation
-- WHY: the 003 run on dev predated the 003 amendment (discovered
-- 2026-08-04 when PostgREST reported no 'channel' column: the
-- amendment presence check returned 0/0/0/0). This script
-- idempotently converges ANY pre-amendment state to the full
-- amended-003 shape: safe to run on a database that has all,
-- some, or none of the amendment pieces.
-- Run on: mybuildervault-dev FIRST. Then run 004 (it depends on
-- this shape). Prod runs 001..005 in order via release ritual.
-- ============================================================

-- ---------- 1. org_support_settings (may be absent) ----------
create table if not exists org_support_settings (
  org_id      uuid primary key references builder_orgs(id) on delete cascade,
  l1_handler  text not null default 'builder' check (l1_handler in ('builder','jsh')),
  updated_at  timestamptz not null default now()
);

-- ---------- 2. tickets — add every amendment column defensively ----------
alter table tickets add column if not exists on_behalf_of uuid references people(id);
alter table tickets add column if not exists type text not null default 'defect';
alter table tickets add column if not exists channel text not null default 'app';
alter table tickets add column if not exists category text;
alter table tickets add column if not exists tags text[];
alter table tickets add column if not exists attachments jsonb;
alter table tickets add column if not exists level int not null default 1;
alter table tickets add column if not exists assigned_to uuid references people(id);
alter table tickets add column if not exists first_response_at timestamptz;
alter table tickets add column if not exists resolved_at timestamptz;
alter table tickets add column if not exists reopened_count int not null default 0;
alter table tickets add column if not exists updated_at timestamptz not null default now();
alter table tickets add column if not exists closed_at timestamptz;

-- Re-state the value checks under known names (drop first so a
-- pre-amendment or auto-named variant can't conflict).
alter table tickets drop constraint if exists tickets_type_check;
alter table tickets add constraint tickets_type_check
  check (type in ('defect','feature_request','how_to','other'));
alter table tickets drop constraint if exists tickets_channel_check;
alter table tickets add constraint tickets_channel_check
  check (channel in ('app','concierge','jsh'));
alter table tickets drop constraint if exists tickets_level_check;
alter table tickets add constraint tickets_level_check
  check (level between 1 and 3);

-- ---------- 3. feature_requests + conversion pointer ----------
create table if not exists feature_requests (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references builder_orgs(id) on delete cascade,
  source       text not null default 'direct'
               check (source in ('concierge','ticket','direct')),
  ticket_id    uuid references tickets(id),
  requested_by uuid references people(id),
  title        text not null,
  body         text,
  status       text not null default 'new'
               check (status in ('new','reviewing','planned','declined','shipped')),
  github_issue_number int,   -- dual-write happens app-side (MRV doctrine)
  created_at   timestamptz not null default now()
);

alter table tickets add column if not exists
  converted_to_feature uuid references feature_requests(id);

-- ---------- 4. ticket_events — amendment columns + kind set ----------
alter table ticket_events add column if not exists visibility text not null default 'requester';
alter table ticket_events drop constraint if exists ticket_events_visibility_check;
alter table ticket_events add constraint ticket_events_visibility_check
  check (visibility in ('requester','internal'));
alter table ticket_events add column if not exists metadata jsonb;

-- Replace whatever kind in-list check exists (any name) with the amended set.
-- Pattern '%kind = ANY%' matches only the in-list check, never 004's
-- actor-required guard ('actor IS NOT NULL OR kind = auto_response').
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'ticket_events'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%kind = ANY%'
  loop
    execute format('alter table ticket_events drop constraint %I', c.conname);
  end loop;
end $$;
alter table ticket_events add constraint ticket_events_kind_check
  check (kind in ('comment','status_change','level_change','assignment',
                  'type_change','reopen','conversion'));

-- ---------- 5. Access functions (create or replace = idempotent) ----------
create or replace function can_see_ticket_queue(p_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select is_platform_staff()
      or (org_role(p_org) in ('owner','admin')
          and (coalesce((select l1_handler from org_support_settings
                         where org_id = p_org),'builder') = 'builder'
               or resolve_entitlement(p_org, auth.uid(), 'support.queue_visible')));
$$;

create or replace function can_work_tickets(p_org uuid, p_level int)
returns boolean language sql security definer stable set search_path = public as $$
  select is_platform_staff()
      or (org_role(p_org) in ('owner','admin') and p_level = 1
          and coalesce((select l1_handler from org_support_settings
                        where org_id = p_org),'builder') = 'builder');
$$;

-- ---------- 6. Stats view — drop + recreate (column set may differ) ----------
drop view if exists v_ticket_stats;
create view v_ticket_stats with (security_invoker = true) as
select org_id,
  count(*) filter (where status in ('open','in_progress','waiting')) as open_tickets,
  count(*) filter (where status = 'in_progress')                     as in_progress,
  count(*) filter (where status = 'waiting')                         as waiting,
  count(*) filter (where status = 'resolved')                        as resolved,
  count(*) filter (where status = 'closed')                          as closed,
  count(*) filter (where created_at > now() - interval '7 days')     as new_7d,
  count(*) filter (where type = 'feature_request')                   as feature_requests,
  round((avg(extract(epoch from (closed_at - created_at)) / 3600.0)
         filter (where closed_at is not null))::numeric, 1)          as avg_hours_to_close,
  round((avg(extract(epoch from (first_response_at - created_at)) / 3600.0)
         filter (where first_response_at is not null))::numeric, 1)  as avg_hours_first_response
from tickets
group by org_id;

-- ---------- 7. RLS + policies — re-stated (drop if exists, create) ----------
alter table org_support_settings enable row level security;
alter table tickets              enable row level security;
alter table feature_requests     enable row level security;
alter table ticket_events        enable row level security;

drop policy if exists oss_select on org_support_settings;
create policy oss_select on org_support_settings for select
  using (is_org_member(org_id) or is_platform_staff());
drop policy if exists oss_write on org_support_settings;
create policy oss_write on org_support_settings for all
  using (is_platform_staff()) with check (is_platform_staff());

drop policy if exists t_select on tickets;
create policy t_select on tickets for select
  using (opened_by = auth.uid() or on_behalf_of = auth.uid()
         or can_see_ticket_queue(org_id));
drop policy if exists t_insert on tickets;
create policy t_insert on tickets for insert
  with check (is_platform_staff()
              or (opened_by = auth.uid() and is_org_member(org_id)
                  and level = 1 and status = 'open'));
drop policy if exists t_update on tickets;
create policy t_update on tickets for update
  using (can_work_tickets(org_id, level))
  with check (is_platform_staff() or level <= 2);  -- builder L1 may escalate to 2

drop policy if exists fr_select on feature_requests;
create policy fr_select on feature_requests for select
  using (requested_by = auth.uid() or can_see_ticket_queue(org_id));
drop policy if exists fr_insert on feature_requests;
create policy fr_insert on feature_requests for insert
  with check (is_platform_staff()
              or (requested_by = auth.uid() and is_org_member(org_id)));
drop policy if exists fr_update on feature_requests;
create policy fr_update on feature_requests for update
  using (is_platform_staff());   -- FR pipeline (status) is JSH product management

drop policy if exists ev_select on ticket_events;
create policy ev_select on ticket_events for select
  using (exists (select 1 from tickets t where t.id = ticket_id
          and (can_see_ticket_queue(t.org_id)
               or ((t.opened_by = auth.uid() or t.on_behalf_of = auth.uid())
                   and visibility = 'requester'))));
drop policy if exists ev_insert on ticket_events;
create policy ev_insert on ticket_events for insert
  with check (actor = auth.uid()
              and exists (select 1 from tickets t where t.id = ticket_id
                   and (can_work_tickets(t.org_id, t.level)
                        or ((t.opened_by = auth.uid() or t.on_behalf_of = auth.uid())
                            and visibility = 'requester'))));

-- ---------- 8. Reload PostgREST ----------
notify pgrst, 'reload schema';

-- ---------- 9. PROVE-IT ----------
-- PASS conditions (mybuildervault-dev):
--   amendment_cols = 4   (channel, type, first_response_at, converted_to_feature)
--   fr_table       = 1
--   stats_view     = 1
--   ticket_fns     = 2
--   kind_check     = 1   (single in-list check, amended set)
select
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='tickets'
      and column_name in ('channel','type','first_response_at','converted_to_feature')) as amendment_cols,
  (select count(*) from information_schema.tables
    where table_schema='public' and table_name='feature_requests') as fr_table,
  (select count(*) from pg_views
    where schemaname='public' and viewname='v_ticket_stats') as stats_view,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in ('can_see_ticket_queue','can_work_tickets')) as ticket_fns,
  (select count(*) from pg_constraint
    where conrelid='ticket_events'::regclass and contype='c'
      and pg_get_constraintdef(oid) like '%kind = ANY%') as kind_check;
