# MyBuilderVault — Architecture & Phasing Proposal (BOARD-012)

**Status: PROPOSED — awaiting Brice approval. Do not build from this document.**
Authored: 2026-08-03 session. Traces to VISION.md theses 1–10.
Competitor schema survey folded in per JSH doctrine §7 and BOARD-008 note.

---

## 0. Executive summary

One tenant-scoped Postgres schema on Supabase with RLS at birth. One **Job**
entity serving both lifecycles (spec + custom), containing 1..n **Structures**.
One continuous financial spine — **Cost Codes → Estimate → Contract → Change
Orders / Allowances / Selections → Actuals → Variance** — where documents are
immutable snapshots and lifecycles are living tables that reference their
origin lines. Client inclusion is a row-level property (visibility flags +
portal toggles), not a bolted-on portal. AI lives in Netlify functions only,
best-effort, never blocking a primary write. Studios are a separate track
gated on BOARD-013.

Build order: Foundation → the Spine (as one thread, not three ports) →
Collaboration surfaces → Photo intelligence (parallel) → Spec pipeline →
Studios. The **Eric demo line** (Dashboard + Change Orders + Budget +
Documents in a Brije-seeded tenant at mybuildervault.com) cuts through the
first three phases and is the scheduling gate for the meeting.

---

## 1. Competitor schema survey — what a decade of corrections teaches

Surveyed 2026-08-03: JobTread (mid-market upstart, ~$199/mo tier),
Buildertrend (low-end incumbent, absorbed CoConstruct), Hyphen
BuildPro/MarkSystems (production high end, 21+ of top 26 US builders).

### 1.1 Convergent shapes (adopt — these are settled law)

| Shape | Evidence | Our adoption |
|---|---|---|
| **Cost codes as the categorization backbone** | Buildertrend orders estimates, budgets, POs, and reports by cost code; MarkSystems links estimating to purchasing through them | `cost_codes` table per tenant, seeded from an NAHB-style default set, editable. Every financial line carries one. The Ocala portal's ad-hoc categories map onto these at ingestion. |
| **Estimate → budget baseline → revised costs** | Buildertrend: estimate becomes the Job Costing Budget baseline; approved COs/selections/bills roll into Revised Cost and Revised Client Price | Estimate versions snapshot to a contract baseline; a computed budget view derives revised cost from approved lifecycle rows. Never hand-maintained totals. |
| **Change orders derive from budget lines, never re-keyed** | JobTread: CO cost items derive directly from budget items; approvals track back to the budget automatically | `change_order_lines` reference `estimate_lines`/cost codes. New-scope COs create lines; they never duplicate them. |
| **Allowance ↔ selection linkage with auto overage/underage** | Buildertrend: approving an option updates the allowance in Selections AND the budget; overage flows to revised cost | Same mechanics — but promoted to a reconciliation lifecycle (thesis 4, §2.4). |
| **Job status as a small state machine** | Buildertrend: Pre-Sale / Open / Warranty / Closed | Adopted and extended for the spec pipeline (§2.2). |
| **Digital approval with audit evidence** | JobTread: e-sign links, approval/denial tracked; manual approvals require an explanation + attached proof | `approvals` records on COs and selections: who, when, channel (portal / verbal-recorded / email), evidence file. Manual approvals require a reason. |
| **Per-role visibility at the row level** | JobTread comments carry isVisibleToCustomerRoles / InternalRoles / VendorRoles | `visibility` enum (internal / client / sub) on comments, documents, photos, decisions. This is how "includes the client" becomes schema, not UI. |
| **Trade/sub as a first-class persona with task-status flows** | BuildPro's entire moat: schedule adherence by lot/phase/trade, subs update status | Schema reserves `participant_kind = sub` and task assignment day one; sub-facing UX is SMS/email worksheet flows first (open unknown: will Brije subs log in). |
| **Warranty as a lifecycle stage, not an afterthought** | Buildertrend Warranty status + claim IDs; MarkSystems contract-to-warranty | Job status includes `warranty`; warranty claims table deferred to backlog but the state exists at birth. |

### 1.2 Divergences (our theses against their record)

- **Allowances:** incumbents treat allowances as budget arithmetic. None give
  them a client-facing reconciliation lifecycle (estimated → actual → variance
  → conversation). Thesis 4 stands — this is greenfield.
