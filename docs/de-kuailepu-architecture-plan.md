# De-Kuailepu Architecture Plan

This document is the top-level design for the current de-Kuailepu refactor.

Its purpose is not to replace `docs/kuailepu-compatibility-roadmap.md`.

That roadmap answers:

- what public runtime behavior must stay stable
- what product truths cannot be violated

This document answers a different question:

- how to restructure the current codebase so it gradually stops looking and behaving like a Kuailepu compatibility patch pile
- without breaking the existing public song runtime path

## Scope

Current target:

- keep public `/song/<slug>` pages on the Kuailepu raw JSON + existing runtime route
- do not rewrite `Song.draw()/compile()/hc.parse/render`
- first separate our own boundaries around that runtime

Non-goals for this phase:

- replacing Kuailepu core parser / renderer
- changing compare baseline away from `note_label_mode=number`
- introducing a brand-new public song rendering route

## Why This Document Exists

The current implementation works, but `src/lib/kuailepu/runtime.ts` has accumulated several different responsibilities:

- server-side runtime HTML assembly
- runtime asset selection
- public state adaptation
- bridge-script generation
- public visual SVG transforms
- letter-mode behavior
- public playback / metronome bridge behavior

If these concerns are split without a boundary model, the refactor drifts and can introduce false abstractions.

The first concrete failure already happened during this work:

- a TypeScript helper module was wired into a browser inline runtime script path
- build passed
- browser runtime failed because the generated inline script did not have access to that imported function

That mistake is exactly why this document is needed.

## Architecture Truth

Today there are three distinct runtime layers. They must not be mixed mentally or structurally.

### 1. Server Assembly Layer

This is code that runs in Node / Next.js server context.

Examples:

- reading `data/kuailepu-runtime/<slug>.json`
- loading archived template HTML
- selecting runtime asset profiles
- injecting CSS / JS / bridge scripts into the runtime HTML shell

Characteristics:

- can import local TypeScript modules freely
- can read filesystem data
- can build strings and HTML safely before response

Current main files:

- `src/lib/runtime-core/publicRuntime.ts`
- `src/lib/kuailepu/runtime.ts` as compatibility re-export shell

Future target:

- `src/lib/runtime-core/server/*`

### 2. Browser Inline Runtime Layer

This is the most fragile layer.

It is not a normal imported module tree.

It is JavaScript source emitted into the Kuailepu runtime HTML and then executed inside the iframe document.

Examples:

- code produced by `buildRuntimeBridgeScript(...)`
- SVG manipulation after Kuailepu runtime draws the sheet
- iframe-side height reporting
- iframe-side playback panel observation

Characteristics:

- cannot directly call imported TypeScript helpers unless those helpers are explicitly emitted into the same script output
- runs in iframe browser context, not in Next server context
- depends on global runtime objects and DOM timing

Current main file:

- `src/lib/runtime-core/bridge/publicRuntimeBridge.ts`

Future target:

- `src/lib/runtime-core/bridge/*`

But that future target still needs one of these delivery models:

1. generate one self-contained inline script string
2. emit a dedicated browser runtime asset and load it into the iframe

Until one of those models is chosen, this layer must remain self-contained.

### 3. Public Shell / React Layer

This is our own app UI around the iframe.

Examples:

- `src/components/song/PublicRuntimeFrame.tsx`
- `src/components/song/PublicRuntimeInteractiveShell.tsx`
- page-level route handling and control UI

Characteristics:

- standard React / Next client and server code
- owns layout, visible copy, user controls, route params, iframe lifecycle
- can import TypeScript modules normally

Future target:

- keep expanding this as our own layer
- keep shrinking special-case behavior leaking out of runtime internals into page code

## Refactor Rule

Every change in this project must answer:

1. which layer does this code belong to
2. how will this code execute
3. what imports or globals is it allowed to rely on

If those three questions are not answered, the change is not ready.

## Current Safe Split Boundaries

The following responsibilities are safe to split first.

### A. Pure Server Assembly Helpers

Safe to move out of `runtime.ts`:

- template loading helpers
- runtime payload loading helpers
- asset profile selection logic
- server-side HTML injection helpers

Reason:

- these stay in Node context
- they do not depend on browser inline execution

### B. Public State Adapter

Safe to split:

- shell route/query state -> Kuailepu runtime context state
- instrument / fingering selection normalization
- default fallback state resolution

