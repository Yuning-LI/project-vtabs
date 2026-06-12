# Manual Runtime QA Checklist

Use this after importing/publishing songs or changing runtime, song shell, letter mode, controls, or iframe behavior.

## Required Automated Checks

Before manual QA:

```bash
npm run validate:content
npm run validate:songbook
npm run doctor:song -- <slug>
npm run preflight:kuailepu-publish -- <slug...>
```

For runtime or shell changes, also run:

```bash
npm run build
```

Preflight compare must use `number` mode through the publish script. If the runtime compare login is invalid, stop and ask the user to run `npm run login:kuailepu`.

## URLs To Open

For each sampled slug:

```text
http://127.0.0.1:3000/song/<slug>
http://127.0.0.1:3000/song/<slug>?note_label_mode=number
http://127.0.0.1:3000/api/kuailepu-runtime/<slug>?note_label_mode=number
```

For iframe/container parity review:

```text
http://127.0.0.1:3000/dev/runtime-host/review/<slug>
http://127.0.0.1:3000/dev/runtime-host/review/<slug>?note_label_mode=number
http://127.0.0.1:3000/dev/runtime-host/review/<slug>?measure_layout=mono
http://127.0.0.1:3000/dev/runtime-host/review/<slug>?sheet_scale=12
http://127.0.0.1:3000/dev/runtime-host/review/<slug>?practice_tool=metronome
```

For public query-flagged host review:

```text
http://127.0.0.1:3000/song/<slug>
http://127.0.0.1:3000/song/<slug>?runtime_host=container
http://127.0.0.1:3000/song/<slug>?runtime_host=iframe
http://127.0.0.1:3000/song/<slug>?runtime_host=container&note_label_mode=number
http://127.0.0.1:3000/song/<slug>?runtime_host=container&measure_layout=mono
http://127.0.0.1:3000/song/<slug>?runtime_host=container&sheet_scale=12
http://127.0.0.1:3000/song/<slug>?runtime_host=container&practice_tool=metronome
```

For local runtime host rollout self-test:

```text
http://127.0.0.1:3000/song/<slug>
http://127.0.0.1:3000/song/<slug>?runtime_host=container
http://127.0.0.1:3000/song/<slug>?runtime_host=iframe
http://127.0.0.1:3000/song/<slug>?runtime_host_rollout_key=always-check
```

Local environment examples:

```bash
NEXT_PUBLIC_RUNTIME_HOST_DEFAULT=container npm run dev -- -p 3001
NEXT_PUBLIC_RUNTIME_HOST_DEFAULT=iframe npm run dev -- -p 3001
NEXT_PUBLIC_RUNTIME_HOST_CONTAINER_ROLLOUT_PERCENT=100 npm run dev -- -p 3001
NEXT_PUBLIC_RUNTIME_HOST_CONTAINER_ROLLOUT_PERCENT=0 npm run dev -- -p 3001
curl -A "Googlebot/2.1" "http://127.0.0.1:3001/song/<slug>"
curl -H "x-vtabs-runtime-user-agent: Googlebot/2.1" "http://127.0.0.1:3001/song/<slug>"
```

For export-route host review:

```text
http://127.0.0.1:3000/dev/print/song/<slug>
http://127.0.0.1:3000/dev/print/song/<slug>?runtime_host=container
http://127.0.0.1:3000/dev/print/song/<slug>?runtime_host=iframe
http://127.0.0.1:3000/dev/print/song/<slug>?runtime_host=container&note_label_mode=number
http://127.0.0.1:3000/dev/print/song/<slug>?runtime_host=container&measure_layout=mono
http://127.0.0.1:3000/dev/print/song/<slug>?runtime_host=container&sheet_scale=12
http://127.0.0.1:3000/dev/pinterest/song/<slug>
http://127.0.0.1:3000/dev/pinterest/song/<slug>?runtime_host=container
http://127.0.0.1:3000/dev/pinterest/song/<slug>?runtime_host=iframe
http://127.0.0.1:3000/dev/pinterest/song/<slug>?runtime_host=container&note_label_mode=number
http://127.0.0.1:3000/dev/pinterest/song/<slug>?runtime_host=container&measure_layout=mono
http://127.0.0.1:3000/dev/pinterest/song/<slug>?runtime_host=container&sheet_scale=12
```

For export script host review:

```bash
npm run export:print-pdf -- --slug <slug> --base-url http://127.0.0.1:3000 --runtime-host iframe --output /tmp/vtabs-phase12/<slug>-print-iframe.pdf
npm run export:print-pdf -- --slug <slug> --base-url http://127.0.0.1:3000 --runtime-host container --output /tmp/vtabs-phase12/<slug>-print-container.pdf
npm run export:pinterest-pin -- --slug <slug> --base-url http://127.0.0.1:3000 --runtime-host iframe --output-dir /tmp/vtabs-phase12/pinterest-iframe --width 500 --height 800 --dpr 1 --capture canvas --max-output-height 1400
npm run export:pinterest-pin -- --slug <slug> --base-url http://127.0.0.1:3000 --runtime-host container --output-dir /tmp/vtabs-phase12/pinterest-container --width 500 --height 800 --dpr 1 --capture canvas --max-output-height 1400
```

## Internal Runtime Host Review

Use `/dev/runtime-host/review/<slug>` only for internal iframe/container parity work.

Check:

- iframe baseline and container host render side by side
- runtime mode diagnostics show iframe baseline and native container host
- query-state diagnostics match the selected sample song, instrument, note mode, layout, zoom, metronome, and visual theme
- iframe ready and container ready both become `yes`
- container measured height and rendered-sheet diagnostics update after render
- console diagnostics remain `clean`; if not, capture the listed messages before changing code
- global changes list shows the captured runtime globals after container scripts finish loading
- Sample Song, Instrument, Fingering, Note Labels, Layout, Zoom, Fingering Chart, Metronome, and Visual Theme controls navigate and remount cleanly
- `Listen`, playback panel close, `Stop`, and `Redraw` continue to use the normalized host controller boundary
- route changes between sample songs leave one `#sheet` per host and no stale playback or metronome panel
- public `/song/<slug>` still uses the iframe host by default

## Public Query-Flagged Host Review

Use `runtime_host=container` only for public-shell parity review. The default public URL must remain iframe-backed.

Check:

- `/song/<slug>` renders one iframe host and no public container host
- `/song/<slug>?runtime_host=container` renders the container host and no iframe host
- `/song/<slug>?runtime_host=iframe` renders the iframe host even after a container-mode visit
- `NEXT_PUBLIC_RUNTIME_HOST_DEFAULT=container` can select the container host on a local experimental server, while `runtime_host=iframe` still forces iframe
- host-query pages keep the canonical song URL and emit `noindex, nofollow`
- Instrument, Fingering Chart, Note Labels, Layout, Zoom, Metronome, and Visual Theme controls preserve the explicit `runtime_host` query
- container-mode control changes remount cleanly with one `#sheet`, one rendered SVG, no stale loading overlay, and no duplicated playback or metronome panel
- `Listen`, playback panel close, `Stop`, and metronome `On/Off` work in both iframe and container modes
- removing `runtime_host` returns the page to the iframe default unless an experimental environment default is set

## Local Runtime Host Rollout Review

Use the rollout controls only for local self-test. Do not enable production grey traffic splitting; the later public switch should be a deliberate full rollout.

Check:

- default `/song/<slug>` renders iframe when no query, environment default, or local rollout percentage is set
- `runtime_host=container` still forces container and `runtime_host=iframe` still forces iframe
- `NEXT_PUBLIC_RUNTIME_HOST_DEFAULT=container` selects container for normal human requests
- `NEXT_PUBLIC_RUNTIME_HOST_DEFAULT=iframe` forces iframe even after a container-mode test
- `NEXT_PUBLIC_RUNTIME_HOST_CONTAINER_ROLLOUT_PERCENT=100` selects container for ordinary non-crawler local requests
- `NEXT_PUBLIC_RUNTIME_HOST_CONTAINER_ROLLOUT_PERCENT=0` returns ordinary local requests to iframe
- requests with crawler user agents such as `Googlebot/2.1`, `Bingbot/2.0`, or `DuckDuckBot/1.0` render iframe even when local rollout percentage is `100`; browser automation may use `x-vtabs-runtime-user-agent` to verify the same server branch when stealth tooling rewrites `User-Agent`
- repeated requests with the same `runtime_host_rollout_key` resolve to the same host while the rollout percent is unchanged
- `window.__PUBLIC_RUNTIME_HOST_MONITOR__` records `host_decision` and `runtime_ready` after page load
- clicking `Listen` records `playback_open` and still opens playback or preserves the existing fallback behavior
- dispatching a test error records `window_error` without breaking the page:

```js
window.dispatchEvent(new ErrorEvent('error', { message: 'phase13 test error' }))
window.__PUBLIC_RUNTIME_HOST_MONITOR__
```

- dispatching a rejected promise records `unhandled_rejection` without breaking the page:

```js
window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', { reason: new Error('phase13 test rejection') }))
window.__PUBLIC_RUNTIME_HOST_MONITOR__
```

