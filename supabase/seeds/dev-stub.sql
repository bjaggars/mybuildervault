-- ============================================================
-- MyBuilderVault — DEV STUB DATA SEED (jaggars-dev sandbox ONLY)
-- NOT a numbered DB change script: this is demo DATA, never runs
-- on prod. Populates the full spine for visual effect:
--   community + lots + plan · 3 client parties · 5 jobs across
--   both funnels · flagship "Anderson Custom" with accepted
--   estimate → contract snapshot, COs in every Ocala status,
--   allowances incl. the hidden $9K well overage, conditions,
--   selections, actuals (trigger fills allowance actuals),
--   tickets for dashboard stats.
-- Idempotent: bails if the flagship job already exists.
-- Contract snapshot + total are COMPUTED from the lines — the
-- seed obeys the same never-hand-maintained rule as the product.
-- ============================================================
do $$
declare
  v_org uuid;
  v_me  uuid;
  v_community uuid; v_lot4 uuid; v_lot7 uuid; v_lot9 uuid; v_plan uuid;
  v_anderson uuid; v_reyes uuid; v_thompson uuid;
  v_job1 uuid; v_job2 uuid; v_job3 uuid; v_job4 uuid; v_job5 uuid;
  v_house uuid; v_shop uuid;
  v_est1 uuid; v_est2 uuid;
  v_line_well uuid; v_line_floor uuid; v_line_light uuid; v_line_appl uuid;
  v_co1 uuid; v_co2 uuid; v_co3 uuid;
  v_total numeric(12,2);
  v_snap jsonb;
