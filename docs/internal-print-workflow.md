# Internal Print Workflow

Internal-only PDF export flow for fingering sheets.

## Boundary

- Do not expose print routes or export scripts on public song pages.
- Keep public `/song/<slug>` focused on web reading/playback.
- Keep rights-sensitive material out of Git.

Local-only paths:

- `exports/`
- `private/`
- `reference/`

Recommended local structure:

- `exports/print-pdf/`
- `private/song-sources/`
- `private/song-runtime/`
- `private/song-rights/`

## Current Tools

- preview route: `/dev/print/song/<slug>`
- export command:

```bash
npm run export:print-pdf -- --slug <slug> --base-url http://127.0.0.1:3000 --output exports/print-pdf/<filename>.pdf
```

Defaults:

- `letter` note mode
- fingering chart on
- lyrics off
- measure numbers on
- A4 portrait

## Public-Domain Flow

1. Confirm the song exists in the public catalog and has deployable runtime JSON.
2. Choose instrument, note mode, lyrics, measure numbers, orientation, scale.
3. Review `/dev/print/song/<slug>`.
4. Export PDF.
5. Manually review output before distribution.

## Copyrighted Song States

Do not mix these states:

- Not authorized: local internal review only; keep in `private/`.
- Authorized for platform distribution only: do not assume website permission.
- Authorized for website and distribution: store evidence in `private/song-rights/`, then evaluate public promotion.

## Print Request Inputs

Ask for:

- song title / slug
- source input: existing slug, Kuailepu URL, MusicXML, MIDI, or notation text
- target instrument
- note mode
- lyrics on/off
- measure numbers on/off
- paper orientation
- rights state

## Output Naming

Use:

```text
<slug>-<instrument>-<mode>.pdf
```

Example:

```text
silent-night-r8b-number.pdf
```

## Pinterest Collection PDF Boundary

Pinterest collection PDFs are separate internal-only tooling:

- one A4 electronic PDF
- cover page
- table of contents
- each song starts on a new page
- one song may continue across pages until complete

Implement that through the Pinterest preview/export chain, not by expanding `export:print-pdf` unless explicitly decided.