- **Selections:** all incumbents demand upfront catalog/option setup — the OCM
  killer thesis 5 names. Accretive capture (link scrape / photo / library
  pick) with background AI normalization has no incumbent equivalent.
- **Self-feeding ops:** JobTread's AI connector (MCP into Claude/ChatGPT)
  validates the direction and proves the segment will pay for it — but it's
  assistant-pulls-data, not system-feeds-itself. Thesis 1 remains the moat.
- **The client-inclusive DNA:** every surveyed product is builder-back-office
  with a portal. None was born from the buyer's chair. Category claim holds.
- **Dead zone confirmed:** Hyphen markets its all-in-one at "approximately 100
  projects per year" builders — they see the same gap. Speed matters.

---

## 2. Domain model

Entity-level design. SQL ships as DB change scripts only after approval,
each with RLS at birth, NOTIFY pgrst, and a prove-it query per doctrine §2.

### 2.1 Tenancy & identity

- **builder_orgs** — the tenant. Branding (logo, palette), settings, tier.
- **people** — identity; email is the login key (Supabase Auth). One auth per
  person, per MRV identity layering.
- **org_members** — person ↔ org with role: `owner`, `admin`, `pm`, `sales`,
  `super`. Add/remove crews without assuming headcount (open unknown honored).
- **contacts** — the relationship unit, a PARTY (person / household / entity)
  with 1..n members, copied from MRV pattern §2. Buyers are contacts before
  they are portal users. Cache columns machine-maintained via trigger.
- **job_participants** — a contact-member's role on a Job: `client_primary`,
  `client_co`, `sub`, `vendor`, `agent`. **"Spec home acquires a buyer at
  drywall" = insert a participant + job state transition.** First-class,
  per thesis 2.

RLS posture: every row carries `org_id`. Org staff policies resolve through
`org_members`. Client policies resolve through `job_participants` scoped to
their job(s) AND row `visibility`. Subs likewise, narrower. No naked tables,
ever (MRV 019/020 scar).

### 2.2 Jobs, structures, and the spec pipeline

- **communities** — subdivision/phase (spec pipeline; optional for custom).
- **lots** — community-optional, address, county, survey document ref.
- **plans** — floor plan as a record from day one (name, base sqft,
  bed/bath, elevation variants), with **plan_versions** holding structured
  metadata (rooms, areas) as it becomes available, including a reserved
  `geometry` JSONB slot — empty until track B, but the column exists at birth
  so Eric's Studio starts with data, not a schema change. Plans enter as DATA,
  never just PDFs — the thesis 7 track-B on-ramp, cheap now, priceless later.
- **jobs** — the core entity. `lifecycle = spec | custom`, `lot_id`,
  `plan_id` (nullable for full custom), status state machine:

  `lead → design → contract → permitting → construction → warranty → closed`
  (custom front door)
  `planned → permitted → construction → listed → under_contract →
  construction (cont.) → closed_sold → warranty → closed` (spec front door)

  Implemented as one status enum + a `job_events` audit table; the two
  funnels are views over one engine. Buyer-attach is an event.
- **structures** — 1..n per job (`house`, `shop`, `garage`, `adu`...).
  Financial lines and selections carry `structure_id`. Proven by the Jaggars
  estimate (house + shop, split allowances).

### 2.3 The financial spine (thesis 3)

- **cost_codes** — per-tenant, seeded default set, NAHB-style groups.
- **estimates** — versioned documents per job. `source = ingested | authored`,
  status `draft | presented | accepted | superseded`. Ingested estimates
  (BOARD-014) parse Brije's Excel/PDF into lines — the on-ramp that kills
  re-keying.
- **estimate_lines** — cost_code, structure_id, `kind = base | fee |
  allowance | structural_option | upgrade`, description, price, client-facing
  approved/disapproved state (matching Brije's own document format —
  LEARNINGS §7), sort order preserving THEIR grouping.
- **conditions** — first-class dated conditions attached to lines or jobs:
  regulatory time-bombs ("New ATU Requirement Starting 6/1/26"), contingency
  notes ("assuming Geo Tech allows..."). Fields: text, type, trigger_date
  (nullable), status. Surfaced on dashboards before they detonate.
- **contracts** — immutable snapshot of the accepted estimate version +
  executed document ref. The baseline all variance measures against.
