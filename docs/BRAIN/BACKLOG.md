# MyBuilderVault — Backlog
Last updated: 2026-08-03

Captured ideas, future features, and aspirational scope. Not sequenced.
Items graduate to BOARD when they're actively planned.

---

## Core Product (port from Ocala portal)
- Dashboard with stat cards and clickable navigation
- Timeline / Phases with steps and completion tracking
- Budget with base price breakdown and change order rollup
- Change Orders — full status workflow, Excel export, email reports
- Selections — material/finish tracking
- Action Items
- Meeting log with AI action item capture
- Key Decisions log
- Contact directory
- Document vault (upload, replace, email select)
- Reports Hub with inline filters
- Builder View / Client View toggle (replaces Admin/Builder in portal)
- Rich text email reports (Outlook-compatible)
- Real-time sync (Supabase Realtime, replacing Firebase onSnapshot)

---

## Multi-Tenancy (greenfield, not in portal)
- Builder account (org) with multiple active builds
- Build (project) record — one per home, linked to builder
- Client sub-account — homeowner access scoped to their build only
- Builder staff roles (admin, project manager, sales)
- Tenant-scoped storage (Cloudinary per tenant or per build)
- Builder onboarding flow
- Client invite flow (magic link, no password friction)
- Builder branding per tenant (logo, palette — "Powered by MyBuilderVault")

---

## AI Features
- AI Design Center — Bridgette's Studio concept from Brije pitch deck:
  client vision profile, material pairing engine, AI palette generation,
  virtual room builder, digital lookbook generator, selections deadline tracker,
  contractor finish schedule export
- Landscape Design module — Zone 9B plant library, HOA compliance checker,
  hardscape designer, irrigation planning, AI lot analysis
- Eric's Studio (architectural) — geometry-true design manipulation: move walls,
  add rooms, massing, lot placement; floor plans as structured data so changes
  update sqft and cost; photoreal renders on top of geometry (VISION thesis 7,
  track B). Consolidates the two fragments below:
  - AI Lot Analysis — upload survey → AI maps setbacks/wetlands/orientation → preliminary site plan
  - 3D Home Visualizer — floor plan PDF → 3D exterior rendering
- Studio presentation mode — full-screen dark touch-first layout for Eric's future
  design-room touchscreen wall (hardware not yet purchased; CSS-cheap, demo-rich)
- Builder's AI Assistant — natural language queries across all builds
- AI Contract & Change Order draft generator
- Predictive Cost Modeling — material price feeds → margin impact across active builds
- AI Content Studio for marketing (see Campaign Studio below)

---

## Marketing Engine (cross-product opportunity with MyRealtyVault Campaign Studio)
- Social media hub — AI-generated captions from build milestones
- Build progress auto-posts (milestone → draft post → one-tap approve → schedule)
- Spec home listing automation — build status triggers listing creation
- Geo-targeted ad campaign management (Meta/Google)
- Testimonial capture engine (move-in + 30-day + 1-year automated requests)
- Lead management — source tagging, lead-to-contract conversion tracking
- Campaign Studio integration — same block engine as MyRealtyVault generates
  Brije Homes' own client nurture drip (two-product story for Eric)

---

## Operations Hub (builder-internal, not client-facing)
- Build pipeline dashboard — all active builds, phase, % complete, days to CO
- Permit tracker — submitted/pending/approved across all builds and counties
- Subcontractor scorecard — rate subs on quality/timeliness/price per job
- Draw schedule manager — milestone, % complete, draw requested/received, days to funding
- Material procurement tracker — long-lead items order-to-delivery
- Profitability dashboard — real margin per build, by floor plan, by client type
- Warranty tracker — post-close claims by trade and sub, pattern recognition
- Daily build log — site supervisor input → weekly client summary auto-generated
- Cycle time analytics — lot acquisition to CO by plan, subdivision, season

---

## Client Experience (premium tier)
- Mobile PWA (mybuildervault.app) with push notifications at milestones
- Build progress photo timeline — auto-assembled by phase
- Virtual walkthrough scheduler — video call booking at key milestones
- Milestone celebration notifications (push + email with photos)
- Digital home handover — branded manual at closing (warranties, paint codes,
  maintenance schedule, sub contacts)
- 30-day and 1-year post-close check-in automation

---

## Business Intelligence
- Change order revenue tracking — which upgrades are most chosen, best margin
- Floor plan profitability — which plans drive best returns
- Subcontractor performance over time
- Client acquisition source attribution

---

## Infrastructure / Platform
- Comms rail (Resend + reply relay + BCC capture) — copy from MyRealtyVault
- Mission Control (Quality + Releases tabs) — copy from MyRealtyVault
- E2E robot (Playwright) — copy from MyRealtyVault
- Capture loop (feature_requests + GitHub Issues dual-write) — copy from MyRealtyVault
- Public compliance pages (privacy, terms, about) before any external submission
- Twilio A2P 10DLC for SMS (if/when SMS features ship)
- Stripe for licensing/subscription billing

---

## Ocala Portal — Remaining known issues
- Firebase Security Rules expired — BOARD-001
- No proper auth (hardcoded password) — resolved in product rebuild, not backport
- All data in single Firestore document — architectural limit, resolved in product rebuild
- No tests of any kind — resolved in product rebuild
- Secrets in client JS — redacted in public repo copy; live deploy still has them inline

---

## Vision-session captures (2026-08-03) — see VISION.md for full theses
- Allowance tracker — budgeted/actual/variance per allowance, reconciliation
  lifecycle, surfaced in client portal before it becomes a dispute (thesis 4)
- Accretive selections — capture-anything record (link scrape / photo / library
  pick) per room+job with price+status; catalog accretes, AI normalizes;
  Brije standards emerge from repetition (thesis 5)
- Estimate ingestion — AI parse of builder's existing estimate → structured spine
  (BOARD-014)
- Accretive price book (intel 2026-08-04): Brije's estimate components exist as
  haphazard written fragments + memory — no maintained catalog. Thesis 5 applies
  to estimate lines, not just selections: cross-estimate line-item memory
  reassembles the price book from ingested/authored estimates and suggests
  prices when authoring ("you priced this at $X on the last 3 jobs"). Incumbent
  cost catalogs demand upfront setup (OCM killer); ours accretes from documents
  Micah (PM) already writes — he is the estimator (corrected 2026-08-04).
  Lands post-BOARD-014 once 2+ estimates are in
- Photo library intelligence — ingest/auto-tag/search with job provenance
  (BOARD-015, thesis 6)
- Self-feeding ops — schedule updates from superintendent texted photos, POs from
  takeoffs, auto-written client updates from job activity (thesis 1, the moat)
- Multi-structure Jobs — 1..n structures per Job (house + shop), split allowances
  (proven by Jaggars estimate)
- Tier toggles — builder entitlements + client portal interactivity toggles at
  schema birth (thesis 9; copy MRV entitlements pattern when board-66 lands there)
- Sub adoption bias — SMS/email worksheet flows before login-required portals
  (open unknown: will Brije subs log in?)
- Finance posture — no finance module; pull/push interface to external accounting
  (system unknown); draws + lien waivers = FL pain point to revisit
- Regulatory time-bombs — dated code changes repricing work (e.g. "New ATU
  Requirement Starting 6/1/26" in the estimate); track as dated conditions
- Contingency notes as conditions — estimate notes carry risk/sequencing
  ("assuming Geo Tech allows...", "location TBD after framing"), not comments
