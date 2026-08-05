# MyBuilderVault — Releases

Release ritual (JSH DOCTRINE §1): (1) notes here on dev; (2) all Actions green
at the release sha; (3) DB change scripts run BY BRICE on the prod database
FIRST; (4) merge dev→main; (5) watch prod CI + Smoke + E2E to green.
Founder approval precedes the merge, always. Approvals are recorded in
release_approvals (Mission Control → Releases).

---

## R1 — Phase A Foundation (DRAFT — not yet released)

Target: first deploy of mybuildervault.com.

**Contents (dev, as of 2026-08-04):**
- React/Vite scaffold, navy/gold/cream design system, build stamp + build.json
- Builder login + magic-link fallback; staff invite rail + /accept-invite
- Entitlement-gated shell (resolve_entitlement, can_see_ticket_queue)
- Concierge intake stub (how_to / defect / feature_request, channel=concierge)
- Ticket dashboard (v_ticket_stats); Settings roster + invite
- Mission Control (Quality + Releases tabs, platform-staff gated)
- Static compliance pages (privacy / terms / about)
- CI / Smoke / E2E workflows; e2e-report + e2e-purge functions

**Prod DB change scripts to run, in order:** 001, 002, 002-patch, 003, 005, 004, 006, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016
(005 before 004 — 004 depends on the reconciled ticket_events shape.
Fresh-install path proven every push by the recalc-smoke CI job.)

**Prod prerequisites before merge:**
- DNS wired for mybuildervault.com (and .dev for TEST parity)
- PROD_E2E_AGENT_EMAIL / PROD_E2E_AGENT_PASSWORD secrets set
- Prod e2e agent + E2E Robot Builder org seeded on mybuildervault-prod
- E2E_REPORT_SECRET set on the prod Netlify site (NEW value, never dev's)
- grant_platform_owner run for Brice on prod after his first prod signup
