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
  transforms/
    publicSheetTransforms.ts
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

- visual changes happen through our own transform boundary instead of ad hoc runtime patching

Deliverables:

- fingering palette system
- sheet background / typography rules
- controlled o12 visual replacement path

Exit criteria:

- visual changes are isolated enough that they can be turned on/off without destabilizing runtime

### Phase 4: Public Shell / Asset De-Kuailepu

Goal:

- make the public engineering surface look and behave like our own system

Deliverables:

- our own asset grouping and naming
- cleaner shell/runtime interface
- reduced direct leakage of Kuailepu mental model into public app code

Exit criteria:

- a new engineer can understand public song page orchestration without first learning Kuailepu template internals

### Phase 5: Core Replacement Track

Goal:

- gradually remove dependence on Kuailepu core renderer

Deliverables:

- our own melody/fingering data model
- our own renderer MVP for selected instruments

Exit criteria:

- at least one instrument path can render without Kuailepu core runtime

## Next-Step Execution Order

Preferred order from the current point:

1. continue Phase 2 by shrinking the remaining bridge heavy blocks and runtime HTML naming leakage
2. keep compatibility names only at the outer shell where they still protect stability
3. only then return to Phase 3 visual differentiation

Why:

- visual work is currently still mostly “post-render theming”
- code-level boundary cleanup increases control and lowers regression risk
- once bridge/runtime integration is cleaner, visual differentiation becomes a first-class layer instead of a fragile patch layer

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

## Validation Rule For This Refactor

Every structural step in this phase should at minimum run:

```bash
npm run build
```

When a step changes publish-sensitive runtime behavior, also run:

```bash
npm run validate:content
npm run validate:songbook
```

And where relevant:

```bash
npm run preflight:kuailepu-publish -- <slug...>
```

## Immediate Next Steps

The next safe work order is:

1. keep `buildRuntimeBridgeScript()` self-contained
2. continue shrinking `runtime.ts` only along true layer boundaries
3. split public state adaptation next
4. split server assembly helpers after that
5. postpone deep visual SVG replacement until these boundaries are stable

## Bottom Line

The current goal is not “remove Kuailepu everywhere at once”.

The current goal is:

- keep Kuailepu core runtime as the correctness engine for now
- make every surrounding layer increasingly ours
- avoid refactors that cross execution layers blindly

That is the shortest path to de-Kuailepu without breaking the public runtime.
