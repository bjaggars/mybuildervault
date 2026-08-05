# MyBuilderVault — Comms Rail (BOARD-007)
Status: CODE SHIPPED 2026-08-05 · ACTIVATION pending Brice console work
Pattern: copy-adapt from MyRealtyVault (jsh-brain PATTERNS §1, Rule of Three)

No §8 step-back brief was opened for this subsystem: the comms rail is a
canonical JSH pattern with a reference implementation — the design research
already happened on MRV and is distilled in PATTERNS §1. This file records
the MBV-specific adaptations instead.

## What shipped
- **Script 016** — `comm_events`: the platform email record. Org-scoped with
  optional job / contact / ticket linkage. RLS at birth; **zero write
  policies by design** — the service role (function layer) is the only
  author, humans cannot forge rail records (same doctrine as actor-less
  auto_response events). `visibility` column ('org'|'participant') scopes a
  future client-portal feed from birth.
- **`_relay.mjs`** — relay domain `log.mybuildervault.com`; party-aware
  emails + salutations (household "Rob & Dana", entity greets the human);
  comm-event logger (best-effort, never blocks a send); branded navy/gold
  email shell shared by the whole send family.
- **`send-email.mjs`** — org-seat-verified staff → contact sends. Party
  fan-out (all members), From `"<Org> via MyBuilderVault"
  <share@mybuildervault.com>`, Reply-To the contact's relay address,
  outbound comm_event logged in the same breath. Optional `jobId` links the
  record to a job — validated against job_participants.
- **`inbound-log.mjs`** — Resend inbound webhook (`?k=INBOUND_LOG_KEY`).
  Relay branch runs BEFORE sender attribution: logs INBOUND on the card and
  forwards to owner/admin seats with reply-to the client. BCC branch
  attributes the org by the sender's seat email and files on matched cards.
  Always 200 (retry-storm proof); metadata-thin events retrieved by
  email_id with the full-access key (MRV 8/1/26 lesson baked in).
- **`ticket-notify.mjs`** — system auto-acks on creation + resolution:
  actor-less `auto_response` ticket_events via service role, idempotent per
  (ticket, event) via an `[auto:<event>]` marker, email rides the rail when
  Resend is configured and **degrades gracefully** (event still lands,
  `emailed:false`) when it isn't. Templates live in function code, never
  the DB. Wired: Concierge fires the creation ack best-effort after filing.
  CLOSES the STATE open item from scripts 003/004.
- **Auth templates** — `supabase/email-templates/` 4-template branded set
  (invite / magic-link / reset / email-change) + README with subjects.
- **Surfaces** — JobDetail **Comms panel** (law #15 full: sort every
  header, filter every column, Clear; direction pills; empty state teaches
  the rail). Golden path 6 extended to assert it.
- **Quality** — `smoke-comms.mjs` 14/14 (mocked network, REAL handlers:
  auth, config-fallback, fan-out, relay format, BCC attribution,
  idempotence, no-Resend fallback); CI step added. smoke-api gained
  contract checks for all three functions (503 accepted as the legitimate
  pre-config state). Chain 001→016 proven fresh (23/23 recalc smoke). RLS
  spot-check on scratch: member reads, human insert denied, stranger blind.

## MBV-specific adaptations (vs. the MRV reference)
1. **comm_events replaces interactions** — MRV logs to a CRM interactions
   table; MBV's record is job-centric with ticket linkage, because the
   consumers here are schedule notices, ticket acks, and the client portal.
2. **Relay forwards to owner/admin seats** (MRV forwards to the contact's
   owning agent) — builder orgs have no per-contact owner yet; revisit if a
   contact-owner concept lands.
3. **Ticket acks are first-class** — MRV's rail predates the ticketing
   doctrine; MBV wires acks day one.
4. **AI quote-splitting (MRV 86B) deferred** — v1 BCC capture logs the
   outbound; the quoted-client extraction is a follow-up tier (best-effort
   by doctrine when it lands).

## Open rulings for Brice
- **R1 · Relay forward audience:** owner + admin seats (current) vs. the
  job's PM when the card maps to a job. Current = safe default.
- **R2 · Client visibility:** which comm_events (if any) surface in the
  Phase-C client portal — the `visibility` column awaits the ruling.
- **R3 · Resolution ack trigger:** fires via ticket-notify when a ticket
  status UI ships (none exists yet — dashboard is read-only). Wire then.

## Activation checklist (Brice — nothing sends until these exist)
1. Resend: verify domain `mybuildervault.com`; enable inbound on
   `log.mybuildervault.com` (MX per Resend docs) with webhook →
   `https://mybuildervault-dev.netlify.app/.netlify/functions/inbound-log?k=<key>`
   (repoint to mybuildervault.dev once DNS lands).
2. Keys: full-access Resend key per site, named `mybuildervault-dev-full`
   (prod key at first release). Netlify env vars on the dev site:
   `RESEND_API_KEY` (Functions scope, secret) + `INBOUND_LOG_KEY` (plain
   alphanumeric — no `+ & =`, DOCTRINE §4). **Redeploy to bake in.**
3. ImprovMX: forward support@ / noreply@ / share@ → Brice's inbox.
4. Supabase (mybuildervault-dev): custom SMTP → Resend
   (noreply@mybuildervault.com, sender name MyBuilderVault); paste the four
   templates per supabase/email-templates/README.md.
5. Run script 016 on mybuildervault-dev; run the seed comms addendum on
   jaggars-dev (both pasted in chat per §10).

## Follow-ups (BOARD-007 tail)
- Send-email compose UI (needs a job-participants surface to hang on).
- Schedule notices (BOARD-032 dependency now unblocked): publish/shift
  events → rail emails to participants — its own small session.
- Report scheduling/email (BOARD-030 open item) rides this rail.
- AI quote-splitting on the BCC branch (MRV 86B parity).
- MRV-style contact thread view (comms by contact, not just by job).