begin
  select id into v_org from builder_orgs where slug = 'jaggars-dev';
  if v_org is null then raise exception 'jaggars-dev org missing — run the sandbox seed first'; end if;
  select id into v_me from people where lower(email) = 'brice@jaggars.com';

  if exists (select 1 from jobs where org_id = v_org and name = 'Anderson Custom — Lot 4') then
    raise notice 'stub data already seeded — nothing to do';
    return;
  end if;

  -- ---------- community / lots / plan ----------
  insert into communities (org_id, name, county, notes)
  values (v_org, 'Summercrest', 'Marion', 'Phase 1: 14 lots, gated')
  returning id into v_community;

  insert into lots (org_id, community_id, address, county, parcel)
  values (v_org, v_community, 'Lot 4 · 7215 SW Summercrest Ln, Ocala FL', 'Marion', '35691-004-00')
  returning id into v_lot4;
  insert into lots (org_id, community_id, address, county, parcel)
  values (v_org, v_community, 'Lot 7 · 7233 SW Summercrest Ln, Ocala FL', 'Marion', '35691-007-00')
  returning id into v_lot7;
  insert into lots (org_id, community_id, address, county, parcel)
  values (v_org, v_community, 'Lot 9 · 7247 SW Summercrest Ln, Ocala FL', 'Marion', '35691-009-00')
  returning id into v_lot9;

  insert into plans (org_id, name, base_sqft, beds, baths, elevations, notes)
  values (v_org, 'The Magnolia', 2480, 4, 3, array['A - Farmhouse','B - Craftsman'], 'Best seller; split plan')
  returning id into v_plan;
  insert into plan_versions (plan_id, version, areas)
  values (v_plan, 1, '{"living": 2480, "garage": 620, "lanai": 310}'::jsonb);

  -- ---------- client parties ----------
  insert into contacts (org_id, kind, display_name, notes)
  values (v_org, 'household', 'The Anderson Family', 'Referred by Wendy; relocating from Tampa')
  returning id into v_anderson;
  insert into contact_members (contact_id, full_name, email, phone, is_primary)
  values (v_anderson, 'Rob Anderson', 'rob.anderson@example.com', '(352) 555-0147', true),
         (v_anderson, 'Dana Anderson', 'dana.anderson@example.com', '(352) 555-0148', false);

  insert into contacts (org_id, kind, display_name)
  values (v_org, 'household', 'Miguel & Sofia Reyes')
  returning id into v_reyes;
  insert into contact_members (contact_id, full_name, email, is_primary)
  values (v_reyes, 'Miguel Reyes', 'm.reyes@example.com', true);

  insert into contacts (org_id, kind, display_name)
  values (v_org, 'person', 'Gary Thompson')
  returning id into v_thompson;
  insert into contact_members (contact_id, full_name, email, is_primary)
  values (v_thompson, 'Gary Thompson', 'gthompson@example.com', true);

  -- ---------- jobs across both funnels ----------
  insert into jobs (org_id, lifecycle, name, lot_id, plan_id, contact_id, status)
  values (v_org, 'custom', 'Anderson Custom — Lot 4', v_lot4, null, v_anderson, 'construction')
  returning id into v_job1;
  insert into jobs (org_id, lifecycle, name, contact_id, status)
  values (v_org, 'custom', 'Reyes Custom — Hilltop', v_reyes, 'design')
  returning id into v_job2;
  insert into jobs (org_id, lifecycle, name, lot_id, plan_id, status)
  values (v_org, 'spec', 'Summercrest Lot 7 Spec', v_lot7, v_plan, 'permitted')
  returning id into v_job3;
  insert into jobs (org_id, lifecycle, name, lot_id, plan_id, status)
  values (v_org, 'spec', 'Summercrest Lot 9 Spec', v_lot9, v_plan, 'listed')
  returning id into v_job4;
  insert into jobs (org_id, lifecycle, name, contact_id, status)
  values (v_org, 'custom', 'Thompson Residence', v_thompson, 'warranty')
  returning id into v_job5;

  insert into job_events (job_id, kind, from_status, to_status, actor) values
    (v_job1, 'status_change', 'lead', 'design', v_me),
    (v_job1, 'status_change', 'design', 'contract', v_me),
    (v_job1, 'status_change', 'contract', 'permitting', v_me),
    (v_job1, 'status_change', 'permitting', 'construction', v_me);
  insert into job_events (job_id, kind, actor, metadata)
  values (v_job1, 'buyer_attach', v_me, jsonb_build_object('contact', 'The Anderson Family'));

  -- ---------- flagship structures ----------
  insert into structures (job_id, kind, label, sort)
  values (v_job1, 'house', 'Main House', 0) returning id into v_house;
  insert into structures (job_id, kind, label, sort)
  values (v_job1, 'shop', 'Detached Shop', 1) returning id into v_shop;
  insert into structures (job_id, kind, label, sort) values
    (v_job2, 'house', 'Main House', 0),
    (v_job3, 'house', 'Magnolia B', 0),
    (v_job4, 'house', 'Magnolia A', 0),
    (v_job5, 'house', 'Main House', 0);

  -- ---------- flagship estimate (accepted) ----------
  insert into estimates (org_id, job_id, version, source, status, title, created_by)
  values (v_org, v_job1, 1, 'authored', 'draft', 'Anderson Custom Build — Estimate v1', v_me)
  returning id into v_est1;

  insert into estimate_lines (estimate_id, structure_id, kind, description, price, client_state, sort, raw_category) values
    (v_est1, v_house, 'base', 'Sitework, pad & foundation — Main House',  48500, 'approved', 1,  'Site & Foundation'),
    (v_est1, v_house, 'base', 'Framing package & trusses',                 87200, 'approved', 2,  'Framing'),
    (v_est1, v_house, 'base', 'Roofing — architectural shingle',           24800, 'approved', 3,  'Roofing'),
    (v_est1, v_house, 'base', 'Windows & exterior doors',                  31400, 'approved', 4,  'Windows & Doors'),
    (v_est1, v_house, 'base', 'Plumbing rough & trim',                     34600, 'approved', 5,  'Plumbing'),
    (v_est1, v_house, 'base', 'Electrical rough & trim',                   29800, 'approved', 6,  'Electrical'),
    (v_est1, v_house, 'base', 'HVAC — 2 zone, 16 SEER',                    22400, 'approved', 7,  'HVAC'),
    (v_est1, v_house, 'base', 'Drywall, paint & interior trim',            41300, 'approved', 8,  'Interior Finish'),
    (v_est1, v_house, 'fee',  'Permits, impact fees & builder fee',        52250, 'approved', 9,  'Fees'),
    (v_est1, v_shop,  'base', 'Detached shop — 30x40 slab & shell',        46800, 'approved', 10, 'Shop'),
    (v_est1, v_shop,  'structural_option', 'Shop lean-to addition 12ft',    8200, 'approved', 11, 'Shop');

  insert into estimate_lines (estimate_id, structure_id, kind, description, price, client_state, sort, raw_category)
  values (v_est1, v_house, 'allowance', 'Well & septic allowance', 18000, 'approved', 12, 'Allowances')
  returning id into v_line_well;
  insert into estimate_lines (estimate_id, structure_id, kind, description, price, client_state, sort, raw_category)
  values (v_est1, v_house, 'allowance', 'Flooring allowance', 25000, 'approved', 13, 'Allowances')
  returning id into v_line_floor;
  insert into estimate_lines (estimate_id, structure_id, kind, description, price, client_state, sort, raw_category)
  values (v_est1, v_house, 'allowance', 'Lighting & fans allowance', 8000, 'approved', 14, 'Allowances')
  returning id into v_line_light;
  insert into estimate_lines (estimate_id, structure_id, kind, description, price, client_state, sort, raw_category)
  values (v_est1, v_house, 'allowance', 'Appliance allowance', 12000, 'approved', 15, 'Allowances')
  returning id into v_line_appl;

  -- conditions on the flagship
  insert into conditions (org_id, job_id, text, type, trigger_date, status) values
    (v_org, v_job1, 'New ATU Requirement Starting 6/1/26 — septic spec must upgrade if permit slips', 'regulatory', date '2026-06-01', 'triggered'),
    (v_org, v_job1, 'Pricing assumes Geo Tech allows standard footers', 'contingency', null, 'open');

  -- accept: snapshot + contract, computed total (seed-side equivalent of accept_estimate)
  select coalesce(sum(price),0) into v_total from estimate_lines where estimate_id = v_est1;
  select jsonb_build_object(
           'estimate', to_jsonb(e),
           'lines', (select jsonb_agg(to_jsonb(l) order by l.sort)
                       from estimate_lines l where l.estimate_id = v_est1),
           'snapshot_at', now())
    into v_snap from estimates e where e.id = v_est1;
  insert into contracts (org_id, job_id, estimate_id, snapshot, contract_total, executed_at, created_by)
  values (v_org, v_job1, v_est1, v_snap, v_total, current_date - 120, v_me);
  update estimates set status = 'accepted' where id = v_est1;

  -- ---------- change orders — the Ocala workflow, every state ----------
  insert into change_orders (org_id, job_id, structure_id, title, description, status, approved_at, approved_by, created_by)
  values (v_org, v_job1, v_house, 'Extend garage depth 2ft', 'Per Rob 5/12 walkthrough', 'approved', now() - interval '45 days', v_me, v_me)
  returning id into v_co1;
  insert into change_order_lines (change_order_id, structure_id, description, price, sort) values
    (v_co1, v_house, 'Foundation & slab extension', 4200, 1),
    (v_co1, v_house, 'Framing & roofline adjustment', 2600, 2);

  insert into change_orders (org_id, job_id, structure_id, title, status, created_by)
  values (v_org, v_job1, v_house, 'Board & batten front accent', 'in_build', v_me)
  returning id into v_co2;
  insert into change_order_lines (change_order_id, structure_id, description, price, sort)
  values (v_co2, v_house, 'Material + labor, front elevation', 3450, 1);

  insert into change_orders (org_id, job_id, structure_id, title, description, status, created_by)
  values (v_org, v_job1, v_house, 'Outdoor kitchen rough-in', 'Awaiting Dana decision on layout', 'considering', v_me)
  returning id into v_co3;
  insert into change_order_lines (change_order_id, structure_id, description, price, sort)
  values (v_co3, v_house, 'Gas, water & electric stubs to lanai', 9200, 1);

  insert into change_orders (org_id, job_id, title, status, created_by) values
    (v_org, v_job1, 'Pool pre-wire & conduit', 'tbd', v_me),
    (v_org, v_job1, 'Upgraded window package', 'included', v_me),
    (v_org, v_job1, 'Metal roof upcharge', 'rejected', v_me);

  -- ---------- allowances (actuals trigger fills 'actual') ----------
  insert into allowances (org_id, job_id, structure_id, estimate_line_id, name, budgeted, status, variance_visible)
  values (v_org, v_job1, v_house, v_line_well, 'Well & Septic', 18000, 'actual_known', false);  -- the $9K conversation, not yet revealed
  insert into allowances (org_id, job_id, structure_id, estimate_line_id, name, budgeted, status, variance_visible)
  values (v_org, v_job1, v_house, v_line_floor, 'Flooring', 25000, 'reconciled', true);
  insert into allowances (org_id, job_id, structure_id, estimate_line_id, name, budgeted, status)
  values (v_org, v_job1, v_house, v_line_light, 'Lighting & Fans', 8000, 'open');
  insert into allowances (org_id, job_id, structure_id, estimate_line_id, name, budgeted, status)
  values (v_org, v_job1, v_house, v_line_appl, 'Appliances', 12000, 'quoted');

  insert into actuals (org_id, job_id, structure_id, allowance_id, description, amount, incurred_on, created_by)
  select v_org, v_job1, v_house, a.id, x.description, x.amount, x.incurred_on, v_me
    from allowances a,
         (values ('Well drilling — 2nd bore required', 24000::numeric, current_date - 60),
                 ('ATU septic system upgrade',           3400::numeric, current_date - 52)) as x(description, amount, incurred_on)
   where a.job_id = v_job1 and a.name = 'Well & Septic';
  insert into actuals (org_id, job_id, structure_id, allowance_id, description, amount, incurred_on, created_by)
  select v_org, v_job1, v_house, a.id, 'LVP + tile install, final invoice', 23100, current_date - 20, v_me
    from allowances a where a.job_id = v_job1 and a.name = 'Flooring';
  insert into actuals (org_id, job_id, cost_code_id, description, amount, incurred_on, created_by)
  select v_org, v_job1, cc.id, 'Framing lumber package — final', 84750, current_date - 80, v_me
    from cost_codes cc where cc.org_id = v_org order by cc.id limit 1;

  -- ---------- selections ----------
  insert into selections (org_id, job_id, structure_id, allowance_id, room, capture_kind, url, title, price, status, approved_at, created_by)
  select v_org, v_job1, v_house, a.id, 'Kitchen', 'link', 'https://example.com/lvp-oak', 'Coretec LVP — Weathered Oak', 4.85, 'approved', now() - interval '30 days', v_me
    from allowances a where a.job_id = v_job1 and a.name = 'Flooring';
  insert into selections (org_id, job_id, structure_id, allowance_id, room, capture_kind, title, price, status, created_by)
  select v_org, v_job1, v_house, a.id, 'Great Room', 'link', 'Minka 60" ceiling fan — matte black', 389, 'shown', v_me
    from allowances a where a.job_id = v_job1 and a.name = 'Lighting & Fans';
  insert into selections (org_id, job_id, structure_id, room, capture_kind, title, status, created_by) values
    (v_org, v_job1, v_house, 'Master Bath', 'photo', 'Tile pattern from Dana — herringbone', 'proposed', v_me),
    (v_org, v_job1, v_house, 'Exterior', 'library', 'SW 7048 Urbane Bronze — trim', 'approved', v_me);

  -- ---------- second estimate: Reyes, presented ----------
  insert into estimates (org_id, job_id, version, source, status, title, created_by)
  values (v_org, v_job2, 1, 'authored', 'presented', 'Reyes Hilltop — Preliminary Estimate', v_me)
  returning id into v_est2;
  insert into estimate_lines (estimate_id, kind, description, price, sort, raw_category) values
    (v_est2, 'base', 'Hilltop sitework & engineered foundation', 68000, 1, 'Site & Foundation'),
    (v_est2, 'base', 'Shell package — 3,100 sqft',              212000, 2, 'Shell'),
    (v_est2, 'allowance', 'Finishes allowance (preliminary)',    95000, 3, 'Allowances'),
    (v_est2, 'fee', 'Permits & builder fee',                     61000, 4, 'Fees');

  -- ---------- tickets for the dashboard ----------
  insert into tickets (org_id, opened_by, subject, body, type, channel, status) values
    (v_org, v_me, 'Budget card: show variance as % too', 'Would love percent next to dollars', 'feature_request', 'concierge', 'open'),
    (v_org, v_me, 'Photo upload on selections?', 'How do I attach the tile photo Dana texted me', 'how_to', 'concierge', 'resolved'),
    (v_org, v_me, 'Job list sort resets after edit', null, 'defect', 'app', 'in_progress');

  raise notice 'stub data seeded: 5 jobs, flagship spine fully loaded';
