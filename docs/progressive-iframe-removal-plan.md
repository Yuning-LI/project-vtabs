# Progressive Iframe Removal Integration Plan

## Permanent Authorization Baseline

This project is based on frontend source code for which we have purchased complete commercial-exclusive authorization. All runtime integration, debugging, refactoring, and future replacement work in this document is treated as work on our own authorized source baseline.

The current program is a Next.js + React architecture upgrade and progressive iframe migration. The operational priority is stable integration first: keep the authorized runtime behavior intact, move it into a controllable React-owned host step by step, and only then continue deeper modularization and technical iteration.

This document is the execution plan for gradually moving the fully authorized runtime from an iframe-hosted page into a native React DOM container.

The project has complete commercial-exclusive authorization for the frontend source. This work is an architecture upgrade and source integration project. The goal is stable integration, controllability, and future maintainability, not a rewrite of the musical engine.

## Current Baseline

Already completed:

- Public runtime wording and planning docs have been aligned to the authorized-runtime architecture-upgrade framing.
- Runtime URL construction is centralized through `buildPublicRuntimeUrl(...)`.
- The React shell no longer sends playback commands by directly reaching into iframe DOM. It uses `PublicRuntimeHostController`.
- Runtime-to-shell message intake is centralized through the host-message subscription boundary.
- Phase 1 host contract hardening is complete: iframe-specific lifecycle and DOM access now live in `src/components/song/runtime-host/IframeRuntimeHost.tsx`, while `PublicRuntimeFrame` is only the shell wrapper.
- Phase 2 has started: full-document generation and structured runtime package output now live under `src/lib/runtime-core/server/assembly/**`.
- Phase 3 dev-only container host skeleton is complete: `/dev/runtime-host/<slug>` shows the iframe baseline next to a React-owned inert container.
- Phase 4 CSS scope isolation is complete for the dev container skeleton: runtime CSS assets are loaded, selector-prefixed, and injected only under `[data-public-runtime-root]`; Shadow DOM remains a future fallback only.
- Phase 8 bridge transport parity is complete on the dev comparison route: playback, playback panel state, metronome, visual theme, instrument/fingering remounts, and readiness diagnostics now work through the normalized host controller boundary.
- Phase 11 query-flagged public host selection is complete: public `/song` still defaults to iframe, while `runtime_host=container` can opt into the container host for parity review.
- Phase 12 export-route compatibility is complete: internal print and Pinterest preview/export routes still default to iframe, while `runtime_host=container` can opt into the container host for export parity checks.
- The iframe is still the active production host.
- Public behavior is still protected by the existing runtime route and existing runtime HTML assembly path.

Current important files:

- `src/components/song/PublicRuntimeHostController.ts`
- `src/components/song/PublicRuntimeFrame.tsx`
- `src/components/song/runtime-host/IframeRuntimeHost.tsx`
- `src/components/song/runtime-host/ContainerRuntimeHost.tsx`
- `src/components/song/runtime-host/RuntimeStyleInjector.tsx`
- `src/components/song/runtime-host/types.ts`
- `src/components/song/PublicRuntimeInteractiveShell.tsx`
- `src/lib/runtime-core/publicRuntimePaths.ts`
- `src/lib/runtime-core/publicRuntime.ts`
- `src/lib/runtime-core/server/assembly/**`
- `src/lib/runtime-core/client/styleScope.ts`
- `src/lib/runtime-core/bridge/**`
- `src/app/api/kuailepu-runtime/[id]/route.ts`
- `src/app/dev/runtime-host/[id]/page.tsx`

## Global Hard Constraints

These constraints apply to every phase in this plan.

- Do not modify notation parsing, SVG rendering, fingering mapping, playback timing, or musical business logic.
- Only change script loading, DOM container mounting, scope isolation, global-conflict handling, communication forwarding, and shell integration.
- Keep formal `Copyright` / `LICENSE` header comments unchanged.
- Preserve current iframe behavior as the correctness baseline until the non-iframe host has passed parity gates.
- Keep the iframe host available as an immediate rollback path until the final removal phase.
- Do not change publish compare semantics.
- Do not change `note_label_mode=number` parity behavior.
- Do not change runtime JSON data format as part of iframe removal.
- Do not rename stable public routes or data directories in this plan.
- Every phase must be independently testable and independently revertible.

## Migration Strategy

Use a three-track rollout model.

Track A: production iframe host

- Remains the default public path.
- Must stay stable during all early phases.
- Serves as functional fallback and parity baseline.

Track B: internal container host

- Runs on dev-only or query-flagged routes first.
- Loads the same authorized runtime logic into a React-owned DOM container.
- Used for diagnostics, parity checks, and manual QA.

Track C: grey public container host

- Enabled by explicit query param, cookie, or environment flag.
- Gradually expands from internal users to selected public traffic.
- Can instantly fall back to Track A.

## Phase 0: Baseline Lock And Recovery Gate

Status: mostly complete.

### Goal

Freeze the current production iframe behavior as the rollback baseline before building the non-iframe host.

### Concrete Scope

Confirm and preserve:

- Current iframe host.
- Current runtime URL builder.
- Current host controller boundary.
- Current playback and metronome behavior.
- Current visual theme behavior.
- Current print and Pinterest dependency on the runtime output.

### Files

Already touched:

- `src/components/song/PublicRuntimeHostController.ts`
- `src/components/song/PublicRuntimeFrame.tsx`
- `src/components/song/PublicRuntimeInteractiveShell.tsx`
- `src/lib/runtime-core/publicRuntimePaths.ts`

Potential additions:

- `docs/progressive-iframe-removal-plan.md`
- optional smoke checklist updates in `docs/manual-runtime-qa-checklist.md`

### Forbidden

- Do not change runtime rendering internals.
- Do not remove iframe.
- Do not change public default host.

### Acceptance

- `npm run typecheck` passes.
- `npm run build` passes.
- Public sample pages still load sheets.
- Listen opens the playback panel and can stop.
- Metronome still works.
- Instrument and fingering switches preserve query state.

### Risks And Mitigation

- Risk: later refactors accidentally lose the stable rollback path.
- Mitigation: keep iframe host as the default until late grey rollout passes.

