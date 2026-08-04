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
- `STATE.md` — honest current state: what works, what's half-done, what's aspirational
- `BOARD.md` — active work items and priorities
- `BACKLOG.md` — captured ideas and future work
- `ROADMAP.md` — sequenced build plan with environments checklist
- `LEARNINGS.md` — hard-won lessons specific to this product
- `JSH.md` — pointer to cross-product doctrine
- `ERIC-MEETING.md` — prep for Brije licensing conversation

## Session protocol
1. Clone repo with fresh fine-grained PAT (Contents RW + Issues RW + Actions RW)
2. Read this BRAIN first — all files, not just STATE
3. Consult jsh-brain for process questions
4. Update BRAIN in the same commits as the work
5. Never push to main — dev branch only; main moves via release ritual

## Key distinction (read every session)
**OCALA PORTAL** = the single-file Firebase app running Brice's own home build.
Live at jaggars-ocala-build.netlify.app. The eat-our-own-dog-food proof and Eric demo vehicle.

**MYBUILDERVAULT** = the product Brije would license. Multi-tenant, real auth, Supabase + RLS,
React/Vite, JSH doctrine stack. Greenfield rebuild — not yet started as of 2026-08-03.

The portal IS the UX reference. It is NOT the product.
