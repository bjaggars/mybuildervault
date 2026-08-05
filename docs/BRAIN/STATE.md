# MyBuilderVault — Current State
Last updated: 2026-08-04

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