## Phase 1: Host Contract Hardening

Status: complete.

### Goal

Make the React shell depend only on a runtime-host interface, not iframe details.

### Concrete Scope

- Expand `PublicRuntimeHostController` into a complete shell-facing contract.
- Add explicit methods for lifecycle, messaging, focus/target detection, and readiness.
- Keep current iframe implementation as the first adapter.

Suggested contract:

```ts
type PublicRuntimeHostController = {
  hostElement: HTMLElement
  containsEventTarget: (target: EventTarget | null) => boolean
  postMessage: (message: unknown) => boolean
  destroy?: () => void
}
```

Possible future additions:

- `reload(nextUrlOrPayload)`
- `getDocument()`
- `getSheetElement()`
- `requestResizeSync()`
- `setVisible(enabled)`

### Files

Modify:

- `src/components/song/PublicRuntimeHostController.ts`
- `src/components/song/PublicRuntimeFrame.tsx`
- `src/components/song/PublicRuntimeInteractiveShell.tsx`

Potentially add:

- `src/components/song/runtime-host/types.ts`
- `src/components/song/runtime-host/IframeRuntimeHost.tsx`

### Forbidden

- Do not change the runtime HTML template.
- Do not change runtime bridge script logic.
- Do not change playback implementation.

### Acceptance

- `PublicRuntimeInteractiveShell` has no direct `HTMLIFrameElement`, `contentWindow`, or `contentDocument` dependency.
- All existing public controls still work.
- iframe host remains the only active production host.

### Risks And Mitigation

- Risk: over-designing the interface before the container host exists.
- Mitigation: only add methods when a real shell call site needs them.

## Phase 2: Runtime HTML Assembly Split For Container Use

Status: started.

### Goal

Make the server assembly layer able to produce both:

- full iframe HTML document
- container-ready runtime fragment / bootstrap package

### Concrete Scope

Split current runtime HTML assembly into reusable parts:

- payload serialization
- context injection
- CSS asset list
- JS asset list
- inline bridge script
- body/container template
- document wrapper

The iframe route continues to call the full-document path.

The future container host will call a new package-builder path.

### Files

Modify:

- `src/lib/runtime-core/publicRuntime.ts`
- `src/lib/runtime-core/server/template/runtimeTemplate.ts`
- `src/lib/runtime-core/server/assets/publicRuntimeAssets.ts`

Potentially add:

- `src/lib/runtime-core/server/assembly/publicRuntimeDocument.ts`
- `src/lib/runtime-core/server/assembly/publicRuntimePackage.ts`
- `src/lib/runtime-core/server/assembly/publicRuntimeAssetManifest.ts`

### Forbidden

- Do not edit parser, renderer, fingering, or playback runtime scripts.
- Do not change generated iframe HTML output unless explicitly verified byte-level or behavior-level safe.
- Do not change the production API route response shape yet.

### Acceptance

- Existing `/api/kuailepu-runtime/<slug>` output still renders through iframe.
- New assembly helper can return a structured package:

```ts
type PublicRuntimePackage = {
  html: string
  styles: PublicRuntimeAsset[]
  scripts: PublicRuntimeAsset[]
  inlineScripts: PublicRuntimeInlineScript[]
  contextJson: string
}
```

- `npm run build` passes.

### Risks And Mitigation

- Risk: helper split changes script order.
- Mitigation: preserve exact order in tests and inspect generated asset manifest for sample songs.

## Phase 3: Dev-Only Container Host Skeleton

Status: complete.

### Goal

Create a React-owned DOM container that can host runtime markup without executing the full runtime yet.

### Concrete Scope

- Add a dev route that renders iframe host and container host side by side.
- The container host initially mounts inert HTML only.
- No runtime scripts execute in the container yet.
- Use this phase to prove layout, shell mounting, and cleanup lifecycle.

### Files

Add:

- `src/components/song/runtime-host/ContainerRuntimeHost.tsx`
- `src/app/dev/runtime-host/[id]/page.tsx`

Modify:

- `src/components/song/PublicRuntimeHostController.ts`
- `src/lib/runtime-core/publicRuntimePaths.ts` if a dev URL helper is needed

### Forbidden

- Do not execute runtime JS inside the container yet.
- Do not expose this host on public `/song`.
- Do not remove iframe comparison view.

### Acceptance

- Dev page shows iframe output on one side and container placeholder/inert markup on the other side.
- Host controller can be created for the container.
- Mount and unmount do not leak DOM nodes.

### Risks And Mitigation

- Risk: inert markup gives false confidence.
- Mitigation: label the page clearly as skeleton-only and do not count it as runtime parity.

## Phase 4: CSS Scope Isolation

Status: complete for the dev-only container skeleton.

### Goal

Load runtime CSS into the React page without allowing it to damage the site shell.

### Concrete Scope

Evaluate and implement a scoped style strategy:

Option A: Shadow DOM host

- Put runtime DOM inside a shadow root.
- Inject runtime CSS into that shadow root.
- Best isolation, but some legacy selectors may assume `document`.

Option B: CSS prefix transform

- Rewrite runtime CSS selectors under `[data-public-runtime-root]`.
- Less isolated but easier for legacy document queries.

Option C: hybrid

- Use container root prefix first.
- Reserve Shadow DOM for later if global leakage is unmanageable.

Recommended first attempt:

- Prefix-scope CSS under `[data-public-runtime-root]`.
- Keep Shadow DOM as a fallback experiment.

### Files

Add:

- `src/lib/runtime-core/client/styleScope.ts`
- `src/components/song/runtime-host/RuntimeStyleInjector.tsx`

Modify:

- `src/components/song/runtime-host/ContainerRuntimeHost.tsx`
- `src/lib/runtime-core/server/assets/publicRuntimeAssets.ts`

### Forbidden

- Do not hand-edit bundled runtime CSS for musical behavior.
- Do not change site-global CSS to accommodate runtime leakage unless unavoidable and documented.

### Acceptance

- Container dev route can inject runtime CSS without changing header, controls, or SEO shell appearance.
- iframe route remains visually unchanged.
- Runtime sheet area has expected base styling in the container.

