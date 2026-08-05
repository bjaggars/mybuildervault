# MyBuilderVault — Learnings
Last updated: 2026-08-05

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

---

## 10. Void-returning admin functions fail silently — make them speak
**Incident:** grant_platform_owner (002) matched email case-sensitively and
returned void. Run before the auth user existed, it matched zero rows,
"succeeded," and granted nothing — the founder hit "No workspace yet" instead
of Mission Control.
**Rule:** Admin/one-shot functions raise on zero effect and RETURN a
human-readable result. Case-insensitive email matching everywhere emails are
compared. Fixed in script 006.

---

## 11. Design law: no voids — rows are columns, not two poles
**Feedback (Brice, 2026-08-04):** list rows with content flush-left and a lone
badge flush-right leave a dead gap across wide screens — "high school
programming project." Rule: wide list rows are columnar grids filled with the
information the user actually scans (client, location, status, recency), with
a header row. Sibling law to "scrolling is not your friend"; candidate for
graduation to jsh-brain PATTERNS.

---

## 12. Design law: every count is a door
**Feedback (Brice, 2026-08-04):** any box showing a count must be clickable
through to the details behind the count. A number you can't open is a dead
end. Applied to dashboard stat cards, pipeline rows, money-in-motion rows,
attention items. Candidate for jsh-brain PATTERNS alongside #11.

---

## 13. The going-through-the-motions failure mode (SESSION-DEFINING — graduated to jsh-brain DOCTRINE)
**Incident (8/4-8/5/26):** Dashboards and personas were built as the
next-obvious-increment: five access-tier personas, a card-grammar dashboard,
no customization. Brice forced a step-back; research grew the persona list
5 → 28, surfaced work orders + time entries as missing subsystems, and
exposed that dashboard customization — table stakes since the dawn of
software — was absent from our design entirely.
**Root cause:** local momentum. Building the increment the last increment
implies, instead of asking what the best product on the market does and what
the level beyond that looks like.
**Doctrine (see jsh-brain):** (1) North star = most advanced platform on the
market; incumbent parity is the FLOOR. (2) Step-back checkpoint at every new
SURFACE or SUBSYSTEM boundary: domain research + incumbent table-stakes
audit before design. (3) Rich UI is a requirement, not polish. (4) The
trigger loop: when a design feels like filling in a template, stop — that
feeling is the signal.

---

## 14. Chat-pasted scripts must be GENERATED from the committed file, never retyped
**Incident (8/5/26):** Script 013 was committed correctly, then re-typed into
chat for Brice to run. The final prove-it column got mangled in transcription
(`where tg_op is null`), the batch errored at line 442, and the whole
transaction rolled back — zero DDL applied despite 440 correct lines.
**Root cause:** the chat paste was authored a second time instead of copied
from the verified file. Two sources of truth, one keyboard.
**Rule:** the chat delivery of a DB change script is produced by cat-ing the
committed file and pasting THAT output — byte-identical, checksum noted.
If chat and file ever diverge, the file wins and the chat paste is
regenerated, not patched by hand.

---

## 15. Design law: grids sort and filter (candidate for jsh-brain §9)
**Feedback (Brice, 2026-08-05):** the field board shipped as a columnar grid
with a header row (law #11 honored) but no click-to-sort and no job filter —
he could not answer "show me the board for one job," the most basic question
a dispatch board exists to answer.
**Root cause:** §8 slippage inside a single surface: the grid grammar was
copied without the interactivity every grid has had for decades.
**Rule (amended same day per Brice):** every columnar grid ships with
(a) click-to-sort on every header, ascending/descending toggle, and (b) a
filter row with a control for EVERY column — text-contains for free text,
selects for enumerables — plus a one-click Clear. "Primary dimensions" was
the first draft; ALL columns is the standard.
A grid you cannot sort or filter is a screenshot, not a tool. Sibling to
#11 (no voids) and #12 (every count is a door).

---

## 16. The migration chain is a product: prove fresh-install every push
**Incident (8/5/26, schedule session):** the new recalc smoke's first step —
applying the REAL chain 001→014 to an empty Postgres — failed at 006:
`create or replace` cannot change a function's return type, and 006 changes
grant_platform_owner from void (002) to text. Dev never saw it (002 ran long
before 006), but the FIRST PROD RELEASE runs 001..NNN in order on an empty
database and would have died mid-ritual.
**Root cause:** every script was only ever proven against the accumulated
dev state, never against the from-zero path prod will actually take.
**Rule:** scripts/smoke-recalc.mjs applies scripts/pg-shim.sql (Supabase
env shim: auth schema, auth.uid(), platform roles) + the full committed
chain to a scratch database on EVERY push (CI job `recalc-smoke`). A chain
that only applies incrementally is not release-ready. Fixed 006 with
drop-then-create (idempotent; no-op in effect on dev).

---

## 17. Triggers steal the reasoned recalc — engine functions own their cascade
**Incident (8/5/26):** first recalc-smoke run, scenario 3: shift_schedule_item
updated start_date, the row trigger cascaded immediately with a NULL reason,
and the function's own reasoned recalc then found nothing left to move —
"one change, one reason" silently recorded no reason. 18/19, and exactly the
kind of quiet failure the smoke exists for.
**Rule:** engine functions (shift/import/publish) set a transaction-local
GUC (`mbv.suppress_recalc`) before their writes; the cascade triggers stand
down when it's set (and at pg_trigger_depth() > 1), so the ONE explicit
recalc carries the reason — and import stops paying N trigger recalcs for
N inserted rows. Direct table edits still cascade via trigger (reason null
by design). Behavioral smokes on DB engines run BEFORE push, on the
committed SQL, via the scratch-database harness — never on a JS mirror of
the logic.

---

## 18. A hook below an early return white-screens the ENTIRE app
**Incident (8/5/26, schedule session):** /schedule rendered blank — no nav,
nothing — for Brice, while all 9 golden paths were green. Gantt had its
"no dated items" early return sitting between useMemo and the drag
useEffect. Mount with empty items → 5 hooks; Lot 7's items arrive → 6
hooks; React throws on the order change and unmounts the WHOLE tree.
The robot missed it because its first job had no schedule and it worked
in the List tab — it never re-rendered the Gantt across the empty→dated
transition. Green robots only prove the paths they walk.
**Rules:**
1. Hooks first, returns after — enforced statically now: eslint with
   react-hooks/rules-of-hooks is part of `npm run validate` (scoped
   config, errors only; proven to name this exact bug).
2. The shell wears a PageBoundary (AppShell, keyed on pathname): a page
   crash degrades to an in-place error card with working nav, never a
   white screen.
3. Every surface's golden path must render each of its tabs/views WITH
   data at least once — path 9 now ends on the Gantt tab with dated bars.

---

## 19. The scratch shim has no Supabase default privileges — grant before RLS assertions
**Incident (8/5/26, comms session):** an RLS spot-check on the scratch chain
database failed with `permission denied for table comm_events` before RLS
ever evaluated. Real Supabase projects set default privileges (grants to
anon/authenticated/service_role) at project creation, so every migrated
table is grant-covered automatically; scripts/pg-shim.sql creates the roles
but not the default privileges. Superuser sessions mask this entirely
(superuser bypasses RLS and grants both).
**Rule:** RLS assertions on the scratch database run as `set role
authenticated` AFTER `grant usage on schema public` + `grant all on all
tables in schema public to authenticated` — mirroring the platform, so the
denial you then observe is RLS policy, not a missing grant. Candidate shim
improvement: bake the default privileges into pg-shim.sql.