end $$;

-- PROVE-IT · PASS (jaggars-dev): jobs = 5 · budget_baseline = 490250.00 ·
--   revised > baseline · hidden_well_variance = 9400.00 · selections = 4
select
  (select count(*) from jobs j join builder_orgs o on o.id = j.org_id
    where o.slug = 'jaggars-dev') as jobs,
  (select contract_baseline from v_job_budget b
    join builder_orgs o on o.id = b.org_id
    where o.slug = 'jaggars-dev' and b.name = 'Anderson Custom — Lot 4') as budget_baseline,
  (select revised_price from v_job_budget b
    join builder_orgs o on o.id = b.org_id
    where o.slug = 'jaggars-dev' and b.name = 'Anderson Custom — Lot 4') as revised_price,
  (select a.variance from allowances a join builder_orgs o on o.id = a.org_id
    where o.slug = 'jaggars-dev' and a.name = 'Well & Septic') as hidden_well_variance,
  (select count(*) from selections s join builder_orgs o on o.id = s.org_id
    where o.slug = 'jaggars-dev') as selections;

-- ============================================================
-- ADDENDUM (post-011): internal COSTS on the Anderson stub lines
-- so the margin board computes real forecast + margin. Idempotent
-- (only fills null costs). jaggars-dev ONLY.
-- ============================================================
update estimate_lines el
   set cost = case when el.kind = 'allowance' then el.price
                   else round(el.price * 0.78, 2) end
  from estimates e
 where e.id = el.estimate_id and el.cost is null
   and e.job_id in (select j.id from jobs j join builder_orgs o on o.id = j.org_id
                     where o.slug = 'jaggars-dev' and j.name = 'Anderson Custom — Lot 4');