### Risks And Mitigation

- Risk: legacy CSS uses global element selectors such as `body`, `html`, `svg`, or `button`.
- Mitigation: prefix selectors; explicitly map `body/html` rules to the runtime root where safe.

## Phase 5: Script Loader And Execution Order Reproduction

Status: complete for the dev-only container route.

### Goal

Create a client-side loader that can load the authorized runtime scripts in the exact same order as the iframe document.

### Concrete Scope

- Build a runtime script manifest from the server assembly layer.
- Add a deterministic client loader for external and inline scripts.
- Ensure each script completes before the next starts when order matters.
- Keep this loader dev-only.
- Preserve the mixed external / inline order from the original document, rather than loading grouped external scripts first.
- Preserve non-executable template scripts such as `type="text/html"` as DOM script nodes without executing their contents.

### Files

Add:

- `src/lib/runtime-core/client/scriptLoader.ts`
- `src/components/song/runtime-host/RuntimeScriptLoader.tsx`
- `src/lib/runtime-core/runtimeScriptTypes.ts`

Modify:

- `src/components/song/runtime-host/ContainerRuntimeHost.tsx`
- `src/lib/runtime-core/server/assembly/publicRuntimeAssetManifest.ts`
- `src/lib/runtime-core/server/assembly/publicRuntimePackage.ts`
- `src/app/dev/runtime-host/[id]/page.tsx`

### Forbidden

- Do not bundle runtime scripts into the Next.js application bundle yet.
- Do not reorder scripts to make them cleaner.
- Do not modify runtime script contents except for isolated bootstrap wrappers required for container mounting.

### Acceptance

- Loader logs ordered script load events in dev.
- Repeated mount/unmount does not duplicate script tags unless intentionally allowed.
- Loader can be disabled instantly through `enableScriptLoader`.
- Public `/song/<slug>` still uses the iframe host and does not mount `RuntimeScriptLoader`.

### Risks And Mitigation

- Risk: scripts assume `document.currentScript`, document-level load order, or global document.
- Mitigation: reproduce script insertion order exactly; record failures in a compatibility log.

## Phase 6: Global Scope Capture And Conflict Shield

Status: complete for the dev-only container route.

### Goal

Run legacy globals without corrupting the Next.js page or React shell.

### Concrete Scope

Before loading runtime scripts, snapshot selected global names.

After loading, detect changes to:

- `$`
- `jQuery`
- `Kit`
- `Song`
- `hc`
- `MIDI`
- `I18n`
- any known runtime globals discovered during inventory

Implement a runtime namespace registry:

```ts
type PublicRuntimeGlobalRegistry = {
  runtimeWindow: Window
  globals: Record<string, unknown>
  restoreShellGlobals: () => void
  dispose: () => void
}
```

The first implementation captures and restores selected host-window globals around
the dev-only ordered script loader. It also tracks event listeners registered while
runtime scripts are loading, removes those listeners on dispose, and restores the
original `EventTarget` methods.

### Files

Add:

- `src/lib/runtime-core/client/globalRegistry.ts`
- `src/lib/runtime-core/client/runtimeGlobalInventory.ts`

Modify:

- `src/components/song/runtime-host/RuntimeScriptLoader.tsx`
- `src/components/song/runtime-host/ContainerRuntimeHost.tsx`
- `src/lib/runtime-core/client/scriptLoader.ts`

### Forbidden

- Do not rewrite global-dependent runtime code.
- Do not rename runtime global symbols inside the runtime implementation.
- Do not change runtime behavior to fit React conventions.

### Acceptance

- React shell still works after runtime scripts load.
- Existing site jQuery usage, if any, is not broken.
- Runtime globals are discoverable through the registry.
- Unmount can clean event listeners and DOM nodes added by the container host where possible.
- Public `/song/<slug>` still uses the iframe host and does not install the dev global registry.

### Risks And Mitigation

- Risk: runtime writes directly to global `window` and cannot be fully isolated.
- Mitigation: start with dev-only container; keep iframe fallback; document every global mutation.

## Phase 7: Container Runtime Bootstrap

Status: complete for the dev-only `twinkle-twinkle-little-star` route.

### Goal

Make the authorized runtime render one simple song inside the React-owned container on a dev route.

### Concrete Scope

- Mount runtime root DOM.
- Load scoped styles.
- Load scripts in exact order.
- Inject song context.
- Trigger the same draw/bootstrap path currently used in iframe.
- Render into container-local `#sheet`.
- Reuse the iframe body fragment as the first container DOM template so the existing jQuery callbacks can find the same controls, templates, modals, and `#sheet` node.
- Keep the runtime DOM under a dedicated runtime-owned mount node, separate from React-owned diagnostics.
- Track runtime timers in the global registry and clear them on dispose.

### Files

Modify:

- `src/components/song/runtime-host/ContainerRuntimeHost.tsx`
- `src/lib/runtime-core/client/scriptLoader.ts`
- `src/lib/runtime-core/client/globalRegistry.ts`
- `src/components/song/runtime-host/RuntimeScriptLoader.tsx`
- `src/components/song/runtime-host/types.ts`
- `src/app/dev/runtime-host/[id]/page.tsx`
- `src/lib/runtime-core/server/assembly/publicRuntimePackage.ts`

Potentially add:

- `src/lib/runtime-core/client/containerBootstrap.ts`

### Forbidden

- Do not change `Song.draw()`.
- Do not change parser input.
- Do not change fingering data.
- Do not change playback timing code.

### Acceptance

For `twinkle-twinkle-little-star` on a dev-only container route:

- SVG sheet appears.
- Fingering charts appear.
- Letter mode appears.
- Number mode still works.
- No React hydration error.
- No shell layout break.

### Risks And Mitigation

- Risk: runtime code queries global `document` instead of container root.
- Mitigation: record all failing selectors; patch only the container bootstrap / DOM forwarding layer, not core runtime logic.

## Phase 8: Bridge Transport Parity

Status: complete for the dev comparison route. Remaining layout and lifecycle parity work moves to Phase 9.

### Goal

Make existing shell features work through both iframe host and container host.

### Concrete Scope

Unify transport for:

- runtime ready
- sheet size
- playback open / stop / close panel
- playback status
- playback panel status
- metronome bridge
- letter-track rerender triggers
- visual theme rerender triggers

For iframe host:

- transport remains `postMessage`.

For container host:

- transport can be direct callback / custom event.
- The shell still sees the same normalized host message.

Implemented foundation:

- `publicRuntimeMessageTypes.ts` now defines command/event unions and type guards.
- Container host `postMessage(...)` now forwards normalized shell commands into the runtime window message channel and a container custom event.
- Both iframe bridge and container bridge can emit `vtabs-runtime-ready`.
- Runtime bridge accepts a normalized redraw command.
- `/dev/runtime-host/[id]` now mounts the shared function-zone controls above the iframe/container comparison.
- Dev controls drive both hosts through normalized host controllers for Listen/Stop, redraw, and URL-state remount controls such as instrument, fingering, layout, zoom, metronome, and visual theme.
- `RuntimeScriptLoader` keeps its runtime bootstrap stable across React development remounts by using a stable ready callback ref and session cancellation guard.

Completed Phase 8 hardening:

- The dev comparison shell now tracks playback status and playback-panel state per host instead of letting iframe/container messages overwrite each other.
- The shell aggregates per-host state into a single top-level Listen/Stop action while still showing iframe/container diagnostic state separately.
- Right-side container playback uses the full runtime asset profile in the dev comparison route, so Tempo, Start, Restart, Continue, Stop, soundfont loading, and playback status run through the same runtime path as iframe.
- Playback panel behavior is normalized in the bridge layer: initial open shows Close/Start, active playback shows Close/Restart/Continue, and panel fallback does not expose Start before runtime loading completes.
- Outside-click close in the dev comparison route now closes both runtime hosts through the normalized `vtabs-runtime-playback-close-panel` command.
- Iframe readiness diagnostics are backed by both host lifecycle callbacks and a dev-only sheet probe so the review page does not report `loading` after an iframe sheet has already rendered.

Phase 8 validation record:

- `Listen` opens both iframe and container playback panels with matching Start/Tempo state.
- `Start`, `Stop`, `Close`, `Restart`, and `Continue` were checked on the container host, with top-level shell state reflecting active playback.
- Repeated open/close and refresh/song-switch checks completed without page errors or failed runtime requests.
- Metronome `Start`/`Stop`, BPM options, time-signature options, and beat display were checked on both hosts.
- Visual theme `classic`/`off`, recorder instrument switching, and 12-hole ocarina fingering switching were checked on both hosts.
- Verification commands for the final Phase 8 changes: `npm run typecheck`, `npm run build`, and `git diff --check`.

### Files

Modify:

- `src/components/song/PublicRuntimeHostController.ts`
- `src/lib/runtime-core/bridge/publicRuntimeMessageTypes.ts`
- `src/lib/runtime-core/bridge/**`
- `src/components/song/runtime-host/ContainerRuntimeHost.tsx`

Potentially add:

- `src/components/song/runtime-host/publicRuntimeHostMessages.ts`
- `src/components/song/runtime-host/containerRuntimeTransport.ts`
- `src/components/song/runtime-host/RuntimeHostReviewClient.tsx`

### Forbidden

- Do not fork playback behavior.
- Do not add separate public controls for iframe and container.
- Do not make shell logic branch on core runtime internals.

### Acceptance

On dev route, iframe and container both support:

- `Listen`
- `Stop`
- playback panel open/close
- metronome open/close
- zoom/layout changes
- instrument/fingering changes by remount or controlled reload

Accepted after this phase:

- The dev comparison route can be used as the manual QA surface for host parity before Phase 9 layout/lifecycle work.
- Production `/song` remains iframe-backed and continues to use the existing rollback baseline.

### Risks And Mitigation

- Risk: container direct events and iframe messages diverge.
- Mitigation: normalize both through the same host-message handler before shell state changes.
- Risk: runtime layout in a native container still differs from iframe sizing/scrolling.
- Mitigation: keep this out of Phase 8 and handle it explicitly in Phase 9.

## Phase 9: Layout, Resize, And Lifecycle Parity

Status: complete for the dev comparison route.

### Goal

Match the iframe version's visible layout behavior without relying on iframe height synchronization.

### Concrete Scope

- Replace iframe height messages with container measurement.
- Ensure no inner scrollbars.
- Ensure no bottom blank space.
- Preserve loading overlay behavior.
- Preserve route-change lifecycle.
- Ensure old runtime DOM is fully removed before next song/instrument mount.

### Execution Checklist

Step 1: Measurement ownership

- Change Scope: add container-owned measurement around the runtime root and shell frame area; keep measurement in the host integration layer.
- Validation: compare iframe and container on the dev route for sheet height, bottom spacing, and absence of inner scrollbars across desktop and mobile widths.
- Risk: late runtime rendering, font loading, or playback-panel changes can change height after the first measure. Mitigate with a measured update loop such as observer plus animation-frame scheduling, and keep iframe as the baseline.

Step 2: Loading and readiness lifecycle

- Change Scope: align container loading, ready, error, and teardown states with the iframe host controller contract.
- Validation: refresh, hard reload, song switch, instrument switch, fingering switch, note-mode switch, layout switch, zoom switch, and visual-theme switch on the dev comparison route.
- Risk: a stale ready state can hide a blank sheet or keep an old overlay visible. Mitigate by clearing host state before each remount and treating the current host session as the only valid message source.

Step 3: Runtime DOM teardown

- Change Scope: ensure the container host removes prior runtime DOM, host-created styles/scripts, tracked listeners, timers, and transient panels before mounting the next session.
- Validation: switch repeatedly between sample songs and modes, then inspect the dev diagnostics for one active sheet root, one current readiness state, and no duplicated playback or metronome panels.
- Risk: runtime code can keep process-level references after a React unmount. Mitigate by remounting the full container host on song or query-key changes first, then optimize only after parity.

Step 4: Shell interaction cleanup

