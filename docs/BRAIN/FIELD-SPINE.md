# MyBuilderVault — Field Spine Step-Back Brief (Work Orders / Superintendent / Crew)

**Status: APPROVED — Brice, 2026-08-05, all 5 rulings as recommended**
(schedule deferred to next named subsystem; sub WOs carry money; time posts
to actuals on approval via labor_rate; punch = WO kind; weather manual v1).
Script 013 written same day.
Authored 2026-08-05. Research basis: Buildertrend (schedule/to-dos/daily logs/time
clock), JobTread (POs & work orders, vendor portal, time tracking, daily logs),
Raken (field-capture specialist), ServiceTitan (dispatch-board specialist),
Hyphen BuildPro/SupplyPro (production trade-dispatch model). Web research
2026-08-05; no schema in this document.

---

## 1. What the market leaders actually do

### Work orders
- **JobTread (closest model):** work orders and POs are the same document
  family — created by converting a bid or selecting approved budget items,
  every order cost item tied to a budget line (their derive-never-re-key),
  assigned to a vendor, emailed, accepted with e-signature in a free vendor
  portal, comments + attachments on the document. Document type names are
  customizable. Bills are later matched against orders.
- **Buildertrend:** no first-class internal work order; the schedule item +
  to-do IS the dispatch unit. "Variance POs" capture unplanned costs from the
  field (client variance = CO; builder variance = internal overrun) — field-
  originated cost capture without a purchasing module.
- **Hyphen BuildPro/SupplyPro (production high end):** the schedule task IS
  the trade order. Task release notifies the trade in SupplyPro; trade
  confirms/accepts; completed work accepted flows to payment. Real-time
  propagation of schedule changes to trades; trades see obligations up to 6
  months out, organized by job and superintendent.
- **ServiceTitan (dispatch specialist):** day/week dispatch board, drag-and-
  drop assignment, skill-based tech matching, capacity view, automated
  assignment by skill/location/history, two-click call/mass-text to field.

### Daily logs
- Universal shape: per job per day; auto-filled date/project/weather; notes,
  crew counts, deliveries, delays; photos/videos attached; visibility
  controls (internal vs client); feeds office dashboards and weekly client
  summaries. Buildertrend and JobTread both mobile-first.
- **Raken (the specialist bar):** voice-to-text entry, time-stamped photos,
  **segmented/collaborator reports — each sub submits their own section and
  the super's report rolls them up**, toolbox talks with signature capture,
  checklists, observations/incidents, production quantities (installed vs
  budget), offline mode. Their pitch is a 5-minute daily report; supers love
  it because it kills the end-of-day trailer hour.
- JobTread vendor portal: subs submit daily logs themselves — segmented
  logging is now mid-market table stakes, not just specialist.

### Crew mobile
- **JobTread:** field crew who only upload photos, log notes, view schedule,
  and check off tasks are FREE users; sub/vendor/customer portals free and
  unlimited. Magic-link portal entry (no password until they add the app).
  Tasks completed with photo proof.
- **Buildertrend:** to-dos with checklists (each checklist item individually
  assignable), priority, tags, link-to-schedule-item (deadline moves with the
  schedule), reminders, photo attachments; punch lists are a task view with
  its own tab; sub portal shows only what's assigned.
- **Raken/field apps:** the crew surface is "today": my assignments, clock
  in/out, photos, notes. Nothing else.

### Time entries
- Universal shape: clock in/out (geofenced) or manual entry with permission;
  hours carry job + cost code; switch tasks mid-day; office approval queue;
  **approved hours land on the matching budget cost line for job costing**
  (JobTread explicitly); push to payroll system (QuickBooks Time) — payroll
  processing itself stays external, exactly our PERSONAS #5 posture.

### Scheduling (the boundary we must name)
- Incumbent schedules are dependency engines: Gantt + calendar + list,
  drag-and-drop, lead/lag, templates per build style, **sub confirmation
  ("commit") on schedule items, automatic notifications on change, conflict
  detection when a person/trade is double-booked, 24h-prior reminders**.
  Buildertrend links to-dos and selections deadlines to schedule items so
  dates move together. This is a full subsystem in every incumbent.

---

## 2. Table stakes (the floor — absence is a defect)

1. Work orders derived from budget/estimate lines, never re-keyed; assignable
   to a sub OR internal crew; sent, accepted (e-sign/acceptance event),
   commented, attached; per-job numbering; customizable status flow.
2. Sub acceptance loop with zero-friction access (magic-link portal; free
   external seats). Subs see only their own scope and money — never internal
   costs or other trades' pricing.
3. Daily logs: per job/day, auto date+weather, notes, photos, crew counts,
   delays/deliveries, internal-vs-client visibility, mobile-first, and
   sub-segmented entries rolling up into the super's log.
4. Crew mobile "today" surface: my work orders/tasks across jobs, check off
   with photo proof, scoped plans/specs, clock in/out against job + cost code.
