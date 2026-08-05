# MyBuilderVault — Board
Last updated: 2026-08-04

Active work items in priority order. Unstarted items have no assignee.
Claude pushes to dev only. Main moves via release ritual after Brice approves.

---

## 🔴 BLOCKING — Fix before Eric demo

### BOARD-001 · Fix Firebase Security Rules on Ocala portal
**What:** Firestore + Storage rules expired (test mode 30-day limit). Edge shows
"Sync failed and will retry." Any demo on a non-Brice device fails.
**Fix:** console.firebase.google.com → build-command-center → Firestore → Rules →
`allow read, write: if true;` → Publish. Repeat for Storage.
**Owner:** Brice (requires Firebase console access)
**Effort:** 5 minutes

---

## 🟡 PRE-MEETING — Eric prep

### BOARD-002 · Schedule Brije leadership meeting (reframed 2026-08-04; Eric design-AI segment a subset)
**What:** Meeting is NOT YET SCHEDULED per session brief. We prep first, then schedule
from strength.
**Dependency:** BOARD-001 fixed; BRIJE-MEETING.md reviewed; demo rehearsed.
**Owner:** Brice

### BOARD-003 · Demo rehearsal on non-Brice device
**What:** Open portal on a fresh browser (not logged into Firebase). Walk every demo
section in BRIJE-MEETING.md. Confirm nothing breaks.
**Owner:** Brice
**Effort:** 30 minutes

---

## 🟢 PRODUCT SETUP — Environments checklist (STACK.md §Environments)

### BOARD-004 · Wire Netlify sites to GitHub ✅ DONE 2026-08-03 (Brice)
**What:** Create two Netlify sites — mybuildervault-prod (main branch → mybuildervault.com)
and mybuildervault-dev (dev branch → mybuildervault.dev). Connect to this repo.
**Dependency:** Domains purchased ✅ (2026-08-03)
**Owner:** Brice (Netlify console) + Claude (netlify.toml)
**Effort:** 1 hour

### BOARD-005 · Supabase projects ✅ DONE — consoles 2026-08-03; script 001 run on dev 2026-08-04, prove-it PASSED
**What:** Two projects under JSH org: mybuildervault-prod and mybuildervault-dev.
Script 001 with RLS at birth (copy from MyRealtyVault).
**Owner:** Brice (Supabase console) + Claude (script 001)
**Effort:** 2 hours

### BOARD-006 · CI / Smoke / E2E workflows ✅ SHIPPED 2026-08-04 (Phase A session)
**Done:** ci/smoke/e2e copied from MRV, adapted (Node 24 everywhere; CI runs on dev+main;
e2e agent seat renamed). e2e-report + e2e-purge functions written (Mission Control
e2e_runs insert via service role; purge scoped to e2e-robot org AND E2E- prefix).
PAT Workflows RW verified by probe before push. FIRST FULL GREEN 2026-08-04 @ 39b0806 (after 005 reconciliation + idempotent 004).
OPEN SUB-ITEM: custom-domain DNS for mybuildervault.dev/.com never wired (BOARD-004
was Netlify-side only) — Brice to add DNS records, then flip TEST_BASE_URL back.
Mission Control UI tabs (Quality/Releases) SHIPPED 2026-08-04 later same session
(platform-staff gated nav + route; negative E2E proves tenant invisibility).
RELEASES.md seeded with the R1 draft + prod script order (001,002,002-patch,003,005,004).
**What:** Copy GitHub Actions workflows from MyRealtyVault. Adapt for MyBuilderVault.
Static gates + behavioral smokes + E2E robot. Mission Control (Quality + Releases tabs).
**Dependency:** BOARD-004, BOARD-005
**Owner:** Claude
**Effort:** 3-4 hours

### BOARD-007 · Resend + ImprovMX + branded auth emails
**What:** Per JSH doctrine — platform sends, reply relay, BCC capture. Domain setup,
full-access keys per env, branded Supabase auth templates.
**Dependency:** BOARD-004, BOARD-005
**Owner:** Brice (Resend/ImprovMX accounts) + Claude (implementation)
**Effort:** 2 hours

---

## 🔵 PRODUCT — First tenant (Brije) feature build

Items here are post-Eric-meeting. Sequence depends on licensing agreement shape.

### BOARD-008 · Multi-tenant schema design — IN PROGRESS (007 job container written 2026-08-04; 008 = estimates spine)
**What:** Builder accounts, build (project) records, client sub-accounts, role model
(builder-admin, builder-staff, homeowner). RLS from birth.
Survey competitor products (CoConstruct, Buildertrend, BuilderPad) before finalizing
schema — per JSH doctrine, competitor field shapes encode a decade of corrections.
**Effort:** 1 day (design) + 1 day (script 001 + RLS)

