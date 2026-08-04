-- ============================================================
-- MyBuilderVault — DB change script 004: system auto-responses
-- Enables actor-less 'auto_response' ticket events (JSH system
-- acks on defect/FR creation and on resolution). Sending itself
-- is app-layer via comms rail; inserts arrive via service role.
-- Run on: mybuildervault-dev. Prod via release ritual.
-- ============================================================

alter table ticket_events alter column actor drop not null;

alter table ticket_events drop constraint if exists ticket_events_kind_check;
alter table ticket_events add constraint ticket_events_kind_check
  check (kind in ('comment','status_change','level_change','assignment',
                  'type_change','reopen','conversion','auto_response'));

-- Humans always identified; only system auto-responses may be actor-less.
alter table ticket_events add constraint ticket_events_actor_required
  check (actor is not null or kind = 'auto_response');

notify pgrst, 'reload schema';

-- PROVE-IT · PASS: actor_nullable = 'YES' · kinds_has_auto = 1 · guard = 1
select
  (select is_nullable from information_schema.columns
     where table_schema='public' and table_name='ticket_events'
       and column_name='actor') as actor_nullable,
  (select count(*) from pg_constraint
     where conname='ticket_events_kind_check'
       and pg_get_constraintdef(oid) like '%auto_response%') as kinds_has_auto,
  (select count(*) from pg_constraint
     where conname='ticket_events_actor_required') as guard;