update change_order_lines cl
   set cost = round(cl.price * 0.80, 2)
  from change_orders co
 where co.id = cl.change_order_id and cl.cost is null
   and co.org_id = (select id from builder_orgs where slug = 'jaggars-dev');

-- PROVE-IT · PASS: costed_lines = 15 · costed_co_lines = 4 · forecast > 0
select
  (select count(*) from estimate_lines el join estimates e on e.id = el.estimate_id
    join builder_orgs o on o.id = e.org_id
   where o.slug = 'jaggars-dev' and el.cost is not null) as costed_lines,
  (select count(*) from change_order_lines cl join change_orders co on co.id = cl.change_order_id
    join builder_orgs o on o.id = co.org_id
   where o.slug = 'jaggars-dev' and cl.cost is not null) as costed_co_lines,
  (select round(sum(el.cost), 2) from estimate_lines el join estimates e on e.id = el.estimate_id
    join builder_orgs o on o.id = e.org_id
   where o.slug = 'jaggars-dev' and e.status = 'accepted') as accepted_forecast_base;

-- ============================================================
-- FIELD SPINE STUB (added 8/5 — script 013 demo data)
-- Populates /field for visual effect on the jaggars-dev sandbox:
--   crew seat gets discipline+labor_rate · a sub party on the
--   Anderson job · 10 work orders across statuses/disciplines
--   (one sub WO accepted VIA the acceptance-event trigger, one
--   punch WO with a half-done checklist) · two days of daily
--   logs with typed entries · time entries: 3 pending for the
--   approval queue + 2 approved (labor trigger posts actuals).
-- Idempotent: bails if the marker WO exists.
-- ============================================================
do $$
declare
  v_org uuid; v_me uuid;
  v_job1 uuid; v_job2 uuid; v_job3 uuid; v_house uuid;
  v_code1 uuid; v_code2 uuid; v_code3 uuid;
  v_subco uuid; v_subpart uuid;
  v_wo_sub uuid; v_wo_punch uuid; v_wo_prog uuid;
  v_log1 uuid; v_log2 uuid;
