# AI Design Center — Vendor Sweep (Advanced Research, filed 2026-08-05)
Companion to DESIGN-CENTER.md (BOARD-013). This is the pressure-test of the
Phase-1 pick across the hosted-walkthrough field, the pixel-streaming tier,
and the SKU-visualization incumbents. Primary sources: vendor pricing pages,
developer docs, GitHub repos, 2025–26 community threads.

## Verdict
**Shapespark HOLDS as the Phase-1 pick** — the only self-serve platform
combining baked-lighting photoreal web walkthroughs, a documented JS Viewer
API for live material swaps, VR/kiosk support, and clean commercial-embed
rights. **One material correction: the API tier is $99/mo, not $19.**

## The pricing correction (spike doc updated)
Shapespark tiers (live pricing page, © 2026, billed monthly):
- **Starter $19** — 3 hosting slots, embed only. NO Viewer API, NO custom JS.
  Cannot run the MBV overlay.
- **Standard $49** — 25 slots, logo removal, team mgmt. Still no API.
- **Plus $99** — **Viewer API + HTML/JS customization + custom domain**,
  50 slots. This is the real entry point for the overlay. (~$84/mo billed
  yearly.)
- **Premium $249** — 150 slots + **own-server hosting** (the supported route
  to an offline/local-network design-office kiosk; true offline is a
  long-standing open feature request, not a first-class mode).
All paid licenses permit commercial use. No per-view/bandwidth charges or
revenue share published — a major advantage over per-minute streaming for an
always-on kiosk.

## API depth ranking (for the SKU-overlay use case)
1. **PlayCanvas** — full engine API, postMessage embed, hosted or
   self-hosted. Highest ceiling, but it's a game engine: we'd build
   lighting/navigation/walkthrough shell from scratch. Phase-2-class effort.
2. **Shapespark** — purpose-built archviz API with exactly the needed
   primitives: `setMaterialEditable` (pre-load), texture replacement,
   `onSceneReadyToDisplay`/`onSceneLoadComplete` hooks, camera events.
   Custom code ships in `body-end.html` + `extra-assets` and SURVIVES THEIR
   HOSTING. Official texture-picker example is essentially our SKU-swap
   pattern. Best fit-to-effort ratio.
3. **Sketchfab** — mature Viewer API + configurator framework; the
   strongest runner-up. Caveats: viewer API ships compiled bundles only
   (no source), real-time lit (heavier photoreal interiors than baked),
   and platform uncertainty under Epic's Fab.
4. **Pixel-streaming hosts (Arcware/Eagle/Vagon/PureWeb)** — SDKs are
   stream-control surfaces; real logic lives in the Unreal build.
5. **Enscape web / Twinmotion Cloud / D5 / Yulio** — RULED OUT: no
   programmable material-swap API for external overlays. (Twinmotion has a
   closed configurator, no JS injection; D5 streaming is LAN-only; Enscape
   web export is fixed-scene draft quality; Yulio is 360-panorama-based.)

## Phase-2 pixel-streaming tier (Unreal parametric)
- **Arcware Cloud** — Lite €10/mo @ €0.15/min; **Core €89/mo @ ≤€0.10/min**
  (5–15 projects, 3–10 concurrent, 25GB); npm Web SDK for custom HTML
  front-ends. Pragmatic single-kiosk pick.
- **Eagle 3D Streaming** — **Core $29/mo incl. 300 min then $0.10/min**
  (~$6/hr), 10 concurrent, WebSDK (React-compatible); cold start ~25s
  (10s Enterprise). All-day kiosk at full office hours ≈ $1k+/mo.
- **Vagon Streams** — ~$0.03–0.04/min tiers + ~$0.67/day app fee; 20+
  regions, white-label, budget caps.
- **PureWeb Reality** — quote-only, **from $750/mo**; enterprise-grade;
  acquired by Banyan Software (Jan 2024) after documented distress —
  net-stabilizing but monitor. Custom React client template.
- Consistent conclusion: **streaming fees are trivial for one kiosk; the
  dominant Phase-2 cost is the Unreal content build** — a specialist
  technical-artist/UE-dev effort (weeks–months) for a parametric
  residential configurator.

## SKU-mapped incumbents = partners/competitors, NOT overlay hosts
- **Renoworks** (TSXV:RW, public, profitable — YTD-2025 rev C$6.0M +15%,
  6th consecutive profitable quarter): SDK + open API + manufacturer
  pricing-engine integrations, but photo-upload/exterior + product-
  selection focused, enterprise-contracted. Powers many builder design-
  center tools — a partner or competitor, not a host for our walkthrough.
- **Chameleon Power** — acquired by Hyphen Solutions (builder ERP);
  configurators with pricing/carts; enterprise channel model. Competitor.
- **Threekit** — product-level configurator, 2025 pivot to AI-sales/CPQ;
  est. $500–999/mo up to $30k–100k/yr; assets are pre-modeled remixes —
  built for SKU products, not free-walk whole homes. Mis-fit.
- **Zolak** — room-scale furniture/product configurator w/ live pricing +
  AR; e-commerce oriented. Not whole-home.
- **Coohom B2B** — genuine open API, white-label, SSO, floor-planner +
  pricing hooks. The closest buy-vs-build whole-home option, but it's a
  full interior-design SaaS to rebrand — a DIFFERENT product strategy than
  author-in-Blender + own overlay. Re-evaluate only if we abandon the
  overlay architecture.

## Vendor risk
- **Shapespark**: founded 2013 (Kraków); **acquired by Glodon (Shenzhen:
  002410) in 2019** — large profitable public construction-software parent
  (2024 op income ~¥6.2B); active development incl. new cloud editor.
  Stability positive; mild Chinese-parent/strategic-priority risk.
  **Asset portability is good:** source models live in OUR Blender/SketchUp
  files and the local desktop editor; vendor death costs the bake + overlay
  re-platforming, not the assets.
- **Sketchfab**: Epic/Fab flux; bundle-only API.
- **Arcware/Eagle/Vagon**: small but active; switching cost contained to
  the SDK layer. **PureWeb**: Banyan-owned, monitor.

## Economics for 5–15 plans × 2–4 variants
Design variants as **in-scene material swaps** (the overlay's whole point)
→ 5–15 hosting slots → fits Plus (50). Separate baked scenes per variant
(15×4=60) would force Premium (150). No per-view charges either way.

## Watch-list triggers that would change the pick
- Variants require >50 separate baked scenes, or multi-tenant client
  accounts/per-view analytics become core → re-evaluate Coohom B2B or
  self-hosted PlayCanvas.
- Hard requirement for real-time GI or live parametric geometry → Phase-2
  pixel-streaming trigger (baked Shapespark cannot do it).
- Glodon deprioritizes Shapespark (stalled changelog, API deprecations) →
  migrate Sketchfab/PlayCanvas; the abstraction layer bounds the cost.

## Standing guidance adopted
- Prototype the overlay against the documented API with one plan + 3–4
  finish sets; confirm SKU→material mapping + pricing round-trip in
  browser AND Quest VR before committing the demo.
- Revision runbook: stable material/object naming, fixed export
  scale/up-axis, relative texture paths, re-import into existing project,
  small-subset test bake before full re-bake; record re-bake turnaround.
- **Wrap all Shapespark API calls behind an MBV abstraction layer** so a
  future migration (Sketchfab/PlayCanvas) is contained.
