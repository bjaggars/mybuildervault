-- ============================================================
-- MyBuilderVault — DB change script 016: comms rail log
-- BOARD-007. The platform-sent email record (PATTERNS §1 —
-- copy-adapt from MyRealtyVault interactions, shaped for the
-- builder domain: org / job / contact / ticket linkage).
--
-- Writes arrive ONLY via the service role (the function layer is
-- the rail; humans never hand-author log rows) — same doctrine as
-- auto_response ticket events (004): no insert/update/delete
-- policies exist for authenticated, so RLS default-deny holds.
--
-- Run on: mybuildervault-dev. Prod via release ritual.
-- ============================================================

create table if not exists comm_events (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references builder_orgs(id) on delete cascade,
  job_id      uuid references jobs(id) on delete set null,
  contact_id  uuid references contacts(id) on delete set null,
  ticket_id   uuid references tickets(id) on delete set null,
  direction   text not null check (direction in ('outbound','inbound')),
  kind        text not null default 'email' check (kind in ('email')),
  subject     text not null default '(no subject)',
  body        text,
  to_emails   text[] not null default '{}',
  from_email  text,
  sent_by     uuid references people(id),  -- null = system send (auto-ack, notice)
  visibility  text not null default 'org'
              check (visibility in ('org','participant')),
  meta        jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists comm_events_org_idx    on comm_events (org_id, created_at desc);
create index if not exists comm_events_job_idx    on comm_events (job_id, created_at desc);
create index if not exists comm_events_ticket_idx on comm_events (ticket_id, created_at desc);
create index if not exists comm_events_contact_idx on comm_events (contact_id, created_at desc);

alter table comm_events enable row level security;

-- Read: org staff and active JSH support see the org's comm record;
-- clients (job participants) see only rows marked visibility='participant'
-- on their own jobs — the future client-portal feed, scoped from birth.
drop policy if exists comm_select on comm_events;
create policy comm_select on comm_events for select
  using (is_org_member(org_id) or is_jsh_support_active(org_id)
         or (visibility = 'participant' and job_id is not null
             and is_job_participant(job_id)));

-- No write policies on purpose: the rail (service role) is the only author.

notify pgrst, 'reload schema';

-- PROVE-IT · PASS: table = 1 · rls_on = true · policies = 1 ·
--                  write_policies = 0 · indexes = 4
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'comm_events') as "table",
  (select relrowsecurity from pg_class where relname = 'comm_events') as rls_on,
  (select count(*) from pg_policies
     where tablename = 'comm_events') as policies,
  (select count(*) from pg_policies
     where tablename = 'comm_events' and cmd <> 'SELECT') as write_policies,
  (select count(*) from pg_indexes
     where tablename = 'comm_events' and indexname like 'comm\_events\_%\_idx') as indexes;
