-- ============================================================
-- MyBuilderVault — DB change script 007: The Job Container
-- Phase B opening move per ARCHITECTURE.md (APPROVED 2026-08-04,
-- amendment 0058e1e): contacts as PARTIES (MRV identity layering),
-- communities / lots / plans-as-data (reserved geometry slot),
-- ONE job status engine serving both lifecycles, job_events audit,
-- structures (1..n per job), job_participants (buyer-attach is an
-- insert + event, first-class). Also widens tickets.t_insert so
-- job participants (clients) can file tickets — the 003 note.
-- RLS at birth on every table. Estimates land in script 008.
-- Run on: mybuildervault-dev FIRST. Prod via release ritual.
-- ============================================================

-- ---------- 1. Contacts — the relationship unit is a PARTY ----------
create table if not exists contacts (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references builder_orgs(id) on delete cascade,
  kind         text not null default 'person'
               check (kind in ('person','household','entity')),
  display_name text not null,
  email        text,   -- cache: mirrors PRIMARY member via trigger, never hand-edited
  phone        text,   -- cache: same
  notes        text,
  created_at   timestamptz not null default now()
);

create table if not exists contact_members (
  id         uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  full_name  text not null,
  email      text,
  phone      text,
  person_id  uuid references people(id),  -- linked when they become a portal user
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists contact_members_one_primary
  on contact_members (contact_id) where is_primary;

-- Cache maintenance: contact.email/phone mirror the primary member.
create or replace function sync_contact_cache()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_contact uuid;
begin
  v_contact := coalesce(new.contact_id, old.contact_id);
  update contacts c
     set email = m.email, phone = m.phone
    from (select email, phone from contact_members
           where contact_id = v_contact and is_primary limit 1) m
   where c.id = v_contact;
  return coalesce(new, old);
end $$;

drop trigger if exists contact_members_cache on contact_members;
create trigger contact_members_cache
  after insert or update or delete on contact_members
  for each row execute function sync_contact_cache();

-- ---------- 2. Communities / lots / plans (plans enter as DATA) ----------
create table if not exists communities (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references builder_orgs(id) on delete cascade,
  name       text not null,
  county     text,
  notes      text,
  created_at timestamptz not null default now()
);

create table if not exists lots (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references builder_orgs(id) on delete cascade,
  community_id uuid references communities(id),
  address      text,
  county       text,
  parcel       text,
  survey_doc_url text,
  notes        text,
  created_at   timestamptz not null default now()
);

create table if not exists plans (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references builder_orgs(id) on delete cascade,
  name       text not null,
  base_sqft  int,
  beds       numeric,
  baths      numeric,
  elevations text[],
  notes      text,
  created_at timestamptz not null default now()
);

create table if not exists plan_versions (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references plans(id) on delete cascade,
  version    int  not null default 1,
  rooms      jsonb,
  areas      jsonb,
  geometry   jsonb,  -- RESERVED (amendment 0058e1e): empty until Studio track B;
                     -- exists at birth so Eric's Studio starts with data, not a schema change
  created_at timestamptz not null default now(),
  unique (plan_id, version)
);

-- ---------- 3. Jobs — one status engine, two funnel views ----------
create table if not exists jobs (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references builder_orgs(id) on delete cascade,
  lifecycle  text not null check (lifecycle in ('spec','custom')),
  name       text not null,
  lot_id     uuid references lots(id),
  plan_id    uuid references plans(id),          -- nullable: full custom
  contact_id uuid references contacts(id),        -- primary client party; null until buyer-attach
  status     text not null default 'lead'
             check (status in ('lead','design','contract','permitting',
                               'planned','permitted','construction','listed',
                               'under_contract','closed_sold','warranty','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function touch_jobs_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists jobs_touch on jobs;
create trigger jobs_touch before update on jobs
  for each row execute function touch_jobs_updated_at();

create table if not exists job_events (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references jobs(id) on delete cascade,
  kind        text not null default 'note'
              check (kind in ('status_change','buyer_attach','note')),
  from_status text,
  to_status   text,
  actor       uuid references people(id),
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists structures (
  id      uuid primary key default gen_random_uuid(),
  job_id  uuid not null references jobs(id) on delete cascade,
  kind    text not null default 'house'
          check (kind in ('house','shop','garage','adu','barn','other')),
  label   text not null,
  sort    int  not null default 0
);

-- ---------- 4. Job participants — the buyer's chair, first-class ----------
create table if not exists job_participants (
  id                uuid primary key default gen_random_uuid(),
  job_id            uuid not null references jobs(id) on delete cascade,
  contact_id        uuid not null references contacts(id),
  contact_member_id uuid references contact_members(id),  -- null = the whole party
  role              text not null
                    check (role in ('client_primary','client_co','sub','vendor','agent')),
  created_at        timestamptz not null default now()
);

-- ---------- 5. RLS helpers ----------
-- A signed-in client is a participant on a job when any contact member linked
-- to their person is a participant (member-level or whole-party rows).
create or replace function is_job_participant(p_job uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from job_participants jp
    join contact_members cm
      on cm.contact_id = jp.contact_id
     and (jp.contact_member_id is null or jp.contact_member_id = cm.id)
    where jp.job_id = p_job and cm.person_id = auth.uid());
$$;

create or replace function is_client_of_org(p_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from job_participants jp
    join jobs j on j.id = jp.job_id
    join contact_members cm
      on cm.contact_id = jp.contact_id
     and (jp.contact_member_id is null or jp.contact_member_id = cm.id)
    where j.org_id = p_org and cm.person_id = auth.uid());
$$;

-- ---------- 6. RLS at birth — every table, no exceptions ----------
alter table contacts        enable row level security;
alter table contact_members enable row level security;
alter table communities     enable row level security;
alter table lots            enable row level security;
alter table plans           enable row level security;
alter table plan_versions   enable row level security;
alter table jobs            enable row level security;
alter table job_events      enable row level security;
alter table structures      enable row level security;
alter table job_participants enable row level security;

-- Staff: members read their org; owner/admin/pm write; sales may also work
-- contacts + jobs (the lead funnel is theirs).
drop policy if exists contacts_select on contacts;
create policy contacts_select on contacts for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id));
drop policy if exists contacts_write on contacts;
create policy contacts_write on contacts for all
  using (org_role(org_id) in ('owner','admin','pm','sales'))
  with check (org_role(org_id) in ('owner','admin','pm','sales'));

drop policy if exists cmembers_select on contact_members;
create policy cmembers_select on contact_members for select
  using (exists (select 1 from contacts c where c.id = contact_id
                 and (is_org_member(c.org_id) or is_jsh_support_active(c.org_id)))
         or person_id = auth.uid());
drop policy if exists cmembers_write on contact_members;
create policy cmembers_write on contact_members for all
  using (exists (select 1 from contacts c where c.id = contact_id
                 and org_role(c.org_id) in ('owner','admin','pm','sales')))
  with check (exists (select 1 from contacts c where c.id = contact_id
                 and org_role(c.org_id) in ('owner','admin','pm','sales')));

drop policy if exists communities_select on communities;
create policy communities_select on communities for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id));
drop policy if exists communities_write on communities;
create policy communities_write on communities for all
  using (org_role(org_id) in ('owner','admin','pm'))
  with check (org_role(org_id) in ('owner','admin','pm'));

drop policy if exists lots_select on lots;
create policy lots_select on lots for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id));
drop policy if exists lots_write on lots;
create policy lots_write on lots for all
  using (org_role(org_id) in ('owner','admin','pm'))
  with check (org_role(org_id) in ('owner','admin','pm'));

