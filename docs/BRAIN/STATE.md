# MyBuilderVault — Current State
Last updated: 2026-08-05

## Vision
VISION.md (added 2026-08-03) defines the category claim and ten core theses.
Product architecture (BOARD-012) traces to it: see ARCHITECTURE.md —
APPROVED by Brice 2026-08-04 (incl. amendment 0058e1e). Phase A underway:
script 001 written, awaiting Brice run on mybuildervault-dev.

## Identity
Multi-tenant SaaS for residential builders. Target: Brije LLC (70 spec + 30 custom homes/year,
Ocala FL) as Lighthouse licensee, then broader builder market.

Founder: Brice Jaggars (JSH LLC). Eat-our-own-dog-food instance: the Ocala portal, running
Brice's own custom home build with Brije as the builder.

---

## Environment: OCALA PORTAL (proof instance — demo vehicle)

| Property | Value |
|---|---|
| URL | jaggars-ocala-build.netlify.app |
| Deploy | Drag-and-drop to Netlify (no CI/CD) |
| Database | Firebase Firestore — single document: `builds/ocala` |
| Storage | Firebase Storage (photos, documents) |
| Auth | Hardcoded password in client JS (`jaggars2026`) |
| Repo | None (was none; now in `/ocala-portal/` of this repo as reference) |
| Version | 20260510.3 |
| Status | **ACTIVE — running a real build** |

### Firebase Security Rules
Currently in test mode — **RULES HAVE EXPIRED** (30-day test mode limit).
Symptom: "Sync failed and will retry" on non-Brice browsers.
Fix: Firestore + Storage rules → `allow read, write: if true;` → Publish.
This is a known issue as of 2026-08-03. Fix before any Eric demo.

### What works in the Ocala portal (demo-ready when rules are fixed)
All 11 pages implemented and working:

**Dashboard** — stat cards (total build cost, approved, open actions, meetings, awaiting
quote, selections pending). Clickable cards navigate to filtered views.

**Timeline / Phases** — build phases with steps, completion tracking, phase-level notes.

**Budget** — base price breakdown (collapsible, all 9 Brije line items, $696,824 total),
change order cost rollup by status, awaiting quote count.

**Changes (Change Orders)** — full status workflow: TBD / Discussed / Considering / Approved /
In Build / Included / Archived / Rejected. 60+ items loaded from Brije's April 2026 estimate.
Included status = green badge, $0, excluded from Awaiting Quote filter. Excel export matches
Brije's own PDF format (Description / Price / Approved or Disapproved, grouped by category).
Email report (rich text for Outlook paste, mailto plain text fallback). Filter by status,
category, priority, assigned, no-cost.

**Selections** — material/finish selection tracking with status.

**Actions** — action item tracking with owner, due date, done toggle.

**Meetings** — meeting log with AI action item capture, per-meeting email reports, full log email.

**Decisions** — key decisions log, filter-aware email (filtered view → email only those items).

**Contacts** — contact directory with role categorization.

**Documents** — Firebase Storage upload, always-visible checkboxes for email select, Replace
File, file type icons, grouped by category. Direct Firestore write on save (not debounced —
bug fix 2026-08-03).

**Reports Hub** — central page: Awaiting Quote Excel export, Change Orders email, Meeting Log,
Key Decisions, Document Share, Full Export. Inline filter dropdowns per card.

**Email infrastructure** — `showEmailModal(subject, html, plain)`. HTML stored in
`window._emailHtml`. Copy Rich Text copies full HTML for Outlook paste. Open in Email App
uses mailto with plain text.

**View toggle** — Builder View (read-only, default) / Admin View (password-gated, edit mode).

**Sync** — Firebase `onSnapshot` real-time listener. All devices update on change.
Documents and deletes now write directly to Firestore (not debounced) after 2026-08-03 fix.

---

## Environment: MYBUILDERVAULT PRODUCT (greenfield — not started)

