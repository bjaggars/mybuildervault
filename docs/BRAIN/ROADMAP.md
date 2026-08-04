# MyBuilderVault — Roadmap
Last updated: 2026-08-03

## Phase 0 — Fix & Prep (before Eric meeting)
**Goal:** Eric sees a working, polished demo. Not a broken portal.
**Timeline:** This week.

1. **Fix Firebase Security Rules** (BOARD-001, 5 min, Brice)
   Firestore + Storage → `allow read, write: if true;` → Publish.
   Verify on a non-Brice device before considering done.

2. **Demo rehearsal** (BOARD-003, 30 min, Brice)
   Walk ERIC-MEETING.md demo plan on fresh browser. Fix anything that breaks.

3. **Schedule Eric meeting** (BOARD-002, Brice)
   From strength: portal working, BRAIN written, talking points clear.

---

## Phase 1 — Environments Setup (JSH doctrine, STACK.md checklist)
**Goal:** Proper development infrastructure before writing a line of product code.
**Timeline:** 1-2 days after Eric meeting.

This is the STACK.md "new product environments checklist" as concrete steps.
Current Firebase/single-file state diverges from doctrine at every point — costs noted.

### Step 1 · Netlify sites (BOARD-004)
- Create `mybuildervault-prod`: main branch → mybuildervault.com
- Create `mybuildervault-dev`: dev branch → mybuildervault.dev
- Add `netlify.toml` to repo (copy from MyRealtyVault, adapt)
- Wire custom domains in Netlify DNS (domains already purchased ✅)
- **Divergence from current state:** Ocala portal is drag-deploy, no CI/CD.
  Cost: ~1 hour to set up; zero ongoing cost.

### Step 2 · Supabase projects (BOARD-005)
- Create `mybuildervault-prod` and `mybuildervault-dev` under JSH org
- Script 001: schema foundation with RLS at birth (copy from MyRealtyVault script 001)
  Minimum: `builds` table, `builder_orgs` table, RLS policies, NOTIFY pgrst + prove-it query
- **Divergence from current state:** Ocala portal uses Firebase single-document.
  No Supabase schema exists anywhere in this codebase. Full greenfield.
  Cost: ~2 hours for initial schema design + script.

### Step 3 · GitHub Actions CI (BOARD-006)
- Copy CI workflow from MyRealtyVault: static gates + smoke + E2E
- Adapt test scripts for MyBuilderVault paths
- Add Mission Control tables to script 001 (e2e_runs, release_approvals)
- Seed e2e agent accounts per env
- Set all secrets per-site AND per-context (prod secret ≠ dev secret)
- Add build.json stamp to vite.config.js (deploy preflight)
- **Divergence:** No tests exist today. E2E robot is zero-to-one.
  Cost: ~4 hours to copy, adapt, and verify-the-verifier.

### Step 4 · Resend + ImprovMX (BOARD-007)
- Domain: mybuildervault.com → Resend verified sender
- Full-access keys: `mybuildervault-prod-full` and `mybuildervault-dev-full`
- ImprovMX: support@, noreply@, reply+@ routing
- Branded auth email templates in Supabase (copy from MyRealtyVault)
- Inbound webhook for reply relay + BCC capture (copy from MyRealtyVault)
- **Divergence:** Ocala portal uses no email infrastructure at all. Platform-sent
  emails in the product use the JSH comms rail. "Open in Email App" handoffs are gone.
  Cost: ~2 hours.

### Step 5 · Cloudinary + Anthropic
- Cloudinary account (or reuse JSH account with new product cloud name)
- Unsigned upload preset for client photo uploads
- ANTHROPIC_API_KEY per env in Netlify (Functions scope, secret)
- **Divergence:** Ocala portal uses Firebase Storage for photos. Product uses Cloudinary.
  Cost: ~30 minutes setup.

---

## Phase 1.5 — Vision Gates (added 2026-08-03)
**Goal:** Architecture approved before code. VISION.md now governs product shape.
1. BOARD-012 architecture & phasing proposal (Claude) → Brice approval
2. Competitor schema survey folded into BOARD-012 (doctrine: incumbent field
   shapes = a decade of corrections)
