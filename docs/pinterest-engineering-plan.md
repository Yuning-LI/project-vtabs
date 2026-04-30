# Pinterest Engineering Plan

Internal plan for producing Pinterest images and using them to drive traffic to existing public song / learn pages.

## Constraints

- Keep public `/song/<slug>` on the runtime-backed main chain.
- Do not change runtime correctness for Pinterest.
- Keep public copy English.
- Do not create thin public pin landing pages when canonical song / learn pages already fit.
- Internal routes under `/dev/pinterest` are production tooling, not public navigation.

## Current Tooling

Internal data / routes / script:

- `src/lib/songbook/pinterestPins.ts`
- `src/app/dev/pinterest/page.tsx`
- `src/app/dev/pinterest/song/[id]/page.tsx`
- `scripts/export-pinterest-pin.ts`

Default export command:

```bash
npm run export:pinterest-portrait -- --slug <slug> --instrument <o12|o6|r8b|r8g|w6>
```

Current behavior:

- opens the internal Pinterest preview route
- waits for runtime/layout stability
- exports the full internal canvas
- crops blank header gap where possible
- reduces `sheet_scale` when needed
- targets around `1000px` width and max `1700px` height

## Destination Rules

Pins should point to:

- canonical song pages for song-specific pins
- existing learn pages for beginner, seasonal, classroom, or instrument-specific pins

Use UTM parameters for attribution:

```text
utm_source=pinterest&utm_medium=organic&utm_campaign=<wave>&utm_content=<creative-id>
```

Canonical URLs should stay clean.

## Visual Rules

Each pin should show:

- song title
- instrument / intent label
- cropped notation or fingering-chart preview
- site branding / URL / clear CTA

Do not reveal enough of the page to replace the click. Usually keep only the top 1-2 systems / rows.

Copyright-safe art direction:

- prefer generated site notation, gradients, textures, simple instrument silhouettes
- avoid movie stills, game screenshots, fan art, posters, or unclear franchise artwork

## Preset Model

Keep presets structured by wave and creative target. Useful fields:

- slug
- instrument
- destination URL
- campaign
- content id
- title treatment
- label / tag
- crop behavior

Only add manifest/CSV outputs if they are actually needed. The current user workflow only requires image files.

## Batch Buckets

Good buckets:

- beginner evergreen songs
- nursery / classroom songs
- Christmas / holiday songs
- recorder letter notes
- tin whistle songs
- first performance songs
- grey-song interest waves

## Collection PDF Boundary

Pinterest collection PDFs are internal-only and separate from `export:print-pdf`.

If implemented:

- output one A4 electronic PDF
- include cover and table of contents
- each song starts on a new page
- a song may continue across pages until complete
- build on the Pinterest preview/export chain, not public song pages

Do not expose collection PDFs publicly without a separate product decision.

## Next Useful Engineering Moves

1. Keep export-by-song reliable.
2. Expand preset coverage in small waves.
3. Add public social metadata / OG images for song pages if sharing previews become a priority.
4. Add learn-page creatives only when song-page pins underperform.

## Success Metrics

Primary:

- clicks from Pinterest to public pages
- landing-page engagement
- click-through to a second page

Secondary:

- saves
- branded search lift
- external mentions

Do not optimize for raw image impressions alone.