| Property | Value |
|---|---|
| Repo | github.com/bjaggars/mybuildervault (this repo, created 2026-08-03) |
| Prod URL | mybuildervault.com (domain purchased 2026-08-03, not yet wired) |
| Test URL | mybuildervault.dev (domain purchased 2026-08-03, not yet wired) |
| Reserve URL | mybuildervault.app (purchased, held for future PWA/marketing) |
| Stack | React/Vite + Supabase + Netlify (per JSH doctrine) — Phase A scaffold SHIPPED 2026-08-04 |
| Auth | Supabase Auth + RLS — builder login + staff magic-link invite SHIPPED; client invites await job_participants (Phase B) |
| CI/CD | CI/Smoke/E2E workflows copied from MRV (Node 24, all on dev+main) SHIPPED 2026-08-04 |
| Status | **PHASE A SCAFFOLD LIVE ON DEV** — shell, auth, design system, compliance pages, Concierge intake stub, ticket dashboard, Mission Control reporters |

### What the BRAIN history says about Supabase v2
Earlier session notes referenced "Firebase legacy app (active), Supabase v2 schema (parallel,
verified), front-end rebuild pending." Code audit result: **this referred to the Pensacola RV
estate portal (a separate project in a separate chat), NOT the Ocala portal.**

The Ocala portal is Firebase-only. There is no Supabase schema anywhere in this codebase.
**Code wins. The Supabase v2 claim does not apply to MyBuilderVault as of 2026-08-03.**

---

## Honest gap: Portal → Product

Every feature in the Ocala portal is:
- Single-tenant (one Firestore document)
- No real auth (hardcoded password visible in source)
- No RLS (no row-level security anywhere)
- No per-build isolation (everything in `builds/ocala`)
- No builder onboarding or client onboarding
- No API layer
- No tests of any kind
- No CI/CD
- Secrets in client-side JS (Firebase config, admin password — public repo version is redacted)

The product requires a complete greenfield rebuild on the JSH doctrine stack.
The portal is the UX reference and Eric demo vehicle. It is not the shipping artifact.

The gap is real. STATE does not hide it.

---

## Supabase Projects (added 2026-08-03)

| Environment | Project | URL |
|---|---|---|
| Production | mybuildervault-prod | https://nicikqkqpuyqqpojqbkh.supabase.co |
| Test/Dev | mybuildervault-dev | https://yglwpguxikulymciosdf.supabase.co |

Both under JSH Supabase org.

**DB change script status on mybuildervault-dev (as of 2026-08-04):**
- 001 RUN, prove-it PASSED (rls=8, policies=14, templates=37, fns=4).
- 002 RUN (Brice; original ss_select applied; prove-it numbers not captured).
- 002-PATCH (L4 invisibility, drop/recreate ss_select) RUN — confirmed by Brice
  2026-08-04 in the Phase A scaffold session. The 002-patch/003 ordering question
  is RESOLVED: patch is in effect on dev.
- 003 RUN — but the PRE-AMENDMENT version (proven 2026-08-04: amendment
  presence check returned 0/0/0/0 for channel/type/feature_requests/SLA; the
  E2E robot surfaced it as "no 'channel' column in schema cache"). Corrected
  by script 005 (idempotent reconciliation to the amended shape).
- 004 (auto-response events) — NOT RUN as of the check above (Brice's "004"
  recollection was 003). Run order: 005 first, then 004.
- 005 (ticketing reconciliation) RUN on dev 2026-08-04, prove-it PASSED
  (amendment_cols=4, fr_table=1, stats_view=1, ticket_fns=2, kind_check=1).
- 004 first attempt post-005 errored 42710: ticket_events_actor_required
  ALREADY EXISTED — evidence a historical partial 004 ran; the errored batch
  rolled back, so auto_response was momentarily absent from kind_check.
  004 amended to idempotent form (drop-if-exists) same day; RUN on dev,
  prove-it PASSED (actor_nullable=YES, kinds_has_auto=1, guard=1).
