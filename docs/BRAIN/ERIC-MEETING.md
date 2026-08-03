# Eric Meeting — Prep
Last updated: 2026-08-03

Meeting with Eric (Brije principal). NOT YET SCHEDULED — prep first, schedule from strength.
Dependency: BOARD-001 (Firebase rules) fixed, BOARD-003 (demo rehearsal) done.

---

## Context

**Who:** Eric is co-principal of Brije LLC alongside Wendy Fisher. Brije builds ~70 spec
homes/year and ~30 custom homes/year in Central Florida. Ocala market. Builder of the
Jaggars custom home (the eat-our-own-dog-food proof).

**What this meeting is:** A licensing conversation — Brice would license MyBuilderVault
to Brije. Brije pays a license fee; Brice owns and develops the platform. Brije gets a
competitive advantage no other builder in their market has. This is the Lighthouse model:
conversational, never advertised, treated as a mutual win rather than a sales pitch.

**What this meeting is NOT:** A product sale. Not "buy our software." Not a revenue pitch
about Brije licensing it to other builders (Brije would not benefit from that — Brice
retains that upside). The pitch is about what the platform does for Brije, not for JSH.

**Tone:** Peer conversation between a builder who cares about quality and a technologist
who built the thing on his own home. Not startup pitch. Not software demo. Real tool,
real build, real data.

---

## Talking Points

### 1. The proof is real
"This isn't a mock-up. I built this for our own build — your build. Everything you see
is live data from the Jaggars home. The change orders in there came from your estimate.
The documents are your permits. I built it because I wanted it, and now I think you do too."

### 2. The problem it solves
Brije runs 100 homes a year on email chains and spreadsheets. Clients call constantly
because they have no visibility. Change orders get missed or disputed. Selections tracked
on paper cause delays. Marketing is inconsistent. This platform makes the digital experience
match the build quality.

### 3. The licensing shape (conversational framing)
"I'm not selling you software. I'm inviting you to be the first builder to run on this
platform, and I'll build it around how Brije actually works. You get a tool no competitor
has. I get a partner who shapes the product with real usage. The fee covers my development
costs. You get something purpose-built for your business."

**Important:** Brice licenses to Brije. Brije does NOT sub-license to other builders.
Brije does NOT share in revenue from other builder customers. Brice retains all IP and
all upside from the broader platform. Brije's benefit is exclusive access and a platform
built around their specific workflows.

### 4. The 48-hour proof point (Frontier Firm credibility)
"This week on our real estate product, an agent sent me a 7-item defect list on Friday
night. Five of the seven were in production by Sunday night — two releases over a weekend.
That's the speed at which this gets built. When Brije has a list, it moves that fast."

This is a direct proof of the JSH operating model. Use it to answer the unspoken question:
"Will this actually get built and maintained?" Answer: yes, demonstrably.

### 5. Campaign Studio — two-product story
"The marketing engine we built for our real estate product — the one that generates
Wendy's client nurture emails — half of her workflows are Brije Homes content. A
custom-home-build nurture sequence she's already running through her Flodesk account.
The same engine can generate Brije's own marketing content from the data inside the
platform. Every build milestone becomes a social post. Every completed spec home triggers
a listing. The data you already have becomes your marketing."

This positions MyBuilderVault + MyRealtyVault Campaign Studio as a unified marketing
engine, not just a build tracker.

### 6. MLS context (if relevant)
MyRealtyVault has MLS Grid / Stellar integration in motion (license signed, broker invite
with Wendy). If spec homes eventually need MLS exposure, the infrastructure is being built
on the sister product. Future-proofs the platform.

### 7. Why Brije specifically
"You're the right first partner for three reasons: you already have a reputation for
quality, your volume (100 homes/year) is big enough to stress-test every feature, and
you have Bridgette. The design center I want to build is built around how she actually
works — material pairings, vendor catalog, lookbook generation. I can't build that without
a real designer using it on real projects."

---

## Demo Plan

**Pre-demo checklist:**
- [ ] BOARD-001: Firebase rules fixed — portal works on non-Brice device
- [ ] BOARD-003: Full rehearsal on fresh browser, no cached state
- [ ] Have the Brije estimate PDF handy (shows the data source)
- [ ] Open portal on laptop Eric can see; have it loaded before he sits down

**Device:** Use a device that is NOT Brice's primary browser — proves the sync works
for other users, not just the device that built it.

**Demo sequence (30 minutes):**

**Stop 1 — Dashboard (2 min)**
Show the stat cards: $1.2M total build cost, approved items, open actions.
"This is what you'd see if you were the homeowner. Everything live, always current."
Click the Awaiting Quote card → navigates to filtered Changes view.

