# Progressive Iframe Removal Integration Plan

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

### Files

Modify:

- `src/components/song/PublicRuntimeHostController.ts`
- `src/lib/runtime-core/bridge/publicRuntimeMessageTypes.ts`
- `src/lib/runtime-core/bridge/**`
- `src/components/song/runtime-host/ContainerRuntimeHost.tsx`

Potentially add:

- `src/components/song/runtime-host/publicRuntimeHostMessages.ts`

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

### Risks And Mitigation

- Risk: container direct events and iframe messages diverge.
- Mitigation: normalize both through the same host-message handler before shell state changes.

## Phase 9: Layout, Resize, And Lifecycle Parity

### Goal

Match the iframe version's visible layout behavior without relying on iframe height synchronization.

### Concrete Scope

- Replace iframe height messages with container measurement.
- Ensure no inner scrollbars.
- Ensure no bottom blank space.
- Preserve loading overlay behavior.
- Preserve route-change lifecycle.
- Ensure old runtime DOM is fully removed before next song/instrument mount.

### Files

Modify:

- `src/components/song/PublicRuntimeFrame.tsx`
- `src/components/song/runtime-host/ContainerRuntimeHost.tsx`
- `src/components/song/PublicRuntimeInteractiveShell.tsx`

Potentially add:

- `src/components/song/runtime-host/useRuntimeHostLifecycle.ts`
- `src/components/song/runtime-host/useRuntimeContainerMeasurement.ts`

### Forbidden

- Do not change sheet SVG scaling math inside the runtime renderer.
- Do not change runtime layout calculations.

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

### Risks And Mitigation

- Risk: runtime lifecycle assumes full document refresh.
- Mitigation: initially remount the whole container host on song or query-key change; optimize later only after parity.

## Phase 10: Internal Side-By-Side Parity Tool

### Goal

Create a repeatable review route that compares iframe host and container host for the same song.

### Concrete Scope

- Add side-by-side visual review.
- Show runtime host mode, query params, readiness state, console errors, and global mutation summary.
- Allow switching sample songs and instruments.

### Files

Add:

- `src/app/dev/runtime-host/review/[id]/page.tsx`
- `src/components/dev/RuntimeHostSideBySideReview.tsx`

Modify:

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

### Risks And Mitigation

- Risk: manual visual comparison is slow.
- Mitigation: add targeted DOM assertions for sheet presence, note labels, playback status, and known controls.

## Phase 11: Query-Flagged Public Container Host

### Goal

Expose the container host on public `/song/<slug>` only behind an explicit opt-in query flag.

### Concrete Scope

Add host mode selection:

- default: `iframe`
- opt-in: `container`

Possible query:

```text
?runtime_host=container
```

Possible environment override:

```text
NEXT_PUBLIC_RUNTIME_HOST_DEFAULT=iframe
```

### Files

Modify:

- `src/components/song/PublicRuntimeInteractiveShell.tsx`
- `src/components/song/PublicRuntimeFrame.tsx`

Add:

- `src/components/song/runtime-host/PublicRuntimeHostSwitch.tsx`
- `src/lib/runtime-core/publicRuntimeHostMode.ts`

### Forbidden

- Do not make container default.
- Do not remove iframe loading path.
- Do not enable container for bots or SEO traffic yet.

### Acceptance

- `/song/twinkle-twinkle-little-star` uses iframe.
- `/song/twinkle-twinkle-little-star?runtime_host=container` uses container.
- Removing the query returns to iframe.
- All feature controls preserve or intentionally drop the host query according to documented behavior.

### Risks And Mitigation

- Risk: search engines index experimental host query.
- Mitigation: keep canonical URL unchanged; optionally add `noindex` for host-debug query if needed.

## Phase 12: Export Route Compatibility

### Goal

Make print and Pinterest preview work with the same host switch, while keeping iframe as default.

### Concrete Scope

- Add host mode support to internal print preview.
- Add host mode support to Pinterest preview.
- Compare exported visual output against iframe baseline.

### Files

Modify:

- `src/app/dev/print/song/[id]/page.tsx`
- `src/app/dev/pinterest/song/[id]/page.tsx`
- `scripts/export-print-song-pdf.ts`
- `scripts/export-pinterest-pin.ts`

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

### Risks And Mitigation

- Risk: container host changes measurement and export crop.
- Mitigation: keep export host default iframe until visual parity is acceptable.

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

Next step should continue Phase 2 without executing runtime scripts in a container yet:

1. Add focused tests or script checks for `buildPublicRuntimePackageData(...)` resource ordering.
2. Split payload serialization, context injection, and document wrapper helpers more explicitly if it can be done without changing output.
3. Keep `/api/kuailepu-runtime/[id]` on the full-document path.
4. Do not execute runtime scripts in a container until assembly output and asset order are locked.

This keeps the work incremental and prevents a risky direct jump from iframe to full native container execution.