Reason:

- pure app-side state transformation
- no dependency on iframe runtime execution model

### C. Pure Browser SVG Transform Logic

Safe to split only if the execution model is preserved.

That means one of two acceptable patterns:

1. keep the code embedded inside the generated bridge script
2. or create a transform source representation that is later serialized into the bridge script

Unsafe pattern:

- normal TypeScript import from server file into browser inline runtime body without explicit serialization

### D. Public Shell Bridge Code

Safe to split:

- iframe lifecycle logic
- loading masks
- host-side frame height synchronization
- shell-side control event mapping

Reason:

- this lives in normal React / browser app code, not in the iframe inline runtime code

## Current Unsafe Split Boundaries

Do not treat these as routine refactor targets yet.

### 1. Kuailepu Core Render Chain

Do not touch:

- `Song.draw()`
- `Song.compile()`
- `hc.parse`
- `hc.render`

Reason:

- this is still the public correctness path
- changing it would mix “de-Kuailepu” work with “replace Kuailepu” work

### 2. Compare Baseline Logic

Do not change:

- `note_label_mode=number`
- runtime compare assumptions
- parity validation semantics

Reason:

- compare is the correctness anchor while the Kuailepu runtime is still in service

### 3. Bridge-Script Self-Containment

Do not break:

- self-contained browser runtime execution inside iframe

Reason:

- the bridge script is not a normal module runtime

## Historical HC Evidence

The local reference material under `reference/hc-history-investigation/2026-04-02/**`
is now part of the planning baseline.

Most useful files:

- `combined-summary-for-coding-ai.md`
- `hc-engine-structure-map.md`
- `hc-module-evidence-matrix.md`
- `live-files/hc.min_02d898293e.js`
- `live-files/hc_*.js`
- `live-files/hc.kit_*.js`

Important conclusions from that material:

- historical public `hc_*.js + hc.kit_*.js` split builds existed from at least 2023 through 2025
- current public pages use a monolithic `hc.min_02d898293e.js`
- old split files and the current monolithic file are locally saved for analysis
- `hc` is not just an SVG template store; it includes parser, lexer, semantic handling, layout, and SVG rendering
- `hc.kit` historically leaned toward MIDI, harmony, instrument, fingering, and support utilities
- current monolithic `hc.min` appears to have absorbed the support responsibilities needed by public pages

Practical planning impact:

- visual differentiation can be done before replacing the engine
- code-boundary cleanup can make the system easier to operate and extend
- full independence cannot be achieved by renaming files or changing the outer shell
- full independence requires our own notation parser, semantic model, layout engine, fingering model, renderer, and playback/data path

## Progress Model

There are two different progress numbers. Do not mix them.

### Current Code-Structure Phase

This is the current second-stage refactor:

- make public app code speak `PublicRuntime`
- move old names to compatibility shells
- isolate adapter points around archived runtime dependencies
- keep `Song.draw()/hc.parse/render` unchanged

Status:

- complete enough to stop treating Phase 2 as open-ended cleanup

Remaining work in this phase should be limited to regressions or clearly useful boundary fixes.

### Full De-Kuailepu Program

This is the user's long-term target:

- public song pages, interaction, playback, fingering, export, and new instruments no longer depend on the archived Kuailepu renderer
- Kuailepu code becomes historical reference instead of runtime dependency

Current estimate:

- about 40% to 45% complete overall under the full function-equivalent definition

Reason:

- shell, bridge, payload, state, and route boundaries are now substantially ours
- the public site can be operated with our own SEO shell, controls, letter mode, playback bridge, visual theme, and export surfaces
- the correctness engine for public pages is still the archived Kuailepu `hc` renderer
- native `SongIR` parsing and rendering has started in internal-only routes, but it is not yet production-grade
- playback source generation, repeat playback semantics, full fingering switching, metronome alignment, export rendering, and public migration are not yet ours

Operationally, the site is much farther along than the full-independence percentage for launch/SEO use. The visual-differentiation track is about 90% complete for public-page operation. Architecturally, full independence now depends on Phase 5 turning the internal native model into a production-capable rendering, interaction, playback, fingering, and export path.

The previous 50%+ estimate was useful when the active scope was mostly code-boundary cleanup plus visual differentiation. Under the stricter `100% = current public features without archived Kuailepu runtime` definition, progress must be counted lower because playback, metronome, export, and public route migration remain mostly unstarted.

