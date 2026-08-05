# MyBuilderVault — Persona Doctrine (PROPOSED 2026-08-04, awaiting Brice approval)

Personas are defined by the QUESTION they wake up asking, not by their RLS role.
RLS roles are the access mechanism; personas are the information contract. One
seat can hold several personas (a small builder's owner IS the PM and the
salesperson). The UI serves the persona; the database serves the role.

Root critique this doc answers (Brice, 8/4/26): dashboards to date decorated a
single generic persona. "Owner should see margins, forecasting, sales." Correct.

---

## P1 · OWNER — "Am I making money, and what's coming?"
The business view. A stock-ticker density is appropriate here: numbers, deltas,
trends, small multiples. Never a to-do list — owners delegate tasks; they watch
money and momentum.

Dashboard contract:
- **Margin board** (per active job + rolled up): revised client price vs cost
  to date vs forecast cost at completion; margin $ and %; trend sparkline of
  cost burn. ⚠ DATA GAP: estimate_lines carry CLIENT PRICE only. True margin
  needs an internal COST basis per line (est. cost at contract) so forecast =
  contract cost + approved CO cost + allowance actuals. → SCRIPT 011:
  `cost` column on estimate_lines + change_order_lines. Until then the board
  shows a PROXY (revised price − actuals to date) and labels it as proxy.
- **Exposure strip**: open allowance exposure (Σ budgeted where status open/
  quoted), unresolved variance (Σ variance where not reconciled), COs approved
  awaiting build (Σ), pipeline value (Σ presented-estimate totals). ✅ feedable
  today.
- **Sales & conversion**: leads count, presented value, presented→accepted
  conversion rate, avg days lead→contract (from job_events timestamps). ✅
  feedable today; thin until real data accumulates.
- **Trends**: 90-day sparklines — actuals/week, pipeline count by week,
  revised-price drift on flagships. ✅ timestamps exist (created_at,
  incurred_on, job_events.created_at).

## P2 · PM — "What decides today, and what's drifting?"
The execution view (today's dashboard is closest to this). Decisions due
(selection deadlines, considering COs), conditions before they detonate,
per-job variance burn, structure-scoped punch of financial motion.

## P3 · SALES — "Who's next, and what's stalling?"
Funnel view: lead/design/contract counts and value, presented estimates aging
(days since presented, no answer), next-touch list. Feedable today except
next-touch (needs a follow-up field or activity log — later).

## P4 · ADMIN — "Is the machine healthy?"
Roster, invitations, ticket SLAs (avg first response — exists in
v_ticket_stats), entitlements. Mostly exists across Settings/Tickets.

## P5 · CLIENT — "Is my house okay, and what do I owe a decision on?"
Phase C portal. Their build's story: status, what they've approved, allowance
amounts (variance only when revealed), selections awaiting them, decision
deadlines. Emotional register: reassurance + agency, never a ledger dump.

---

## Dashboard routing rule (AMENDED 8/4 per Brice)
Personas define DEFAULTS, not prescriptions. Model:
- **Widget catalog**: every dashboard panel is a registered widget (id, title,
  personas it serves, minimum role, data contract). Margin board, exposure
  strip, sales funnel, burn chart, pipeline, needs-attention, ticket stats,
  money-in-motion — all catalog entries.
- **Persona defaults**: role→persona mapping (owner→P1, pm/super→P2, sales→P3,
  admin→P4) selects the starting widget set + order.
- **Seat-scoped customization**: an edit-dashboard mode lets the user add,
  remove, and reorder widgets from the catalog (filtered to their role's
  ceiling). Choices persist in org_members.dashboard_prefs (jsonb) — per seat,
  so one person can run different layouts at different orgs. Reset-to-persona-
  default always available.
- Widgets a role cannot feed (e.g. margin for a seat without financial read)
  never appear in that seat's catalog.
Small-builder reality preserved: the owner-who-is-also-the-PM adds P2 widgets
onto the P1 canvas rather than switching back and forth.

## Immediate build order (pending approval)
1. Script 011 — cost basis + dashboard prefs: `cost numeric(12,2)` on
   estimate_lines + change_order_lines (contracts snapshot picks it up
   automatically; margin becomes real, not proxy), AND
   `dashboard_prefs jsonb` on org_members (seat-scoped widget layout).
2. Owner dashboard (P1) — margin board, exposure strip, sales/conversion,
   sparkline trends. Stock-ticker density. Charting via recharts (adds a
   dependency — approved stack addition?).
3. PM dashboard (P2) — evolve today's dashboard into the P2 contract.
4. Persona switcher in shell.

## Open decisions for Brice
- APPROVE personas P1–P5 as the doctrine (edits welcome — this is proposed).
- APPROVE script 011 (cost columns) — prerequisite for honest margin.
- APPROVE recharts as a stack addition (vs hand-rolled SVG sparklines).
- Design language: consider a dedicated design pass (Claude Design) for the
  P1 visual system — ticker density is a different aesthetic than the current
  card grammar and deserves deliberate art direction, not incremental drift.