- **change_orders** — the Ocala portal's proven status workflow carried
  forward: `tbd → discussed → considering → approved → in_build`, plus
  `included` (green, $0, excluded from awaiting-quote), `archived`,
  `rejected`. **change_order_lines** derive from estimate_lines or create
  new ones (JobTread lesson). Excel export matches Brije's 3-column format
  exactly (LEARNINGS §7). Email reports ride the comms rail.
- **allowances** — first-class lifecycle (thesis 4): origin estimate_line,
  budgeted amount, structure scope, status `open → quoted → actual_known →
  reconciled`, actual amount, computed variance, linked selections, client
  visibility ON by default for allowance AMOUNTS (the client signed them in
  the contract); VARIANCE reveal as actuals land is builder-controlled per
  allowance (one entitlement flag) — a builder may deliver a $9K well overage
  in a conversation before it appears in the portal. The variance conversation
  happens with the builder in control of timing, in the portal BEFORE it
  becomes a dispute. This table is the emotional center of the product.
- **selections** (thesis 5) — accretive capture: `capture_kind = link |
  photo | library`, scraped title/image/price at capture, room, structure,
  linked allowance (optional), status `proposed → shown → approved`,
  approval evidence, and an optional schedule-item link with decision
  deadline + lag ("choose N days before task start" — Buildertrend's
  proven correction; the deadline moves when the schedule moves). Background AI normalization fills `normalized_product`
  fields (brand, model, category) — best-effort, never blocking. Standards
  accrete: repetition across jobs surfaces "Brije Standard" candidates.
- **actuals** — v1 is deliberately light: actual-cost entries per cost code /
  allowance (manual or ingested), feeding variance. **No PO/bill module in
  v1** — finance posture is pull/push interface to external accounting
  (system unknown until the Eric meeting). The schema leaves room; we do not
  build purchasing until Brije's back office is known. Draws and lien waivers
  revisit here (FL pain point).

