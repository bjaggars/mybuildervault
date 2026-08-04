# MyBuilderVault — Vision
Last updated: 2026-08-03 (vision session with Brice)
Distilled from the founding vision session. This file defines WHY the product wins.
STATE/BOARD/ROADMAP define what exists and what's next; this defines the theses.

---

## The category claim

**The first end-to-end builder platform that includes the client.**

Every incumbent is builder-back-office-first with a client portal bolted on.
MyBuilderVault was born from the buyer's chair — the Ocala portal was built BY the
buyer (Brice) DURING his own custom build. No competitor can copy this DNA.
Positioning line: "built from the buyer backwards."

Scope ambition: everything a builder does end to end — marketing, sales, design,
project management, purchasing, vendor management, financial system interface,
cost-per-build tracking, dashboards, contractor management, permitting, plans,
client portal, contractor worksheets, mobile. Functionality toggles per builder
by payment tier; client portal toggles per client by desired interactivity.

## The market gap (researched 2026-08-03)

The market is barbell-shaped:
- **Low end:** Buildertrend (absorbed CoConstruct 2021), JobTread, Houzz Pro,
  Contractor Foreman — custom/remodel-centric, weak at production volume.
- **High end:** Hyphen BuildPro (21 of top 26 US builders), ECI MarkSystems,
  Constellation NEWSTAR/BuildTopia — heavyweight ERPs, brutal implementations,
  built for national builders.

**A builder doing ~100 homes/year (Brije: 70 spec + 30 custom) sits in the dead
zone between them.** Upstarts are sniffing this gap (e.g. Cornerstone PM markets
AI agents to 5–200 homes/yr builders) — the thesis is validated and unowned.
Hyphen HomeSight proves buyer-facing visual selection sells; nothing on the market
does generative, conversational design manipulation.

## Core theses

### 1. Self-feeding operations (the moat)
The #1 adoption killer in this segment is data entry the spreadsheet never demanded
(OCM failure — Brice's Chief Delivery Officer scar tissue). AI's first job is NOT
renderings; it's making the system feed itself: schedules updated from a
superintendent's texted photo, POs drafted from takeoffs, client updates written
automatically from job-site activity, estimates ingested rather than re-keyed.
The Design Studio is the showroom; the self-feeding ops layer is the moat.

### 2. One Job model, two lifecycles (spec + custom converge)
Spec and custom are both houses needing permits, materials, labor. Core entity:
**Job** (house on a lot) with plans, permits, schedule, budget, POs, inspections.
Differences are the front door and client intensity:
- Custom enters via sales → design → contract funnel, heavyweight client portal.
- Spec enters via community/lot/inventory pipeline, lightweight portal until a
  buyer attaches.
**"Spec home acquires a buyer at drywall" is a first-class state change**, not an
afterthought. One engine underneath. Model both from day one.

A **Job contains 1..n structures** (Jaggars build: house + shop with split
allowances and parallel scopes). Proven by Brije's own estimate.

### 3. The estimate is the genesis document (spine thesis)
From Brije's real estimate (7/23/2026, Jaggars residence): plan-based base price
("Modified 3172 Plan"), county fees, allowances, structural options, then an
upgrade list (Price / Approved-or-Disapproved). The Ocala portal's 60+ change
orders were loaded FROM the April estimate.
**Product spine: Estimate → Contract → Change Orders → Selections → Actuals** —
one continuous thread, not adjacent modules. Estimate ingestion (AI parse of
their existing Excel/PDF) is the on-ramp that avoids re-keying.

### 4. Allowances are a first-class entity
Brije's estimate carries ~$150K+ of allowances (well, septic, driveway,
landscaping, grading, filtration…) with notes like "Will not know until well is
tested." An allowance = placeholder with a reconciliation lifecycle:
estimated → actual → variance → client conversation. Today that lives in Eric's
head and email. **Allowance tracker with budgeted/actual/variance surfaced in the
client portal BEFORE it becomes a dispute** — the emotional center of the custom
relationship; no incumbent treats it that way.