5. Time entries with approval workflow; approved hours cost to the budget
   line by cost code; payroll processing external.
6. Punch lists as first-class checklist-style work with photo confirmation,
   filterable by trade/status.
7. Dispatch visibility: a super's day/week board of who is where on what,
   with change notifications to assignees.

## 3. The next level (where we beat the market)

1. **One spine, money included.** Incumbents split dispatch (tasks/schedule)
   from money (POs/WOs). Ours: the work order is BOTH the dispatch unit and
   the financial artifact — scoped to job + structure + cost code +
   discipline, assignable to internal crew or sub, and it is the document AP
   later matches invoices against (PERSONAS structural implication). One
   record, no split-brain.
2. **Discipline-as-attribute visibility.** Crew members see the work orders
   and specs for their discipline automatically (PERSONAS #16) — incumbents
   only have per-person assignment. Assignment can target a discipline pool
   or a named person.
3. **The daily log writes itself (thesis 1, the moat).** The day's events —
   WO status changes, photos uploaded, time entries, deliveries — auto-
   assemble into a draft log the super confirms and annotates (voice-to-text
   capture), instead of authoring from blank. Raken sells a 5-minute report;
   ours converges on a 1-minute confirm. Client-facing weekly update
   auto-drafts from visibility-filtered logs. (App-layer, phased; schema
   just has to not prevent it: events are rows, not prose.)
4. **Live margin from the field.** Approved time entries × labor cost basis
   (011) flow into actuals against the WO's cost code — the margin board and
   v_job_budget update from field activity with zero office re-keying.
   High-end ERPs do this with an army of clerks; we do it with none.
5. **Field-originated variance capture.** A WO can be flagged as builder
   variance (Buildertrend's Variance PO concept) feeding actuals — cost
   truth from the field without building purchasing.
6. **Every count is a door / no voids** apply to the super board and crew
   surfaces from birth (§9).

## 4. The scheduling ruling (honest boundary)

A dependency-driven schedule engine (Gantt, lead/lag, templates, conflict
detection, selection-deadline linkage) is a full subsystem and deserves its
own step-back per §8. Recommendation: **v1.x work orders carry planned_start/
planned_end and the super board is a date-window dispatch view** — this
covers the dispatch job-to-be-done now; the schedule engine is named as the
next subsystem boundary, and 010's selection deadline fields keep awaiting
that FK. Alternative: fold a minimal schedule_items table into 013 now.
Ruling requested.

## 5. Proposed scope for script 013 + surfaces (pending approval)

- **work_orders** — org/job/structure(nullable)/cost_code/discipline; kind
  (work | punch); origin estimate_line nullable (derive-never-re-key);
  assignee model covering internal member, discipline pool, or sub
  participant; status flow draft → issued → accepted → in_progress →
  complete → verified → closed (+ declined, cancelled); per-job numbering
  (CO trigger pattern); planned/actual dates; priority; sub amount for
  sub-assigned WOs (their contract price — visible to them, invisible to
  other subs); variance flag.
- **work_order_items** — checklist items, individually checkable, photo
  proof refs (punch execution rides this).
- **work_order_events** — audit + comments with requester/internal-style
  visibility; acceptance recorded as an event (approvals pattern).
- **daily_logs + daily_log_entries** — per job/day; author kind super | sub
  (segmented rollup); weather jsonb; typed entries (note, delay, delivery,
  crew_count, photo ref) so the auto-assembled draft is possible later.
- **time_entries** — person/org/job/cost_code, WO nullable, clock or manual,
  status pending → approved, approver; approved hours × cost basis feed
  actuals (mechanism per ruling #3 below).
- **Surfaces:** super board (day/week dispatch, counts-as-doors), WO detail,
  crew mobile Today view, daily log compose (v1 manual, auto-assemble
  later), time approval queue. E2E golden path 8: WO lifecycle through
  the UI.
- **RLS:** crew scoped by discipline + assignment; subs see ONLY their WOs
  and their own amounts; time entries self-insert, approver-update.

## 6. Open rulings for Brice

1. Schedule engine deferred per §4 — WOs carry dates, super board is the
   dispatch view, schedule = next named subsystem? (Recommended: yes.)
2. Sub WOs carry money (amount + acceptance) in 013, with billing/invoicing
   still out per finance posture? (Recommended: yes — the AP-match artifact
   exists from birth, purchasing module still deferred.)
3. Time → actuals mechanism: capture hours now and post approved hours ×
   labor cost basis into actuals (allowance-sync-trigger pattern), or
   capture-only in 013 and costing in a follow-up? (Recommended: post on
   approval, since 011 cost basis exists.)
4. Punch as work_order kind=punch with checklist items, not a separate
   tasks subsystem? (Recommended: yes.)
5. Weather on daily logs: auto-capture needs a weather API (new external
   dependency, function-side) — manual field v1 with the jsonb slot ready,
   API later? (Recommended: manual v1.)
