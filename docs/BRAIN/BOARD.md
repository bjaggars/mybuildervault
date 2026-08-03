# MyBuilderVault — Board
Last updated: 2026-08-03

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

### BOARD-002 · Schedule Eric meeting
**What:** Meeting is NOT YET SCHEDULED per session brief. We prep first, then schedule
from strength.
**Dependency:** BOARD-001 fixed; ERIC-MEETING.md reviewed; demo rehearsed.
**Owner:** Brice

### BOARD-003 · Demo rehearsal on non-Brice device
**What:** Open portal on a fresh browser (not logged into Firebase). Walk every demo
section in ERIC-MEETING.md. Confirm nothing breaks.
**Owner:** Brice
**Effort:** 30 minutes

---

## 🟢 PRODUCT SETUP — Environments checklist (STACK.md §Environments)

### BOARD-004 · Wire Netlify sites to GitHub
**What:** Create two Netlify sites — mybuildervault-prod (main branch → mybuildervault.com)
and mybuildervault-dev (dev branch → mybuildervault.dev). Connect to this repo.
**Dependency:** Domains purchased ✅ (2026-08-03)
**Owner:** Brice (Netlify console) + Claude (netlify.toml)
**Effort:** 1 hour

### BOARD-005 · Supabase projects
**What:** Two projects under JSH org: mybuildervault-prod and mybuildervault-dev.
Script 001 with RLS at birth (copy from MyRealtyVault).
**Owner:** Brice (Supabase console) + Claude (script 001)
**Effort:** 2 hours

### BOARD-006 · CI / Smoke / E2E workflows
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

### BOARD-008 · Multi-tenant schema design
**What:** Builder accounts, build (project) records, client sub-accounts, role model
(builder-admin, builder-staff, homeowner). RLS from birth.
Survey competitor products (CoConstruct, Buildertrend, BuilderPad) before finalizing
schema — per JSH doctrine, competitor field shapes encode a decade of corrections.
**Effort:** 1 day (design) + 1 day (script 001 + RLS)

### BOARD-009 · Auth flows
**What:** Builder signup/login, client invite (magic link), role-based UI gates.
Copy identity layering pattern from MyRealtyVault (PATTERNS §2).
**Dependency:** BOARD-005, BOARD-008
**Effort:** 2 days

### BOARD-010 · React/Vite scaffold + design system
**What:** Greenfield React app. Copy Vite config + build stamp from MyRealtyVault.
MyBuilderVault palette (navy/gold/cream per Brije branding). "Scrolling is not your friend."
**Effort:** 1 day

### BOARD-011 · Port Ocala portal features to product stack
**What:** Rebuild all 11 pages on React/Supabase. Ocala portal is the UX reference.
Phases: Dashboard → Changes → Documents → Budget → remaining pages.
**Dependency:** BOARD-008, BOARD-009, BOARD-010
**Effort:** 3-4 weeks
