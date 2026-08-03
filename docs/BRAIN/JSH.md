# JSH Doctrine Pointer

Cross-product engineering doctrine lives at: github.com/bjaggars/jsh-brain

## Files to read every session
- `README.md` — precedence rules, Rule of Three
- `DOCTRINE.md` — non-negotiables: branches, DB change scripts, testing tiers,
  code discipline, compliance, session protocol, culture
- `PATTERNS.md` — comms rail, identity layering, capture loop, Mission Control,
  deploy preflight, render engine, Campaign Studio, compliance surface, external feeds
- `STACK.md` — standard kit: React/Vite, Netlify, Supabase, Resend, Cloudinary,
  Anthropic, Stripe, plus the new-product environments checklist

## MyBuilderVault adoption status (as of 2026-08-03)

| Doctrine item | Status |
|---|---|
| dev/main branches + release ritual | dev branch created ✅; release ritual not yet needed (no CI/CD yet) |
| DB change scripts (NOTIFY + prove-it + RLS at birth) | Not started — no Supabase yet |
| Three testing tiers | Not started — no tests exist |
| Comms rail (Resend, platform-sent) | Not started |
| Identity layering (person/card/participant) | Not started |
| Capture loop (feature_requests + GitHub Issues) | Not started |
| Mission Control (Quality + Releases) | Not started |
| Deploy preflight + version stamp | Not started |
| Render engine (@resvg) | Not started — needed for Campaign Studio integration |
| Campaign Studio | Not started — cross-product opportunity with MyRealtyVault |
| Public compliance pages | Not started — required before external submissions |
| External data feeds (MLS) | Not started — future phase |
| Session PATs (Contents RW + Issues RW + Actions RW) | Adopted ✅ 2026-08-03 |
| Secrets in env vars, never in repo | Adopted ✅ (portal reference is redacted) |
| Verify-after-write | Adopted ✅ (standing rule this session) |
| "DB change scripts" not "migrations" | Adopted ✅ |
| Scrolling is not your friend | Adopted ✅ (design law, all MBV pages) |

## Rule of Three reminder
Copy reference implementations from MyRealtyVault (github.com/bjaggars/myhomevault).
Do NOT invent parallel versions. Extract a true shared package only when a THIRD product
needs the same thing. Copy-paste + shared doctrine is the fast, safe road.

## Documented exceptions to JSH doctrine
None yet. When MBV diverges from doctrine intentionally, document it here with reasoning.
