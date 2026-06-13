# Runtime Decoupling And Module Split Plan

This document is the dedicated post-iframe-removal plan for decoupling old runtime integration code, splitting large files, and cleaning redundant structure.

It starts after `docs/progressive-iframe-removal-plan.md` Phase 15.

That plan answered:

- how to remove iframe hosting while preserving the authorized runtime behavior
- how to keep public, review, print, Pinterest, and export routes on a React-owned runtime container

This document answers:

- how to reduce large runtime integration files into stable modules
- how to clarify server / browser / React shell ownership
- how to remove obsolete bridge-era residue
- how to do this without changing notation parsing, SVG rendering, fingering mapping, playback timing, or sound behavior

## Permanent Authorization Baseline

The project is based on frontend source code with complete commercial-exclusive authorization.

All source reading, movement, splitting, refactoring, and second-stage architecture work in this plan is legitimate maintenance on the authorized source baseline.

The goal of this plan is architectural hygiene and maintainability. It is not a music-engine rewrite and not a renderer replacement.

## Current Baseline

Already completed:

- Phase 0 through Phase 15 of progressive iframe removal are complete.
- Public song, dev review, internal print, Pinterest, and export automation routes use the React-owned runtime container path.
- `runtime_host=iframe` remains accepted as a legacy compatibility and diagnostics signal, but does not restore an iframe entity.
- The stable public behavior remains the authorized runtime rendering chain:

```text
data/kuailepu-runtime/<slug>.json
  -> Kit.context.setContext(...)
  -> Song.draw() / Song.compile()
  -> hc.parse / render
  -> final SVG
```

Current important modules:

- `src/lib/kuailepu/runtime.ts`
- `src/lib/runtime-core/publicRuntime.ts`
- `src/lib/runtime-core/server/**`
- `src/lib/runtime-core/bridge/**`
- `src/lib/runtime-core/client/**`
- `src/lib/runtime-core/state/**`
- `src/lib/runtime-core/letterTrack/**`
- `src/lib/runtime-core/visual/**`
- `src/components/song/PublicRuntimeInteractiveShell.tsx`
- `src/components/song/PublicRuntimeHostController.ts`
- `src/components/song/runtime-host/**`

Current large-file pressure points:

- `src/lib/runtime-core/bridge/svg/publicRuntimeSvgBridge.ts`
- `src/components/song/PublicRuntimeInteractiveShell.tsx`
- `src/lib/runtime-core/bridge/playback/publicRuntimePlaybackBridge.ts`
- `src/components/song/runtime-host/RuntimeHostReviewClient.tsx`
- `src/components/song/runtime-host/RuntimeStyleInjector.tsx`
- `src/lib/runtime-core/server/html/runtimeHtmlScaffold.ts`
- `src/components/song/runtime-host/useRuntimeContainerMeasurement.ts`

Current already-split areas:

- server assembly: `src/lib/runtime-core/server/assembly/**`
- server assets: `src/lib/runtime-core/server/assets/**`
- server HTML helpers: `src/lib/runtime-core/server/html/**`
- server payload helpers: `src/lib/runtime-core/server/payload/**`
- server template helpers: `src/lib/runtime-core/server/template/**`
- bridge subdomains: `height`, `metronome`, `playback`, `script`, `svg`

## Global Hard Constraints

These constraints apply to every phase in this plan.

- Do not modify notation parsing behavior.
- Do not modify SVG rendering behavior.
- Do not modify fingering mapping behavior.
- Do not modify playback timing behavior.
- Do not modify soundfont or audio-kernel behavior.
- Do not rewrite `Song.draw()`, `Song.compile()`, `hc.parse`, or the core render chain.
- Do not change publish / parity compare semantics.
- Do not change the `note_label_mode=number` compare baseline.
- Do not change public default mode away from `letter`.
- Do not restore the removed iframe development comparison pages.
- Keep `runtime_host=iframe` accepted as a compatibility signal unless a separate rollback plan explicitly removes it.
- Keep formal `Copyright` / `LICENSE` header comments unchanged.
- Prefer moving code, splitting files, and adjusting imports / exports over rewriting logic.
- Every phase must be independently testable.
- Every phase must be independently revertible.
- Do not mix visual experiments or renderer replacement work into this module-split stream.

## Layer Model

Every file movement must identify one owner layer before it is made.

### 1. Server Runtime Assembly

Runs in Node / Next.js server context.

Owns:

- loading runtime payload JSON
- applying server-side payload localization and defaults
- selecting asset profiles
- loading archived runtime template files
- building full runtime HTML documents
- building container runtime packages
- serializing values for inline script injection

Preferred location:

- `src/lib/runtime-core/server/**`

Allowed:

- filesystem reads
- local TypeScript imports
- structured package objects
- HTML string assembly

Forbidden:

- browser DOM access
- shell event handling
- React component state

### 2. Browser Runtime Bridge

Runs inside the runtime container script context after scripts are loaded.

Owns:

- runtime readiness messages
- runtime height messages
- runtime-to-shell playback state messages
- metronome command intake
- public SVG label / visibility transforms
- runtime-local DOM observation required for host integration

Preferred location:

- `src/lib/runtime-core/bridge/**`

Allowed:

- self-contained script builders
- browser globals available in the runtime container script context
- serialized configuration from the server assembly layer

Forbidden:

- assuming normal TypeScript imports exist at browser runtime unless explicitly bundled or serialized
- moving core music parsing or rendering into the bridge
- changing runtime timing or sound semantics

### 3. Public React Shell

Runs in the Next.js / React app.

Owns:

- public song page controls
- route and query-state coordination
- instrument / fingering controls
- playback and metronome UI
- host lifecycle
- loading, errors, and public layout
- English public copy

Preferred locations:

- `src/components/song/**`
- `src/components/song/runtime-host/**`
- `src/lib/runtime-core/publicRuntimeHostMode.ts`
- `src/lib/runtime-core/publicRuntimeHostRollout.ts`
- `src/lib/runtime-core/publicRuntimePaths.ts`

Allowed:

- normal React hooks and components
- normal TypeScript imports
- shell-owned state machines
- host controller abstractions

Forbidden:

- direct edits to runtime core parser / renderer behavior
- reaching around `PublicRuntimeHostController` for routine shell commands
- reintroducing iframe-specific assumptions into shell code

### 4. Compatibility Facade

Preserves historical import names while the codebase migrates.

Current file:

- `src/lib/kuailepu/runtime.ts`

Owns:

- legacy `Kuailepu*` export names
- direct re-exports from `src/lib/runtime-core/publicRuntime.ts`
- short boundary comments that prevent future logic from drifting back into this facade

Forbidden:

- adding new primary runtime logic
- adding new browser bridge logic
- adding new shell logic

Required file-header comment template:

```ts
/**
 * Compatibility facade only.
 *
 * This file may only:
 * - preserve historical `Kuailepu*` export names
 * - re-export the current `PublicRuntime*` implementation
 * - keep boundary comments that prevent logic from drifting back here
 *
 * Do not add:
 * - runtime assembly logic
 * - browser bridge logic
 * - React shell logic
 * - parser / renderer / fingering / playback logic
 *
 * New primary runtime implementation belongs in `src/lib/runtime-core/**`.
 */