### BOARD-009 · Auth flows — PARTIAL 2026-08-04
**Done:** builder email+password login, magic-link fallback, staff invite rail
(invite-member function: caller-role verified server-side, inviteUserByEmail,
existing-user attach path, org_members upsert), /accept-invite completion page.
**Open:** client (homeowner) magic-link invites — blocked on job_participants (Phase B);
clients attach to jobs, never the org roster.
**What:** Builder signup/login, client invite (magic link), role-based UI gates.
Copy identity layering pattern from MyRealtyVault (PATTERNS §2).
**Dependency:** BOARD-005, BOARD-008
**Effort:** 2 days

### BOARD-010 · React/Vite scaffold + design system ✅ SHIPPED 2026-08-04
**Done:** Vite+React scaffold, navy/gold/cream CSS variables, build stamp +
dist/build.json, 100vh no-page-scroll shell, entitlement-gated nav
(resolve_entitlement + can_see_ticket_queue), Concierge ? intake stub (003 contract),
ticket dashboard on v_ticket_stats, Settings roster+invite, static compliance pages.
**What:** Greenfield React app. Copy Vite config + build stamp from MyRealtyVault.
MyBuilderVault palette (navy/gold/cream per Brije branding). "Scrolling is not your friend."
**Effort:** 1 day

### BOARD-011 · Port Ocala portal features to product stack
**What:** Rebuild all 11 pages on React/Supabase. Ocala portal is the UX reference.
Phases: Dashboard → Changes → Documents → Budget → remaining pages.
**Dependency:** BOARD-008, BOARD-009, BOARD-010
**Effort:** 3-4 weeks

---

## 🟣 VISION SESSION OUTPUTS (2026-08-03) — pre-build gates

### BOARD-012 · Architecture & phasing proposal — ✅ APPROVED BY BRICE 2026-08-04 (incl. amendment 0058e1e)
**What:** Full product architecture from VISION.md theses. Delivered as
`docs/BRAIN/ARCHITECTURE.md` (status PROPOSED). Includes competitor schema
survey (JobTread / Buildertrend / Hyphen-MarkSystems), full domain model,
app architecture, phasing with the Brije demo line, and a 7-item approval
checklist. Approved with amendment 0058e1e (geometry slot, selection↔schedule
deadline+lag, variance-reveal toggle). Phase A UNDERWAY: script 001 RUN
on mybuildervault-dev 2026-08-04, prove-it PASSED. Next: React scaffold +
auth flows + CI copy (BOARD-006/009/010) in a fresh session.
**Owner:** Claude (build) + Brice (run script 001 on dev Supabase)

### BOARD-013 · Design Lobby pipeline evaluation (rescoped 2026-08-04)
**What:** Research spike (doctrine: kill riskiest unknown first). Target experience
is now the Design Lobby (VISION thesis 7): one 3D scene layer serving walkthrough,
wall-stretch, and live finish-swap. Evaluate: (a) plan→3D tooling (floor plan to
modeled interior; feeds plan_versions.geometry), (b) rendering path — web engine
(Three.js/Babylon) vs. Unreal pixel-streaming vs. hosted walkthrough platforms —
on a single large screen (fullscreen browser, tablet controller), (c) material/PBR
libraries mappable to real SKUs (ties to accretive selections normalized_product),
(d) image-gen retained for lookbooks/stills only (Bridgette's non-walkthrough
outputs). Deliverable: recommended pipeline + per-plan content cost estimate for
Brije's standard spec plans. Non-Anthropic tools expected — Claude orchestrates,
doesn't render.
**Owner:** Claude · **Effort:** 1-2 research sessions · **When:** before Studio build, not before core

### BOARD-014 · Estimate ingestion (the on-ramp)
**What:** AI parse of Brije estimate (Excel/PDF) → structured base price, allowances,
options, upgrades with approved/included states. Kills re-keying; feeds accretive
selections catalog. Jaggars 7/23/26 estimate PDF is the test fixture.
INTEL 2026-08-04: the .xlsx has NO formulas — MICAH (PM) keys amounts manually
(attribution corrected same day: pricing is Micah's work, not Eric's). Ingestion
is pure extraction; PDF fixture is sufficient. Ingestion must also sum lines and
flag mismatch vs. stated totals (hand-keyed math can drift) — builder-facing flag
only, never surfaced to the client.
**Dependency:** BOARD-012 schema ✅ (approved 2026-08-04)

### BOARD-015 · Photo library intelligence
**What:** Bulk ingest + AI auto-tag (room/feature/style/material/color) + job
provenance + instant search. Fastest wow, zero process change. See VISION thesis 6.
**Dependency:** BOARD-010 scaffold, Cloudinary setup

