# P4 Runtime Library Replacement Plan

This note marks replacement entry points for the authorized legacy runtime libraries. P3 keeps the current rendering, playback, and metronome behavior intact; this document is only a handoff map for later P4 work.

## jQuery UI

Current role:

- `vendor/kuailepu-static/lib/jqueryui/1.11.4/jquery-ui.min.js`
- `vendor/kuailepu-static/lib/jqueryui/1.11.4/jquery-ui.min.css`
- Historically supports modal and generic UI helpers in the archived runtime template.

Current isolation:

- Public `public-song` deployment filtering does not copy jQuery UI JS into `public/k-static`.
- Runtime compatibility stubs cover modal helper calls that the public shell no longer needs directly.

P4 replacement entry:

- Replace remaining modal helper calls in the runtime template bridge with React-owned panel state.
- Remove jQuery UI CSS only after screenshot parity confirms playback/metronome panels do not depend on it.

## Materialize

Current role:

- `vendor/kuailepu-static/lib/materialize/0.97.5/js/materialize.min.js`
- `vendor/kuailepu-static/cdn/css/materialize-0.97.5_4f7335d448.css`
- Runtime modals, select styles, overlay side effects, and toast calls.

Current isolation:

- Public `public-song` deployment filtering does not copy Materialize JS.
- `publicRuntimeAssets.ts` injects a small `Materialize.toast` fallback for public pages.
- Playback bridge overrides modal open/close behavior inside the container host.

P4 replacement entry:

- Move playback and metronome modals to React-owned controls.
- Remove Materialize CSS after runtime modal markup is no longer visible or required.

## soundmanager2

Current role:

- `vendor/kuailepu-static/lib/soundmanager2/2.97a.20150601/**`
- Legacy media/audio UI support, separate from the runtime MIDI soundfont path.

Current isolation:

- Public `public-song` deployment filtering does not copy soundmanager2 JS.
- Compatibility stubs provide no-op `soundManager` methods for public pages.

P4 replacement entry:

- Confirm no public song flow still calls soundmanager2 for MIDI playback.
- Remove bar UI CSS/images only after media panel code is fully absent from the public runtime profile.

## MIDI Soundfont Path

Current role:

- `public/static/soundfont/**`
- Runtime MIDI playback loads full instrument soundfont JS or per-note MP3 samples on demand.

Current P3 optimization:

- Public shell schedules idle prefetch for the default piano soundfont and a small bass/drum warm set.
- Cache headers distinguish soundfont JS from audio samples.

P4 replacement entry:

- Replace legacy `MidiPlayer`/`MidiContext` orchestration only after a native player reproduces count-in, transpose, tempo, loop, note highlight, and no-sound fallback behavior.