- FIRST FULL GREEN BOARD 2026-08-04 @ 39b0806: CI + Smoke + E2E (all 4 golden
  paths) green against mybuildervault-dev.netlify.app. Stale failure issues
  #1-#4 closed. TEST_BASE_URL temporarily points at the netlify.app subdomain;
  flip to https://mybuildervault.dev once Brice wires DNS (open item).

**E2E agent seeded on dev 2026-08-04, prove-it PASSED** (org=1, member_role=admin,
cost_codes=37): auth user e2e-robot@mybuildervault.dev (auto-confirmed), org
"E2E Robot Builder" slug e2e-robot, role admin, cost codes seeded. E2E- prefix
convention governs purge.

Concierge intake flow (answer how-tos first, ticket on failure, FR conversion at
triage, GH Issues dual-write) and system auto-acks on ticket creation + resolution
(comms rail, service-role event inserts) are SCAFFOLD-PHASE app requirements —
intake stub SHIPPED in the Phase A scaffold (see Product environment below); AI
answering, auto-acks, and dual-write are still open. NOTE: clients cannot file
tickets until job_participants lands (jobs script) — widen t_insert policy then.
After Brice's first app signup: run `select grant_platform_owner('<brice email>');`
via console. Prod runs 001+002(+patch)+003+005+004+006+007 in that order via release ritual
at first release.
- 007 (job container: contacts/parties, communities/lots/plans+versions with
  reserved geometry slot, one-engine jobs + job_events, structures,
  job_participants, t_insert widened for clients) WRITTEN 2026-08-04, pasted
  in chat, RUN on dev 2026-08-04, prove-it PASSED (new_tables=10, helper_fns=3,
  status_values=12, t_insert_client=1).
- 008 (estimate document: versioned estimates, Brije-format estimate_lines,
  conditions, immutable contract snapshots, transactional accept_estimate)
  RUN on dev 2026-08-04, prove-it PASSED (new_tables=4, accept_fn=1,
  line_kinds=5, contract_frozen=0).
- 009 (change orders w/ Ocala 8-status workflow + per-job numbering trigger;
  change_order_lines derive-never-re-key; allowances w/ generated variance +
  builder-controlled variance_visible reveal via owner-rights
  v_client_allowances) RUN on dev 2026-08-04, prove-it PASSED (3/8/4/1/1).
- 010 (selections accretive capture w/ deadline fields awaiting schedule FK;
  actuals v1-light w/ allowance-sum sync trigger; v_job_budget computed view —
  baseline + approved COs + allowance variance = revised_price;
  approved_selections_total informational only, NOT summed into revised_price
  to avoid double-count via allowance actuals — revisit with real Brije data)
  RUN on dev 2026-08-04, prove-it PASSED (2/1/3/3/1).
  FINANCIAL SPINE SCHEMA COMPLETE — scripts 001-010 all converged on dev with
  captured prove-its. OPEN RULING for Brice: v_job_budget omits selections from
  revised_price (double-count avoidance; approved_selections_total is
  informational) — deviation from §2.3's "+ selection overages" wording,
  revisit with real Brije data. UI + estimate ingestion (BOARD-014) are the
  next build fronts.
- JOBS SURFACE SHIPPED 2026-08-04 @ 44fcb6d, all green: jobs list + create
  (client-UUID insert), job detail (12-status engine writing job_events,
  structures panel, computed budget card on v_job_budget w/ revised price).
  Golden path 6 (job lifecycle) proves the spine schema through the UI.
  e2e-purge widened to E2E- jobs (cascade sweeps the spine) + contacts.
  Next fronts (REORDERED 8/4 eve per Brice design feedback): PERSONAS.md
  doctrine v2 APPROVED by Brice 8/4 eve — full 28-persona catalog from domain
  research (CORE/ADJACENT/RECORD tiers); work orders + time entries named
  v1.x subsystems; warranty rides the ticket engine. Persona-driven
  dashboards precede the estimate editor. Script 011 scope GREW: cost basis
  + dashboard_prefs + expanded org_members roles (estimator/selections/
  warranty/field/accounting/office) + expanded job_participants roles
  (architect/engineer/lender/owners_rep). 011 RUN on dev 8/4, prove-it PASSED (2/1/11/9).
  012 (save_dashboard_prefs, column-scoped) RUN on dev 8/5 AM, prove-it PASSED
  (1/1). Stub cost addendum RUN 8/5 AM, prove-it PASSED (15/4/396255.00) —
  margin board live with real forecast math. Dashboard widget-catalog shell
  SHIPPED @ cce1be9 all green (P1 default for owner seats, edit mode, seat
  persistence, recharts burn chart).