drop policy if exists plans_select on plans;
create policy plans_select on plans for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id));
drop policy if exists plans_write on plans;
create policy plans_write on plans for all
  using (org_role(org_id) in ('owner','admin','pm'))
  with check (org_role(org_id) in ('owner','admin','pm'));

drop policy if exists pv_select on plan_versions;
create policy pv_select on plan_versions for select
  using (exists (select 1 from plans p where p.id = plan_id
                 and (is_org_member(p.org_id) or is_jsh_support_active(p.org_id))));
drop policy if exists pv_write on plan_versions;
create policy pv_write on plan_versions for all
  using (exists (select 1 from plans p where p.id = plan_id
                 and org_role(p.org_id) in ('owner','admin','pm')))
  with check (exists (select 1 from plans p where p.id = plan_id
                 and org_role(p.org_id) in ('owner','admin','pm')));

-- Jobs: staff full; clients read their own jobs (the buyer's chair).
drop policy if exists jobs_select on jobs;
create policy jobs_select on jobs for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id)
         or is_job_participant(id));
drop policy if exists jobs_write on jobs;
create policy jobs_write on jobs for all
  using (org_role(org_id) in ('owner','admin','pm','sales'))
  with check (org_role(org_id) in ('owner','admin','pm','sales'));

-- job_events: staff read + insert (audit is builder-internal for now;
-- client-visible history is a Phase C portal-surface decision).
drop policy if exists jev_select on job_events;
create policy jev_select on job_events for select
  using (exists (select 1 from jobs j where j.id = job_id
                 and (is_org_member(j.org_id) or is_jsh_support_active(j.org_id))));
