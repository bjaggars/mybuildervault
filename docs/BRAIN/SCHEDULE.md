# MyBuilderVault — Schedule Engine Step-Back Brief

**Status: EXECUTED — script 014 + surfaces shipped 2026-08-05 (schedule session)**
(was: APPROVED — Brice, 2026-08-05, all 6 rulings as recommended)
(item↔WO separate FK-linked; FS+lag only; cascade in DB incl. WO-completion
trigger; baseline columns at publish + schedule_events reasons; selections
FK lands in 014; in-app notices until BOARD-007 comms rail, which this
elevates). Build authorized — script 014 in a fresh session.
Authored 2026-08-05 (same-day follow-on to FIELD-SPINE.md; ruling #1 there
named this subsystem). Research basis: Buildertrend schedule mechanics
(predecessors/lag, baseline, cascade, sub confirmations, conflict detection,
linked to-dos/selections), JobTread (schedule templates w/ Day-N offsets,
working days + excluded dates, draft→publish w/ baseline-at-publish,
drag-preserving dependencies), Hyphen BuildPro (task release = trade order),
plus general dependency-scheduling norms (workday-based lag, ripple recalc).

---

## 1. What the market leaders actually do

- **Dependencies + cascade:** Buildertrend links items with finish-to-start
  predecessors and lag days; when a predecessor shifts, every linked
  successor moves automatically, one change carries one reason, and everyone
  affected is notified. Critical path is visible on the Gantt.
- **Baseline:** a snapshot of the original timeline; a Gantt toggle shows
  original vs current position per item; used for accountability and
  duration forecasting. JobTread sets the baseline at PUBLISH.
- **Draft → publish:** JobTread builds schedules privately in draft; publish
  triggers assignee notifications and sets the baseline in one act.
- **Templates:** JobTread schedule templates live in a catalog with Day 1..N
  placeholder days; importing onto a job + start date computes real dates;
  an existing job schedule can be exported as a template.
- **Working calendar:** org-level working days + excluded dates (holidays);
  durations count workdays; per-item override for weekend pours.
- **Notifications loop:** sub confirmations on schedule items, 24h-prior
  reminders, change notices on shift, conflict detection when a person or
  trade is double-booked across items.
- **Linked artifacts:** to-dos and selection decision deadlines link to
  schedule items so dates move together; POs/invoices can carry schedule
  due dates. BuildPro goes furthest: the schedule task IS the trade order —
  release notifies the trade, who confirms in their portal.
- **Views:** Gantt + calendar + list, drag-and-drop that preserves durations
  and dependencies, client-portal schedule at full or phase-level detail.

## 2. Table stakes (the floor)

1. Schedule items per job: title, trade/discipline, duration in workdays,
   computed start/end, phase grouping, color, milestone flag, assignees.
2. FS predecessors with lag; automatic cascade on shift; one reason per
   shift, recorded.
3. Org working-day calendar + excluded dates; per-item override.
4. Templates with relative days; import-on-start-date; per build style.
5. Baseline set at publish; current-vs-baseline visible per item.
6. Draft → publish gate; publish notifies assignees.
7. Change notices, sub confirmation, reminders, double-booking detection.
8. Gantt/calendar/list views; client-visible schedule at builder-chosen
   detail level.
9. Linked artifacts move with the schedule (work orders, selection
   deadlines).

## 3. The next level (where we beat the market)

1. **Plan and dispatch are one spine, not linked twins.** Incumbents keep a
   schedule and separately keep tasks/POs, wired by links. Ours: a schedule
   item begets work orders (0..n) that inherit its dates by default — the
   BuildPro release-is-the-order model brought to the mid-market, with the
   WO still carrying money + acceptance (013). No dual entry, ever.
2. **The field advances the schedule (thesis 1).** A super marking a WO
   complete (or a daily-log event) advances the linked schedule item, and
   the cascade + notices run from the database — no PM re-dragging Gantt
   bars at 9pm. "Schedule updated from a superintendent's texted photo" is
   the vision sentence; this is its schema.
3. **Selection deadlines finally land (closes the 010 await).** Decision
   deadline = linked task start − lag days; the deadline MOVES when the
   schedule moves; surfaced in the client portal with the selection and
   allowance context. Buildertrend has the linkage; nobody pairs it with
   client-inclusive allowance transparency.
4. **Durations accrete (price-book thesis applied to time).** Baseline vs
   actual per template item accumulates: "framing on Magnolia has averaged
   9 workdays across 6 builds; the template says 7." Template tuning stops
   being folklore.
5. **Conditions overlay:** dated conditions (the 6/1/26 ATU time-bomb) draw
   on the Gantt where they detonate.
6. **Spec-volume view (Phase E):** one engine, community-level adherence by
   lot/trade — BuildPro's moat surface, deferred but schema-anticipated.

## 4. Proposed scope for script 014 + surfaces (pending rulings)

- **schedule_items** — org/job, phase, title, discipline, duration_days
  (workdays), start/end (computed), sort, milestone, client_visible,
  status (pending|in_progress|complete), baseline_start/baseline_end
  (set at publish), shift-reason events.
- **schedule_deps** — successor → predecessor, FS type, lag_days.
- **org_calendar** — working-days mask on builder_orgs + excluded-dates
  table; per-item override flag.
- **schedule_templates / template_items / template_deps** — Day-N relative,
  catalog-style; Magnolia first.
- **jobs.schedule_status** — draft | published; publish stamps baselines.
- **recalc engine** — DB function recalc_schedule(job_id): topological walk,
  workday-aware, invoked by trigger on item/dep change and by WO completion.
- **Linkage:** work_orders.schedule_item_id; selections.schedule_item_id +
  computed decision deadline (010's waiting FK).
- **Surfaces:** Gantt (drag w/ cascade), list view (per §15: sortable +
  filter row on every column), template import, publish flow, baseline
  toggle. Client portal schedule is Phase C portal work, schema-ready now.
- **Notifications:** publish/change/reminder notices ride the comms rail —
  which is BOARD-007 and NOT YET BUILT for MBV. In-app only until then.

## 5. Rulings requested

1. **Schedule item ↔ work order = separate tables, FK-linked** (item is the
   plan; WO is dispatch + money; 0..n WOs per item, dates inherited by
   default)? Recommended: yes.
2. **FS-only dependencies with lag in v1** (SS/FF later if ever — covers
   residential reality)? Recommended: yes.
3. **Cascade lives in the database** (recalc_schedule fn, workday-aware,
   trigger-invoked — including from WO completion)? Recommended: yes.
4. **Baseline as columns set at publish** + shift reasons in a
   schedule_events table (not full jsonb snapshots)? Recommended: yes.
5. **Selections FK + moving decision deadline land in 014**? Recommended:
   yes.
6. **Notifications sequencing:** ship 014 + surfaces with in-app state only;
   schedule notices join the comms rail when BOARD-007 lands (which this
   elevates in priority)? Recommended: yes.