## Target Module Layout

The target layout for this phase is:

```text
src/lib/runtime-core/
  publicRuntime.ts
  server/
    payload/
    template/
    assets/
    html/
  state/
    publicRuntimeState.ts
    instrumentSelection.ts
  bridge/
    publicRuntimeBridge.ts
    script/
    playback/
    metronome/
    height/
    svg/
  letterTrack/
    publicLetterTrack.ts
  visual/
    publicRuntimeVisualTheme.ts
  diagnostics/
    runtimeBoundaryNotes.ts
```

## Current Progress Snapshot

As of the current boundary phase:

- `src/lib/runtime-core/publicRuntime.ts` is now the preferred app-side entry for public runtime payload loading, state resolution, lyric-toggle checks, runtime HTML assembly, and letter-track preparation
- `src/lib/kuailepu/runtime.ts` has been reduced to a compatibility-facing re-export shell instead of staying the main mixed-responsibility implementation file
- browser inline bridge code now lives in `src/lib/runtime-core/bridge/publicRuntimeBridge.ts` while still being emitted as one self-contained inline script
- letter-track computation now lives in `src/lib/runtime-core/letterTrack/publicLetterTrack.ts`
- public song page shell components now use `PublicRuntime*` names directly, while old `Kuailepu*` component names only remain as compatibility-facing re-export boundaries where needed
- song page query parsing has been centralized before shell mount so app-side runtime state no longer depends on re-reading `window.location` after first paint
- runtime iframe API path usage is centralized through a PublicRuntime path constant, while the actual `/api/kuailepu-runtime/[id]` route remains stable
- public playback messaging now uses the `PUBLIC_RUNTIME_*` protocol on both the main shell path and iframe command bridge
- server payload loading and localization now go through PublicRuntime payload file/localization adapters instead of direct old helper imports in the main payload flow
- archived template lookup now goes through a PublicRuntime template file adapter, while the current deployable archive file stays unchanged
- `runtime-core/runtimeTypes.ts` now only defines `PublicRuntime*` / `PublicLetterTrack*` main types; old `Kuailepu*` type names are centralized in the compatibility shell
- letter-track notation, payload file lookup, payload localization, and template archive lookup are now explicit adapter boundaries where the remaining archived-runtime dependencies are intentionally contained

This means the current architectural boundary is no longer “everything goes through one giant Kuailepu file”.

It is now:

1. app/server code should prefer `runtime-core/publicRuntime.ts`
2. compatibility naming remains available through `src/lib/kuailepu/runtime.ts`
3. archived Kuailepu renderer remains untouched behind those boundaries

Important note:

- `transforms/` here does not automatically mean “import and execute from server”
- for bridge-side transforms, the final execution format still must remain browser-compatible

## Phase Plan

### Phase 1: Boundary Separation Without Core Change

Goal:

- make `runtime.ts` more like an assembler
- separate the obviously independent responsibilities

Deliverables:

- split pure server assembly helpers
- split public state adapter
- isolate transform definitions and bridge-side responsibilities more clearly
- keep public song runtime behavior unchanged

Exit criteria:

- `runtime.ts` is smaller and easier to reason about
- each moved function has a clear execution layer
- `npm run build` passes after each cut

Current completion estimate:

- effectively complete, with only low-value naming polish left inside the old compatibility shell surface

Remaining close-out items:

1. continue shrinking `src/lib/runtime-core/bridge/publicRuntimeBridge.ts`
2. split the remaining heavy bridge blocks:
   - playback bridge block
   - metronome bridge block
   - letter-render / visible-sheet transform block
3. keep runtime behavior unchanged while proving the bridge can be assembled from smaller self-contained script parts

Phase 1 done means:

- app entry, state, payload, server HTML, bridge bootstrap/height, letter-track data, and runtime types all have stable boundaries
- old `src/lib/kuailepu/runtime.ts` and `src/lib/kuailepu/runtimeTypes.ts` are only compatibility shells
- the next work is no longer “where does this code belong”, but “which part should be replaced next”

### Phase 2: Code-Level De-Kuailepu Without Core Replacement

Goal:

- reduce direct Kuailepu mental-model leakage from naming, asset grouping, compare workflow, and runtime integration surfaces
- still keep archived `Song.draw()/hc.parse/render` as the correctness engine

Deliverables:

- finish bridge decomposition:
  - `bridge/playback/*`
  - `bridge/metronome/*`
  - `bridge/svg/*`
- introduce a clearer public runtime contract owned by `runtime-core`
- reduce remaining `kuailepu` naming from app-side modules where compatibility naming is no longer needed
- separate compare/correctness concerns from public visual/output concerns more explicitly
- prepare a safe place for future visual themes without mixing them into structure refactors

Exit criteria:

- a new engineer can follow public runtime assembly and iframe behavior mostly through `runtime-core/**`
- `publicRuntimeBridge.ts` is no longer the second giant mixed file
- app/runtime integration no longer needs to spread direct compatibility naming across the codebase
- future visual work can be done as an isolated layer on top of these boundaries

Current completion estimate:

- effectively complete for the current code-structure phase

What is already true:

- page shell entry, frame, and interactive wrapper now speak `PublicRuntime` first
- server-side payload/state/query assembly is already centered on `runtime-core/**`
- old `Kuailepu*` names are increasingly compatibility aliases instead of primary implementation names
- public iframe route path, playback status protocol, payload file lookup, and payload localization now have explicit PublicRuntime boundaries
- archived template file lookup now has an explicit PublicRuntime boundary
- old playback command/status message names have been removed from the public runtime bridge
- `runtime-core` main types no longer export old `Kuailepu*` names
- remaining old helper imports inside `runtime-core/**` are adapter-boundary imports, not main-flow imports

What still remains:

- keep high-value compatibility names at the API route, old re-export shells, data directories, compare scripts, and archived template/data-source boundaries
- run targeted manual runtime QA before using this as the base for visual differentiation work
- make the future visual-differentiation layer plug into these boundaries instead of patching around them

Phase 2 should now be treated as a close-out state, not an open-ended naming cleanup project.

Continuing to remove every remaining `kuailepu` string would either:

- rename stable public/maintenance paths such as `/api/kuailepu-runtime` and `data/kuailepu-runtime`
- obscure the fact that the archived renderer is still the correctness engine
- create churn in scripts that are explicitly about import / compare / compatibility

The next useful work is Phase 3 visual differentiation or Phase 5 core replacement, depending on whether the priority is operating the current site sooner or reducing renderer dependency deeper.

### Phase 3: Controlled Visual Differentiation

Goal:

- make the public sheet and export output visibly ours while keeping runtime correctness anchored to the archived renderer

Why this comes next:

- it directly supports SEO operation, Pinterest distribution, and user-facing differentiation
- Phase 2 already created enough boundaries to keep visual work isolated
- it is lower risk than replacing the parser / renderer immediately

Deliverables:

- public runtime theme switch that is disabled for compare mode
- fingering palette system with per-fingering color rules
- sheet background / paper tone / typography rules
- controlled SVG transform entry for fingering chart visual shape adjustments
- Pinterest / print export route compatibility with the same visual theme
- documented on/off switch for runtime visual transforms

Non-goals:

- changing note parsing
- changing fingering correctness
- changing compare baseline
- replacing the Kuailepu `Song.draw()/hc.parse/render` chain

Execution order:

1. create a `PublicRuntimeVisualTheme` config boundary
2. make compare mode bypass all visual transforms
3. add palette and sheet background transforms first
4. add typography transforms where they do not affect note positioning
5. add fingering SVG appearance transforms only through a reversible transform layer
6. validate public page, bare runtime, print, Pinterest, and `note_label_mode=number`

Exit criteria:

- visual changes are isolated enough that they can be turned on/off without destabilizing runtime
- `note_label_mode=number` compare path remains usable
- public page, print, and Pinterest export share the same visual identity
- a future engineer can change visual theme values without touching parser, layout, or data import code

Progress estimate:

- public page visual layer is effectively complete for the first operating pass
- `PublicRuntimeVisualTheme` now exists as the switch point for sheet tone, fingering palette, typography, and fingering-shape changes
- compare mode resolves the visual theme to disabled before bridge injection
- the SVG bridge has a stable `applyPublicRuntimeVisualTheme(...)` entry after each archived runtime render
- the visual layer now changes sheet tone, text ink, letter-note cover styling, fingering palette, playback-panel styling, and instrument SVG appearance
- current covered public instruments:
  - `o12`: 12-hole ocarina has differentiated outline, hole sizing/placement, color gradients, and paper/ink treatment
  - `o6`: 6-hole ocarina has a rounder/wider body, adjusted mouthpiece, separated outer holes, and differentiated outline treatment
  - `r8b` / `r8g`: recorder has detached back hole, smaller main holes, adjusted front-hole spacing, trapezoid ends, and tuned double-hole treatment
  - `w6`: tin whistle has a conservative differentiated body, hole spacing, hole sizing, and clearer outline while preserving the semantic top marker