### 5. Accretive selections (meet the Home Depot habit)
Brije selects like consumers: homedepot.com lookups, Floor & Decor SKUs, Delta
part numbers, SW paint codes — the estimate IS a selections record. There is a
de facto standards catalog in tribal knowledge ("Brije Standard Windmill Fan",
"Brije POH Standard", "Brije standard 3172").
**No upfront catalog build (OCM killer). Selections start as captured decisions**
— link (scrape title/image/price at capture), photo, or library pick — attached
to room + job with price + status (proposed / shown / approved). The structured
catalog ACCRETES from usage; AI normalizes in background; standards emerge from
repetition across estimates.

### 6. Photo library intelligence (the sleeper feature)
Brije has thousands of photos of their own completed work — a proprietary dataset
they can't search ("find the bigger fireplace photo" = a hunt). Bulk-ingest +
AI auto-tag (room, feature, style, materials, colors) + job provenance:
- Instant sales answers: type "fireplaces" → filterable wall of every Brije fireplace.
- Estimating intel: photo → its job → what that upgrade actually cost.
- Grounding corpus for the Design Studio (render "like this one WE built").
- Marketing inventory (galleries, social, spec listings via MyRealtyVault).
One ingestion, four products. Zero process change to adopt. Fastest wow.

### 7. Two studios, two personas (the design center split)
Clarified by Brice 2026-08-03: **Eric = architectural; Bridgette = interior.**
- **Bridgette's Studio (interior):** materials, finishes, palettes, room
  visualization, lookbooks, finish schedules. Maps to image-generation grounded in
  selections + tagged photo library. Track A: ships first, buys credibility.
- **Eric's Studio (architectural):** move walls, add rooms, exterior massing, lot
  placement. Requires a geometry layer — floor plans as structured data so a moved
  wall updates sqft and (eventually) cost; photoreal renders on top of geometry.
  Track B: the roadmap crown jewel and deepest moat; architect toward it from day
  one (floor plans enter as data early, never just PDFs).
BACKLOG's "AI Lot Analysis" and "3D Home Visualizer" are fragments of Eric's Studio.
Rendering/3D is not an Anthropic superpower — Claude orchestrates; a dedicated
tooling evaluation (image-gen APIs, parametric floor-plan engines) is its own
workstream before Studio build starts.
Roadmap theater: Studio ships with a **presentation mode** (full-screen, dark,
touch-first) so Eric's future sci-fi touchscreen wall is satisfied by CSS the day
he buys the hardware. His dedicated AI design room currently has no hardware.

### 8. Concierge is JSH doctrine, not a feature
The ❓ AI assist from MyRealtyVault (how-to answers + feature requests + bug
reports in one conversational surface) is the OCM answer and the requirements
engine — every "how do I" is a UX signal. Ships in MyBuilderVault day one.
Candidate for jsh-brain PATTERNS ("every Vault ships with the Concierge").

### 9. Tier toggles at birth
Builder-level feature entitlements (payment tier) and client-level portal toggles
(interactivity appetite) are schema-level concerns from script 001 thinking, not
a retrofit. Aligns with MyRealtyVault entitlements engine (board 66) — copy the
pattern when it lands there, per Rule of Three.

### 10. MyRealtyVault seam
Confirmed direction: **spec inventory → agent/listing pipeline.** Brije spec homes
flow to Brije Real Estate agents as inventory (status, photos, buyer handoff into
the client portal). Campaign Studio is the shared marketing engine (build
milestone → post; completed spec → listing). Deeper shared-identity integration
is future, not v1.

## Financial systems posture
No finance module. **Pull/push interface to external accounting** (system TBD —
Brije's back office unknown as of 2026-08-03). Depth of v1 integration undecided;
draws and lien waivers noted as the Florida pain point to revisit.

## Open unknowns (as of 2026-08-03)
- Brije's accounting system and books process
- Brije headcount / superintendents / active trade count (design for add/remove
  crews without assuming numbers)
- Whether subs will log in vs. SMS/email worksheet flows (bias: SMS-first adoption)
- ~~Brije estimate .xlsx (formulas/tabs)~~ RESOLVED 2026-08-04: no formulas — Eric keys every amount manually. No computation to replicate; ingestion is pure extraction, and the computed budget view is a genuine upgrade over his current process, not a replication of it
- Pricing tiers — deferred pending competitor pricing survey
