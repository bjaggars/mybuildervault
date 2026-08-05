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