---

### BOARD-030 · Reports surface (Brice, 8/4/26)
**What:** A Reports tab housing a REPORT CATALOG — each report a registered
definition (title, personas served, params, columns, query) rendered as a
printable table + Excel export (SheetJS). Persona-filtered like the dashboard
widget catalog. Starting set: Job cost detail (cost code × structure), Budget
vs actual, Change order log (home of the Brije 3-column Excel export,
LEARNINGS §7), Allowance reconciliation, Sales funnel + conversion, WIP
summary; Timesheet summary once time entries land (PERSONAS v2).
**Depends:** 011 (cost basis) for cost reports; recharts DECIDED YES 8/4
(Brice deferred to recommendation) — charts allowed inside reports too.
**Sequence:** after dashboard shell, before or alongside estimate editor.
**SHIPPED (v1) 2026-08-05 AM:** Reports surface live — role-filtered catalog of
5 reports (WIP summary, Budget vs actual/allowances, Change order log, Job
cost detail, Sales funnel & aging), generic table renderer, SheetJS Excel
export, print mode. Golden path 7 covers it. OPEN: Brije-exact 3-column CO
export format (needs their actual sample doc), timesheet report (awaits time
entries), report scheduling/email (comms rail).

### BOARD-031 · Field spine — work orders / superintendent / crew (session 8/5 PM)
**What:** The superintendent/work-order spine per PERSONAS v2 (#15/#16) and the
v1.x subsystem call-out. Per DOCTRINE §8, session opened with the step-back
brief — research across Buildertrend, JobTread, Raken, ServiceTitan, Hyphen
BuildPro — delivered as `docs/BRAIN/FIELD-SPINE.md` (status PROPOSED) naming
table stakes, the next level, proposed 013 scope, and 5 open rulings
(schedule deferral, sub WO money, time→actuals, punch-as-WO-kind, weather).
**Gate:** CLEARED — brief APPROVED 8/5. Script 013 RUN on dev 8/5,
prove-it PASSED (6/9/21/1/1/1/1/2/1). Surfaces SHIPPED same day: Board /
Today / Daily Log / Time on /field, WO drawer, golden path 8.
**Open:** sub acceptance portal surface, Cloudinary photos on items/logs,
auto-assembled log draft (thesis 1), date-window board view. Schedule
engine = next named subsystem (own §8 step-back).
**Owner:** Claude (brief ✅ delivered 8/5) + Brice (rulings)

### BOARD-032 · Schedule engine (session 8/5 PM, block 2)
**What:** The dependency schedule engine — the subsystem FIELD-SPINE ruling
#1 named as next. Step-back brief delivered per §8 as
`docs/BRAIN/SCHEDULE.md` (PROPOSED): incumbent mechanics researched
(Buildertrend/JobTread/BuildPro), table stakes + next level named, proposed
014 scope (items, FS deps + lag, workday calendar, templates, draft→publish
baseline, DB recalc engine, WO + selections linkage), 6 rulings open.
**Gate:** CLEARED — brief APPROVED 8/5, all 6 rulings as recommended.
**EXECUTED 8/5 (schedule session):** script 014 (items, FS deps + lag,
workday calendar + excluded dates, Day-N templates, draft→publish
baseline-at-publish, DB recalc engine + WO-completion trigger, WO +
selections FK linkage) written and behaviorally PROVEN pre-push — 19/19
recalc-smoke scenarios green against the real chain on a scratch Postgres
(scripts/smoke-recalc.mjs, now a CI job). Surfaces shipped: /schedule
Gantt (drag-cascade + reason modal + baseline toggle) · List (#15 full
sort/filter, add item, drawer w/ deps + reasoned shift + activity) ·
Templates (catalog + Day-N import). Magnolia stub schedule seeded
(template 15 items/16 deps; Lot 7 published + field-advanced; Lot 9
draft). Golden path 9 added. Script 014 RUN on
mybuildervault-dev 8/5 PM (prove-it 7/4/4/2/2/2/1/1/1); seed RUN with full
prove-it captured (1/15/16/15/1/15/4/15/1/2/1/0).
**Also shipped 8/5 PM:** dashboard schedule-health card (late/at-risk/
tracking/draft, baseline-derived, pills filter, rows deep-link).
**Open:** dependency arrows on the Gantt, template create/export from a
job, calendar view, client-portal schedule (Phase C), duration accretion
(baseline vs actual per template item). BOARD-007 (comms rail) remains
elevated: schedule notices depend on it.
**Owner:** Claude (build ✅) + Brice (run scripts)