- public visual theme can be disabled with `runtime_visual_theme=off`

Remaining visual close-out:

1. run a focused manual QA pass across the public page samples below
2. check `runtime_visual_theme=off` still restores the unthemed runtime path for debugging
3. sample Pinterest and print routes, then only do small export-specific adjustments if needed
4. avoid further open-ended SVG tuning unless a real page/export defect is found

### Phase 4: Public Shell / Asset Ownership

Goal:

- make the public engineering surface and asset story feel like our own system while still allowing archived runtime recovery

Deliverables:

- clearer public runtime asset profiles
- own-named static grouping for public runtime support assets where path compatibility allows it
- documented split between public runtime assets, archived recovery assets, and compare-only assets
- internal scripts updated to prefer PublicRuntime naming where they are not explicitly compare/import scripts
- public shell and export routes audited for no visible source attribution wording

Non-goals:

- deleting archived assets needed for compare or recovery
- renaming stable public paths merely for cosmetic reasons
- hiding that compare/import scripts still deal with Kuailepu-compatible data

Exit criteria:

- a new engineer can understand public song page orchestration without first learning Kuailepu template internals
- public-facing and export-facing assets are grouped by our product boundary
- archived runtime assets are clearly marked as compatibility/recovery dependencies

Progress estimate:

- partially complete through Phase 1 and Phase 2
- remaining work should happen after Phase 3 proves the visual theme boundary

### Phase 5: Core Replacement Track

Goal:

- gradually remove dependence on Kuailepu core renderer

Research entry:

- `docs/public-runtime-renderer-replacement-research.md`

This is the phase that moves the project from "differentiated runtime wrapper" to "independent renderer".

Deliverables:

- notation ingestion model that can represent Happy123/Kuailepu-style numbered notation and MusicXML-derived melody
- parser subset for the most common current catalog constructs
- semantic model for notes, rests, bars, repeats, slurs, lyrics, key, tempo, and fingering directives
- layout engine MVP for melody rows, lyrics, measure numbers, and fingering anchors
- renderer MVP for one narrow instrument family first, likely 12-hole ocarina
- public controls backed by native state: instrument, fingering, note mode, graph, lyric, measure number, layout, and zoom
- playback source generation independent from archived runtime
- native metronome / highlight alignment from the same timing model as playback
- print and Pinterest export backed by the native renderer
- public route migration with an intentional archived-runtime fallback period
- side-by-side renderer diff tooling against current archived output

Suggested subphases:

1. Parser Audit

   - use `reference/hc-history-investigation/**` plus current catalog JSON to list real syntax constructs
   - bucket constructs into MVP, common, rare, and unsupported
   - generate fixtures from existing public songs

2. Data Model

   - define our own intermediate representation for melody, lyrics, measures, repeats, and fingering events
   - keep it instrument-agnostic enough for guitar / sax / future flashcard-style fingering

3. Renderer MVP

   - render a small stable set of songs without archived runtime
   - start with simple songs and one instrument
   - measure visual correctness against archived output, not byte identity

4. Interaction / Playback

   - move playback, metronome alignment, note highlight, zoom, layout, graph, lyric, note-mode, and fingering controls onto our own model
   - keep archived runtime fallback until MVP is stable

5. Export Migration

   - drive Pinterest and print output from native renderer output
   - keep export visual quality close to the current public visual direction
   - avoid using archived runtime screenshots as the long-term export source

6. Catalog Migration

   - classify songs by supported syntax
   - route supported songs to our renderer
   - leave unsupported songs on archived runtime until parser coverage catches up

Exit criteria:

- at least one instrument path can render and play without archived Kuailepu runtime
- the renderer can handle a meaningful public subset, not just a toy fixture
- public controls for instrument, fingering, note mode, graph, lyric, measure number, layout, zoom, playback, and metronome work through native data
- export routes can use native output for supported songs
- unsupported songs fail back intentionally, not silently
- compare tooling distinguishes correctness, visual difference, and known unsupported syntax

