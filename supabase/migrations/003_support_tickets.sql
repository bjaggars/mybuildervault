-- ============================================================
-- MyBuilderVault — DB change script 003: Support Ticketing
-- Tiered tickets (L1 builder-or-JSH per org routing, L2/L3 JSH).
-- Queue visibility via entitlements ('support.queue_visible').
-- Platform staff work all tickets, all levels, always.
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
  category    text,
  priority    text not null default 'normal'
              check (priority in ('low','normal','high','urgent')),
  status      text not null default 'open'
              check (status in ('open','in_progress','waiting','resolved','closed')),
  level       int  not null default 1 check (level between 1 and 3),
  assigned_to uuid references people(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  closed_at   timestamptz
);

create table if not exists ticket_events (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references tickets(id) on delete cascade,
  actor       uuid not null references people(id),
  kind        text not null default 'comment'
              check (kind in ('comment','status_change','level_change','assignment')),
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

alter table org_support_settings enable row level security;
alter table tickets              enable row level security;
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
                            and visibility = 'requester'))));

notify pgrst, 'reload schema';

-- PROVE-IT · PASS: new_tables=3 (RLS on) · ticket_fns=2 · policy_count>=33
select
  (select count(*) from pg_tables where schemaname='public' and rowsecurity
     and tablename in ('org_support_settings','tickets','ticket_events')) as new_tables,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public'
       and p.proname in ('can_see_ticket_queue','can_work_tickets')) as ticket_fns,
  (select count(*) from pg_policies where schemaname='public') as policy_count;
