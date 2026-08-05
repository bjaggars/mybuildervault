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