Progress estimate:

- research groundwork exists
- dev-only MVP implementation has started
- current implemented chain: public runtime syntax inventory -> `SongIR v0` -> MusicXML draft adapter + runtime notation adapter -> native support contract -> `/dev/native-renderer/song/[id]` preview + `/dev/native-renderer/review/[id]` side-by-side review
- MusicXML draft mode remains deliberately narrow: 15 MusicXML-backed native MVP seed songs only
- current MusicXML strict supported set is 12 songs; 3 eligible seeds still fallback because they contain MIDI `79`, which has no current o12 fingering entry
- runtime probe mode can now parse deployable runtime JSON internally; latest 400-song analysis supports 104 songs, identifies 279 songs with parenthesized groups, models repeat markers in 131 songs, models first/second endings in 83 songs, identifies sections in 139 songs, models `{play:...}` play-order steps in 88 songs, and can expand modeled play order into explicit measure ranges; 79 of those play-order songs resolve all section labels, while 9 still expose unresolved labels for later handling
- native sheet rendering now displays rest `R`, hold dashes, parenthesized group boundaries, repeat bars, and first/second ending brackets in internal preview
- `/dev/native-renderer/review/[id]?source=runtime&force_native_preview=1` can render unsupported runtime songs for internal visual inspection without changing the formal support/fallback contract
- native layout now estimates measure and row widths before rendering, so internal rows can break by semantic measure width instead of relying on CSS wrapping
- native layout now compresses over-wide single measures to the target row width and scales event-level visuals with the compressed cell width
- native playback-sequence audit now classifies songs before any native playback migration; latest 400-song scan has 210 linear songs, 51 explicit-play-order songs, 102 repeat / ending songs, 28 play-order plus repeat / ending songs, and 9 unresolved-play-order songs; repeat-only sections and clear first/second endings can now be expanded conservatively, bringing the repeat/play-order-level usable playback sequence count to 358 songs; remaining repeat expansion blockers are 27 complex-ending songs and 5 unmatched-repeat-start songs
- `npm run analyze:native-runtime-layout -- --limit=400` reports the densest current runtime songs; the latest scan now caps max row / measure width at 52rem and reports compressed measure counts / compression ratios
- `npm run check:native-renderer-regressions` locks the current native milestones for rest, hold, group, repeat, ending, play-order structure, play-order expansion, fallback-boundary, and dense-layout compression fixtures
- public `/song` is still archived-runtime backed; no public route replacement has happened

Current Phase 5 status:

- Parser Audit: first-pass complete for the current 400-song public runtime catalog
- Data Model: `SongIR v0` exists for simple melody / rest / measure / lyric / chord data, with optional parenthesized group marks, measure-level repeat / ending markers, sections, play-order steps, and derived play-order expansion ranges
- Parser Adapter: MusicXML draft adapter exists; runtime notation adapter now handles notes, rests, holds, chords, bars, simple parenthesized groups, repeat / ending structure markers, section labels, `{play:...}` structure, and safe layout markers
- Renderer MVP: internal o12 preview and side-by-side runtime review exist; simple melody, rest, hold, group, repeat, and ending notation can be drawn; row-level layout and over-wide measure compression exist, but production-grade engraving is still incomplete
- Fingering / Instrument Controls: native renderer currently supports only a narrow o12 adapter; full public fingering-index switching and multi-instrument parity are not migrated
- Interaction / Playback: native playback is not connected yet, but SongIR now has a playback-sequence audit that identifies which songs can use the current measure sequence directly and which still need repeat / ending expansion
- Export Migration: not started for native renderer; print / Pinterest still need native output integration later
- Catalog Migration: only support/fallback decision contract exists; public migration not started

Subtrack progress under the full Phase 5 scope:

- Parser / SongIR: about 43% to 53%
- Static native sheet rendering: about 55% to 65% for the narrow o12 internal MVP
- Public controls / fingering switching: about 10% to 15%
- Native playback / metronome / highlight: about 0% to 5%
- Native export path: about 0% to 5%
- Public route migration: about 0% to 5%

Overall Phase 5, counted as the full replacement track, is about 25% to 30% complete.

Recommended next Phase 5 order:

1. inspect the 27 remaining `blocked-by-complex-ending` songs and the 5 `blocked-by-unmatched-repeat-start` songs before widening repeat expansion further
2. audit native fingering/instrument-control parity against the current public detail-page controls
3. move toward native playback/metronome alignment from SongIR
4. audit and add missing o12 fingering coverage where musically valid
5. migrate export previews only after native sheet output is stable enough for supported songs
6. only then consider a private or query-flagged public native route experiment

### Phase 6: New Instrument Expansion

Goal:

- add instruments whose fingering/display model does not fit the old small inline chart style

Examples:

- guitar
- saxophone
- larger flashcard-style fingering views
- non-ocarina fingering systems with many keys, positions, or alternate fingerings

Dependency:

- can begin as shell/UI prototypes before Phase 5 is complete
- should not be forced into the archived ocarina-style graph model
- should become much cleaner once our own intermediate representation exists

Exit criteria:

- new instrument UI is driven by our own instrument/fingering model
- public pages can expose the new instrument without pretending it is a Kuailepu-style fingering chart
- SEO entry points and instrument switching remain understandable

## Next-Step Execution Order

Preferred order from the current point:

1. keep public `/song` on the archived runtime while Phase 5 stays internal-only
2. continue Phase 5 by making native layout handle denser runtime songs without overlap or fragile spacing
3. add focused fixture / DOM checks around native renderer semantics before expanding support
4. implement play-order expansion only after repeat / ending visual markers are stable
5. start native playback / metronome alignment from `SongIR` after visual semantics are inspectable
6. consider a private or query-flagged public native experiment only after layout, support contract, and fallback behavior are proven

Why:

- Phase 2 has already done the high-value structural cleanup
- Phase 3 already supports current SEO and Pinterest operation well enough to stop polishing visuals indefinitely
- Phase 5 is now the main independence track
- repeat / ending rendering must stay internally testable without falsely marking those songs as production-supported

Recommended current native review samples:

- `on-top-of-old-smoky`
- `london-bridge?source=runtime`
- `deck-the-halls?source=runtime&force_native_preview=1`
- `its-a-small-world?source=runtime&force_native_preview=1`
- `love-is-blue?source=runtime&force_native_preview=1`

Recommended public runtime regression samples before any public-facing release:

- `/song/twinkle-twinkle-little-star`
- `/song/london-bridge?note_label_mode=number`
- `/song/we-wish-you-a-merry-christmas?instrument=r8b&fingering_index=4`
- `/api/kuailepu-runtime/twinkle-twinkle-little-star?note_label_mode=number`

Manual checks:

- native forced preview visibly shows modeled syntax but normal unsupported review still falls back
- public archived runtime sheet appears without loading-card or header flash
- playback opens, stops, and closes correctly
- metronome is still usable
- number mode remains clean
- iframe height has no large blank bottom area or inner scrollbar
- compare-related route behavior remains unchanged

## Decision Rules

When facing a refactor choice, use these rules.

### Rule 1

If code executes inside `buildRuntimeBridgeScript()` output, it belongs to the browser inline runtime layer.

Do not refactor it as though it were an ordinary imported TypeScript helper unless you also change how that code is shipped.

### Rule 2

If code only transforms input state and does not touch iframe globals or DOM, prefer moving it into `runtime-core/state/*`.

### Rule 3

If code only assembles response HTML / assets / payloads on the server, prefer moving it into `runtime-core/server/*`.

### Rule 4

If a change mixes visual differentiation and structural refactor, structural safety wins first.

### Rule 5

Any refactor that changes both execution layer and user-visible behavior at the same time is too large for one step.

## Diagnostics Map

When something breaks, locate the layer first.

### Symptom: song page loads, iframe exists, but no sheet appears

Likely layers:

- browser inline runtime layer
- Kuailepu core runtime inside iframe

Checks:

- inspect `/api/kuailepu-runtime/<slug>` output
- search returned runtime HTML for missing inline functions or unexpected references
- inspect iframe console/runtime errors

### Symptom: song page HTML is wrong before iframe even runs

Likely layer:

- server assembly layer

Checks:

- inspect server response HTML
- inspect injected assets and bridge-script payload

### Symptom: controls render but selecting instrument/fingering gives wrong runtime state

Likely layer:

- public shell / React layer
- public state adapter layer

Checks:

- inspect route/query params
- inspect resolved runtime state before HTML assembly

### Symptom: sheet appears but looks visually wrong while notation correctness stays intact

Likely layer:

- browser SVG transform layer

Checks:

- inspect SVG after Kuailepu render
- compare raw runtime SVG vs transformed SVG

### Symptom: compare/parity breaks

Likely layer:

- core runtime assumptions or compare baseline handling

Checks:

- verify `note_label_mode=number`
- verify no visual-layer change leaked into compare baseline assumptions

## Validation Rules By Phase

Use validation scope according to the risk of the step.

### Phase 2 Structural Boundary Changes

Every structural step should at minimum run:

```bash
npm run build
```

If the step touches song data, publication, import, compare, or content rules, also run:

```bash
npm run validate:content
npm run validate:songbook
```

Where relevant to a specific song:

```bash
npm run preflight:kuailepu-publish -- <slug...>
```

### Phase 3 Visual Differentiation

Visual work must verify both themed public output and unthemed correctness paths.

Minimum automated check:

```bash
npm run build
```

Manual samples:

- `twinkle-twinkle-little-star`
- `london-bridge`
- `wedding-march`
- `turkish-march`

Manual URLs:

- `/song/<slug>`
- `/song/<slug>?note_label_mode=number`
- `/api/kuailepu-runtime/<slug>?note_label_mode=number`
- `/dev/print/song/<slug>`
- `/dev/pinterest/song/<slug>`

Pass criteria:

- visual theme applies only where intended
- compare / number mode is not visually transformed in a way that breaks correctness checks
- fingering charts stay semantically correct
- iframe height remains correct
- print and Pinterest output match the public visual direction

### Phase 5 Core Replacement

Core replacement work needs stronger validation because it changes correctness, not just appearance.

Minimum checks for any renderer/parser milestone:

```bash
npm run build
npm run validate:content
npm run validate:songbook
```

Additional expected checks:

- fixture tests for parser syntax buckets
- side-by-side visual render diff against archived runtime for selected songs
- manual playback / metronome checks if timing or audio source changes
- explicit unsupported-syntax fallback checks

## Reporting Rule

After each completed work step, report in plain language:

- what changed
- which phase it belongs to
- what was verified
- whether any user / teammate dirty worktree changes were left untouched
- approximate progress impact

Example format:

```text
This step was Phase 3 groundwork. I added the visual theme boundary but did not change actual sheet styling yet. Build passed. The overall full de-Kuailepu program remains about 40%, while Phase 3 moved from 0% to about 10%.
```

Use two progress tracks:

- `Current phase progress`: how far the active phase has moved.
- `Full independence progress`: how close the whole project is to no longer needing the archived Kuailepu runtime.

## Immediate Next Steps

The next safe work order is:

1. keep public `/song` on the archived runtime while native remains internal-only
2. run `npm run check:native-renderer-regressions` before and after native parser / layout / renderer changes
3. implement repeat / ending playback expansion for the audited complex sequence buckets
4. audit current public detail-page controls and map each control to the native data / renderer responsibility
5. start native playback / metronome alignment from `SongIR`
6. only after native rendering and interaction are stable, migrate print / Pinterest output for supported songs
7. only after those checks pass, consider a private or query-flagged public native route experiment

## Bottom Line

The current short-term goal is not “remove Kuailepu everywhere at once”.

The current short-term goal is:

- keep the archived Kuailepu core runtime as the public correctness engine for now
- keep making the native `SongIR` path cover more semantics, layout, controls, playback, and export behavior
- preserve current public feature parity while each dependency is replaced intentionally
- avoid refactors that cross execution layers blindly

The long-term goal is full independence. That requires Phase 5: our own parser, semantic model, layout engine, renderer, fingering model, playback path, control mapping, and export path.

## Full Independence Definition

`100% de-Kuailepu` means functionally equivalent public operation without the archived Kuailepu runtime.

This includes:

- public song rendering from our own parser / `SongIR` / native renderer
- instrument and fingering selection driven by our own fingering model
- letter and number note labels from our own rendering path
- lyrics, rests, holds, groups, repeats, endings, and measure layout handled natively
- playback, note highlighting, and metronome alignment from our own timing model
- zoom / layout / graph / lyric / measure-number controls still working from the public shell
- Pinterest, print, and future export surfaces driven by our own renderer
- archived Kuailepu code removed from the live public correctness path

The target is not fewer features than the current public site. It is the same visible product capability, with the implementation migrated off the archived runtime. Until playback, fingering switching, and export paths are moved onto native data, the project is not 100% independent even if the static sheet can be drawn.
