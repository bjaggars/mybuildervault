# MyBuilderVault BRAIN

Source of truth for all MyBuilderVault product facts.  
Last distilled: 2026-08-03  
Distilled by: Claude (Sonnet 4.6) from Ocala portal chat history + codebase inventory

## Precedence
- **JSH Brain** (github.com/bjaggars/jsh-brain) governs HOW we build — process, patterns, stack.
- **This BRAIN** governs WHAT this product is — state, board, backlog, roadmap.
- **Code wins** over conversation memory when they disagree.
- **BRAIN wins** over conversation memory for product facts.

## Files
- `README.md` — this file; orientation and precedence rules
- `VISION.md` — why the product wins: category claim, market gap, core theses
- `ARCHITECTURE.md` — BOARD-012 architecture & phasing proposal (PROPOSED, awaiting approval)
- `STATE.md` — honest current state: what works, what's half-done, what's aspirational
- `BOARD.md` — active work items and priorities
- `BACKLOG.md` — captured ideas and future work
- `ROADMAP.md` — sequenced build plan with environments checklist
- `LEARNINGS.md` — hard-won lessons specific to this product
- `JSH.md` — pointer to cross-product doctrine
- `FIELD-SPINE.md` — field spine step-back brief (work orders/super/crew; APPROVED 8/5)
- `SCHEDULE.md` — schedule engine step-back brief (APPROVED 8/5; 014 pending)
- `BRIJE-MEETING.md` — prep for the Brije leadership meeting (licensing conversation; Eric design-AI segment)

## Session protocol
1. Clone repo with fresh fine-grained PAT (Contents RW + Issues RW + Actions RW)
2. Read this BRAIN first — all files, not just STATE
3. Consult jsh-brain for process questions
4. Update BRAIN in the same commits as the work
5. Never push to main — dev branch only; main moves via release ritual
6. DB change scripts are PASTED IN FULL IN CHAT at delivery, not just
   committed — Brice runs from the chat, no repo hunting (adopted 2026-08-04)
7. Every new surface ships with stub/demo data — extend
   supabase/seeds/dev-stub.sql in the same session so functionality is
   visible on the sandbox immediately (Brice, 2026-08-05)

## Key distinction (read every session)
**OCALA PORTAL** = the single-file Firebase app running Brice's own home build.
Live at jaggars-ocala-build.netlify.app. The eat-our-own-dog-food proof and Eric demo vehicle.

**MYBUILDERVAULT** = the product Brije would license. Multi-tenant, real auth, Supabase + RLS,
React/Vite, JSH doctrine stack. Greenfield rebuild — not yet started as of 2026-08-03.

The portal IS the UX reference. It is NOT the product.

## Founder build map (dev-only surface)
`src/pages/Progress.jsx` renders an owner-only "Build Progress" tab on dev
hosts only (netlify.app/localhost hostname gate — self-retiring on the prod
domain). Sessions that ship or start a module UPDATE ITS MODULES TABLE in
the same commits as the work, so Brice's map never lies. BRAIN remains the
source of truth; the tab is the view.