begin
  select id into v_org from builder_orgs where slug = 'jaggars-dev';
  if v_org is null then raise exception 'jaggars-dev org missing'; end if;
  select id into v_me from people where lower(email) = 'brice@jaggars.com';

  if exists (select 1 from work_orders where org_id = v_org
             and title = 'Frame interior walls — Main House') then
    raise notice 'field stub already seeded — nothing to do';
    return;
  end if;

  select id into v_job1 from jobs where org_id = v_org and name = 'Anderson Custom — Lot 4';
  select id into v_job2 from jobs where org_id = v_org and name = 'Reyes Custom — Hilltop';
  select id into v_job3 from jobs where org_id = v_org and name = 'Summercrest Lot 7 Spec';
  select id into v_house from structures where job_id = v_job1 and kind = 'house' limit 1;
  select id into v_code1 from cost_codes where org_id = v_org order by code limit 1;
  select id into v_code2 from cost_codes where org_id = v_org order by code limit 1 offset 8;
  select id into v_code3 from cost_codes where org_id = v_org order by code limit 1 offset 16;

  -- Crew identity on the founder's sandbox seat: framing pool + a rate so
  -- the approval→actuals trigger has something to multiply.
  update org_members set discipline = 'framing', labor_rate = 58.00
   where org_id = v_org and person_id = v_me;

  -- Sub party on the Anderson job.
  insert into contacts (org_id, kind, display_name, notes)
  values (v_org, 'entity', 'Ocala Elite Electric LLC', 'Preferred electrical sub; Marion + Levy')
  returning id into v_subco;
  insert into contact_members (contact_id, full_name, email, phone, is_primary)
  values (v_subco, 'Tony Delgado', 'tony@ocalaelite.example.com', '(352) 555-0190', true);
  insert into job_participants (job_id, contact_id, role)
  values (v_job1, v_subco, 'sub') returning id into v_subpart;

  -- ---------- work orders ----------
  insert into work_orders (org_id, job_id, structure_id, cost_code_id, discipline, kind,
                           title, scope, status, assignee_kind, assigned_person,
                           planned_start, planned_end, created_by)
  values (v_org, v_job1, v_house, v_code2, 'framing', 'work',
          'Frame interior walls — Main House', 'Per Magnolia mod plan v1; garage depth +2ft CO applies.',
          'in_progress', 'member', v_me,
          current_date - 3, current_date + 4, v_me)
  returning id into v_wo_prog;
  update work_orders set actual_start = current_date - 3 where id = v_wo_prog;

  insert into work_orders (org_id, job_id, structure_id, cost_code_id, discipline,
                           title, scope, status, assignee_kind, assigned_participant_id,
                           amount, planned_start, planned_end, created_by)
  values (v_org, v_job1, v_house, v_code3, 'electrical',
          'Electrical rough-in — Main House', 'Rough per plan; outdoor kitchen conduit NOT in scope (CO pending).',
          'issued', 'sub', v_subpart, 14850.00,
          current_date + 7, current_date + 12, v_me)
  returning id into v_wo_sub;
  -- Sub acceptance arrives as an EVENT; the trigger flips issued → accepted.
  insert into work_order_events (work_order_id, kind, body, visibility, actor)
  values (v_wo_sub, 'acceptance', 'Scope reviewed and accepted — Tony', 'all', v_me);

  insert into work_orders (org_id, job_id, cost_code_id, discipline, kind, title, scope,
                           status, assignee_kind, planned_start, planned_end, created_by)
  values
    (v_org, v_job1, v_code1, 'well_septic', 'work', 'Well drilling — north easement',
     'Location TBD after framing; ATU condition applies if permit slips.',
     'draft', 'discipline', current_date + 20, current_date + 24, v_me),
    (v_org, v_job1, v_code1, 'sitework', 'work', 'Final grade + swale correction',
     'Rework swale per county comment #2.', 'issued', 'discipline',
     current_date + 2, current_date + 3, v_me),
    (v_org, v_job2, v_code1, 'sitework', 'work', 'Clear & grub — Hilltop pad',
     'Design phase site prep; save specimen oaks flagged orange.',
     'complete', 'discipline', current_date - 14, current_date - 12, v_me),
    (v_org, v_job2, v_code2, 'foundation_concrete', 'work', 'Form & pour footers',
     'Assumes Geo Tech allows standard footers (condition open).',
     'verified', 'discipline', current_date - 9, current_date - 7, v_me),
    (v_org, v_job3, v_code2, 'roofing', 'work', 'Dry-in — Magnolia B',
     'Felt + peel-and-stick valleys before Thursday rain.',
     'in_progress', 'discipline', current_date - 1, current_date + 1, v_me),
    (v_org, v_job3, v_code3, 'plumbing', 'work', 'Top-out plumbing',
     null, 'issued', 'discipline', current_date + 3, current_date + 5, v_me),
    (v_org, v_job3, v_code1, 'landscape_irrigation', 'work', 'Irrigation sleeve rough',
     'Sleeves under drive before pour.', 'cancelled', 'discipline',
     current_date - 5, current_date - 5, v_me);

  insert into work_orders (org_id, job_id, cost_code_id, discipline, kind,
                           title, scope, status, assignee_kind, assigned_person,
                           planned_start, planned_end, created_by)
  values (v_org, v_job2, v_code2, 'punch_clean', 'punch',
          'Pre-drywall punch — Hilltop', 'Walk with Micah before insulation.',
          'in_progress', 'member', v_me, current_date, current_date + 1, v_me)
  returning id into v_wo_punch;

  insert into work_order_items (work_order_id, label, sort, done, done_by, done_at) values
    (v_wo_punch, 'Nail plates on all top-plate penetrations', 0, true,  v_me, now() - interval '3 hours'),
    (v_wo_punch, 'Blocking for master bath grab bars',         1, true,  v_me, now() - interval '2 hours'),
    (v_wo_punch, 'Re-strap HVAC chase at bonus room',          2, false, null, null),
    (v_wo_punch, 'Photo doc: window flashing all elevations',  3, false, null, null);

  insert into work_order_items (work_order_id, label, sort, done, done_by, done_at) values
    (v_wo_prog, 'Layout walls per plan sheet A-3', 0, true, v_me, now() - interval '2 days'),
    (v_wo_prog, 'Set headers — garage depth CO',   1, false, null, null);

  insert into work_order_events (work_order_id, kind, body, actor) values
    (v_wo_prog, 'status_change', 'issued → in_progress', v_me),
    (v_wo_prog, 'comment', 'Lumber drop staged at NW corner; count verified.', v_me);

  -- ---------- daily logs ----------
  insert into daily_logs (org_id, job_id, log_date, author_kind, weather, notes, created_by)
  values (v_org, v_job1, current_date, 'staff',
          '{"summary": "94° clear, breeze after 2pm"}'::jsonb,
          'Framing crew of 5; garage CO headers set. County framing inspection requested for Thursday.',
          v_me)
  returning id into v_log1;
  insert into daily_log_entries (daily_log_id, kind, body, qty, work_order_id) values
    (v_log1, 'crew_count', '5 on site (framing)', 5, v_wo_prog),
    (v_log1, 'delivery', 'Truss package delivered — tally matches BOL', null, v_wo_prog),
    (v_log1, 'note', 'Anderson walkthrough moved to Friday 9am per Dana', null, null);

  insert into daily_logs (org_id, job_id, log_date, author_kind, weather, notes, created_by)
  values (v_org, v_job1, current_date - 1, 'staff',
          '{"summary": "91° pm storms"}'::jsonb,
          'Lost the afternoon to lightning; crew pulled at 1:30.',
          v_me)
  returning id into v_log2;
  insert into daily_log_entries (daily_log_id, kind, body, qty) values
    (v_log2, 'delay', 'Weather stop 1:30pm — 3.5 crew-hours lost', 3.5),
    (v_log2, 'safety', 'Toolbox talk: heat + lightning protocol, 5 signatures on paper', null);

  -- ---------- time entries ----------
  -- 3 pending → visible in the approval queue.
  insert into time_entries (org_id, person_id, job_id, cost_code_id, work_order_id,
                            worked_on, hours, entry_source, status, notes)
  values
    (v_org, v_me, v_job1, v_code2, v_wo_prog, current_date, 6.5, 'manual', 'pending', 'Interior wall framing'),
    (v_org, v_me, v_job2, v_code2, v_wo_punch, current_date, 2.0, 'manual', 'pending', 'Punch walk prep'),
    (v_org, v_me, v_job3, v_code2, null, current_date, 1.5, 'manual', 'pending', 'Dry-in supervision');
  -- 2 approved at insert → the 013 trigger posts hours × 58.00 into actuals.
  insert into time_entries (org_id, person_id, job_id, cost_code_id, work_order_id,
                            worked_on, hours, entry_source, status, approved_by, approved_at, notes)
  values
    (v_org, v_me, v_job1, v_code2, v_wo_prog, current_date - 1, 4.0, 'manual', 'approved', v_me, now(), 'Pre-storm framing'),
    (v_org, v_me, v_job1, v_code2, v_wo_prog, current_date - 2, 8.0, 'manual', 'approved', v_me, now(), 'Full framing day');

  raise notice 'field stub seeded';
end $$;