- Change Scope: close playback, metronome, and transient runtime panels through normalized host commands during route changes and host disposal.
- Validation: start playback, open/close the playback panel, start/stop metronome, navigate to another song, and confirm the new host starts cleanly without stale panel state.
- Risk: a teardown command can race with navigation. Mitigate by making teardown idempotent and by ignoring messages that do not match the current host session.

Step 5: Responsive layout parity

- Change Scope: adjust only host wrappers, container sizing, and shell integration styles needed for parity; do not change runtime SVG scaling or renderer layout logic.
- Validation: check compact and equal-width layouts, zoom options, portrait mobile, landscape mobile, tablet, and desktop widths against the iframe baseline.
- Risk: fixing one viewport can create extra blank space or horizontal drift in another. Mitigate with sample-song coverage and keep the iframe comparison visible while tuning.

Step 6: Phase 9 exit record

- Change Scope: record the sampled songs, viewport coverage, failed cases, accepted differences, and rollback path in this plan or the manual runtime QA checklist.
- Validation: `npm run typecheck`, `npm run build`, `git diff --check`, plus the Phase 9 manual sample set below.
- Risk: accepting undocumented differences makes later grey rollout ambiguous. Mitigate by requiring every accepted difference to name its scope and fallback.

### Files

Modified:

- `src/components/song/runtime-host/ContainerRuntimeHost.tsx`
- `src/components/song/runtime-host/RuntimeHostReviewClient.tsx`
- `src/components/song/runtime-host/RuntimeScriptLoader.tsx`
- `src/components/song/runtime-host/RuntimeStyleInjector.tsx`
- `src/components/song/runtime-host/types.ts`
- `src/lib/runtime-core/client/containerBootstrap.ts`
- `src/components/song/runtime-host/useRuntimeHostLifecycle.ts`
- `src/components/song/runtime-host/useRuntimeContainerMeasurement.ts`

Not modified in this phase:

- `src/components/song/PublicRuntimeFrame.tsx`
- `src/components/song/PublicRuntimeInteractiveShell.tsx`
- parser, SVG renderer, fingering mapping, playback timing, runtime JSON, public `/song` host selection

### Forbidden

- Do not change sheet SVG scaling math inside the runtime renderer.
- Do not change runtime layout calculations.
- Do not enable the container host on public `/song` as part of Phase 9.
- Do not change print or Pinterest export behavior as part of Phase 9.
- Do not change runtime JSON shape, note-mode semantics, fingering selection, playback timing, or parser behavior.

### Acceptance

Sample pages:

- `twinkle-twinkle-little-star`
- `the-godfather`
- `we-wish-you-a-merry-christmas`
- `turkish-march`
- `canon`

Checks:

- Sheet appears without iframe.
- No duplicated sheet after route changes.
- No stale playback panel after route changes.
- Zoom does not shift content horizontally.
- Dense songs do not regress compared with iframe baseline.
- Loading overlay appears and clears at the same lifecycle point as the iframe baseline.
- Metronome and playback teardown do not leak into the next host session.

Phase 9 validation record:

- `npm run typecheck` passed.
- `npm run build` passed.
- `git diff --check` passed.
- Dev comparison route browser checks passed for desktop and mobile widths on:
  - `twinkle-twinkle-little-star`
  - `the-godfather`
  - `turkish-march`
  - `we-wish-you-a-merry-christmas`
  - `canon`
- Additional dev comparison checks passed for `twinkle-twinkle-little-star` with `sheet_scale=12`, `measure_layout=mono`, and `practice_tool=metronome`.
- Container metrics showed one `#sheet`, one rendered SVG, no loading overlay after render, no horizontal overflow, no inner scrollbar, and 0-2px height difference attributable to the host border/rounding against the iframe baseline.
- Normalized playback close command hides the container playback panel; route changes from `twinkle-twinkle-little-star` to `the-godfather` and back start with a clean container host and no duplicated sheet.
- A desktop screenshot of the metronome comparison route was visually inspected for iframe/container layout alignment.
- Public `/song` remains iframe-backed; no public host switch was added.

### Risks And Mitigation

- Risk: runtime lifecycle assumes full document refresh.
- Mitigation: initially remount the whole container host on song or query-key change; optimize later only after parity.
- Risk: measurement parity is song- and viewport-sensitive.
- Mitigation: require both quick samples and long/dense samples before treating the phase as complete.

## Phase 10: Internal Side-By-Side Parity Tool

Status: complete for the dedicated internal review route.

### Goal

Turn the current dev comparison surface into a repeatable review tool for iframe/container parity, with a dedicated internal review URL.

### Concrete Scope

- Keep side-by-side visual review.
- Show runtime host mode, query params, readiness state, console errors, and global mutation summary.
- Allow switching sample songs and instruments.

### Execution Checklist

Step 1: Review diagnostics

- Change Scope: add or tighten diagnostic text for host mode, query state, ready state, measured size, console errors, and current global inventory.
- Validation: open the review route for quick, long, and dense sample songs and confirm diagnostics update independently for iframe and container.
- Risk: diagnostics can become misleading if they share state across hosts. Mitigate by keeping iframe and container state keyed by host session.

Step 2: Repeatable sample controls

- Change Scope: keep sample switching, instrument/fingering switching, layout, zoom, note mode, metronome, playback, and visual-theme controls on the normalized host boundary.
- Validation: run the same control sequence for both hosts without direct DOM access from the shell.
- Risk: review-only controls can drift from public controls. Mitigate by routing through the same host controller and bridge message types.

Step 3: Review record

- Change Scope: document the sample set, browser widths, and accepted differences for each review pass.
- Validation: the review output is clear enough for a later engineer to repeat without extra context.
- Risk: manual comparison is slow and inconsistent. Mitigate with targeted DOM assertions for sheet presence, note labels, playback status, and known controls when needed.

### Files

Added:

- `src/app/dev/runtime-host/review/[id]/page.tsx`
- `src/components/dev/RuntimeHostSideBySideReview.tsx`

Modified:

- `src/components/song/runtime-host/RuntimeHostReviewClient.tsx`
- `docs/manual-runtime-qa-checklist.md`

### Forbidden

- Do not use this route as public fallback.
- Do not hide container errors just to make visual review pass.

### Acceptance

Review route can compare:

- sheet render
- text mode
- visual theme
- instrument/fingering
- playback panel
- metronome
- loading lifecycle

Phase 10 validation record:

- `npm run typecheck` passed.
- Dedicated review route opened successfully at `/dev/runtime-host/review/twinkle-twinkle-little-star`.
- Browser diagnostics confirmed iframe and container render side by side, container has one `#sheet` and one rendered SVG, loading overlay clears, and iframe/container ready state reaches `yes`.
- Extended diagnostics display host modes, query state, runtime state, container measured size, console diagnostics, script loader status, and captured runtime globals.
- Sample Song switch from `twinkle-twinkle-little-star` to `canon` passed through the review route controls.
- Instrument switch on the review route passed and remounted cleanly with one container sheet.
- Direct review URL for `canon?measure_layout=mono&sheet_scale=12` passed with no horizontal overflow and no stale loading overlay.
- No browser `pageerror` or console `error` was captured during the Phase 10 route checks.
- Public `/song` remains iframe-backed; no public host switch was added.

### Risks And Mitigation

- Risk: manual visual comparison is slow.
- Mitigation: add targeted DOM assertions for sheet presence, note labels, playback status, and known controls.

## Phase 11: Query-Flagged Public Container Host

Status: complete for query-flagged public song pages.

### Goal

Expose the container host on public `/song/<slug>` only behind an explicit opt-in query flag.

### Concrete Scope

Add host mode selection:

- default: `iframe`
- opt-in: `container`
- force fallback: `iframe`

Possible query:

```text
?runtime_host=container
?runtime_host=iframe
```

Possible environment override:

```text
NEXT_PUBLIC_RUNTIME_HOST_DEFAULT=iframe
NEXT_PUBLIC_RUNTIME_HOST_DEFAULT=container
```

### Execution Checklist

Step 1: Public opt-in host mode

- Change Scope: add `src/lib/runtime-core/publicRuntimeHostMode.ts`, parse `runtime_host`, preserve it in public song query-state links, and resolve query before environment before iframe default.
- Validation: `/song/twinkle-twinkle-little-star` uses iframe; `/song/twinkle-twinkle-little-star?runtime_host=container` uses the container host; removing the query returns to iframe.
- Risk: an opt-in query can leak into public navigation. Mitigate by preserving the query only while the flagged session is active, keeping canonical URL unchanged, and exposing `runtime_host=iframe` as the immediate rollback query.

Step 2: Fallback controls

- Change Scope: add `PublicRuntimeHostSwitch` and pass the resolved host mode through `PublicRuntimePage` into `PublicRuntimeInteractiveShell`; keep the switch visible only for flagged or container sessions.
- Validation: force iframe after a container render and confirm controls, playback, metronome, and note modes still work.
- Risk: fallback may be unavailable during an incident if it is not exercised. Mitigate by checking `runtime_host=iframe` in every public opt-in validation pass.

Step 3: Indexing guard

- Change Scope: update `/song/[id]` metadata so any `runtime_host` query keeps the canonical song URL and emits noindex/nofollow.
- Validation: inspect the rendered metadata for `runtime_host=container` and `runtime_host=iframe`.
- Risk: search engines can retain experimental URLs. Mitigate with unchanged canonical URLs and conservative metadata for host-debug queries.

Step 4: Container package handoff

- Change Scope: when the resolved host is container, build the same public runtime package shape used by the internal review host and pass only body HTML, scoped styles, and script entries into the client shell.
- Validation: container mode renders a sheet, clears loading, supports metronome and playback, and keeps one active runtime DOM root after control changes.
- Risk: client-only query replacement cannot rebuild a server-created package. Mitigate by using full route navigation for public controls while the container host is active.

### Files

Modified:

- `src/app/song/[id]/page.tsx`
- `src/components/song/PublicRuntimePage.tsx`
- `src/components/song/PublicRuntimeInteractiveShell.tsx`
- `src/components/song/PublicRuntimeFrame.tsx`
- `src/lib/songbook/publicInstruments.ts`
- `src/lib/songbook/songPageQueryState.ts`

Added:

- `src/components/song/runtime-host/PublicRuntimeHostSwitch.tsx`
- `src/lib/runtime-core/publicRuntimeHostMode.ts`

### Forbidden

- Do not make container default.
- Do not remove iframe loading path.
- Do not enable container for bots or SEO traffic yet.

### Acceptance

- `/song/twinkle-twinkle-little-star` uses iframe.
- `/song/twinkle-twinkle-little-star?runtime_host=container` uses container.
- `/song/twinkle-twinkle-little-star?runtime_host=iframe` forces iframe.
- Removing the query returns to iframe unless `NEXT_PUBLIC_RUNTIME_HOST_DEFAULT=container` is set for an experimental environment.
- All feature controls preserve the explicit host query; container-mode control changes use full route navigation so the server-built package matches the new query state.
- Host-query pages emit noindex/nofollow and keep the canonical song URL.

Phase 11 validation record:

- `npm run typecheck` passed.
- Browser validation covered default iframe, `runtime_host=container`, `runtime_host=iframe`, noindex metadata, query preservation through controls, and metronome/playback smoke checks on the public song shell.
- `NEXT_PUBLIC_RUNTIME_HOST_DEFAULT=container` was checked on a local experimental dev server; the default host switched to container and `runtime_host=iframe` still forced iframe.
- A production `next start` smoke check confirmed `runtime_host=container` still selects the container host and emits noindex metadata after `npm run build`.
- `npm run build` passed.
- `git diff --check` passed.
- Public `/song` default remains iframe-backed; the container host is available only through the query flag or explicit environment default.

### Risks And Mitigation

- Risk: search engines index experimental host query.
- Mitigation: keep canonical URL unchanged and add `noindex` for any `runtime_host` query.
- Risk: a container-mode control change can reuse an old server package.
- Mitigation: public controls perform full route navigation while the active host is container.
- Risk: public host switching exposes a styling or lifecycle mismatch.
- Mitigation: force `runtime_host=iframe` or remove the query, then fix only the host-selection or integration layer.

## Phase 12: Export Route Compatibility

Status: Complete.

### Goal

Make print and Pinterest preview work with the same host switch, while keeping iframe as default.