**Stop 2 — Change Orders (8 min)**
This is the centerpiece. Show:
- The full list with status badges (Discussed, Considering, Approved, Included, TBD)
- Filter to "Awaiting Quote" — show the items still needing pricing from Brije
- Show the Included status (green badge, $0 — base price items)
- Open one change order — show the notes, category, priority, assigned
- Click Export Excel → show that the output matches Brije's own estimate PDF format
  (have the PDF open for comparison)
- Show the Email Report flow — rich text copy → paste in Outlook

"Every change order that's come up in our meetings is in here. When you update a price,
everyone sees it immediately. No more emailing updated spreadsheets."

**Stop 3 — Budget (4 min)**
Show the base price breakdown (collapsible — Brije's own 9 line items, $696,824).
Show the cost rollup: total quoted, approved, awaiting quote.
"You gave me your estimate. I loaded it all. This is your data."

**Stop 4 — Documents (3 min)**
Show the document vault. Check a few boxes → Email Selected button appears.
Open one document.
"Your permits, plans, elevations — all in one place. The homeowner can see everything
you've shared. No hunting through email attachments."

**Stop 5 — Meetings + Decisions (3 min)**
Show a meeting entry with action items. Show the Key Decisions log.
"Every decision we've made is captured. The homeowner can see the history. So can you."

**Stop 6 — Reports Hub (3 min)**
Show the Reports page. Filter the Awaiting Quote report by category → Export Excel.
"This is the report I'd send you: here's every item we still need pricing on,
broken out by category, in the format your team already uses."

**Stop 7 — Builder View / Admin View (2 min)**
Toggle from Admin to Builder View.
"This is what your client sees — no edit controls, read-only, clean. They log in and
they can see exactly where their build is. The anxious phone calls stop."

**Stop 8 — The vision (5 min, no demo)**
Put the screen away. Talk through what the full platform becomes:
- Internal ops: 100 builds on one dashboard, permit tracker, draw schedule manager
- Bridgette's Design Studio: AI material pairing, client vision profiles, lookbook generator
- Marketing engine: build milestone → social post, spec home → listing, leads from ads
- Digital home handover: at closing, the client gets a branded home manual with every
  warranty, paint code, maintenance schedule

"Everything I just showed you is running on a single HTML file I built in a few weeks.
The product gets rebuilt properly — multi-tenant, real authentication, mobile app, the works.
But the concept is proven. You're using it."

---

## Lighthouse Licensing Shape (conversational — never advertised)

Do not put a price on paper in this meeting. The goal is alignment, not a transaction.

**What to convey:**
- Monthly license fee (TBD — based on discussion of scope)
- Phase 1: core platform for Brije's builds + client portals
- Ongoing: Brice develops new features, Brije gets them as they ship
- Brije's feedback directly shapes the roadmap
- Brije is not reselling or sub-licensing — the benefit is exclusive access and
  purpose-built features

**If Eric asks about price:** "I want to scope Phase 1 together before I put a number on it.
What I know is it's a monthly arrangement — not a one-time purchase — because the value
is in what keeps getting built, not just what exists today."

**If Eric asks who else is using it:** "You'd be first. That's the point. You'd get
something shaped around how Brije works before any other builder sees it."

---

## Open Questions for Brije

These are questions to ask Eric, not answer for him:

1. **How do you currently handle change order tracking and client communication?**
   (Understand the pain before describing the solution.)

2. **What's your biggest operational headache at 100 homes/year?**
   (Permits? Subs? Draw timing? Leads? Uncovering this shapes Phase 1 priority.)

3. **How does Bridgette currently manage selections across active builds?**
   (Design Center scoping — is she overwhelmed? Is there a deadline problem?)

4. **Do you use any builder software today?** (CoConstruct? Buildertrend? BuilderPad?)
   If yes: "What does it do well? What does it miss?"
   If no: "What made you not adopt any of the existing tools?"

5. **What would make a client portal compelling enough that your clients actually use it?**
   (Their answer shapes the client experience priority stack.)

6. **For spec homes — what's the biggest marketing gap?**
   (Social? Leads? Listing speed? This shapes the Campaign Studio integration story.)

7. **Is there a timeline pressure?** (Selling season? A specific build they want this on?)

---

## If the meeting goes well

Next step is a working session to scope Phase 1 together. Not a contract — a conversation
about what the first 90 days looks like and what Brije specifically needs first.

Leave the meeting with:
- Agreement that this is worth exploring further
- A short list of Phase 1 priorities from Brije's perspective
- A follow-up call scheduled (not open-ended "I'll be in touch")