3. BOARD-013 AI tooling evaluation runs before Studio build (not before core)

**Sequencing note (2026-08-03):** Netlify sites + Supabase projects + env vars
completed by Brice ahead of schedule — Phase 1 steps 1–2 are done except script
001, which ships with the Phase 2 schema per the approved architecture.
The estimate-as-spine thesis (VISION 3) reshapes Phase 3's port order: Change
Orders, Budget, and Selections are one continuous Estimate→Actuals thread, not
three ports.

## Phase 2 — React/Vite Scaffold + Schema
**Goal:** Empty but correctly structured React app running at mybuildervault.dev.
**Timeline:** 1 week after Phase 1.

- React + Vite scaffold (copy from MyRealtyVault, strip product-specific code)
- Build stamp (COMMIT_REF → build.json, deploy preflight works)
- Design system: MyBuilderVault palette (navy #1C2B4A, gold #C5A028, cream #F5F0E8
  per Brije branding from pitch deck)
- Supabase scripts 002+: multi-tenant schema — builder_orgs, builds, clients, roles
  Survey CoConstruct/Buildertrend/BuilderPad schema patterns before finalizing
  (JSH doctrine: competitor field shapes = decade of corrections)
- Auth flows: builder signup, client invite (magic link)
- Public compliance pages (privacy, terms, about) — required before mybuildervault.com
  is named anywhere externally

---

## Phase 3 — Core Feature Port (Brije-ready)
**Goal:** Brije can run their first real build on MyBuilderVault.
**Timeline:** 4-6 weeks after Phase 2. (This is where Lighthouse licensing starts.)

Port Ocala portal features to product stack in this sequence (highest demo value first):
1. Dashboard
2. Change Orders (highest Eric interest based on pitch deck)
3. Document Vault
4. Budget / Base Price Breakdown
5. Meetings + Decisions
6. Timeline / Phases
7. Selections
8. Actions
9. Contacts
10. Reports Hub + Excel export

Comms rail ships with Change Orders (email reports are a core feature).
E2E robot covers each page as it ships.

---

## Phase 4 — Brije-specific Extensions
**Goal:** Features only Brije needs that make them a sticky Lighthouse customer.
**Timeline:** Ongoing after Phase 3, driven by Brije usage.

- AI Design Center (Bridgette's Studio)
- Landscape Design module
- Campaign Studio integration (Brije Homes nurture drip via MyRealtyVault engine)
- Operations Hub (spec home pipeline — 70 homes/year)
- Spec home listing automation

---

## Phase 5 — Second Tenant
**Goal:** Prove multi-tenancy works with a second builder.
**Timeline:** After Phase 3 is solid and Brije is live.

- Onboarding flow for new builder
- Tenant branding (logo, palette per builder)
- Billing integration (Stripe)
- Usage instrumentation

---

## Divergence log (current Firebase state vs. JSH doctrine)

| Concern | Current State | Doctrine | Cost to Adopt |
|---|---|---|---|
| Branching | No repo existed | dev/main + release ritual | Repo created ✅ 2026-08-03 |
| Hosting | Drag-deploy Netlify | GitHub → Netlify CI/CD | BOARD-004, ~1hr |
| Database | Firebase Firestore | Supabase + Postgres | Full rebuild, ~2 days schema |
| Auth | Hardcoded password | Supabase Auth + RLS | Full rebuild, ~1 day |
| RLS | None | RLS at birth on every table | No backport; greenfield only |
| Testing | None | 3 tiers: static + smoke + E2E | BOARD-006, ~4hrs copy/adapt |
| Comms | None (mailto) | Resend comms rail | BOARD-007, ~2hrs |
| Storage | Firebase Storage | Cloudinary | Full rebuild, ~30min setup |
| Secrets | In client JS | Netlify env vars, never in repo | Redacted in public repo ✅ |
| CI | None | GitHub Actions | BOARD-006 |
| Mission Control | None | Quality + Releases tabs | BOARD-006 |
