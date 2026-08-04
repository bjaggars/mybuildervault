-- ============================================================
-- MyBuilderVault — DB change script 003 (amended pre-run):
-- Support Ticketing + Feature Request pipeline + metrics.
-- Tiers 1-3, org L1 routing, entitlement-gated queue visibility,
-- Concierge intake channel, triage type reclassification,
-- ticket→feature_request conversion, dashboard stats view.
-- Run on: mybuildervault-dev FIRST. Prod via release ritual.
-- ============================================================

create table if not exists org_support_settings (
  org_id      uuid primary key references builder_orgs(id) on delete cascade,
  l1_handler  text not null default 'builder' check (l1_handler in ('builder','jsh')),
  updated_at  timestamptz not null default now()
);

create table if not exists tickets (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references builder_orgs(id) on delete cascade,
  opened_by   uuid not null references people(id),
  on_behalf_of uuid references people(id),
  subject     text not null,
  body        text,
  type        text not null default 'defect'
              check (type in ('defect','feature_request','how_to','other')),
  channel     text not null default 'app'
              check (channel in ('app','concierge','jsh')),
  category    text,
  tags        text[],
  attachments jsonb,
  priority    text not null default 'normal'
              check (priority in ('low','normal','high','urgent')),
  status      text not null default 'open'
              check (status in ('open','in_progress','waiting','resolved','closed')),
  level       int  not null default 1 check (level between 1 and 3),
  assigned_to uuid references people(id),
  first_response_at timestamptz,
  resolved_at       timestamptz,
  reopened_count    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  closed_at   timestamptz
);

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

create table if not exists ticket_events (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references tickets(id) on delete cascade,
  actor       uuid not null references people(id),
  kind        text not null default 'comment'
              check (kind in ('comment','status_change','level_change','assignment',
                              'type_change','reopen','conversion')),
  body        text,
  visibility  text not null default 'requester'
              check (visibility in ('requester','internal')),
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- Builder-L1 orgs always see their queue; JSH-L1 orgs governed by the
-- 'support.queue_visible' entitlement (org scope; default = visible,
-- hide by inserting an org-scope row with enabled=false).
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

-- Dashboard metrics — security_invoker so caller's RLS governs which orgs appear.
create or replace view v_ticket_stats with (security_invoker = true) as
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

alter table org_support_settings enable row level security;
alter table tickets              enable row level security;
alter table feature_requests     enable row level security;
alter table ticket_events        enable row level security;

create policy oss_select on org_support_settings for select
  using (is_org_member(org_id) or is_platform_staff());
create policy oss_write on org_support_settings for all
  using (is_platform_staff()) with check (is_platform_staff());

create policy t_select on tickets for select
  using (opened_by = auth.uid() or on_behalf_of = auth.uid()
         or can_see_ticket_queue(org_id));
create policy t_insert on tickets for insert
  with check (is_platform_staff()
              or (opened_by = auth.uid() and is_org_member(org_id)
                  and level = 1 and status = 'open'));
create policy t_update on tickets for update
  using (can_work_tickets(org_id, level))
  with check (is_platform_staff() or level <= 2);  -- builder L1 may escalate to 2

create policy fr_select on feature_requests for select
  using (requested_by = auth.uid() or can_see_ticket_queue(org_id));
create policy fr_insert on feature_requests for insert
  with check (is_platform_staff()
              or (requested_by = auth.uid() and is_org_member(org_id)));
create policy fr_update on feature_requests for update
  using (is_platform_staff());   -- FR pipeline (status) is JSH product management

create policy ev_select on ticket_events for select
  using (exists (select 1 from tickets t where t.id = ticket_id
          and (can_see_ticket_queue(t.org_id)
               or ((t.opened_by = auth.uid() or t.on_behalf_of = auth.uid())
                   and visibility = 'requester'))));
create policy ev_insert on ticket_events for insert
  with check (actor = auth.uid()
              and exists (select 1 from tickets t where t.id = ticket_id
                   and (can_work_tickets(t.org_id, t.level)
                        or ((t.opened_by = auth.uid() or t.on_behalf_of = auth.uid())
                            and visibility = 'requester'))))
;

notify pgrst, 'reload schema';

-- PROVE-IT · PASS: new_tables=4 (RLS on) · ticket_fns=2 · stats_view=1 · policy_count>=36
select
  (select count(*) from pg_tables where schemaname='public' and rowsecurity
     and tablename in ('org_support_settings','tickets','feature_requests','ticket_events')) as new_tables,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public'
       and p.proname in ('can_see_ticket_queue','can_work_tickets')) as ticket_fns,
  (select count(*) from pg_views where schemaname='public'
     and viewname='v_ticket_stats') as stats_view,
  (select count(*) from pg_policies where schemaname='public') as policy_count;
