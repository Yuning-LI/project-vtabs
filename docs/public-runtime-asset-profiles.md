# Public Runtime Asset Profiles

This document records the policy for loading fewer Kuailepu template assets on public song pages while keeping a recovery path.

## Rule

Do not delete bundled Kuailepu assets just because the public page does not currently load them.

Instead:

- keep assets in `vendor/kuailepu-static` and `public/k-static`
- control default loading in `src/lib/runtime-core/server/assets/publicRuntimeAssets.ts`
- use `full-template` for compare, debugging, and recovery

## Current Profiles

`src/lib/runtime-core/server/assets/publicRuntimeAssets.ts` defines:

- `public-song`
  - default read-only public runtime profile
  - minimal validated runtime script set
  - only safe when playback / metronome are not enabled
- `full-template`
  - full original template injection
  - used for compare / debugging / recovery and current public song detail playback / metronome paths

API selector:

```text
/api/kuailepu-runtime/<slug>?runtime_asset_profile=full-template
```

Feature auto-upgrade:

```text
/api/kuailepu-runtime/<slug>?public_feature=metronome
/api/kuailepu-runtime/<slug>?public_feature=playback
```

## Hard Dependencies

Do not remove from the minimal public profile without a new runtime QA pass:

- `lib/jquery/1.8.3/jquery.min.js`
- `cdn/js/i18n_d3be79dfbd.js`
- `cdn/js/kit_9b7263d863.js`
- `cdn/js/dist/hc.min_1cfae5fe62.js`
- `cdn/js/song_builder_a87186a4c4.js`
- `cdn/js/song_1f2ad3c3ba.js`

## Reserved Assets

The disabled-by-default scripts in the read-only profile cover legacy UI/features such as:

- Materialize / jQuery UI
- soundmanager legacy UI helpers
- non-feature metronome helpers
- microphone
- favorites / login-related UI
- clipboard / chip tags / media helpers

These are reserved assets, not deleted code.

Public playback also depends on local soundfont assets under `public/static/soundfont/**`; those are deployable runtime assets, not temporary debug files.

## CSS

CSS has not been aggressively trimmed because it can affect runtime container width and visual stability. If trimming CSS later, use screenshot/layout comparison, not only “SVG exists” checks.

## Recovery Workflow

When restoring a feature such as metronome, playback, favorites, or microphone:

1. define exact feature scope
2. add required scripts back through the asset profile
3. restore only the required public UI
4. verify English copy and mobile behavior
5. run runtime QA and preflight on representative songs