```

Comment and content check standard for `src/lib/kuailepu/runtime.ts`:

- The file must contain only compatibility comments, `export { ... } from ...`, and `export type { ... } from ...`.
- It must not contain function declarations, class declarations, runtime constants, DOM code, filesystem code, or conditional branches.
- It must not import implementation modules for local execution; re-export statements are allowed.
- If a future task needs new behavior, place it under the correct `src/lib/runtime-core/**` layer and re-export it here only when legacy callers require the old name.
- Before merging a compatibility-facade change, review `git diff -- src/lib/kuailepu/runtime.ts` and confirm the diff is limited to comments or re-export lists.

## Split Rules

Every candidate split must pass these checks before implementation.

1. Execution context is clear: server, runtime container script context, React shell, or compatibility facade.
2. Imports are valid for that execution context.
3. Public behavior is unchanged.
4. Runtime asset order is unchanged unless a separate asset-profile task approves the change.
5. Bridge script output stays self-contained.
6. Compare / publish behavior stays on the current baseline.
7. Moved code keeps existing comments that explain fragile behavior.
8. No public copy changes are included unless the phase explicitly allows them.

## Phase 0: Inventory And Baseline Lock

Status: complete.

### Goal

Build an explicit inventory of runtime-facing files before moving code.

### Concrete Scope

- Record current large files and their line counts.
- Map public exports from `src/lib/runtime-core/publicRuntime.ts`.
- Map legacy exports from `src/lib/kuailepu/runtime.ts`.
- Map all imports of runtime host components.
- Identify bridge script builders that are already self-contained.
- Identify obsolete names or comments left from iframe-era implementation.

### Files

Read-only inventory targets:

- `src/lib/runtime-core/publicRuntime.ts`
- `src/lib/kuailepu/runtime.ts`
- `src/lib/runtime-core/server/**`
- `src/lib/runtime-core/bridge/**`
- `src/components/song/PublicRuntimeInteractiveShell.tsx`
- `src/components/song/runtime-host/**`

Potential documentation output:

- update this document with discovered inventory notes if the implementation differs from the baseline above

### Forbidden

- Do not move code in this phase.
- Do not rename public exports in this phase.
- Do not alter runtime HTML output in this phase.

### Acceptance

- `git status --short --branch` reviewed before edits: complete.
- Large-file targets are listed: complete.
- Candidate split list is ordered by risk: complete.
- The inventory table below is updated in this document when Phase 0 runs: complete.
- `git diff --check -- docs/runtime-decoupling-module-split-plan.md` passes: complete.

### Inventory Results

Phase 0 was executed as a read-only source inventory plus this documentation update.

No source files, exports, runtime logic, runtime HTML output, parser behavior, SVG rendering behavior, fingering mapping, playback timing, or sound behavior were modified.

Public exports from `src/lib/runtime-core/publicRuntime.ts`:

| Export | Kind | Responsibility |
|--------|------|----------------|
| `loadPublicRuntimeSongPayload` | function | Loads the deployable public runtime payload archive for a song id. |
| `resolvePublicRuntimeContextState` | function | Resolves public runtime context state from payload and optional shell state. |
| `hasPublicRuntimeLyricContent` | function | Detects whether a payload has lyric text content. |
| `hasPublicRuntimeLyricToggle` | function | Determines whether the public lyric toggle should exist. |
| `buildPublicRuntimeHtml` | function | Builds full public runtime HTML by returning `buildPublicRuntimePackageData(...).html`. |
| `buildPublicRuntimePackageData` | function | Main public runtime package assembly entry; prepares payload, visual theme, bridge script, and package input. |
| `buildPublicRuntimeLetterTrackData` | function | Builds public letter-track data from notation, raw notation, payload, and state. |

Legacy and compatibility exports from `src/lib/kuailepu/runtime.ts`:

| Export | Kind | Source | Responsibility |
|--------|------|--------|----------------|
| `buildKuailepuRuntimeHtml` | compatibility function re-export | `buildPublicRuntimeHtml` | Preserves old Kuailepu runtime HTML builder name. |
| `buildKuailepuLetterTrackData` | compatibility function re-export | `buildPublicRuntimeLetterTrackData` | Preserves old Kuailepu letter-track builder name. |
| `hasKuailepuLyricContent` | compatibility function re-export | `hasPublicRuntimeLyricContent` | Preserves old lyric-content helper name. |
| `hasPublicKuailepuLyricToggle` | compatibility function re-export | `hasPublicRuntimeLyricToggle` | Preserves old public lyric-toggle helper name. |
| `loadKuailepuSongPayload` | compatibility function re-export | `loadPublicRuntimeSongPayload` | Preserves old runtime payload loader name. |
| `resolveKuailepuRuntimeState` | compatibility function re-export | `resolvePublicRuntimeContextState` | Preserves old runtime state resolver name. |
| `buildPublicRuntimeHtml` | direct function re-export | `../runtime-core/publicRuntime.ts` | Current public runtime HTML builder. |
| `buildPublicRuntimeLetterTrackData` | direct function re-export | `../runtime-core/publicRuntime.ts` | Current public letter-track builder. |
| `hasPublicRuntimeLyricContent` | direct function re-export | `../runtime-core/publicRuntime.ts` | Current lyric-content helper. |
| `hasPublicRuntimeLyricToggle` | direct function re-export | `../runtime-core/publicRuntime.ts` | Current lyric-toggle helper. |
| `loadPublicRuntimeSongPayload` | direct function re-export | `../runtime-core/publicRuntime.ts` | Current runtime payload loader. |
| `resolvePublicRuntimeContextState` | direct function re-export | `../runtime-core/publicRuntime.ts` | Current runtime state resolver. |
| `PublicLetterTrackData` | type re-export | `./runtimeTypes.ts` | Current public letter-track data type. |
| `PublicLetterTrackMode` | type re-export | `./runtimeTypes.ts` | Current public letter-track mode type. |
| `PublicRuntimeAssetProfileName` | type re-export | `./runtimeTypes.ts` | Current public runtime asset profile type. |
| `PublicRuntimePayload` | type re-export | `./runtimeTypes.ts` | Current public runtime payload type. |
| `PublicRuntimePublicFeature` | type re-export | `./runtimeTypes.ts` | Current public runtime feature type. |
| `PublicRuntimeState` | type re-export | `./runtimeTypes.ts` | Current public runtime state type. |
| `PublicRuntimeTextMode` | type re-export | `./runtimeTypes.ts` | Current public runtime text-mode type. |
| `PublicRuntimeVisualTheme` | type re-export | `./runtimeTypes.ts` | Current public runtime visual theme type. |
| `KuailepuLetterTrackData` | type re-export | `./runtimeTypes.ts` | Legacy Kuailepu letter-track data type. |
| `KuailepuLetterTrackMode` | type re-export | `./runtimeTypes.ts` | Legacy Kuailepu letter-track mode type. |
| `KuailepuRuntimeAssetProfileName` | type re-export | `./runtimeTypes.ts` | Legacy Kuailepu asset profile type. |
| `KuailepuRuntimePayload` | type re-export | `./runtimeTypes.ts` | Legacy Kuailepu payload type. |
| `KuailepuRuntimePublicFeature` | type re-export | `./runtimeTypes.ts` | Legacy Kuailepu feature type. |
| `KuailepuRuntimeState` | type re-export | `./runtimeTypes.ts` | Legacy Kuailepu state type. |
| `KuailepuRuntimeTextMode` | type re-export | `./runtimeTypes.ts` | Legacy Kuailepu text-mode type. |
| `KuailepuRuntimeVisualTheme` | type re-export | `./runtimeTypes.ts` | Legacy Kuailepu visual theme type. |

Runtime host import relationships:

| Importing file | Runtime-host imports | Relationship |
|----------------|----------------------|--------------|
| `src/components/song/PublicRuntimeInteractiveShell.tsx` | `ContainerRuntimeHost`, `dispatchContainerRuntimeCommand`, `PublicRuntimeHostSwitch`, `PublicRuntimeHostController` types | Public shell owns controls and mounts the container host through the controller boundary. |
| `src/components/song/PublicRuntimeHostController.ts` | `runtime-host/types` | Re-exports host controller/message types and centralizes host message subscription. |
| `src/components/song/runtime-host/ContainerRuntimeHost.tsx` | `RuntimeScriptLoader`, `RuntimeStyleInjector`, `dispatchContainerRuntimeCommand`, `useRuntimeContainerMeasurement`, `useRuntimeHostLifecycle`, `runtime-host/types` | Main React-owned runtime container host composition root. |
| `src/components/song/runtime-host/ExportRuntimeHost.tsx` | `ContainerRuntimeHost` | Thin export/print/Pinterest host wrapper around the container host. |
| `src/components/song/runtime-host/RuntimeHostReviewClient.tsx` | `PublicRuntimeHostController` types, `ContainerRuntimeHost`, `dispatchContainerRuntimeCommand`, `RuntimeScriptLoaderDiagnostics`, `useRuntimeContainerMeasurement` types | Dev review client coordinates diagnostics and host commands for runtime review pages. |
| `src/components/song/runtime-host/types.ts` | `RuntimeScriptLoaderDiagnostics`, `RuntimeContainerMeasurementSnapshot` | Shared runtime host type boundary. |
| `src/app/dev/runtime-host/[id]/page.tsx` | `RuntimeHostReviewClient` | Dev runtime-host review route. |
| `src/app/dev/print/song/[id]/page.tsx` | `ExportRuntimeHost` | Internal print preview route. |
| `src/app/dev/pinterest/song/[id]/page.tsx` | `ExportRuntimeHost` | Pinterest preview/export route. |
| `src/components/dev/RuntimeHostSideBySideReview.tsx` | `RuntimeHostReviewClient` | Dev wrapper for runtime host review UI. |
| `src/components/dev/NativeRendererSideBySideReview.tsx` | `ContainerRuntimeHost` | Dev native-renderer comparison page uses the same runtime container host. |

Self-contained bridge script builders already present:

| Builder | File | Lines of code | Notes |
|---------|------|---------------|-------|
| `buildPublicRuntimeBridgeScript` | `src/lib/runtime-core/bridge/publicRuntimeBridge.ts` | 96 | Top-level bridge assembler; serializes song id, letter track, text mode, features, and visual theme into one script tag. |
| `buildPublicRuntimeHeightBridgeScript` | `src/lib/runtime-core/bridge/height/publicRuntimeHeightBridge.ts` | 55 | Runtime height reporting script fragment. |
| `buildPublicRuntimeMetronomeBridgeScript` | `src/lib/runtime-core/bridge/metronome/publicRuntimeMetronomeBridge.ts` | 174 | Metronome bridge script fragment. |
| `buildPublicRuntimePlaybackBridgeScript` | `src/lib/runtime-core/bridge/playback/publicRuntimePlaybackBridge.ts` | 944 | Playback bridge script fragment; large and high-risk for future split work. |
| `buildPublicRuntimeSvgBridgeScript` | `src/lib/runtime-core/bridge/svg/publicRuntimeSvgBridge.ts` | 2493 | SVG / visible-sheet transform script fragment; largest bridge file and highest-risk split target. |
| `buildPublicRuntimeBootstrapScript` | `src/lib/runtime-core/bridge/script/publicRuntimeBootstrap.ts` | 6 | Concatenates message and lifecycle bridge fragments. |
| `buildPublicRuntimeLifecycleBootstrapScript` | `src/lib/runtime-core/bridge/script/publicRuntimeLifecycleBootstrap.ts` | 114 | Lifecycle/readiness bootstrap fragment. |
| `buildPublicRuntimeMessageBridgeScript` | `src/lib/runtime-core/bridge/script/publicRuntimeMessageBridge.ts` | 39 | Runtime command intake via container custom event and same-origin message event. |

Iframe-era residue reviewed during Phase 0:

| Location | Current residue | Phase 0 interpretation |
|----------|-----------------|------------------------|
| `src/components/song/PublicRuntimeInteractiveShell.tsx` | `runtimeHostMode = 'iframe'` default prop value | Intentional compatibility signal path; do not change during inventory. |
| `src/lib/runtime-core/publicRuntimeHostMode.ts` | `PublicRuntimeHostMode = 'iframe' \| 'container'`, default `'iframe'` | Intentional compatibility / rollout model naming; needs future Phase 6 review before any rename. |
| `src/lib/runtime-core/publicRuntimeHostRollout.ts` | rollout branches and labels still mention iframe baseline | Intentional compatibility / diagnostics residue; do not change in Phase 0. |
| `src/components/song/runtime-host/PublicRuntimeHostSwitch.tsx` | mode option includes `'iframe'` | Intentional compatibility UI signal; current behavior resolves to container host after Phase 15. |
| `src/components/song/runtime-host/RuntimeHostReviewClient.tsx` | dev copy says retired iframe path resolves to React container | Current explanatory copy, not stale behavior. |
| `src/lib/runtime-core/bridge/*` | bridge still uses `window.parent.postMessage` and same-origin `message` events | Transport compatibility residue; not evidence of an active iframe host by itself. |
| `docs/runtime-decoupling-module-split-plan.md` | intentional references to iframe removal, compatibility signal, and Phase 6 cleanup | Documentation context, not source residue. |

### Appendix: Inventory Table

Filled during Phase 0 and kept in this document until the split work is complete.

| File path | Lines of code | Core responsibility | Dependency layer | Split priority |
|-----------|---------------|---------------------|------------------|----------------|
| `src/lib/runtime-core/publicRuntime.ts` | 88 | Stable public runtime API facade; delegates implementation to server assembly helpers while preserving public export names and signatures. | Server runtime assembly facade | Complete in Phase 1 |
| `src/lib/kuailepu/runtime.ts` | 66 | Legacy `Kuailepu*` compatibility re-exports plus boundary comments. | Compatibility facade | High |
| `src/components/song/PublicRuntimeInteractiveShell.tsx` | 1220 | Public runtime shell controls, query/state wiring, host command dispatch, playback/metronome UI, loading/error presentation. | Public React shell | High |
| `src/components/song/PublicRuntimeHostController.ts` | 51 | Host controller/message type re-export and same-origin host message subscription helper. | Public React shell / runtime host boundary | Medium |
| `src/components/song/runtime-host/ContainerRuntimeHost.tsx` | 178 | React-owned container host composition root; mounts runtime HTML, style injector, script loader, measurement, lifecycle, and host controller. | Public React shell / runtime host | Medium |
| `src/components/song/runtime-host/ExportRuntimeHost.tsx` | 60 | Export/print/Pinterest wrapper around `ContainerRuntimeHost`. | Public React shell / runtime host export wrapper | Low |
| `src/components/song/runtime-host/PublicRuntimeHostSwitch.tsx` | 82 | Dev/diagnostic runtime host mode switch UI, including legacy `iframe` compatibility mode label. | Public React shell / runtime host diagnostics | Low |
| `src/components/song/runtime-host/RuntimeHostReviewClient.tsx` | 844 | Runtime host dev review UI, diagnostics, host command tests, and side-by-side state reporting. | Public React shell / dev review | High |
| `src/components/song/runtime-host/RuntimeScriptLoader.tsx` | 193 | Client-side runtime script loading, script diagnostics, and script load status reporting. | Public React shell / runtime host script loading | Medium |
| `src/components/song/runtime-host/RuntimeStyleInjector.tsx` | 513 | Runtime CSS asset loading, selector scoping, injection, and diagnostics. | Public React shell / runtime host style | High |
| `src/components/song/runtime-host/containerRuntimeTransport.ts` | 32 | Dispatches validated runtime host command messages into the container event channel. | Public React shell / runtime host transport | Low |
| `src/components/song/runtime-host/types.ts` | 65 | Shared runtime host controller, message, measurement, and container host prop types. | Public React shell / runtime host type boundary | Low |
| `src/components/song/runtime-host/useRuntimeContainerMeasurement.ts` | 312 | Runtime container measurement, resize feedback, loading state, and synthetic height event handling. | Public React shell / runtime host measurement | High |
| `src/components/song/runtime-host/useRuntimeHostLifecycle.ts` | 113 | Runtime host lifecycle callbacks for ready/loading/measurement/controller cleanup. | Public React shell / runtime host lifecycle | Medium |
| `src/lib/runtime-core/server/assembly/publicRuntimeAssetManifest.ts` | 147 | Builds structured runtime asset entries and preserves runtime asset list order. | Server runtime assembly | Medium |
| `src/lib/runtime-core/server/assembly/publicRuntimeDocument.ts` | 59 | Builds full public runtime HTML document from scaffold and package parts. | Server runtime assembly | Low |
| `src/lib/runtime-core/server/assembly/publicRuntimePackage.ts` | 39 | Builds public runtime package data for document/container consumers. | Server runtime assembly | Medium |
| `src/lib/runtime-core/server/assembly/publicRuntimeBuildInput.ts` | 139 | Prepares payload defaults, page title, visual theme, bridge script input, package input, lyric helpers, payload loading facade helpers, and letter-track delegation for the public runtime API facade. | Server runtime assembly / build input preparation | Complete in Phase 1 |
| `src/lib/runtime-core/server/assets/publicRuntimeAssets.ts` | 241 | Resolves public runtime asset profiles and script/style asset lists. | Server runtime assembly / asset selection | Medium |
| `src/lib/runtime-core/server/html/runtimeHtmlDocument.ts` | 4 | Re-export shim for HTML scaffold helper. | Server runtime assembly / HTML compatibility | Low |
| `src/lib/runtime-core/server/html/runtimeHtmlScaffold.ts` | 407 | Runtime HTML scaffold helpers, inline serialization, head/body assembly, and HTML injection support. | Server runtime assembly / HTML scaffolding | High |
| `src/lib/runtime-core/server/payload/publicRuntimePayloadFiles.ts` | 12 | Resolves raw and packed public runtime payload file paths. | Server runtime assembly / payload file paths | Low |
| `src/lib/runtime-core/server/payload/publicRuntimePayloadLocalization.ts` | 40 | Localizes public runtime payload title/subtitle fields. | Server runtime assembly / payload localization | Low |
| `src/lib/runtime-core/server/payload/runtimePayload.ts` | 253 | Loads runtime payload archives, prefers packed production payloads, parses payload JSON, and applies localization. | Server runtime assembly / payload loading | Medium |
| `src/lib/runtime-core/server/publicRuntimeContainerPackage.ts` | 61 | Builds container package data and currently resolves song notation data for letter-track generation. | Server runtime assembly / container package | Medium |
| `src/lib/runtime-core/server/template/publicRuntimeTemplateFiles.ts` | 5 | Re-export shim for archived runtime template loader. | Server runtime assembly / template compatibility | Low |
| `src/lib/runtime-core/server/template/runtimeTemplate.ts` | 63 | Loads archived public runtime HTML template from vendor archive. | Server runtime assembly / template loading | Low |
| `src/lib/runtime-core/bridge/publicRuntimeBridge.ts` | 96 | Top-level runtime container bridge script assembler and inline serialization helper. | Browser runtime bridge | Medium |
| `src/lib/runtime-core/bridge/publicRuntimeMessageTypes.ts` | 95 | Shared runtime host message and command constants/type guards. | Runtime bridge / public React shell shared contract | Medium |
| `src/lib/runtime-core/bridge/height/publicRuntimeHeightBridge.ts` | 55 | Self-contained runtime height reporting script fragment. | Browser runtime bridge / height | Medium |
| `src/lib/runtime-core/bridge/metronome/publicRuntimeMetronomeBridge.ts` | 174 | Self-contained metronome bridge script fragment. | Browser runtime bridge / metronome | Medium |
| `src/lib/runtime-core/bridge/playback/publicRuntimePlaybackBridge.ts` | 944 | Self-contained playback bridge script fragment, playback panel observation, and playback status posting. | Browser runtime bridge / playback | High |
| `src/lib/runtime-core/bridge/script/publicRuntimeBootstrap.ts` | 6 | Concatenates message and lifecycle bootstrap script fragments. | Browser runtime bridge / bootstrap | Low |
| `src/lib/runtime-core/bridge/script/publicRuntimeLifecycleBootstrap.ts` | 114 | Self-contained lifecycle, readiness, redraw, and runtime command bootstrap script fragment. | Browser runtime bridge / lifecycle | Medium |
| `src/lib/runtime-core/bridge/script/publicRuntimeMessageBridge.ts` | 39 | Self-contained runtime host command intake script fragment. | Browser runtime bridge / message intake | Low |
| `src/lib/runtime-core/bridge/svg/publicRuntimeSvgBridge.ts` | 2493 | Self-contained public SVG / visible-sheet transform script fragment, including letter label and public visual behavior. | Browser runtime bridge / SVG transform | High |

## Phase 1: Public Runtime Facade Cleanup

Status: complete.

### Goal

Keep `src/lib/runtime-core/publicRuntime.ts` as a stable public API facade and move implementation details behind narrower modules.

### Concrete Scope

Safe candidates:

- move HTML/package input normalization into a server assembly helper
- move title and payload preparation into server-side helpers
- keep exported function names stable from `publicRuntime.ts`
- keep `src/lib/kuailepu/runtime.ts` as a compatibility re-export shell

Target shape:

```text
src/lib/runtime-core/publicRuntime.ts
  -> exports stable public APIs only

src/lib/runtime-core/server/assembly/publicRuntimeBuildInput.ts
  -> created in Phase 1
  -> prepares payload, state, text mode, visual theme, and bridge inputs
```

### Files

Likely modify:

- `src/lib/runtime-core/publicRuntime.ts`

Likely add:

- `src/lib/runtime-core/server/assembly/publicRuntimeBuildInput.ts` (created in Phase 1)

### Forbidden

- Do not change exported API names.
- Do not change generated runtime HTML behavior.
- Do not change bridge script contents except for whitespace that is unavoidable from moved builders.
- Do not add new primary logic to `src/lib/kuailepu/runtime.ts`.

### Acceptance

- `npm run typecheck` passes: complete.
- A focused diff shows moved code and import updates only: complete.
- Existing callers continue importing from the same facade paths: complete.
- `src/lib/kuailepu/runtime.ts` remains a compatibility re-export facade with no new business logic: complete.

## Phase 2: Server Container Package Boundary Split

Status: planned.

### Goal

Separate public container package construction from song-catalog lookup and letter-track preparation.

### Concrete Scope

Current concern:

- `src/lib/runtime-core/server/publicRuntimeContainerPackage.ts` builds the container package and also resolves song notation data for letter-track generation.

Safe split:

- package construction stays in server runtime package code
- catalog / imported-song lookup moves to a small song-data resolver
- letter-track input derivation becomes an explicit helper

Target shape:

```text
src/lib/runtime-core/server/publicRuntimeContainerPackage.ts
src/lib/runtime-core/server/payload/publicRuntimeSongData.ts
src/lib/runtime-core/server/assembly/publicRuntimeLetterTrackInput.ts
```

### Files

Likely modify:

- `src/lib/runtime-core/server/publicRuntimeContainerPackage.ts`

Likely add:

- `src/lib/runtime-core/server/payload/publicRuntimeSongData.ts` (Phase2执行时创建)
- `src/lib/runtime-core/server/assembly/publicRuntimeLetterTrackInput.ts` (Phase2执行时创建)

### Forbidden

- Do not change letter-mode transformation logic.
- Do not change `note_label_mode` handling.
- Do not change which source wins between catalog and imported / candidate song docs.

### Acceptance

- `npm run typecheck` passes.
- One letter-mode public song and one number-mode parity URL render the same notation behavior in manual QA.

## Phase 3: Runtime Host Component Split

Status: planned.

### Goal

Reduce runtime-host React files into smaller components and hooks while preserving host behavior.

### Concrete Scope

High-value targets:

- `RuntimeHostReviewClient.tsx`
- `RuntimeStyleInjector.tsx`
- `useRuntimeContainerMeasurement.ts`
- `ContainerRuntimeHost.tsx`

Suggested ownership split:

```text
src/components/song/runtime-host/review/**       -> Phase3执行时创建
src/components/song/runtime-host/style/**        -> Phase3执行时创建
src/components/song/runtime-host/measurement/**  -> Phase3执行时创建
src/components/song/runtime-host/lifecycle/**    -> Phase3执行时创建
```

Candidate extractions:

- review route controls
- review diagnostics view
- style asset loading
- style text rewriting / scoping orchestration
- resize observer setup
- runtime height calculation helpers
- host lifecycle cleanup helpers

### Files

Likely modify:

- `src/components/song/runtime-host/RuntimeHostReviewClient.tsx`
- `src/components/song/runtime-host/RuntimeStyleInjector.tsx`
- `src/components/song/runtime-host/useRuntimeContainerMeasurement.ts`
- `src/components/song/runtime-host/ContainerRuntimeHost.tsx`

Likely add:

- small files under `src/components/song/runtime-host/review/**` (Phase3执行时创建)
- small files under `src/components/song/runtime-host/style/**` (Phase3执行时创建)
- small files under `src/components/song/runtime-host/measurement/**` (Phase3执行时创建)

### Forbidden

- Do not change runtime script loading order.
- Do not change CSS selector scoping semantics.
- Do not change measurement thresholds or debounce timing unless a bug fix is explicitly approved.
- Do not change public runtime layout or loading states.

### Acceptance

- `npm run typecheck` passes.
- Public song page renders.
- Dev review page renders.
- Internal print and Pinterest preview routes still receive a runtime host.

## Phase 4: Public Runtime Shell Split

Status: planned.

### Goal

Reduce `PublicRuntimeInteractiveShell.tsx` by extracting shell-owned controls and state wiring into focused modules.

### Concrete Scope

Candidate extractions:

- query-state synchronization
- instrument / fingering control model
- playback control model
- metronome control model
- mobile tools drawer state
- shell loading / error presentation
- runtime host event subscriptions

Suggested target shape:

```text
src/components/song/public-runtime-shell/PublicRuntimeInteractiveShell.tsx  -> Phase4执行时创建
src/components/song/public-runtime-shell/usePublicRuntimeQueryState.ts       -> Phase4执行时创建
src/components/song/public-runtime-shell/usePublicRuntimeControls.ts         -> Phase4执行时创建
src/components/song/public-runtime-shell/usePublicRuntimePlayback.ts         -> Phase4执行时创建
src/components/song/public-runtime-shell/usePublicRuntimeMetronome.ts        -> Phase4执行时创建
src/components/song/public-runtime-shell/PublicRuntimeToolbar.tsx            -> Phase4执行时创建
src/components/song/public-runtime-shell/PublicRuntimeStatus.tsx             -> Phase4执行时创建
```

Compatibility option:

- keep `src/components/song/PublicRuntimeInteractiveShell.tsx` as a re-export wrapper until imports are migrated

### Files

Likely modify:

- `src/components/song/PublicRuntimeInteractiveShell.tsx`

Likely add:

- files under `src/components/song/public-runtime-shell/**` (Phase4执行时创建)

### Forbidden

- Do not change public visible copy unless needed to preserve current text after extraction.
- Do not change URL query semantics.
- Do not change default instrument / fingering selection.
- Do not change playback or metronome command payloads.
- Do not bypass `PublicRuntimeHostController`.

### Acceptance

- `npm run typecheck` passes.
- Public page instrument switches preserve query state.
- Listen opens, plays, and stops through the same host boundary.
- Metronome starts and stops through the same host boundary.
- Mobile `More Tools` behavior stays unchanged.

## Phase 5: Bridge Builder Boundary Tightening

Status: planned.

### Goal

Make bridge submodules easier to maintain without breaking injected-script self-containment.

### Concrete Scope

Current bridge submodules already exist for:

- height
- metronome
- playback
- script/bootstrap
- SVG transforms

Safe cleanup:

- group script fragments by execution stage
- keep serialization centralized
- add tests or snapshots around bridge output where useful
- remove obsolete iframe wording from comments when it no longer describes runtime-container behavior

Possible target shape:

```text
src/lib/runtime-core/bridge/publicRuntimeBridge.ts
src/lib/runtime-core/bridge/serialization.ts
src/lib/runtime-core/bridge/scriptStages.ts
src/lib/runtime-core/bridge/height/**
src/lib/runtime-core/bridge/metronome/**
src/lib/runtime-core/bridge/playback/**
src/lib/runtime-core/bridge/svg/**
```

### Files

Likely modify:

- `src/lib/runtime-core/bridge/publicRuntimeBridge.ts`
- bridge submodules under `src/lib/runtime-core/bridge/**`

Likely add:

- `src/lib/runtime-core/bridge/serialization.ts` (Phase5执行时创建)
- optional bridge-output tests if the existing test setup supports them cleanly

### Forbidden

- Do not import normal TypeScript helpers into code that must execute only in the runtime container script context unless their source is serialized into the script.
- Do not change playback timing.
- Do not change SVG render geometry.
- Do not change letter label anchoring behavior.

### Acceptance

- `npm run typecheck` passes.
- Bridge script remains one self-contained runtime container script output.
- Public song page reports readiness and height.
- Playback and metronome messages still cross the host boundary.

## Phase 6: Obsolete Residue And Naming Cleanup

Status: planned.

### Goal

Clean comments, filenames, and dead branches that describe removed iframe-era behavior, while preserving compatibility signals.

### Concrete Scope

Candidates:

- comments that still say iframe when they mean runtime container or runtime container script context
- unused iframe-only helpers
- dev route references to removed comparison pages
- stale docs that imply iframe remains an active host

Keep:

- `runtime_host=iframe` compatibility signal references
- `/api/kuailepu-runtime/[id]` diagnostics and compatibility behavior
- historical context where it prevents future mistakes

### Files

Likely modify:

- docs under `docs/**`
- comments in `src/components/song/runtime-host/**`
- comments in `src/lib/runtime-core/bridge/**`
- comments in `src/lib/runtime-core/publicRuntimeHostMode.ts`
- comments in `src/lib/runtime-core/publicRuntimeHostRollout.ts`

### Forbidden

- Do not remove working compatibility route behavior.
- Do not rename stable public routes.
- Do not delete runtime static assets.
- Do not hide meaningful historical warnings that explain fragile boundaries.

### Acceptance

- `rg "iframe"` results are reviewed and remaining matches are intentional.
- `npm run typecheck` passes if code comments / names were touched.
- Docs describe current post-Phase-15 state consistently.

## Phase 7: Runtime Module Index And Ownership Docs

Status: planned.

### Goal

Document the final module ownership after split work so future changes do not drift back into large mixed files.

### Concrete Scope

- Add a module index section to this document or a small companion doc.
- List owner layer, allowed dependencies, and forbidden dependencies for each runtime subdirectory.
- Update `README.md` and `docs/agent-handoff.md` topic links if paths change.

Suggested ownership table:

```text
src/lib/runtime-core/server/**       server assembly only
src/lib/runtime-core/bridge/**       runtime container script builders only
src/lib/runtime-core/client/**       React-page browser helpers only
src/lib/runtime-core/state/**        pure runtime state adaptation
src/lib/runtime-core/letterTrack/**  public note-label adaptation only
src/lib/runtime-core/visual/**       public visual theme data only
src/components/song/runtime-host/**  React runtime host implementation
src/components/song/public-runtime-shell/**  public song shell controls
```

### Forbidden

- Do not turn the ownership doc into a broad architecture rewrite plan.
- Do not document aspirational routes as if they already exist.

### Acceptance

- A new developer can identify the correct target module before editing runtime integration code.
- Future tasks can reference this plan instead of re-reading every runtime document.

## Validation Matrix

Use the smallest validation set that matches the risk of each phase.

| 变更类型 | 验证命令 | 手动QA必选项 |
|----------|----------|----------------|
| Documentation-only changes | `git diff -- docs && git diff --check -- docs/runtime-decoupling-module-split-plan.md` | 1. Confirm the document changes only clarify execution details; 2. Confirm no source file changed. |
| Compatibility facade changes | `npm run typecheck` | 1. Review `src/lib/kuailepu/runtime.ts` diff; 2. Confirm the file contains only comments and re-exports; 3. Confirm legacy imports still typecheck. |
| Import/export-only TypeScript moves | `npm run typecheck` | 1. Confirm focused diff shows moved code and import updates only; 2. Confirm exported names from public facades are unchanged. |
| Server assembly changes | `npm run typecheck && npm run build` | 1. Open one public song in default `letter` mode; 2. Open one public song in `number` mode; 3. Confirm runtime asset order was not intentionally changed. |
| Runtime host or shell changes | `npm run typecheck && npm run build` | 1. Public song page renders; 2. Instrument / fingering switches preserve query state; 3. Listen opens, plays, and stops; 4. Metronome starts and stops; 5. Mobile `More Tools` behavior stays unchanged. |
| Runtime bridge code | `npm run typecheck && npm run build` | 1. Public song page reports readiness and height; 2. Playback / metronome messages cross the host boundary normally; 3. SVG rendering has no geometry change. |
| Runtime measurement changes | `npm run typecheck && npm run build` | 1. Public song page has no clipped sheet; 2. Public song page has no large blank bottom space; 3. Internal print preview receives the expected runtime height. |
| Runtime style-scope changes | `npm run typecheck && npm run build` | 1. Runtime CSS is scoped under the runtime root; 2. Public shell layout is not affected by runtime CSS; 3. Print or export route still displays the sheet. |
| Publish-sensitive or parity-sensitive runtime changes | `npm run validate:content && npm run validate:songbook && npm run preflight:kuailepu-publish -- <slug...> && npm run build` | 1. Use `note_label_mode=number` for parity; 2. Compare one Kuailepu-backed song when applicable; 3. Confirm public default `letter` mode still works afterward. |
| Print / Pinterest / export host changes | `npm run typecheck && npm run build` | 1. Open one internal print preview; 2. Open one Pinterest preview or export path; 3. Confirm both paths use the runtime container host. |

Do not run `npm run build` and `npm run test:e2e` concurrently in the same workspace.

## Risk Register

| Risk description | Failure mode | Mitigation | Detection method |
|------------------|--------------|------------|------------------|
| Module split changes execution context | A server TypeScript helper is imported into runtime container script context and is unavailable at runtime. | Keep bridge script fragments serialized and self-contained; review every bridge split for actual runtime container script context. | After bridge splits, run `npm run typecheck && npm run build`; manually inspect the generated bridge entry and confirm runtime container script dependencies are inlined or serialized. |
| Asset order changes | Runtime scripts load in a different order and global initialization changes. | Preserve asset list order; keep asset-profile changes out of routine module split phases. | Diff asset manifest construction; manually verify one public song renders and reports readiness after server assembly changes. |
| Shell split alters query state | Instrument, fingering, note mode, or feature flags stop round-tripping through the URL. | Extract query logic as-is first; keep URL parameter names stable. | Manually switch instrument, fingering, and note mode on a public song and confirm the URL and rendered state stay synchronized. |
| Measurement split alters layout | Runtime area gains blank bottom space, clips the sheet, or creates nested scrolling. | Keep measurement constants unchanged during extraction; separate pure helpers from observer lifecycle without changing thresholds. | Manually compare one public song and one internal print preview; confirm no clipping, nested scrollbar, or blank bottom space. |
| Compatibility facade regains business logic | `src/lib/kuailepu/runtime.ts` starts accumulating implementation code again. | Enforce the required comment template and allow only comments plus re-exports. | Review `git diff -- src/lib/kuailepu/runtime.ts`; confirm there are no functions, classes, local runtime constants, DOM calls, or conditionals. |
| Comment cleanup removes useful warnings | Future developers lose context about fragile runtime boundaries. | Replace stale wording with current wording instead of deleting boundary explanations. | Review every removed comment in diff; confirm remaining comments still explain execution context and forbidden boundaries. |
| Public shell split changes visible copy | English public controls or status text changes unintentionally. | Move JSX as-is first and avoid copy edits during structure-only phases. | Review public shell diff for text changes; manually open a public song page and compare controls / status wording. |

## Success Criteria

This workstream is complete when:

- `src/lib/kuailepu/runtime.ts` remains a compatibility facade only.
- `src/lib/runtime-core/publicRuntime.ts` is a stable facade, not a mixed implementation file.
- server assembly code is grouped under `src/lib/runtime-core/server/**`.
- runtime container bridge code is grouped under `src/lib/runtime-core/bridge/**` and remains self-contained.
- React runtime host code is split by host, style, measurement, lifecycle, and review concerns.
- public runtime shell code is split by controls, query state, playback, metronome, and status concerns.
- obsolete iframe-era residue is reviewed and only intentional compatibility references remain.
- public song behavior, compare behavior, playback, metronome, print, and Pinterest/export behavior remain unchanged.
- Each phase is submitted as an independent PR.
- PR titles use this format: `runtime-module-split-phase-X: 核心操作`.
- After all phases are complete, a final module ownership inventory table is written below and kept current with this document.

Final module ownership inventory template:

| Module path | Owner layer | Allowed dependencies | Forbidden dependencies | Final status |
|-------------|-------------|----------------------|------------------------|--------------|
| `src/lib/runtime-core/server/**` | Server runtime assembly | filesystem reads, server helpers, runtime payload data | browser DOM, React state, runtime container script globals | TBD |
| `src/lib/runtime-core/bridge/**` | Browser runtime bridge | serialized configuration, runtime container script context globals | server filesystem reads, React hooks, non-serialized TS helper calls inside runtime container script output | TBD |
| `src/lib/runtime-core/client/**` | React-page browser helpers | browser APIs, shell-side runtime helpers | server filesystem reads, core renderer edits | TBD |
| `src/lib/runtime-core/state/**` | Runtime state adaptation | pure data transforms, runtime payload types | DOM access, React state, bridge script side effects | TBD |
| `src/lib/runtime-core/letterTrack/**` | Public note-label adaptation | notation data, payload state, pure transforms | core parser edits, SVG geometry edits, playback timing edits | TBD |
| `src/lib/runtime-core/visual/**` | Public visual theme data | visual config and pure theme resolution | renderer internals, runtime asset loading side effects | TBD |
| `src/components/song/runtime-host/**` | React runtime host implementation | React hooks, host controller types, runtime package data | core runtime parser / renderer edits, server filesystem reads | TBD |
| `src/components/song/public-runtime-shell/**` | Public song shell controls | React hooks, public controls, host controller boundary | direct runtime core DOM mutation, bypassing `PublicRuntimeHostController` | TBD |
| `src/lib/kuailepu/runtime.ts` | Compatibility facade | comments, re-exports, type re-exports | business logic, browser bridge logic, React shell logic | TBD |