drop policy if exists jev_insert on job_events;
create policy jev_insert on job_events for insert
  with check (actor = auth.uid()
              and exists (select 1 from jobs j where j.id = job_id
                          and org_role(j.org_id) in ('owner','admin','pm','sales')));

-- Structures: staff write; clients read structures of their jobs.
drop policy if exists structures_select on structures;
create policy structures_select on structures for select
  using (exists (select 1 from jobs j where j.id = job_id
                 and (is_org_member(j.org_id) or is_jsh_support_active(j.org_id)
                      or is_job_participant(j.id))));
drop policy if exists structures_write on structures;
create policy structures_write on structures for all
  using (exists (select 1 from jobs j where j.id = job_id
                 and org_role(j.org_id) in ('owner','admin','pm')))
  with check (exists (select 1 from jobs j where j.id = job_id
                 and org_role(j.org_id) in ('owner','admin','pm')));

-- Participants: staff write; a participant can see their own row.
drop policy if exists jp_select on job_participants;
create policy jp_select on job_participants for select
  using (exists (select 1 from jobs j where j.id = job_id
                 and (is_org_member(j.org_id) or is_jsh_support_active(j.org_id)))
         or is_job_participant(job_id));
drop policy if exists jp_write on job_participants;
create policy jp_write on job_participants for all
  using (exists (select 1 from jobs j where j.id = job_id
                 and org_role(j.org_id) in ('owner','admin','pm','sales')))
  with check (exists (select 1 from jobs j where j.id = job_id
                 and org_role(j.org_id) in ('owner','admin','pm','sales')));

-- ---------- 7. Widen tickets.t_insert — clients can now file ----------
-- The 003 note comes due: job participants may open L1 tickets in their org.
drop policy if exists t_insert on tickets;
create policy t_insert on tickets for insert
  with check (is_platform_staff()
              or (opened_by = auth.uid() and level = 1 and status = 'open'
                  and (is_org_member(org_id) or is_client_of_org(org_id))));

-- ---------- 8. Reload PostgREST ----------
notify pgrst, 'reload schema';

-- ---------- 9. PROVE-IT ----------
-- PASS conditions (mybuildervault-dev):
--   new_tables      = 10   (all RLS-enabled)
--   helper_fns      = 3    (is_job_participant, is_client_of_org, sync_contact_cache)
--   status_values   = 12   (one engine, both funnels)
--   t_insert_client = 1    (widened policy mentions is_client_of_org)
select
  (select count(*) from pg_tables where schemaname='public' and rowsecurity
     and tablename in ('contacts','contact_members','communities','lots','plans',
                       'plan_versions','jobs','job_events','structures','job_participants'))
    as new_tables,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public'
       and p.proname in ('is_job_participant','is_client_of_org','sync_contact_cache'))
    as helper_fns,
  (select count(*)
     from unnest(string_to_array('lead,design,contract,permitting,planned,permitted,construction,listed,under_contract,closed_sold,warranty,closed', ',')) v
     where exists (select 1 from pg_constraint
                   where conrelid='jobs'::regclass and contype='c'
                     and pg_get_constraintdef(oid) like '%' || v || '%'))
    as status_values,
  (select count(*) from pg_policies
     where schemaname='public' and tablename='tickets' and policyname='t_insert'
       and coalesce(with_check,'') like '%is_client_of_org%')
    as t_insert_client;
