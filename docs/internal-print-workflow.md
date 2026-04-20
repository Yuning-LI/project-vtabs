# Internal Print Workflow

This document defines the internal-only PDF export flow for fingering sheets.

## Scope

- Internal use only.
- Do not expose the print route or export script on public song pages.
- Keep public `/song/<slug>` pages focused on web playback and reading.

## Repository Rule

The following paths must stay local-only and should not be committed:

- `exports/`
- `private/`
- `reference/`

Recommended local structure:

- `exports/print-pdf/`
  - final generated PDFs
- `private/song-sources/`
  - MusicXML, MIDI, text notation, or other rights-sensitive inputs
- `private/song-runtime/`
  - local-only runtime payload drafts for non-public songs
- `private/song-rights/`
  - license files, screenshots, emails, contracts, platform eligibility notes

## Current Internal Tools

- Internal print preview page:
  - `/dev/print/song/<slug>`
- PDF export script:
  - `npm run export:print-pdf -- --slug <slug> ...`

These tools reuse the current Kuailepu runtime rendering chain. They do not introduce a second renderer.

## Explicit Boundary Against Pinterest Collection PDFs

Current decision:

- the internal print workflow and the planned Pinterest collection PDF workflow are related but not the same tool
- internal print export remains song-by-song and print-oriented
- the Pinterest collection PDF direction remains a separate internal-only document-style export lane

Do not blur these two workflows together in future sessions.

Current Pinterest collection PDF direction:

- input should be a list of song titles from the current public catalog
- output should be a single A4 electronic PDF
- each song starts on a new page
- if one page is not enough, the same song continues across additional pages until complete
- the collection should include:
  - cover page
  - table of contents
  - song title on each song section
  - table of contents entries with song title and starting page number

Current recommendation:

- implement that collection workflow on top of the Pinterest preview/export chain rather than folding it into `export:print-pdf`
- keep it internal-only until there is a separate product decision

## Current Export Baseline

Default print assumptions:

- `letter` note mode
- fingering chart on
- lyrics off
- measure numbers on
- `A4 portrait`

These defaults can be overridden per export.

## Recommended Print Flow For Public-Domain Songs

1. Confirm the song already exists in the site catalog and has deployable runtime JSON.
2. Decide export settings:
   - instrument
   - note mode
   - fingering chart
   - lyrics
   - measure numbers
   - paper orientation
   - scale
3. Open `/dev/print/song/<slug>` and review layout.
4. Export a PDF with:

```bash
npm run export:print-pdf -- --slug <slug> --base-url http://127.0.0.1:3000 --output exports/print-pdf/<filename>.pdf
```

5. Review the PDF manually before distribution.

## Recommended Flow For Copyrighted Songs

There are three separate states. Do not mix them.

### 1. Not Authorized

- May be prepared and exported locally for internal review only.
- Must not be added to:
  - `data/kuailepu-runtime/`
  - public manifest
  - public routes
- Source materials and drafts must remain in `private/`.

### 2. Authorized For Platform Distribution Only

- Keep the song in local private workflow unless the license explicitly covers the website too.
- Do not assume platform permission automatically covers site publication.
- Save the rights basis in `private/song-rights/`.

### 3. Authorized For Website And Distribution

- Store the license evidence in `private/song-rights/`.
- Prepare the song through the same runtime workflow used by public songs.
- Only after that, evaluate whether it can be promoted into public site data.

## Input Expectations For New Print Jobs

When requesting a new print job, provide:

- song title
- source input, one of:
  - existing site slug
  - Kuailepu page URL
  - MusicXML
  - MIDI
  - readable notation text
- target instrument
- note mode
- whether lyrics should show
- whether measure numbers should show
- paper orientation
- rights state:
  - public domain
  - not authorized
  - authorized for distribution only
  - authorized for website and distribution

## Output Naming

Recommended output pattern:

- `<slug>-<instrument>-<mode>.pdf`

Examples:

- `twinkle-twinkle-little-star-o12-letter.pdf`
- `silent-night-r8b-number.pdf`

## Current Product Boundary

- Internal print tools may include site branding and a site URL for traffic attribution.
- Public song pages should not be turned into public printable download pages without a separate product decision.
