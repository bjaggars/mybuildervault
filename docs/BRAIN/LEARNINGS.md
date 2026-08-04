# MyBuilderVault — Learnings
Last updated: 2026-08-03

Hard-won lessons from building the Ocala portal. Each has a root cause and a rule.
Cross-product lessons live in jsh-brain/DOCTRINE.md — these are MBV-specific.

---

## 1. Debounced saves drop data on fast navigation
**Incident:** Documents uploaded by admin were visible locally but not to other users.
**Root cause:** `saveDoc()` called `scheduleCloudSave()` (1.5s debounce). File upload
takes time; if the user navigated away or closed the modal quickly, the Firestore write
never fired. The Storage upload succeeded (file was there) but the metadata record
never landed in Firestore. Other browsers' `onSnapshot` listeners never received the update.
**Rule:** For any user-initiated create/update that completes a multi-step flow (especially
ones involving async uploads), write directly to Firestore with `await BUILD_DOC.set()`
immediately after the operation. Do not rely on a debounce for critical writes.
**Fixed:** 2026-08-03. `saveDoc()` and `deleteDoc()` now `await BUILD_DOC.set({ documents }, { merge: true })` directly.

---

## 2. Secrets in client-side JS on a public repo
**Incident:** Firebase config (API key, project ID) and admin password hardcoded in
`index.html`. When the portal was added to the public `mybuildervault` repo as a reference,
these were exposed.
**Root cause:** Single-file HTML app had no way to use env vars. Everything was inline.
**Rule:** Never commit secrets to any repo, public or private. For the product (React/Vite
+ Netlify), all secrets go in Netlify env vars (Functions scope), never in the codebase.
**Mitigation:** Redacted both in the `ocala-portal/index.html` committed to this repo.
Live deployment still has real values inline — acceptable for a private Firebase test-mode
project, but the pattern must never carry forward to the product.

---

## 3. Firebase Security Rules expire in test mode
**Incident:** After the 30-day test mode window, Firebase Security Rules expired.
Any browser other than Brice's (which may have had a cached auth state) showed
"Sync failed and will retry." The portal appeared to work for the owner but was
broken for all other users.
**Root cause:** Firebase console default for new Firestore databases is test mode with
an expiration date. Easy to miss; shows no warning in the portal UI.
**Rule:** For any Firebase project used in a real demo: immediately after creation,
set permanent rules (`allow read, write: if true;` for open access, or proper auth-gated
rules). Never rely on test mode past the first week.
**Status:** Outstanding as of 2026-08-03. BOARD-001.

---

## 4. Single-document Firestore = no multi-tenancy possible
**Incident:** Not an incident — a structural limit acknowledged upfront.
**Root cause:** The entire Ocala portal's state lives in one Firestore document
(`builds/ocala`). This was the fastest path to a working proof but means the
architecture cannot support multiple tenants without a complete rewrite.
**Rule:** The product builds on Supabase with proper row-level security from day one.
The portal's single-document model is explicitly a prototype decision, not a pattern
to replicate.

---

## 5. Script/link tags merged by str_replace cause catastrophic rendering bugs
**Incident:** The SheetJS `<script>` tag and the favicon `<link>` tag were merged
into a single malformed line during an edit. The browser interpreted part of the
favicon SVG as a script src attribute and rendered a giant house emoji as a full-page
background image.
**Root cause:** `str_replace` tool editing adjacent lines in a single-file HTML app.
Verify-after-write was not applied — the merged line wasn't caught before commit.
**Rule:** Verify-after-write on every edit. For HTML, always `grep` the affected
lines after a replacement to confirm the output is valid. `node --check` catches JS
syntax but not HTML structural issues — visual QA catches the rest.

---

## 6. "Supabase v2 schema" claim was for a different project
**Incident:** Session handoff notes carried a claim that MyBuilderVault had a
"Supabase v2 schema (parallel, verified), front-end rebuild pending." This was
incorrect — that claim applied to the Pensacola RV estate portal (a separate chat,
separate project), not to the Ocala portal or MyBuilderVault.
**Root cause:** Conversation memory synthesized across multiple project contexts.
**Rule:** Code wins over conversation memory. The 2026-08-03 codebase audit found
zero Supabase references in the Ocala portal. STATE.md reflects the code, not the
summary.

---

## 7. Excel export must match the builder's own format exactly
**Learning:** First attempt at Excel export used a multi-column format with category
groupings, priority, and notes — looked like a data dump. Brije's own estimate PDF
used a simple 3-column format: Item Description / Price / Approved or Disapproved.
**Rule:** Survey how the target user already works before designing output formats.
The builder already has a document format they use with clients and subcontractors.
Match it exactly — don't make them translate.
**Applied:** Excel export was rebuilt to match Brije's PDF format column-for-column.

---

## 8. Rich text email requires Copy-then-Paste — mailto cannot carry HTML
**Learning:** Multiple iterations trying to make "Open in Email App" send formatted HTML.
No browser API can inject HTML into a native mail client via mailto: — the protocol
only supports plain text in the body.
**Rule:** For Outlook users (primary target for builder market), the correct UX is:
(1) Copy Rich Text button copies HTML to clipboard, (2) user opens Outlook and pastes.
Platform-sent email (comms rail, Resend) is the only path to reliably formatted email
without clipboard friction. Build the comms rail early in the product.

---

## 9. "Prove-it numbers not captured" is a live defect, not a formality
**Incident:** Script 003 was amended pre-run, but the version actually executed on
dev was the pre-amendment one. Because the prove-it output was never captured, the
gap stayed invisible until the E2E robot hit "Could not find the 'channel' column"
— three sessions later. A second recollection error ("004 was the tickets one")
compounded it.
**Root cause:** Run-confirmation by memory instead of by prove-it output. The
prove-it query exists precisely to make "which version ran" a fact, not a memory.
**Rule:** A DB change script is not RUN until its prove-it row is in the chat.
STATE records scripts without captured prove-its as UNVERIFIED, and reconciliation
scripts (005 pattern) converge idempotently rather than assuming any prior shape.