### Concrete Scope

- Add host mode support to internal print preview.
- Add host mode support to Pinterest preview.
- Compare exported visual output against iframe baseline.

### Execution Checklist

Step 1: Internal print opt-in

- Change Scope: allow internal print preview to request the container host while keeping iframe output available.
- Implementation: `src/app/dev/print/song/[id]/page.tsx` resolves `runtime_host` with an iframe-only environment fallback, builds a server-side container package only when `runtime_host=container`, and renders the selected host through `ExportRuntimeHost`.
- Validation: compare print preview for `twinkle-twinkle-little-star`, a long sample, and a dense sample against iframe output.
- Risk: container measurement can change page breaks or sheet crop. Mitigate by keeping print default on iframe until parity is accepted.

Step 2: Pinterest opt-in

- Change Scope: allow Pinterest preview/export tooling to request the container host while keeping iframe output available.
- Implementation: `src/app/dev/pinterest/song/[id]/page.tsx` resolves `runtime_host` with an iframe-only environment fallback, mirrors the workbench query state into the container package, and keeps iframe as the default host for preview/export.
- Validation: compare exported image dimensions, crop, sheet visibility, and title/metadata placement against iframe output.
- Risk: host sizing differences can shift crop boundaries. Mitigate by recording visual differences and leaving iframe export as the operational path until accepted.

Step 3: Export fallback

- Change Scope: document how to force iframe exports during container validation.
- Implementation: `scripts/export-print-song-pdf.ts` and `scripts/export-pinterest-pin.ts` accept `--runtime-host iframe|container`. Omitting the flag preserves the existing iframe route. Pinterest filename, manifest destination URL, crop post-processing, and print PDF options stay unchanged.
- Validation: run one successful iframe export after each container export test.
- Risk: export regressions can block content work. Mitigate by keeping the existing export path unchanged until the container path passes.

### Files

Modify:

- `src/app/dev/print/song/[id]/page.tsx`
- `src/app/dev/pinterest/song/[id]/page.tsx`
- `scripts/export-print-song-pdf.ts`
- `scripts/export-pinterest-pin.ts`

Add:

- `src/components/song/runtime-host/ExportRuntimeHost.tsx`
- `src/lib/runtime-core/server/publicRuntimeContainerPackage.ts`

### Forbidden

- Do not change export dimensions and cropping rules unless container host exposes a real mismatch.
- Do not remove iframe export support.

### Acceptance

For `twinkle-twinkle-little-star`:

- iframe print preview still works.
- container print preview works behind query.
- iframe Pinterest preview still works.
- container Pinterest preview works behind query.
- Visual differences are documented.

Phase 12 validation record:

- `npm run typecheck` passed.
- Browser validation covered print preview default iframe, print `runtime_host=container`, print `runtime_host=iframe`, Pinterest preview default iframe, Pinterest `runtime_host=container`, and Pinterest `runtime_host=iframe`.
- Export smoke checks covered print PDF iframe/container output and Pinterest image iframe/container output for `twinkle-twinkle-little-star`; generated files were written outside the repository worktree.
- `npm run build` passed.
- `git diff --check` passed.
- Print and Pinterest routes keep iframe as the default host even if a public runtime host environment default is configured elsewhere.
- No export dimensions, PDF options, image filename rules, manifest destination URLs, or crop post-processing rules were changed.

### Risks And Mitigation

- Risk: container host changes measurement and export crop.
- Mitigation: keep export host default iframe until visual parity is acceptable.
- Risk: container export has a route-specific host issue.
- Mitigation: force `runtime_host=iframe` in the preview URL or `--runtime-host iframe` in export scripts, then repair only the route/host adaptation layer.

## Phase 13: Controlled Grey Rollout

### Goal

Gradually send selected human traffic to the container host while retaining automatic rollback.

### Concrete Scope

Rollout levels:

1. local dev only
2. internal production query only
3. internal cookie allowlist
4. 1% human traffic
5. 10% human traffic
6. 50% human traffic
7. default container with iframe fallback

Signals to monitor:

- sheet render success
- runtime ready time
- playback open success
- JavaScript errors
- route-change remount errors
- user-visible blank sheet reports

### Execution Checklist

Step 1: Deterministic rollout decision

- Change Scope: add a deterministic host decision layer for allowed users or sessions while iframe remains forceable.
- Validation: confirm the same session gets the same host mode and that query/environment overrides take priority.
- Risk: unstable assignment can make bugs hard to reproduce. Mitigate by logging host mode and decision reason in diagnostics.

Step 2: Health signals

- Change Scope: observe sheet render success, runtime ready time, playback open success, JavaScript errors, route-change remount errors, and blank-sheet reports.
- Validation: verify signals are emitted for both success and failure paths on internal traffic before increasing rollout.
- Risk: missing signals can hide regressions. Mitigate by requiring health visibility before each rollout step.

Step 3: Rollout stop rule

- Change Scope: document thresholds for stopping rollout and forcing iframe.
- Validation: simulate or manually trigger a failure path and confirm the fallback procedure is clear.
- Risk: rollout can continue after a visible regression. Mitigate with a conservative stop rule for blank sheet, playback, metronome, or route-change failures.

### Files

Add:

- `src/lib/runtime-core/publicRuntimeHostRollout.ts`
- optional analytics helpers under `src/lib/analytics/**`

Modify:

- `src/components/song/PublicRuntimeInteractiveShell.tsx`

### Forbidden

- Do not include bots in early grey rollout.
- Do not disable iframe fallback.
- Do not continue rollout if blank-sheet or playback regressions appear.

### Acceptance

- Runtime host mode can be determined deterministically per request/session.
- Fallback can be forced by query or environment variable.
- Error rate and render success are observable.

### Risks And Mitigation

- Risk: intermittent runtime race conditions only appear under production load.
- Mitigation: grey slowly and keep forced iframe override.

## Phase 14: Default Container Host

### Goal

Make the non-iframe container host the default public host after grey rollout passes.

### Concrete Scope

- Switch default host mode from iframe to container.
- Keep iframe fallback available.
- Keep side-by-side review route.
- Keep internal forced iframe query.

