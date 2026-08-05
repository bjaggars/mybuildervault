# MyBuilderVault — Persona Doctrine v2 (APPROVED by Brice 2026-08-04)

Personas are defined by the QUESTION each wakes up asking, not by RLS role.
RLS is the access mechanism; personas are the information contract. One human
can hold several personas (small-builder reality). Researched against
mid-market builder org structures, incumbent role models (Buildertrend:
internal roles / subs-vendors with fixed narrow permissions that never see
internal costs / client portal), and real builder job postings.

Scope tiers: CORE = first-class login + surfaces. ADJACENT = limited login or
interface. RECORD = modeled as data, no login.

## A. Ownership & management
1. Owner/Principal — "Am I making money, what's coming?" Margin, exposure,
   forecast, pipeline. CORE (P1 dashboard specced).
2. General Manager / VP Construction — cross-job health, escalations. CORE
   (mid-market; small builders = owner).
3. Controller/Bookkeeper — job costing, actuals, WIP, draw schedules, export
   to accounting. CORE for visibility; ledger stays external (finance posture).
4. Accounts Payable — sub invoices matched to work orders/POs, lien-waiver
   gate before payment (FL pain). ADJACENT v1 → CORE later.
5. Payroll admin — processing OUT; TIMESHEETS per job/cost-code are CORE
   (job costing, not payroll).

## B. Office & pre-construction
6. Office Manager/Admin — roster, docs, sub insurance/license expiry,
   tickets. CORE (P4 expands).
7. Estimator — takeoffs, cost basis (011), vendor pricing history, estimate
   authoring. CORE.
8. Purchasing/Procurement — POs, quotes, deliveries. ADJACENT v1; CORE at
   purchasing revisit.
9. Permit/Compliance Coordinator — permits, NOCs, inspections per job.
   CORE-lite (permits panel on jobs).
10. Legal/Outside Counsel — contract snapshots, CO history. RECORD +
    read-only doc access.

## C. Sales, design & client care
11. Sales/New-Home Consultant — funnel, stalls. CORE (P3).
12. Selections/Design-Center Coordinator — selection pipeline, deadlines,
    allowance alignment. CORE (selections schema already serves it).
13. Marketing — spec inventory, photos, communities. ADJACENT (feeds future
    campaign engine).
14. Warranty Coordinator/Service Tech — claims on closed jobs, punch and
    orientation walks. CORE — rides the ticket engine org-side; `warranty`
    job status already anticipates it.

## D. Field operations (internal)
15. Superintendent/Foreman — daily logs, schedule, WORK-ORDER dispatch,
    inspections, photos, crew timesheets. CORE — currently the biggest
    surface gap (super role exists in RLS, almost no UI).
16. Crew Lead / Crew Member — mobile-first: today's work orders, scoped
    plans/specs, photos, clock in/out vs job + cost code. CORE. Discipline is
    an ATTRIBUTE (sitework, foundation/concrete, framing, roofing, masonry,
    electrical, plumbing, HVAC, insulation, drywall, paint, trim, flooring,
    tile, cabinets, low-voltage, gutters, landscape/irrigation, pool,
    well/septic, punch/clean), driving which work orders and specs they see.
17. Safety Officer — incident log, toolbox talks. ADJACENT, not v1.

## E. External trade partners
18. Subcontractor Principal — bids, awarded scopes, schedule, work orders,
    invoice submission, doc/insurance upload. CORE external. Fixed narrow
    permissions; NEVER internal costs (incumbent-validated contract).
19. Sub Field Crew — work order + schedule + plans only. CORE-lite.
20. Vendor/Supplier — POs/deliveries. RECORD v1 → ADJACENT with POs.

## F. External professionals
21. Architect/Designer — plan versions, RFIs, revisions. ADJACENT (per-job
    invite; strategic for the Studio/geometry track with Eric).
22. Engineer (structural/geo) — same shape. ADJACENT.
23. Lender/Draw Inspector — draw package completeness, progress photos,
    sign-off. ADJACENT — high FL/custom value; pairs w/ draws + lien-waiver
    revisit.
24. Building Inspector/Municipality — RECORD (results logged by super).
25. Real Estate Agent — listing (specs) / buyer's (customs). ADJACENT;
    participant role exists; the MyRealtyVault handshake persona (Wendy).
26. Title/Closing Agent — RECORD.

## G. Client side
27. Client (primary/co) — their build's story. CORE (P5, Phase C portal).
28. Owner's Representative — client-shaped access, flagged as rep. ADJACENT.

## Structural implications (build order inputs)
- org_members roles expand: + estimator, selections, warranty, field,
  accounting, office (constraint change → script 011 scope).
- job_participants roles expand: + architect, engineer, lender, owners_rep
  (011 scope).
- WORK ORDERS become a named v1.x subsystem: the field-dispatch spine.
  Assignable to internal crews OR subs; scoped job + structure + cost code;
  the artifact AP matches invoices against.
- TIME ENTRIES (timesheets) v1.x: person, job, cost code, hours — job
  costing input; payroll processing stays external.
- Warranty claims ride the ticket engine (org-side type/queue), not a new
  subsystem.

## Dashboards
Personas define DEFAULTS over a customizable WIDGET CATALOG; users add/
remove/reorder; layout persists per seat in org_members.dashboard_prefs
(011). Reset-to-default always available. Widgets a role cannot feed never
appear in that seat's catalog. First five dashboards: P1 owner (specced, POC
approved direction), P2 PM, P3 sales, P4 admin, P5 client — now understood as
the first five of this larger cast.