- REPORTS SURFACE (BOARD-030 v1) SHIPPED 8/5 AM: 5-report role-filtered
  catalog + Excel export (xlsx dep added) + print. Session PAT valid ~27 more
  days (Brice 8/5) — next session may reuse; add Variables RW when rotating.
  NEXT SESSION QUEUE: superintendent/work-order spine → estimate editor →
  BOARD-014 ingestion. Console items parked: DNS wiring (then repoint
  TEST_BASE_URL), jsh-brain graduation of design laws #11/#12. recharts DECIDED YES 8/4
  (Brice deferred to recommendation). Reports surface added as BOARD-030.
  Then: owner (P1) dashboard w/ margin board + trends, PM (P2) evolution,
  persona switcher. Estimate editor + BOARD-014 follow.
- DEV STUB DATA seeded on jaggars-dev sandbox 2026-08-04, prove-it PASSED
  exactly (jobs=5, baseline=490250.00, revised=508000.00,
  hidden_well_variance=9400.00, selections=4) — first live proof of the
  allowance sync trigger + generated variance + v_job_budget arithmetic
  against realistic data. Seed at supabase/seeds/dev-stub.sql (data seed,
  never prod).

---

## Netlify Sites (added 2026-08-03)

| Environment | Netlify Site | Branch | Domain |
|---|---|---|---|
| Production | mybuildervault-prod | main | mybuildervault.com |
| Test/Dev | mybuildervault-dev | dev | mybuildervault.dev |

Both sites wired to github.com/bjaggars/mybuildervault via Netlify Git integration.
Env vars set per site (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY) + E2E_REPORT_SECRET added to the dev site (Functions
scope) 2026-08-04. GitHub Actions secrets set: TEST_E2E_AGENT_EMAIL/PASSWORD,
E2E_REPORT_SECRET; variables: TEST_BASE_URL, PROD_BASE_URL, TEST_SMOKE_SLUG
(e2e-robot). PROD_E2E_* secrets deferred to first release.
mybuildervault.app purchased and held in reserve (future PWA or marketing landing page).
- FIELD SPINE SESSION OPENED 8/5 PM per DOCTRINE §8: step-back brief
  delivered as docs/BRAIN/FIELD-SPINE.md (PROPOSED) — table stakes + next
  level from Buildertrend/JobTread/Raken/ServiceTitan/BuildPro research;
  Brief APPROVED same day, all 5 rulings as recommended. Script 013 (field
  spine: work_orders + items + events w/ acceptance-as-event trigger,
  daily_logs segmented + typed entries, time_entries w/ approval→actuals
  labor posting via org_members.labor_rate, discipline attr, actuals source
  +labor) RUN on dev 8/5 PM, prove-it PASSED (6/9/21/1/1/1/1/2/1) — after one
  rolled-back attempt from a mangled chat paste (LEARNINGS #14: chat pastes
  are generated from the committed file, never retyped).
