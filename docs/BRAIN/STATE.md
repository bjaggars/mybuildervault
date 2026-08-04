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
via console. Prod runs 001+002(+patch)+003+005+004 in that order via release ritual at first release.

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
