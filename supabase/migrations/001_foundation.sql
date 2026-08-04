-- ============================================================
-- MyBuilderVault — DB change script 001: Foundation
-- Per ARCHITECTURE.md (APPROVED 2026-08-04) Phase A scope:
-- tenancy + identity + roles + cost codes + entitlements skeleton
-- + Mission Control tables. RLS at birth on every table.
-- Run on: mybuildervault-dev FIRST. Prod only via release ritual.
-- ============================================================

-- ---------- 1. Tenancy ----------
create table if not exists builder_orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  palette     jsonb not null default '{"navy":"#1C2B4A","gold":"#C5A028","cream":"#F5F0E8"}',
  tier        text not null default 'lighthouse'
              check (tier in ('lighthouse','core','pro','enterprise')),
  created_at  timestamptz not null default now()
);

-- ---------- 2. Identity ----------
-- People mirror auth.users (one auth per person — MRV identity layering).
create table if not exists people (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text not null,
  phone       text,
  created_at  timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into people (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create table if not exists org_members (
  org_id      uuid not null references builder_orgs(id) on delete cascade,
  person_id   uuid not null references people(id) on delete cascade,
  role        text not null
              check (role in ('owner','admin','pm','sales','super')),
  created_at  timestamptz not null default now(),
  primary key (org_id, person_id)
);

-- ---------- 3. RLS helper functions (security definer; no RLS recursion) ----------
create or replace function is_org_member(p_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from org_members
                 where org_id = p_org and person_id = auth.uid());
$$;

create or replace function org_role(p_org uuid)
returns text language sql security definer stable set search_path = public as $$
  select role from org_members
  where org_id = p_org and person_id = auth.uid();
$$;

create or replace function is_platform_owner()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from org_members
                 where person_id = auth.uid() and role = 'owner');
$$;

-- ---------- 4. Cost codes (the categorization backbone) ----------
create table if not exists cost_code_templates (
  id          serial primary key,
  code        text not null unique,
  name        text not null,
  group_name  text not null,
  sort        int  not null
);

create table if not exists cost_codes (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references builder_orgs(id) on delete cascade,
  code        text not null,
  name        text not null,
  group_name  text not null,
  sort        int  not null default 0,
  active      boolean not null default true,
  unique (org_id, code)
);

create or replace function seed_cost_codes(p_org uuid)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into cost_codes (org_id, code, name, group_name, sort)
  select p_org, code, name, group_name, sort from cost_code_templates
  on conflict (org_id, code) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

insert into cost_code_templates (code, name, group_name, sort) values
  ('1000','Permits & Government Fees','Preliminaries',10),
  ('1010','Plans & Engineering','Preliminaries',20),
  ('1020','Site Preparation & Clearing','Preliminaries',30),
  ('1030','Temporary Utilities','Preliminaries',40),
  ('2000','Excavation & Grading','Foundation',50),
  ('2010','Footings & Foundation','Foundation',60),
  ('2020','Slab','Foundation',70),
  ('2030','Waterproofing & Termite','Foundation',80),
  ('3000','Framing','Rough Structure',90),
  ('3010','Windows & Exterior Doors','Rough Structure',100),
  ('3020','Roof Structure & Sheathing','Rough Structure',110),
  ('4000','Roofing','Enclosure',120),
  ('4010','Siding & Masonry','Enclosure',130),
  ('4020','Exterior Trim & Soffit','Enclosure',140),
  ('4030','Garage Doors','Enclosure',150),
  ('5000','Plumbing Rough','Rough MEP',160),
  ('5010','HVAC Rough','Rough MEP',170),
  ('5020','Electrical Rough','Rough MEP',180),
  ('6000','Insulation','Interior Finish',190),
  ('6010','Drywall','Interior Finish',200),
  ('6020','Interior Trim & Doors','Interior Finish',210),
  ('6030','Cabinets','Interior Finish',220),
  ('6040','Countertops','Interior Finish',230),
  ('6050','Flooring','Interior Finish',240),
  ('6060','Paint','Interior Finish',250),
  ('6070','Plumbing Fixtures','Interior Finish',260),
  ('6080','Electrical Finish & Fixtures','Interior Finish',270),
  ('6090','Appliances','Interior Finish',280),
  ('7000','Driveway & Flatwork','Site Finish',290),
  ('7010','Well','Site Finish',300),
  ('7020','Septic / ATU','Site Finish',310),
  ('7030','Landscaping & Irrigation','Site Finish',320),
  ('7040','Final Grading','Site Finish',330),
  ('7050','Gutters','Site Finish',340),
  ('8000','Cleanup','Other',350),
  ('8010','Contingency','Other',360),
  ('8020','Warranty','Other',370)
on conflict (code) do nothing;

-- ---------- 5. Entitlements skeleton (thesis 9) ----------
create table if not exists org_entitlements (
  org_id      uuid not null references builder_orgs(id) on delete cascade,
  feature_key text not null,
  enabled     boolean not null default true,
  primary key (org_id, feature_key)
);
-- client_portal_toggles lands with jobs/participants in script 002 (needs job FK).

-- ---------- 6. Mission Control ----------
create table if not exists e2e_runs (
  id          uuid primary key default gen_random_uuid(),
  branch      text not null,
  sha         text not null,
  status      text not null check (status in ('pass','fail','running')),
  summary     text,
  run_url     text,
  created_at  timestamptz not null default now()
);

create table if not exists release_approvals (
  id          uuid primary key default gen_random_uuid(),
  version     text not null,
  sha         text not null,
  approved_by text not null,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ---------- 7. RLS at birth — every table, no exceptions ----------
alter table builder_orgs        enable row level security;
alter table people              enable row level security;
alter table org_members         enable row level security;
alter table cost_code_templates enable row level security;
alter table cost_codes          enable row level security;
alter table org_entitlements    enable row level security;
alter table e2e_runs            enable row level security;
alter table release_approvals   enable row level security;

-- builder_orgs: members read; owner/admin update; insert via service role only.
create policy orgs_select on builder_orgs for select
  using (is_org_member(id));
create policy orgs_update on builder_orgs for update
  using (org_role(id) in ('owner','admin'));

-- people: self + fellow org members read; self update.
create policy people_select on people for select
  using (id = auth.uid()
         or exists (select 1 from org_members a
                    join org_members b on a.org_id = b.org_id
                    where a.person_id = auth.uid() and b.person_id = people.id));
create policy people_update on people for update
  using (id = auth.uid());

-- org_members: members read their org's roster; owner/admin write.
create policy members_select on org_members for select
  using (is_org_member(org_id));
create policy members_insert on org_members for insert
  with check (org_role(org_id) in ('owner','admin'));
create policy members_update on org_members for update
  using (org_role(org_id) in ('owner','admin'));
create policy members_delete on org_members for delete
  using (org_role(org_id) in ('owner','admin'));

-- cost_code_templates: read-only reference for any authenticated user.
create policy cct_select on cost_code_templates for select
  using (auth.uid() is not null);

-- cost_codes: members read; owner/admin/pm write.
create policy cc_select on cost_codes for select
  using (is_org_member(org_id));
create policy cc_write on cost_codes for all
  using (org_role(org_id) in ('owner','admin','pm'))
  with check (org_role(org_id) in ('owner','admin','pm'));

-- org_entitlements: members read; writes via service role only (founder-controlled).
create policy ent_select on org_entitlements for select
  using (is_org_member(org_id));

-- Mission Control: platform-owner read; writes via service role (robot/founder).
create policy e2e_select on e2e_runs for select
  using (is_platform_owner());
create policy rel_select on release_approvals for select
  using (is_platform_owner());

-- ---------- 8. Reload PostgREST ----------
notify pgrst, 'reload schema';

-- ---------- 9. PROVE-IT ----------
-- PASS conditions, run and eyeball on the NAMED target project (mybuildervault-dev):
--   rls_enabled_tables = 8            (every table in this script has RLS on)
--   policy_count       >= 14          (all policies above created)
--   template_codes     = 37           (cost code seed landed)
--   helper_functions   = 4            (is_org_member, org_role, is_platform_owner, seed_cost_codes)
select
  (select count(*) from pg_tables t
    where t.schemaname='public'
      and t.tablename in ('builder_orgs','people','org_members','cost_code_templates',
                          'cost_codes','org_entitlements','e2e_runs','release_approvals')
      and t.rowsecurity) as rls_enabled_tables,
  (select count(*) from pg_policies where schemaname='public') as policy_count,
  (select count(*) from cost_code_templates) as template_codes,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in ('is_org_member','org_role','is_platform_owner','seed_cost_codes'))
    as helper_functions;