-- PROVE-IT (field stub) — PASS on jaggars-dev:
--   wos = 10 · items = 6 · accepted_via_event = 1 · logs = 2 ·
--   log_entries = 5 · time_pending = 3 · labor_actuals = 2 · labor_total = 696.00
select
  (select count(*) from work_orders wo join builder_orgs o on o.id = wo.org_id
     where o.slug = 'jaggars-dev') as wos,
  (select count(*) from work_order_items i join work_orders wo on wo.id = i.work_order_id
     join builder_orgs o on o.id = wo.org_id where o.slug = 'jaggars-dev') as items,
  (select count(*) from work_orders wo join builder_orgs o on o.id = wo.org_id
     where o.slug = 'jaggars-dev' and wo.status = 'accepted'
       and wo.accepted_at is not null) as accepted_via_event,
  (select count(*) from daily_logs d join builder_orgs o on o.id = d.org_id
     where o.slug = 'jaggars-dev') as logs,
  (select count(*) from daily_log_entries e join daily_logs d on d.id = e.daily_log_id
     join builder_orgs o on o.id = d.org_id where o.slug = 'jaggars-dev') as log_entries,
  (select count(*) from time_entries t join builder_orgs o on o.id = t.org_id
     where o.slug = 'jaggars-dev' and t.status = 'pending') as time_pending,
  (select count(*) from actuals a join builder_orgs o on o.id = a.org_id
     where o.slug = 'jaggars-dev' and a.source = 'labor') as labor_actuals,
  (select coalesce(sum(a.amount),0) from actuals a join builder_orgs o on o.id = a.org_id
     where o.slug = 'jaggars-dev' and a.source = 'labor') as labor_total;

