-- ============================================================
-- MyBuilderVault — DB change script 002: JSH Access Model
-- Four layers: tenant personas+groups / builder admin (toggles,
-- view-as) / JSH support (session-gated cross-tenant) / platform owner.
-- FIXES script 001 latent bug: is_platform_owner() was org-based.
-- Run on: mybuildervault-dev FIRST. Prod via release ritual.
-- ============================================================

create table if not exists platform_staff (
  person_id   uuid primary key references people(id) on delete cascade,
  role        text not null check (role in ('owner','support')),
  created_at  timestamptz not null default now()
);

create or replace function is_platform_staff()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from platform_staff where person_id = auth.uid());
$$;

create or replace function is_platform_owner()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from platform_staff
                 where person_id = auth.uid() and role = 'owner');
$$;

create or replace function grant_platform_owner(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into platform_staff (person_id, role)
  select id, 'owner' from people where email = p_email
  on conflict (person_id) do update set role = 'owner';
end $$;
revoke execute on function grant_platform_owner(text) from public, anon, authenticated;

create table if not exists org_groups (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references builder_orgs(id) on delete cascade,
  name        text not null,
  unique (org_id, name)
);

create table if not exists org_group_members (
  group_id    uuid not null references org_groups(id) on delete cascade,
  person_id   uuid not null references people(id) on delete cascade,
  primary key (group_id, person_id)
);

drop table if exists org_entitlements;

create table if not exists entitlements (
  id          uuid primary key default gen_random_uuid(),
  feature_key text not null,
  scope_type  text not null check (scope_type in ('platform','org','group','person')),
  org_id      uuid references builder_orgs(id) on delete cascade,
  scope_id    uuid,
  enabled     boolean not null default true,
  set_via     text not null check (set_via in ('jsh','builder_admin','system')),
  set_by      uuid references people(id),
  created_at  timestamptz not null default now(),
  constraint scope_shape check (
    (scope_type = 'platform' and org_id is null and scope_id is null) or
    (scope_type = 'org'      and org_id is not null and scope_id is null) or
    (scope_type in ('group','person') and org_id is not null and scope_id is not null)
  )
);
create unique index if not exists entitlements_scope_uq
  on entitlements (feature_key, scope_type, coalesce(org_id,'00000000-0000-0000-0000-000000000000'::uuid),
                   coalesce(scope_id,'00000000-0000-0000-0000-000000000000'::uuid));

create or replace function resolve_entitlement(p_org uuid, p_person uuid, p_feature text)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(
    (select enabled from entitlements
      where feature_key = p_feature and scope_type = 'person'
        and org_id = p_org and scope_id = p_person),
    (select e.enabled from entitlements e
      join org_group_members gm on gm.group_id = e.scope_id and gm.person_id = p_person
      where e.feature_key = p_feature and e.scope_type = 'group' and e.org_id = p_org
      order by e.created_at desc limit 1),
    (select enabled from entitlements
      where feature_key = p_feature and scope_type = 'org' and org_id = p_org),
    (select enabled from entitlements
      where feature_key = p_feature and scope_type = 'platform'),
    true)
$$;

create table if not exists support_sessions (
  id            uuid primary key default gen_random_uuid(),
  actor_person  uuid not null references people(id),
  actor_layer   text not null check (actor_layer in ('builder_admin','jsh_support','jsh_owner')),
  org_id        uuid not null references builder_orgs(id) on delete cascade,
  target_person uuid references people(id),
  mode          text not null default 'view' check (mode in ('view')),
  reason        text not null,
  started_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '1 hour',
  ended_at      timestamptz
);

create or replace function is_jsh_support_active(p_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select is_platform_owner()
      or exists (select 1 from support_sessions s
                 join platform_staff st on st.person_id = s.actor_person
                 where s.org_id = p_org and s.actor_person = auth.uid()
                   and s.ended_at is null and s.expires_at > now());
$$;

alter table platform_staff    enable row level security;
alter table org_groups        enable row level security;
alter table org_group_members enable row level security;
alter table entitlements      enable row level security;
alter table support_sessions  enable row level security;

create policy pstaff_select on platform_staff for select
  using (person_id = auth.uid() or is_platform_owner());

create policy groups_select on org_groups for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id));
create policy groups_write on org_groups for all
  using (org_role(org_id) in ('owner','admin'))
  with check (org_role(org_id) in ('owner','admin'));

create policy gmembers_select on org_group_members for select
  using (exists (select 1 from org_groups g where g.id = group_id
                 and (is_org_member(g.org_id) or is_jsh_support_active(g.org_id))));
create policy gmembers_write on org_group_members for all
  using (exists (select 1 from org_groups g where g.id = group_id
                 and org_role(g.org_id) in ('owner','admin')))
  with check (exists (select 1 from org_groups g where g.id = group_id
                 and org_role(g.org_id) in ('owner','admin')));

create policy ent_select on entitlements for select
  using (scope_type = 'platform'
         or (org_id is not null and (is_org_member(org_id) or is_jsh_support_active(org_id))));
create policy ent_builder_write on entitlements for all
  using (scope_type in ('group','person') and org_role(org_id) in ('owner','admin'))
  with check (scope_type in ('group','person') and org_role(org_id) in ('owner','admin')
              and set_via = 'builder_admin');
create policy ent_jsh_write on entitlements for all
  using (is_platform_staff() and scope_type in ('org','platform'))
  with check (is_platform_staff() and scope_type in ('org','platform') and set_via = 'jsh');

create policy ss_select on support_sessions for select
  using (actor_person = auth.uid()
         or is_platform_owner()
         or org_role(org_id) in ('owner','admin'));
create policy ss_insert_builder on support_sessions for insert
  with check (actor_layer = 'builder_admin'
              and actor_person = auth.uid()
              and org_role(org_id) in ('owner','admin'));
create policy ss_insert_jsh on support_sessions for insert
  with check (actor_layer in ('jsh_support','jsh_owner')
              and actor_person = auth.uid()
              and is_platform_staff());
create policy ss_end_own on support_sessions for update
  using (actor_person = auth.uid());

notify pgrst, 'reload schema';

-- PROVE-IT · PASS: new_tables=5 · access_fns=5 · old_entitlements_gone=0 · policy_count>=26 (14 from 001 + 12 here)
select
  (select count(*) from pg_tables where schemaname='public' and rowsecurity
     and tablename in ('platform_staff','org_groups','org_group_members',
                       'entitlements','support_sessions')) as new_tables,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname in
       ('is_platform_staff','is_platform_owner','grant_platform_owner',
        'resolve_entitlement','is_jsh_support_active')) as access_fns,
  (select count(*) from pg_tables where schemaname='public'
     and tablename='org_entitlements') as old_entitlements_gone,
  (select count(*) from pg_policies where schemaname='public') as policy_count;
