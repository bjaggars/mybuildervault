# Day in the Life — Build Doctrine (Brice, 2026-08-05; ADOPTED)

## The principle
**Build to what actually happens every day.** The unit of product delivery
is not a feature and not a persona — it is a walkable day-in-the-life loop:
one complete cross-persona conversation, testable end to end the moment it
ships. A feature is done when the people in the loop can live their real
morning through it. Partial functionality is untestable because nobody's
day is partial.

Corollaries:
- Every loop ships with its CAST pre-seeded on dev (one seat/identity per
  persona in the loop) so both sides are walkable in the sandbox instantly.
- Every loop gets a golden path the robot walks and testing cards Brice
  walks. "Walk it before the walker" applies to the whole loop, not a
  screen.
- main advances only by whole conversations — a release train is a loop,
  never half of one.
- Persona surfaces are designed from the narrative first ("what does this
  person wake up asking?" — PERSONAS.md), then the screens.

## Loop order (APPROVED 8/5 — under joint re-cut 8/14)
**8/14: JOURNEY.md filed** — the full lead→warranty map (23 scenarios,
stages A–E). Loops below cover stages D–E; stages A–C (the front door:
lead, paid design, contract/pre-con) are the unbuilt territory and the
AI Design Center's journey position moved to the sales funnel (rows 7–9).
Build order is being brainstormed together against the journey map —
these loops stand until the re-cut is ratified.

### Loop 1 — Internal field dispatch (opens next session)
*The super's morning:* Coffee, phone. Today view: every WO across his jobs,
weather risk, what's due. He dispatches the framing WO for Anderson Lot 4 —
born with its 8 checklist steps (templates). The crew lead's phone shows
today's work orders, scoped plans, the checklist. Steps tick through the
day; photos attach from the slab. By afternoon the drift detector has
nothing to say — which is the point. The owner's dashboard health card
stays green without anyone writing a status report.
Pieces: WO notices on the rail · checklist templates · super day view ·
crew mobile view (discipline-scoped) · photos on WOs · Gantt arrows
(demo polish rides along). PERSONAS: #15 super (biggest surface gap), #16
crew. FIELD-SPINE brief already APPROVED — no new §8 gate.

### Loop 2 — The sub loop
*The sub's Tuesday:* A text lands: "Framing WO — Anderson Lot 4, starts
Thu." One tap on the magic link — no password, no IT, zero-DNS doctrine —
into exactly his scope: his WOs, his schedule, his checklists, his docs.
Never other trades' pricing, never internal costs (incumbent-validated
contract, PERSONAS #18/#19). He confirms, works, marks steps; the super
watches it move without a phone call.
Pieces: sub portal (magic link) · WO sent-to-sub messages on the rail ·
scoped RLS surfaces. **§8 GATE: magic-link auth step-back brief required
before code** (scoping patterns, expiry, revocation, Buildertrend sub
access model).

### Loop 3 — The client loop
*The homeowner's evening:* She opens her build's story: the published
schedule (client-visible detail level), her selections with deadlines, the
budget view the builder chose to publish. She approves the lanai T&G change
without an email chain. RLS read paths shipped in 014 — this loop is
surface work + publish controls. **§8 GATE: client portal brief (what
builders actually publish vs hide; incumbent client-portal contracts).**
PERSONAS #27/#28.

### Loop 4 — Office & money
*The office's month:* Estimator authors from cost basis (011); selections
coordinator runs the pipeline against allowances; warranty claims ride the
ticket engine on closed jobs; timesheets land per job/cost-code; P2–P4
dashboards from the widget catalog. PERSONAS §B/§C + structural
implications block.

After Loop 4: ADJACENT tier (AP w/ lien-waiver gate, lender draw view,
architect/engineer per-job invites) per PERSONAS scope tiers.

## Relationship to existing queue
The yellow queue (schedule/WO notices, checklist templates, Gantt arrows)
is absorbed INTO Loop 1 — nothing is displaced; the loop is the yellow
queue plus the surfaces that make it walkable.
