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

Preflight compare must use `number` mode through the publish script. If Kuailepu login is invalid, stop and ask the user to run `npm run login:kuailepu`.

## URLs To Open

For each sampled slug:

```text
http://127.0.0.1:3000/song/<slug>
http://127.0.0.1:3000/song/<slug>?note_label_mode=number
http://127.0.0.1:3000/api/kuailepu-runtime/<slug>?note_label_mode=number
```

## Default Public Page

Check:

- no obvious flash of numbered notes before letter mode settles
- title, body, FAQ, controls are English
- no Kuailepu/source-attribution wording
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
- Playback start shows the native Kuailepu `3 / 2 / 1` countdown overlay before audio begins.
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
