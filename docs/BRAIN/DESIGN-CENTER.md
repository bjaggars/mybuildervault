# AI Design Center — Pipeline Spike (BOARD-013)
Status: SPIKE RUN 2026-08-05 · RESEARCH FILED (see DESIGN-CENTER-RESEARCH.md)
· RECOMMENDATION PROPOSED — sequencing decoupled from the Brije meeting
(Brice owns meeting timing, 8/5 PM); build order resumes the normal queue.
**RULING LOGGED (Brice, 8/5 PM): money is NOT a factor — optimize for the
best possible experience.** Consequences folded in below.
Scope: VISION thesis 7. The lobby is the entry shell; two studios (Bridgette
interior / Eric architectural). Doctrine applied: kill the riskiest unknown
first — the rendering pipeline, not the product code.

## The load-bearing finding
**Shapespark** (hosted web-walkthrough platform) exposes a **JavaScript
viewer API**: custom HTML/JS injected into the scene page, materials marked
editable pre-load, programmatic material/texture swaps, scene-ready event
hooks (github.com/shapespark/shapespark-viewer-api). This is the keystone,
because it means the finish-swap UI does not have to be Shapespark's generic
material picker — it can be **our React overlay where every swatch is a
`normalized_product` SKU**, and every tap emits a selections event into
MyBuilderVault (accretive selections → allowances → budget, silently). The
walkthrough is theirs; the intelligence is ours. That is exactly the split
VISION §7 demands ("every swap is a selections record with product + price").

## Recommended pipeline (phased)

### Phase 1 — Bridgette's Studio (ships first, demo-grade)
1. **Model** the spec plan in Blender or SketchUp (both import to
   Shapespark). One plan, interior-complete, UV-mapped with discipline —
   the API's material system needs clean UV maps and deliberate material
   naming (materials merge unless marked editable pre-load).
2. **Bake + host** in Shapespark: photoreal baked lighting, runs in any
   browser incl. mobile; VR mode supports the material picker. Fullscreen
   Chrome on the design-office screen + tablet controller = the office
   experience with zero special hardware. Same link works on a client's
   laptop at home.
3. **Overlay**: MBV React panel via the viewer API — rooms → surfaces →
   SKU swatch sets (cabinet color, counter, flooring, paint). Swap fires
   `selections` event with product + price into the job. This panel is
   MBV code in our repo, versioned, tested like everything else.
4. **Lobby v1** is plain MBV React — a rendered-still navigation screen
   with doors (Architectural / Interior). Zero 3D budget; the lobby is
   navigation, not simulation. CSS-cheap per VISION ("sci-fi screen wall
   satisfied by CSS the day Brije buys the hardware").
5. **Lookbooks/stills**: image-gen retained (existing doctrine), fed by
   walkthrough screenshots as conditioning.

### Phase 2 — Eric's Studio (architectural)
Live wall-stretch at photoreal quality is NOT feasible on the baked-web
path (geometry edits invalidate baked lightmaps) and web engines
(Three.js/Babylon raw) put us in the 3D-content business without solving
authoring. The honest options:
- **(a) Interim — plan VARIANTS (recommended):** pre-model the variants
  Brije actually sells (bonus room, 3-car garage, extended lanai) as
  separate baked scenes = doors in the lobby. Covers the architectural
  DEMO want at Phase-1 cost. "Pick a plan from the wall, walk the
  version with the bonus room" is 80% of the wow with 0% of the risk.
- **(b) Unreal + pixel streaming** for true parametric wall-stretch:
  mature in 2026; for one kiosk the streaming fee is trivial
  (Arcware Core €89/mo @ ≤€0.10/min or Eagle Core $29/mo + $0.10/min —
  see research doc). The constraint is the Unreal CONTENT BUILD:
  specialist UE engineering, weeks–months. **Reframed under the
  best-experience ruling:** no longer deferred on cost — this is now a
  WHEN-READY engineering track. Recommended shape: ship Phase 1, then
  commission the UE parametric build in parallel (external UE technical
  artist) so Eric's true wall-stretch studio arrives as fast as the
  engineering allows, not as budget allows. Sequencing stays risk-based:
  variants first because they ship in weeks, not because Unreal costs
  money.

## Costs (per-plan content + platform)
- **Modeling per spec plan:** outsourced interior-complete model
  ~$500–2,000 market rate; in-house Blender ~20–40 hrs. Plan revisions =
  re-bake, hours not days. Best-experience ruling: commission TOP-tier
  outsourced modeling (photoreal furnishing/staging, disciplined UV +
  material naming per the revision runbook) — the model is the experience.
- **Shapespark (CORRECTED by vendor sweep):** the Viewer API + custom
  HTML/JS injection live on **Plus, $99/mo** (50 slots, custom domain) —
  NOT the $19 Starter, which cannot run the overlay. **Premium, $249/mo**
  adds own-server hosting (the supported route to a local-network office
  kiosk) + 150 slots. Per the best-experience ruling: **go Premium** —
  own-server kiosk resilience, headroom for per-variant scenes if in-scene
  swaps ever constrain quality.
- **Authoring tools note (trap flagged):** Cedreo is the builder-friendly
  authoring darling (2-hr concept plans, $79–129/mo tiers) but is a
  CLOSED platform — VERIFY whether it exports 3D models at all; if not
  (expected), Cedreo is a sales-render tool, NOT a source for this
  pipeline. Do not buy Cedreo expecting it to feed Shapespark.
- **Pixel streaming (Phase 2b only):** per-stream-hour retail
  ~$0.50–1.00; content build is the dominant cost, not streaming.

## Demo math (meeting timing is Brice's — no clock on this doc)
ONE modeled plan → walkthrough with 3–4 swappable finish sets priced live
against allowances IS the AI Design Center pitch, end to end: Eric sees
the plan wall + a variant door (his studio, interim path), Bridgette sees
finish swaps landing in selections with prices. Lead time ~2 weeks if
modeling is outsourced immediately; the MBV overlay panel is ~1 session
once a scene exists.

## Risks & mitigations
- **Vendor concentration (Shapespark):** the MODELS are ours
  (Blender/SketchUp files in our storage) — portable to Three.js or a
  competitor later; the overlay is our code. Lock-in is limited to bake
  + hosting.
- **Material-merge quirk:** editable materials must be declared pre-load;
  naming + UV discipline goes in the modeling spec handed to whoever
  models plan #1.
- **API tier uncertainty:** confirm custom-injection allowances on the
  chosen tier during trial before committing the demo date.

## Rulings needed (Brice)
- **R1:** Approve the Phase-1 pipeline (Blender/SketchUp → Shapespark →
  MBV SKU overlay)?
- **R2:** Plan #1 modeling go: outsource top-tier (~2 wks lead once
  commissioned; cost immaterial per ruling) or in-house?
- **R3:** Eric interim = plan variants (recommended) vs committing Unreal
  now?
- **R4:** Which Brije spec plan is the pilot (pick the best-seller)?

Sources: shapespark.com (+ help center, viewer-api GitHub), Eagle 3D /
Arcware / StraySpark pixel-streaming pricing surveys (2026), Cedreo
pricing pages, floor-plan tooling roundups (2026).