### Execution Checklist

Step 1: Default switch

- Change Scope: switch the default public host to the container after Phase 13 passes its agreed soak and health gates.
- Validation: run the full validation matrix on public URLs without a host query.
- Risk: rare songs can expose layout or lifecycle assumptions missed during grey rollout. Mitigate by keeping forced iframe fallback and review diagnostics.

Step 2: Fallback verification

- Change Scope: keep forced iframe mode and internal review routes after the default switch.
- Validation: `?runtime_host=iframe` or the chosen fallback mechanism still renders and supports playback, metronome, note mode, instrument, and fingering changes.
- Risk: fallback can rot after default switch. Mitigate by testing it with the same manual samples.

Step 3: Handoff update

- Change Scope: update runtime handoff and QA docs to say container is default while iframe remains a fallback.
- Validation: docs point to the correct commands, sample URLs, and rollback path.
- Risk: stale docs slow incident response. Mitigate by updating handoff in the same phase as the default switch.

### Files

Modify:

- `src/lib/runtime-core/publicRuntimeHostMode.ts`
- `src/components/song/PublicRuntimeInteractiveShell.tsx`
- `docs/manual-runtime-qa-checklist.md`
- `docs/agent-handoff.md`

### Forbidden

- Do not delete iframe host implementation yet.
- Do not delete runtime route yet.
- Do not change musical core logic.

### Acceptance

- Public default pages use container host.
- `?runtime_host=iframe` still works.
- All manual QA sample pages pass.
- Build passes.
- E2E smoke passes.

### Risks And Mitigation

- Risk: rare songs expose assumptions not caught in sample set.
- Mitigation: keep iframe fallback for a full soak period.

## Phase 15: Iframe Host Retirement

### Goal

Remove iframe dependency after the container host has been stable through a full soak period.

### Preconditions

All must be true:

- Container host has been default for a defined soak period.
- No material blank-sheet, playback, metronome, or route-change regressions remain.
- Print and Pinterest routes have accepted container behavior.
- Forced iframe fallback has not been needed operationally.
- Rollback plan has been reviewed.

### Concrete Scope

- Remove iframe public host switch.
- Retain only internal diagnostic route if still useful.
- Remove iframe-specific height bridge from public shell.
- Keep the runtime route only if still needed for diagnostics, compare, or internal tools.

### Execution Checklist

Step 1: Retirement readiness review

- Change Scope: confirm soak period, incident history, export compatibility, and fallback usage before deleting iframe-specific public paths.
- Validation: all preconditions below are checked off with dates or release references.
- Risk: deleting the fallback too early removes the fastest recovery path. Mitigate by requiring an explicit readiness review.

Step 2: Public iframe path removal

- Change Scope: remove only iframe-specific public host branches and height bridge code after readiness passes.
- Validation: no public `/song` runtime iframe remains, and all current public features still pass the validation matrix.
- Risk: cleanup can accidentally touch core runtime behavior. Mitigate by keeping the change scoped to host integration and reviewing diffs for parser, renderer, fingering, and playback timing files.

Step 3: Post-retirement recovery note

- Change Scope: record the last fallback-capable commit and current recovery procedure in the handoff docs.
- Validation: another engineer can identify the fallback commit and the expected recovery path from docs alone.
- Risk: rollback instructions become ambiguous after cleanup. Mitigate by documenting the recovery point before merging the retirement change.

### Files

Modify or delete:

- `src/components/song/PublicRuntimeFrame.tsx`
- `src/components/song/runtime-host/IframeRuntimeHost.tsx`
- iframe-specific branches in `PublicRuntimeHostController`
- iframe-only QA notes

Potentially keep:

- `/api/kuailepu-runtime/[id]` for internal diagnostics if still useful

### Forbidden

- Do not delete diagnostic or fallback code until post-default soak has passed.
- Do not combine final iframe removal with core renderer replacement.

### Acceptance

- No public `/song` page renders an iframe for the runtime.
- Authorized runtime code runs inside a React-owned native DOM container.
- Runtime globals are either isolated, namespaced, or documented and controlled.
- All current public features remain available:
  - instrument switching
  - fingering switching
  - letter / number note mode
  - layout
  - zoom
  - visual theme
  - lyrics toggle where available
  - playback
  - metronome
  - print preview
  - Pinterest preview

### Risks And Mitigation

- Risk: final deletion removes an emergency recovery path.
- Mitigation: tag the last fallback-capable commit and keep rollback instructions in `docs/handoff.md`.

## Validation Matrix

Run these checks whenever a phase touches runtime host behavior:

```bash
npm run typecheck
npm run build
```

Add when native host behavior starts executing runtime scripts:

```bash
npm run test:e2e
```

Manual smoke samples:

- `twinkle-twinkle-little-star`
- `the-godfather`
- `we-wish-you-a-merry-christmas`
- `turkish-march`
- `canon`
- `london-bridge`

Manual feature checks:

- default letter mode
- number mode
- instrument switching
- fingering switching
- layout compact / equal width
- zoom changes
- visual theme on / off
- playback listen / stop
- playback panel close by outside click
- metronome open / close
- route change between songs
- print preview
- Pinterest preview

## Rollback Rules

Every phase must keep at least one rollback path:

- code revert for the phase commit
- query flag fallback to iframe
- environment fallback to iframe
- internal route to compare iframe and container

If a phase causes public blank sheets, broken playback, or broken instrument switching:

1. force iframe host
2. stop rollout
3. capture console errors and host mode
4. reproduce on side-by-side dev route
5. fix only the host integration layer unless proven otherwise

## Recommended Next Engineering Step

Next step should prepare Phase 11 public opt-in host mode only after review-route parity remains stable:

1. Change Scope: design an explicit `runtime_host=container` opt-in path while keeping iframe as the default.
2. Validation: run `npm run typecheck`, `npm run build`, `git diff --check`, and repeat the internal review route sample set before exposing any public query flag.
3. Risk: an opt-in query can accidentally become an SEO surface. Mitigate with unchanged canonical URLs and conservative debug-query metadata.

Public `/song` remains iframe-backed until Phase 11 opt-in work is deliberately started.