Budget is a **computed view**: contract baseline + approved COs + allowance
variances + selection overages = revised cost / revised client price
(Buildertrend's arithmetic, our transparency).

### 2.4 Collaboration & content

Ported from the Ocala portal onto the product stack, each gaining `org_id`,
`job_id`, `visibility`, and real auth:

- **phases / phase_steps** (timeline), **meetings** (+ AI action capture),
  **decisions**, **actions**, **documents** (Cloudinary, direct-write on
  save — LEARNINGS §1 scar honored by architecture: no debounced critical
  writes anywhere in the product).
- **photos** (thesis 6) — separate from documents: bulk ingest, AI tags
  (room / feature / style / material / color), `job_id` provenance,
  search index. One ingestion, four consumers (sales answers, estimating
  intel, Studio grounding corpus, marketing inventory).
- **comments** — on any entity, with the JobTread-shape visibility flags.

### 2.5 Platform doctrine tables (copy from MyRealtyVault, Rule of Three)

- **feature_requests** + GitHub Issues dual-write (capture loop, Concierge
  backend — thesis 8; Concierge ships day one).
- **e2e_runs**, **release_approvals** (Mission Control).
- Comms rail tables (sends, inbound log, relay) per PATTERNS §1.
- **entitlements** (thesis 9): `org_entitlements` (feature key → enabled,
  driven by tier) + `client_portal_toggles` (per job or per participant:
  which portal surfaces this client sees). Schema-born, enforced in RLS
  where data-level and in UI where surface-level. Copy MRV board-66 pattern
  when it lands; until then this is the minimal correct shape.
- **ai_usage** metering (per JSH doctrine §6b).

---

## 3. Application architecture

- **Frontend:** React/Vite SPA per STACK.md — build stamp, inline styles,
  CSS variables (navy #1C2B4A / gold #C5A028 / cream #F5F0E8), "scrolling
  is not your friend." Three shells, one app: **Builder workspace**
  (staff), **Client portal** (toggled surfaces), **Mission Control**
  (founder). View-as toggle replicates the portal's Builder/Admin trick
  legitimately (role-based, not password-gated).
- **API layer:** Supabase client + RLS for CRUD; Netlify functions for
  anything holding secrets or calling AI (estimate ingestion, photo
  tagging, selection scraping/normalization, Concierge, comms rail sends,
  render engine later).
- **AI posture:** Sonnet for extraction/generation, Haiku for Concierge
  chatter; **best-effort in all data paths** — an AI failure never blocks
  a write (STACK.md law). Self-feeding ops (thesis 1) enters v1 as:
  estimate ingestion (BOARD-014), photo auto-tag (BOARD-015), meeting
  action capture, selection normalization. Superintendent-photo-to-schedule
  and PO drafting are Phase E+ once schedule + Brije workflow exist.
- **Studios (thesis 7):** out of core scope. Bridgette's Studio (track A)
  and Eric's Studio (track B) start only after BOARD-013 tooling
  evaluation. Core's obligations to them are already in the model: plans
  as data, tagged photo corpus, selections with normalized products, and
  a presentation-mode CSS budget line. Nothing else.
- **Realtime:** Supabase Realtime replaces Firebase onSnapshot for the
  surfaces that earned it in the portal (dashboard counters, CO status).
  Not blanket-enabled — subscription per surface, added when a page ships.
- **Testing:** all three tiers from day one (static gates, behavioral
  smokes per new path BEFORE push, E2E robot with deploy preflight).
  CI copied from MRV (BOARD-006). E2E covers each page as it ships.

---

## 4. Phasing

Reshaped from ROADMAP Phase 2–4 per the spine thesis: Change Orders,
Budget, and Selections are **one continuous thread**, not three ports.

**Phase A — Foundation (≈1 week)**
Script 001: tenancy + identity + roles + RLS + Mission Control tables +
entitlements skeleton + cost_codes. React scaffold + design system + auth
flows (builder login, client magic-link invite). CI/Smoke/E2E copied and
green on a hello-world deploy at mybuildervault.dev. Compliance pages
(privacy/terms/about) — required before the .com is named externally.

**Phase B — The Spine (≈2–3 weeks)**
Jobs + structures + estimates + estimate ingestion (BOARD-014, Jaggars
7/23/26 PDF as fixture; request the .xlsx) → contract snapshot → change
orders (full workflow + Excel export + comms-rail email reports) →
allowances lifecycle → selections capture → budget view. Seeded Brije
tenant with real categories and the Jaggars job.

**Phase C — Collaboration surfaces (≈2 weeks)**
Dashboard (stat cards, clickable), documents, meetings + decisions +
actions, timeline/phases, contacts, reports hub. Concierge ships here.

**⟶ THE ERIC DEMO LINE.** Gate check (ERIC-MEETING.md): Dashboard, Change
Orders, Budget, Documents live in the Brije-seeded tenant at
mybuildervault.com, clean on a fresh browser. Reached at A + B + the first
two items of C — roughly 5–6 weeks of sessions. Meeting gets scheduled
here, not before.

**Phase D — Photo intelligence (BOARD-015, ≈1 week, parallelizable with C)**
Bulk ingest + auto-tag + search. Fastest wow, zero process change; a demo
enhancer if it lands before the meeting, not a gate.

**Phase E — Spec pipeline (post-Eric, shaped by the meeting)**
Communities/lots/plan library, inventory dashboard, buyer-attach flow,
MyRealtyVault seam (spec → listing pipeline, thesis 10). Self-feeding ops
deepens here (schedule + super photo flows) once Brije's real operation is
in the room.

**Phase F — Studios (post BOARD-013)**
Track A (Bridgette) first; track B (Eric) architecture already paid for by
plans-as-data. Presentation mode ships with track A.

---

## 5. Decisions requiring Brice approval

1. **Estimate lines + separate lifecycle tables** (allowances/selections
   reference origin lines; documents immutable, lifecycles living) — vs. a
   single polymorphic table. Proposed: separate, as specified.
2. **Cost codes at birth**, seeded NAHB-style, even though the portal never
   had them. Ingestion maps Brije's categories onto them.
3. **No PO/bill/purchasing module in v1** — actuals-lite + external
   accounting interface posture, pending Brije back-office discovery.
4. **One job status engine, two funnel views** for spec/custom.
5. **Phasing order and the Eric demo line** as the meeting gate (~5–6 weeks
   of sessions from approval).
6. **Client visibility ON by default for allowances**, off by default for
   internal comments — the client-inclusive default posture generally.
7. **BOARD-014 fixture:** proceed with PDF; .xlsx from Brije when available.

On approval: this header flips to APPROVED, script 001 is written, and
Phase A begins. Until then, zero product code.