- FIELD SURFACES SHIPPED 8/5 PM: /field page — super Board (status-count
  doors, columnar grid, create + advance, WO drawer w/ checklist + activity),
  crew Today (direct + discipline-pool active WOs), Daily Log (segmented
  staff/sub cards, typed entries, weather slot), Time (my entries + approval
  queue; approval posts hours × labor_rate to actuals via 013 trigger).
  Golden path 8 (WO lifecycle + checklist + time approval) added; purge
  covered by E2E- job cascade. Open follow-ups: sub portal acceptance
  surface (events-based), photo upload via Cloudinary on items/logs,
  auto-assembled daily log draft (thesis 1), day/week date-window board
  view — schedule engine remains the next named subsystem.
- FIELD SPINE GREEN 8/5 PM @ b5dcfca: CI + Smoke + E2E, all 8 golden paths.
  One robot-caught fix en route: controlled checklist checkbox never flipped
  on click (issue #7, closed) → optimistic toggle w/ revert-on-error — the
  right field UX anyway. Session PAT: JSH-session token valid ~Sep 1
  (Contents/Actions/Issues/Workflows RW). NEXT SESSION CANDIDATES: schedule
  engine step-back (§8) · sub acceptance portal surface · estimate editor ·
  BOARD-014 ingestion · Cloudinary photos on WO items + logs.
- SCHEDULE ENGINE APPROVED 8/5 PM (SCHEDULE.md, BOARD-032): all 6 rulings
  as recommended. NEXT SESSION = execute script 014 (items, FS deps + lag,
  workday calendar, templates, draft→publish baseline, DB recalc engine,
  WO + selections linkage) + Gantt/list surfaces (#15 grid treatment) +
  Magnolia stub schedule + behavioral smokes on recalc + golden path 9.
  Board sort/filter shipped @ 7b44ab7 (LEARNINGS #15). BOARD-007 comms
  rail ELEVATED (schedule notices depend on it).
- FIELD STUB SEEDED on jaggars-dev 8/5 PM, prove-it PASSED exactly
  (10/6/1/2/5/3/2/696.00) — 696.00 is the first trigger-posted labor cost
  (12 hrs × 58.00). Acceptance-event trigger proven live (Ocala Elite
  Electric WO issued→accepted via event). One authoring bug en route
  (punch WO 14 cols/13 values) → predeploy gained a quote-aware SQL
  insert-arity gate (on-conflict/returning safe), verifier verified.
  STANDING RULE (Brice 8/5, BRAIN README #7): every new surface ships
  with stub data in the same session.
- SCHEDULE ENGINE EXECUTED 8/5 PM (block 3, fresh session per §6b): script
  014 written per the approved brief — schedule_items (manual_start
  no-earlier-than, actual_start/end field dates, ignore_workdays override,
  milestone), schedule_deps (FS+lag, constraint-widen-ready dep_type),
  builder_orgs.workdays mask + org_excluded_dates, Day-N template catalog
  (templates/items/deps), jobs.schedule_status draft|published,
  schedule_events (one change one reason), recalc_schedule (topological
  Kahn walk, workday math, effective end = coalesce(actual_end, end_date),
  cycle raises), shift/import/publish fns (suppress-GUC own their reasoned
  cascade, LEARNINGS #17), WO triggers (inherit dates on insert; completion
  advances item + successors follow actual), selections FK + moving
  decision deadline (010 await CLOSED).
  BEHAVIORAL SMOKE BEFORE PUSH: scripts/smoke-recalc.mjs applies
  scripts/pg-shim.sql + the REAL chain 001→014 to a scratch Postgres and
  runs 19 scenarios — 19/19 green locally; added as CI job `recalc-smoke`
  (postgres:16 service). Two real catches en route: 006 fresh-install
  failure (LEARNINGS #16, fixed drop-then-create) and the trigger-steals-
  the-reason bug (#17). Full dev-stub (base + field + schedule blocks)
  also proven end-to-end on the scratch DB — schedule prove-it exactly
  1/15/16/15/1/15/4/15/1/2/1/0.
  SURFACES: /schedule (nav + route) — Gantt (drag → reason modal →
  shift_schedule_item RPC; baseline ghost toggle; today line; weekend
  shading; milestone diamonds; sticky label rail w/ dep counts), List
  (#15 FULL: sort on all 10 headers, filter control on every column +
  clear; add-item row; drawer: duration/visibility/weekend-override edits,
  dep link/unlink w/ lag, reasoned shift, start/complete, delete, item
  activity), Templates (#15 grid, expandable Day-N item list, import
  template→job→start-date via RPC). Golden path 9 (schedule lifecycle
  through the UI) added — 9 golden paths total.
  STUB (README #7): Magnolia template (15 items, 16 deps, real
  inspection/cure lags, 5 phases); Lot 7 imported mid-flight + PUBLISHED,
  4 items field-complete (slab a day early → reasoned recalc), framing
  in_progress, 2 linked WOs (dates inherited), 1 linked selection w/
  moving deadline (paint − 10 workdays); Lot 9 imported, DRAFT. Seed
  impersonates Brice via the auth GUC so the REAL engine fns run their
  own role checks.
  RUN 8/5 PM (Brice, prove-its in chat): script 014 on mybuildervault-dev
  — 7/4/4/2/2/2/1/1/1 exact PASS. Seed addendum on jaggars-dev — visible
  columns 1/15/16/15/1/15/4/15 exact PASS; tail columns confirmed
  by Brice 1/2/1/0 — full prove-it 1/15/16/15/1/15/4/15/1/2/1/0 exact,
  incl. weekend_dates=0 (no workday leak on seeded data). devDependency added: pg (smoke
  harness only). Open follow-ups on BOARD-032.
- GATE-GREEN 8/5 PM: 9/9 golden paths + Smoke + CI (incl. recalc-smoke)
  all green @ 18c7733 on live dev. Path 9 first run exposed a TEST bug,
  not a product bug (asserted absence of em-dash; empty phase/baseline
  columns legitimately render them) — the failure capture itself proved
  the engine live: E2E items cascaded Aug 7 → Aug 11, correctly skipping
  the weekend. Robot issues #8/#9 closed. Session breakpoint here (§6b).
- SCHEDULE HEALTH CARD 8/5 PM (Brice ask, same day): Dashboard widget
  'schedule_health' (span 2, leads P1/P2/P4 personas; in the Customize
  picker for saved layouts). Health vs PUBLISHED baseline: LATE (red) =
  projected finish (max coalesce(actual_end,end_date)) past baseline
  finish; AT RISK (amber) = finish holds but an incomplete item is behind
  its baseline window; ON TRACK (green, shows days ahead); DRAFT dim.
  Pills filter, rows deep-link /schedule?job= (Schedule honors the param).
  Seed addendum #3 lights all colors on real rails: Anderson imported
  −30wd, built through roof dry-in, insulation pushed 5wd w/ reason
  ('material backorder') → LATE; Reyes −8wd, sitework open past its
  window → AT RISK. Full seed re-proven END-TO-END on a fresh
  shim+chain scratch DB: all prior prove-its exact, health prove-it
  1/1/1/1 with anderson_slip 7 (cal days), reyes_slip 0. Path 9 extended:
  dashboard card renders, pills visible, row navigates to /schedule.
  RUN 8/5 PM (Brice, prove-it in chat): seed addendum #3 on jaggars-dev —
  1/1/1/1/7/0 exact, matching the fresh-chain local proof to the digit.
  All three health colors live on dev. Nothing pending on the schedule
  engine or its dashboard card.
- HEALTH CARD v2 8/5 PM (Brice: 'ugly, too much whitespace, be
  dashboard-like — look at the incumbents'): researched BT/JobTread —
  BT elevated Baseline to a first-class tab and an aftermarket sells
  schedule-performance dashboards ON TOP of BT (their own at-a-glance is
  weak = our opening); JobTread's signature is dense KPI tiles + progress
  bars. Rebuilt: 4 SOLID stat tiles (big number, caption, click-filter,
  gold ring on selected, others dim); rows carry a per-item SEGMENT STRIP
  (green done / gold in-progress / red-tint overdue-vs-baseline / gray
  ahead, item tooltip), 'now: <item>' current-phase line, done/total + %,
  health pill, projected finish over baseline finish. Same testids —
  path 9 untouched. Design note: whitespace is a void; the strip is data
  where padding used to be.
- PROGRESS DRIFT EXECUTED 8/5 PM (BOARD-033, green-lit): script 015 +
  smoke 23/23 + surfaces + drift stub, all proven pre-push on the
  fresh-chain scratch DB (015 prove-it 1/1/1/4; stub 2/1/1/0/3).
  Demo line: 'the incumbents ask your super for a percent — we compute
  drift from the field checklists.' RUN 8/5 PM (Brice, prove-its in chat):
  015 on mybuildervault-dev 1/1/1/4 exact; drift addendum on jaggars-dev
  2/1/1/0/3 exact. Drift engine live end to end — Anderson windows +
  Reyes sitework flagged from checklists, Lot 7 framing on pace
  unflagged. Nothing pending.
- BUILD PROGRESS TAB 8/5 PM (Brice ask): owner-only + dev-host-only
  (hostname gate, self-retiring in prod) /progress — module table with
  status shading (green complete / gold next / neutral planned), full #15
  sort+filter, count pills as filters. 24 modules seeded from the script
  chain + surfaces. Maintenance rule added to README: shipping sessions
  update the table in the same commits.
- COMMS RAIL EXECUTED 8/5 PM (BOARD-007, elevated by BOARD-032; fresh
  session per §6b): copy-adapt from MRV per PATTERNS §1 — no §8 brief,
  design record in COMMS-RAIL.md instead. Script 016 (comm_events: org/
  job/contact/ticket linkage, RLS at birth, ZERO write policies — service
  role is the only author; participant-visibility column scoped from
  birth). Chain 001→016 proven fresh on scratch (recalc-smoke 23/23);
  016 prove-it 1/t/1/0/4 — prove-it caught its own first-draft index
  miscount (pkey matched the pattern; query corrected to _idx-only).
  Functions: _relay (log.mybuildervault.com, party-aware, branded shell),
  send-email (seat-verified, party fan-out, relay Reply-To, logs in the
  same breath, job link validated), inbound-log (relay branch → INBOUND
  log + forward to owner/admin w/ reply-to client; BCC branch → org by
  seat email; always-200), ticket-notify (actor-less auto_response acks,
  idempotent [auto:event] marker, graceful emailed:false without Resend)
  — CLOSES the 003/004 auto-ack open item; Concierge wired for creation
  acks. Branded auth template set at supabase/email-templates/ (4 + README).
  JobDetail Comms panel (law #15 full). smoke-comms 14/14 NEW, in CI;
  smoke-api +3 contract checks (503 = legitimate pre-config); golden
  path 6 extended (comms panel visible). Seed comms addendum proven
  END-TO-END on the fresh shim+chain scratch (all prior prove-its exact;
  comms 4/3/1/1/1) + RLS spot-check (member reads 4, human insert DENIED,
  stranger 0 — scratch needed explicit grants: Supabase default
  privileges aren't in the shim, LEARNINGS #19). ACTIVATION IS BRICE'S:
  Resend domain + inbound webhook, RESEND_API_KEY + INBOUND_LOG_KEY +
  redeploy, ImprovMX, Supabase SMTP + template paste, run 016 + seed
  addendum — checklist in COMMS-RAIL.md. RUN-pending: 016 on
  mybuildervault-dev; comms seed addendum on jaggars-dev. One gate-fix en
  route: the SQL insert-arity gate split array['a','b'] literals on their
  inner comma (false positive on the comms seed) — splitter is now
  bracket-aware; verifier verified (injected 3/2 and 2/3 bugs both fire,
  legit array literal passes). Open rulings
  R1-R3 in COMMS-RAIL.md. Schedule notices now UNBLOCKED (own session).