- any blank sheet, duplicated sheet, playback failure, metronome failure, or route-change remount issue is a stop condition; force iframe with `runtime_host=iframe`, `NEXT_PUBLIC_RUNTIME_HOST_DEFAULT=iframe`, or rollout percent `0`

## Export Route Host Review

Use `runtime_host=container` only for export parity review. Print and Pinterest preview/export defaults must remain iframe-backed.

Check:

- `/dev/print/song/<slug>` renders one iframe host and no public container host
- `/dev/print/song/<slug>?runtime_host=container` renders the container host and no iframe host
- `/dev/print/song/<slug>?runtime_host=iframe` renders the iframe host even after a container-mode visit
- print preview keeps the same paper mode, instrument, note labels, fingering chart, lyrics, measure numbers, layout, and zoom query state in both host modes
- print PDF export without `--runtime-host` uses iframe; `--runtime-host container` opts into the container host
- print PDF file format, filename path, A4 orientation, CSS page size, and PDF options stay unchanged
- `/dev/pinterest/song/<slug>` renders one iframe host under the Pinterest export root and no public container host
- `/dev/pinterest/song/<slug>?runtime_host=container` renders the container host under the Pinterest export root and no iframe host
- `/dev/pinterest/song/<slug>?runtime_host=iframe` renders the iframe host even after a container-mode visit
- Pinterest preview keeps the same instrument, note labels, fingering chart, lyrics, measure numbers, layout, zoom, watermark, title, footer, and destination link state in both host modes
- Pinterest image export without `--runtime-host` uses iframe; `--runtime-host container` opts into the container host
- Pinterest output filename, manifest destination URL, tracking URL, screenshot target, and title-gap crop behavior stay unchanged
- container exports produce visible sheet output with no extra inner scrollbar, no clipped first system, and no unexpected bottom blank area
- when a container export differs visually, rerun the same command with `--runtime-host iframe` and record the difference before changing code

## Default Public Page

Check:

- no obvious flash of numbered notes before letter mode settles
- title, body, FAQ, controls are English
- no internal runtime provenance wording
- fingering chart and notation enter view without excessive shell height
- no grey overlay, modal residue, inner iframe scrollbar, or large bottom blank area
- pure Chinese lyrics stay hidden and do not expose a public lyrics toggle
- if public lyrics exist, lyrics remain aligned with the melody

## Number Mode

Check:

- original numbered notation style is restored
- no letter-mode leftover labels or white cover blocks
- repeats, measures, lyrics, and fingering chart still render normally

## Bare Runtime

Check:

- `svg.sheet-svg` renders
- no overlay blocks it
- runtime height is complete

## Letter Mode

Check:

- note labels are letters
- rests show `R`
- hold lines show `-`
- accidentals like `Eb5` / `F#5` fit
- western breath mark comma appears where expected
- labels do not collide badly with lyrics or fingering charts
- switching instrument / fingering still updates the labels correctly

## Controls / Practice Tools

When controls are touched:

- Instrument, Fingering Chart, Layout, Zoom, Note View preserve query state.
- Lyrics toggle appears only when public lyrics are available.
- Metronome UI is English and docked above the sheet.
- Metronome does not cover the fingering chart.
- Playback opens from the shell `Listen` button and can return to `Stop`.
- Playback panel opens in the upper-right area on desktop and stays readable on mobile.
- Playback start shows the integrated runtime `3 / 2 / 1` countdown overlay before audio begins.
- Clicking blank area inside the iframe closes the playback panel without breaking the page.
- Clicking blank area outside the iframe also closes the playback panel without stopping playback.
- In `letter` mode, playback note highlight remains visible on the overlay instead of disappearing behind the white label cover.
- On mobile, `More Tools` opens and `Close more tools` fully dismisses the drawer without immediately reopening.

## SEO Shell

When content shell is touched:

- homepage song cards show title only
- page copy is English and song-specific
- metadata avoids mechanical brand suffixes
- song pages naturally cover ocarina, recorder, and tin whistle when supported

## Good Regression Samples

Long pages:

- `turkish-march`
- `canon`
- `jingle-bells`
- `we-wish-you-a-merry-christmas`

Lyrics / English-page samples:

- `twinkle-twinkle-little-star`
- `silent-night`
- `greensleeves`
- `scarborough-fair`

Dense / complex samples:

- `moonlight-sonata`
- `wedding-march`
- `air-on-the-g-string`
- `fur-elise`

Known stable quick samples:

- `frere-jacques`
- `london-bridge`
- `old-macdonald`
- `do-your-ears-hang-low`

## If Something Fails

Classify first:

1. `number` mode fails: raw JSON / runtime / compare condition issue.
2. `number` passes, `letter` fails: letter overlay issue.
3. bare runtime passes, public page fails: shell / iframe / controls issue.