-- ============================================================
-- SCHEDULE STUB (script 014 session, 2026-08-05) — Magnolia jobs
-- per standing rule (BRAIN README #7): every new surface ships
-- with stub data in the same session.
--   · "The Magnolia — Standard Build" template: 15 Day-N items,
--     16 FS deps with real lags (inspection/cure), 5 phases.
--   · Lot 7 Spec: imported mid-flight, PUBLISHED (baseline live),
--     first two items field-complete → successors follow
--     actual_end; 2 linked WOs (dates inherited); 1 linked
--     selection with a moving decision deadline.
--   · Lot 9 Spec: imported, left DRAFT (publish flow demo).
-- Impersonates Brice via the auth GUC so the REAL engine
-- functions (import_schedule_template / publish_schedule /
-- recalc_schedule) run their own role checks — the seed uses the
-- product's rails, not hand-rolled copies.
-- Idempotent: bails if the template already exists.
-- ============================================================
do $$
declare
  v_org uuid; v_me uuid;
  v_job7 uuid; v_job9 uuid;
  v_tpl uuid;
  t1 uuid; t2 uuid; t3 uuid; t4 uuid; t5 uuid; t6 uuid; t7 uuid; t8 uuid;
  t9 uuid; t10 uuid; t11 uuid; t12 uuid; t13 uuid; t14 uuid; t15 uuid;
  v_site uuid; v_found uuid; v_frame uuid; v_paint uuid;
  v_wo_a uuid; v_wo_b uuid;
begin
  select id into v_org from builder_orgs where slug = 'jaggars-dev';
  if v_org is null then raise exception 'jaggars-dev org missing — run the sandbox seed first'; end if;
  select id into v_me from people where lower(email) = 'brice@jaggars.com';
  select id into v_job7 from jobs where org_id = v_org and name = 'Summercrest Lot 7 Spec';
  select id into v_job9 from jobs where org_id = v_org and name = 'Summercrest Lot 9 Spec';
  if v_job7 is null or v_job9 is null then
    raise exception 'Magnolia jobs missing — run the dev stub above first';
  end if;

  if exists (select 1 from schedule_templates
              where org_id = v_org and name = 'The Magnolia — Standard Build') then
    raise notice 'schedule stub already seeded — nothing to do';
    return;
  end if;

  -- run as Brice so the engine functions'' own role checks pass
  perform set_config('request.jwt.claim.sub', v_me::text, true);

  -- ---------- template: 15 Day-N items, 5 phases ----------
  insert into schedule_templates (org_id, name, build_style, notes, created_by)
  values (v_org, 'The Magnolia — Standard Build', 'The Magnolia',
          'Standard spec sequence; durations from Brije field averages', v_me)
  returning id into v_tpl;

  insert into schedule_template_items (template_id, title, phase, discipline, day_offset, duration_days, milestone, sort)
  values (v_tpl, 'Permitting complete', 'Pre-Construction', null, 0, 0, true, 1) returning id into t1;
  insert into schedule_template_items (template_id, title, phase, discipline, day_offset, duration_days, milestone, sort)
  values (v_tpl, 'Sitework & pad', 'Pre-Construction', 'sitework', 0, 3, false, 2) returning id into t2;
  insert into schedule_template_items (template_id, title, phase, discipline, day_offset, duration_days, milestone, sort)
  values (v_tpl, 'Underground plumbing', 'Pre-Construction', 'plumbing', 3, 2, false, 3) returning id into t3;
  insert into schedule_template_items (template_id, title, phase, discipline, day_offset, duration_days, milestone, sort)
  values (v_tpl, 'Foundation & slab pour', 'Shell', 'foundation_concrete', 5, 3, false, 4) returning id into t4;
  insert into schedule_template_items (template_id, title, phase, discipline, day_offset, duration_days, milestone, sort)
  values (v_tpl, 'Framing', 'Shell', 'framing', 10, 7, false, 5) returning id into t5;
  insert into schedule_template_items (template_id, title, phase, discipline, day_offset, duration_days, milestone, sort)
  values (v_tpl, 'Roof dry-in', 'Shell', 'roofing', 17, 3, false, 6) returning id into t6;
  insert into schedule_template_items (template_id, title, phase, discipline, day_offset, duration_days, milestone, sort)
  values (v_tpl, 'Windows & exterior doors', 'Shell', 'framing', 20, 2, false, 7) returning id into t7;
  insert into schedule_template_items (template_id, title, phase, discipline, day_offset, duration_days, milestone, sort)
  values (v_tpl, 'Electrical rough', 'Rough-Ins', 'electrical', 20, 4, false, 8) returning id into t8;
  insert into schedule_template_items (template_id, title, phase, discipline, day_offset, duration_days, milestone, sort)
  values (v_tpl, 'Plumbing top-out', 'Rough-Ins', 'plumbing', 20, 3, false, 9) returning id into t9;
  insert into schedule_template_items (template_id, title, phase, discipline, day_offset, duration_days, milestone, sort)
  values (v_tpl, 'HVAC rough', 'Rough-Ins', 'hvac', 20, 3, false, 10) returning id into t10;
  insert into schedule_template_items (template_id, title, phase, discipline, day_offset, duration_days, milestone, sort)
  values (v_tpl, 'Insulation & drywall', 'Finishes', 'drywall', 25, 7, false, 11) returning id into t11;
  insert into schedule_template_items (template_id, title, phase, discipline, day_offset, duration_days, milestone, sort)
  values (v_tpl, 'Interior trim & cabinets', 'Finishes', 'trim', 32, 6, false, 12) returning id into t12;
  insert into schedule_template_items (template_id, title, phase, discipline, day_offset, duration_days, milestone, sort)
  values (v_tpl, 'Paint', 'Finishes', 'paint', 38, 4, false, 13) returning id into t13;
  insert into schedule_template_items (template_id, title, phase, discipline, day_offset, duration_days, milestone, sort)
  values (v_tpl, 'Flooring, tile & final MEP', 'Finishes', 'flooring', 42, 6, false, 14) returning id into t14;
  insert into schedule_template_items (template_id, title, phase, discipline, day_offset, duration_days, milestone, sort)
  values (v_tpl, 'Punch & certificate of occupancy', 'Closeout', 'punch_clean', 48, 3, false, 15) returning id into t15;

  insert into schedule_template_deps (template_id, successor_item, predecessor_item, lag_days) values
    (v_tpl, t2,  t1,  0),
    (v_tpl, t3,  t2,  0),
    (v_tpl, t4,  t3,  1),   -- underground inspection
    (v_tpl, t5,  t4,  2),   -- slab cure
    (v_tpl, t6,  t5,  0),
    (v_tpl, t7,  t6,  0),
    (v_tpl, t8,  t6,  0),
    (v_tpl, t9,  t6,  0),
    (v_tpl, t10, t6,  0),
    (v_tpl, t11, t8,  1),   -- rough inspections
    (v_tpl, t11, t9,  1),
    (v_tpl, t11, t10, 1),
    (v_tpl, t12, t11, 0),
    (v_tpl, t13, t12, 0),
    (v_tpl, t14, t13, 0),
    (v_tpl, t15, t14, 0);

  -- ---------- Lot 7: import mid-flight, publish, field-advance ----------
  perform import_schedule_template(v_job7, v_tpl, (current_date - 15)::date);
  perform publish_schedule(v_job7);

  select id into v_site  from schedule_items where job_id = v_job7 and title = 'Sitework & pad';
  select id into v_found from schedule_items where job_id = v_job7 and title = 'Foundation & slab pour';
  select id into v_frame from schedule_items where job_id = v_job7 and title = 'Framing';
  select id into v_paint from schedule_items where job_id = v_job7 and title = 'Paint';

  -- field history: sitework + underground done on plan; slab done a day early
  update schedule_items set status = 'complete',
         actual_start = start_date, actual_end = end_date
   where job_id = v_job7 and title in ('Permitting complete','Sitework & pad','Underground plumbing');
  update schedule_items set status = 'complete',
         actual_start = start_date, actual_end = end_date - 1
   where id = v_found;
  perform recalc_schedule(v_job7, 'Slab finished a day early — field update', v_me);
  update schedule_items set status = 'in_progress', actual_start = start_date
   where id = v_frame;

  -- linked WOs inherit the item''s dates (wo_inherit_dates trigger)
  insert into work_orders (id, org_id, job_id, kind, discipline, title, status,
                           assignee_kind, schedule_item_id, created_by)
  values (gen_random_uuid(), v_org, v_job7, 'work', 'framing',
          'Frame Magnolia B — Lot 7', 'in_progress', 'discipline', v_frame, v_me)
  returning id into v_wo_a;
  insert into work_orders (id, org_id, job_id, kind, discipline, title, status,
                           assignee_kind, schedule_item_id, created_by)
  values (gen_random_uuid(), v_org, v_job7, 'work', 'paint',
          'Interior paint package — Elevation B scheme', 'draft', 'discipline', v_paint, v_me)
  returning id into v_wo_b;

  -- linked selection: deadline = paint start − 10 workdays, and it MOVES
  insert into selections (org_id, job_id, title, capture_kind, status,
                          schedule_item_id, deadline_lag_days, notes, created_by)
  values (v_org, v_job7, 'Interior paint colors — Elevation B',
          'link', 'proposed', v_paint, 10,
          'Deadline rides the schedule: 10 workdays before paint starts', v_me);
  perform recalc_schedule(v_job7, null, v_me);

  -- ---------- Lot 9: imported, left DRAFT (publish-flow demo) ----------
  perform import_schedule_template(v_job9, v_tpl, (current_date + 30)::date);

  raise notice 'schedule stub seeded';
end $$;

-- PROVE-IT (schedule stub) — PASS on jaggars-dev:
--   tpl = 1 · tpl_items = 15 · tpl_deps = 16 · lot7_items = 15 ·
--   lot7_published = 1 · lot7_baselines = 15 · lot7_complete = 4 ·
--   lot9_items = 15 · lot9_draft = 1 · linked_wos = 2 ·
--   sel_deadline = 1 · weekend_dates = 0
select
  (select count(*) from schedule_templates t join builder_orgs o on o.id = t.org_id
     where o.slug = 'jaggars-dev' and t.name = 'The Magnolia — Standard Build') as tpl,
  (select count(*) from schedule_template_items i
     join schedule_templates t on t.id = i.template_id
     join builder_orgs o on o.id = t.org_id where o.slug = 'jaggars-dev') as tpl_items,
  (select count(*) from schedule_template_deps d
     join schedule_templates t on t.id = d.template_id
     join builder_orgs o on o.id = t.org_id where o.slug = 'jaggars-dev') as tpl_deps,
  (select count(*) from schedule_items i join jobs j on j.id = i.job_id
     where j.name = 'Summercrest Lot 7 Spec') as lot7_items,
  (select count(*) from jobs where name = 'Summercrest Lot 7 Spec'
     and schedule_status = 'published') as lot7_published,
  (select count(*) from schedule_items i join jobs j on j.id = i.job_id
     where j.name = 'Summercrest Lot 7 Spec' and i.baseline_start is not null) as lot7_baselines,
  (select count(*) from schedule_items i join jobs j on j.id = i.job_id
     where j.name = 'Summercrest Lot 7 Spec' and i.status = 'complete') as lot7_complete,
  (select count(*) from schedule_items i join jobs j on j.id = i.job_id
     where j.name = 'Summercrest Lot 9 Spec') as lot9_items,
  (select count(*) from jobs where name = 'Summercrest Lot 9 Spec'
     and schedule_status = 'draft') as lot9_draft,
  (select count(*) from work_orders w join jobs j on j.id = w.job_id
     where j.name = 'Summercrest Lot 7 Spec' and w.schedule_item_id is not null) as linked_wos,
  (select count(*) from selections s join jobs j on j.id = s.job_id
     where j.name = 'Summercrest Lot 7 Spec' and s.schedule_item_id is not null
       and s.decision_deadline is not null) as sel_deadline,
  (select count(*) from schedule_items i join jobs j on j.id = i.job_id
     where j.name in ('Summercrest Lot 7 Spec','Summercrest Lot 9 Spec')
       and i.ignore_workdays = false
       and (extract(isodow from i.start_date) > 5 or extract(isodow from i.end_date) > 5)) as weekend_dates;

-- ============================================================
-- SCHEDULE HEALTH STUB (dashboard widget session, 2026-08-05)
-- Gives the Schedule-health card all three colors on real data:
--   · Anderson Custom — Lot 4 (construction): imported 30 workdays
--     back, published, built through roof dry-in on plan, then
--     insulation/drywall pushed 5 workdays with a reason
--     (material backorder) → projected finish past baseline = LATE.
--   · Reyes Custom — Hilltop: imported 8 workdays back, published,
--     permitting done, sitework still open past its baseline
--     window while the finish still holds = AT RISK.
--   · (Lot 7 stays ON TRACK a day ahead; Lot 9 stays DRAFT.)
-- Same rails as before: impersonates Brice via the auth GUC and
-- uses the REAL engine functions. Idempotent: bails if Anderson
-- already has schedule items.
-- ============================================================
do $$
declare
  v_org uuid; v_me uuid; v_tpl uuid;
  v_and uuid; v_rey uuid;
  v_ins uuid; v_site uuid;
begin
  select id into v_org from builder_orgs where slug = 'jaggars-dev';
  select id into v_me  from people where lower(email) = 'brice@jaggars.com';
  select id into v_tpl from schedule_templates
   where org_id = v_org and name = 'The Magnolia — Standard Build';
  if v_tpl is null then
    raise exception 'Magnolia template missing — run the schedule stub above first';
  end if;
  select id into v_and from jobs where org_id = v_org and name = 'Anderson Custom — Lot 4';
  select id into v_rey from jobs where org_id = v_org and name = 'Reyes Custom — Hilltop';

  if exists (select 1 from schedule_items where job_id = v_and) then
    raise notice 'schedule health stub already seeded — nothing to do';
    return;
  end if;

  perform set_config('request.jwt.claim.sub', v_me::text, true);

  -- ---------- Anderson: LATE ----------
  perform import_schedule_template(v_and, v_tpl, sub_workdays(v_org, current_date, 30));
  perform publish_schedule(v_and);
  update schedule_items set status = 'complete',
         actual_start = start_date, actual_end = end_date
   where job_id = v_and
     and title in ('Permitting complete','Sitework & pad','Underground plumbing',
                   'Foundation & slab pour','Framing','Roof dry-in');
  select id into v_ins from schedule_items
   where job_id = v_and and title = 'Insulation & drywall';
  perform shift_schedule_item(v_ins,
            add_workdays(v_org, (select start_date from schedule_items where id = v_ins), 5),
            'Drywall crew delayed — material backorder');

  -- ---------- Reyes: AT RISK ----------
  perform import_schedule_template(v_rey, v_tpl, sub_workdays(v_org, current_date, 8));
  perform publish_schedule(v_rey);
  update schedule_items set status = 'complete',
         actual_start = start_date, actual_end = end_date
   where job_id = v_rey and title = 'Permitting complete';
  update schedule_items set status = 'in_progress', actual_start = start_date
   where job_id = v_rey and title = 'Sitework & pad';

  raise notice 'schedule health stub seeded';
end $$;

-- PROVE-IT (schedule health stub) — PASS on jaggars-dev:
--   late = 1 (Anderson) · at_risk = 1 (Reyes) · tracking = 1 (Lot 7) ·
--   draft_sched = 1 (Lot 9) · anderson_slip > 0 · reyes_slip = 0
with health as (
  select j.id, j.name, j.schedule_status,
         max(coalesce(i.actual_end, i.end_date))                     as proj_finish,
         max(i.baseline_end)                                          as base_finish,
         bool_or(i.status <> 'complete' and i.baseline_end is not null
                 and (i.baseline_end < current_date
                      or i.end_date > i.baseline_end))                as behind_window
    from jobs j
    join schedule_items i on i.job_id = j.id
    join builder_orgs o on o.id = j.org_id
   where o.slug = 'jaggars-dev'
   group by j.id, j.name, j.schedule_status
)
select
  count(*) filter (where schedule_status = 'published'
                     and proj_finish > base_finish)                          as late,
  count(*) filter (where schedule_status = 'published'
                     and proj_finish <= base_finish and behind_window)       as at_risk,
  count(*) filter (where schedule_status = 'published'
                     and proj_finish <= base_finish and not behind_window)   as tracking,
  count(*) filter (where schedule_status = 'draft')                          as draft_sched,
  (select proj_finish - base_finish from health
    where name = 'Anderson Custom — Lot 4')                                  as anderson_slip,
  (select proj_finish - base_finish from health
    where name = 'Reyes Custom — Hilltop')                                   as reyes_slip
from health;
