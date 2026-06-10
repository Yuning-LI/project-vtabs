# Public Runtime Native Renderer Research

This document is the research entry for the later modular/native renderer phase.

It does not start the renderer rewrite.

Its purpose is to keep future renderer work scoped, measurable, and separated from
Phase 3 visual differentiation.

## Current Truth

Public song pages still use:

```text
runtime JSON -> Kit.context.setContext(...) -> Song.draw()/compile() -> hc.parse/render -> SVG
```

The current visual theme layer changes the rendered SVG after the integrated runtime
has produced it. That is correct for the current operating path, but it is not native renderer ownership.

Full renderer replacement needs our own:

- notation parser
- semantic melody model
- measure and repeat model
- fingering event model
- layout engine
- SVG renderer
- playback / highlight timing source
- fallback strategy for unsupported syntax

## Existing Local Evidence

Use these files before starting any parser or renderer implementation:

- `reference/hc-history-investigation/2026-04-02/combined-summary-for-coding-ai.md`
- `reference/hc-history-investigation/2026-04-02/hc-engine-structure-map.md`
- `reference/hc-history-investigation/2026-04-02/hc-module-evidence-matrix.md`
- `reference/song-publish-candidates/review-notes/hc-parser-grammar-analysis-2026-05-13.md`
- `reference/song-publish-candidates/review-notes/hc-duration-encoding-analysis-2026-05-13.md`
- `reference/song-publish-candidates/review-notes/hc-overlap-semantic-analysis-2026-05-13.md`
- `reference/song-publish-candidates/review-notes/hc-runtime-absorption-progress-2026-05-13.md`
- `reference/song-publish-candidates/review-notes/kuailepu-repeat-grammar-analysis-2026-05-12.md`
- `reference/song-publish-candidates/review-notes/kuailepu-slur-group-analysis-2026-05-12.md`
- `reference/song-publish-candidates/review-notes/kuailepu-rhythm-marker-analysis-2026-05-12.md`
- `reference/song-publish-candidates/review-notes/kuailepu-directive-analysis-2026-05-12.md`

Main conclusion from the existing evidence:

- `hc` is a parser / lexer / layout / render engine, not just an SVG template store.
- Replacing it is a real renderer project, not a naming cleanup.

## Research Questions Before Implementation

### 1. Catalog Syntax Coverage

Answer:

- which notation constructs are used by current public songs
- how often they appear
- which songs are simple enough for renderer MVP
- which songs require integrated-runtime fallback

Track at least:

- plain scale notes and rests
- octave markers: `g`, `d`, `'`, `,`, `"`
- accidentals: `#`, `b`, `n`
- duration suffixes: `x`, `_`, `-`, `.`, `=`, `/`
- bars and end bars
- repeat starts / ends / numbered endings
- parenthesized groups
- tuplet heads
- lyric blocks
- text / annotation blocks
- key-value directives such as `{bpm:...}` and `{cn:...}`

### 2. Renderer MVP Scope

The first native renderer should not try to match every integrated-runtime feature.

Suggested MVP:

- one instrument family first, likely `o12`
- letter-note output first
- simple bars and line wrapping
- inline fingering charts
- lyric alignment only for simple public-lyrics songs
- no full repeat expansion at first
- integrated-runtime fallback for unsupported syntax

### 3. Layout Correctness Target

Do not use byte-for-byte SVG equality as the target.

Use:

- melody event count
- pitch sequence
- rest sequence
- bar count
- fingering anchor count
- visible row stability
- acceptable visual alignment

The new renderer should be visually ours, not a clone of archived output.

### 4. Fallback Contract

Unsupported songs must fail intentionally.

Do not silently show a wrong native render.

The route decision should eventually become:

```text
if native renderer supports this song:
  render native runtime
else:
  render integrated-runtime fallback
```

## Useful Existing Commands

Grammar and semantic analysis:

```bash
npm run analyze:hc-parser-grammar
npm run analyze:hc-overlap-semantics -- --slug=<slug>
npm run analyze:kuailepu-repeat-grammar
```

Import / overlap analysis:

```bash
npm run compare:song-ingest-overlap -- --slug=<slug>
npm run generate:kuailepu-from-ingest -- <draft.json> --template=<template-slug> --slug=<slug>
```

Runtime safety checks:

```bash
npm run build
npm run validate:content
npm run validate:songbook
```

## Current Implementation State

Status: dev-only MVP chain started.

Public `/song/<slug>` still uses the integrated runtime. The native renderer work is
currently isolated to internal tooling and `/dev/native-renderer/song/[id]` /
`/dev/native-renderer/review/[id]`.

Implemented so far:

- `SongIR v0` type model in `src/lib/native-renderer/songIr.ts`
- `MusicXML draft -> SongIR` adapter in `src/lib/native-renderer/fromMusicXmlDraft.ts`
- runtime payload notation -> SongIR adapter in `src/lib/native-renderer/fromRuntimeNotation.ts`
- native SongIR loader in `src/lib/native-renderer/loadSongIr.ts`
- conservative native support contract in `src/lib/native-renderer/support.ts`
- native syntax / SongIR validation scripts:
  - `npm run analyze:public-runtime-syntax-inventory`
  - `npm run analyze:native-song-ir`
  - `npm run analyze:native-runtime-song-ir`
- dev-only preview route:
  - `/dev/native-renderer/song/on-top-of-old-smoky`
  - supported songs render through `NativeMelodySheet`
  - unsupported or missing SongIR shows an explicit fallback diagnostic page
- dev-only side-by-side route:
  - `/dev/native-renderer/review/<slug>`
  - add `?source=runtime` to compare integrated runtime against native rendering from deployable runtime JSON

Current strict support contract:

- MusicXML draft mode only admits the 15 MusicXML-backed native MVP seed songs
- runtime probe mode admits deployable runtime JSON for internal analysis only
- SongIR must be version `0`
- source must match the selected mode: `musicxml-draft` or `runtime-notation`
- `unsupported` must be empty
- note and measure sequences must be non-empty
- slug must match the SongIR metadata slug
- o12 fingering coverage must be complete for every note

Latest `npm run analyze:native-song-ir` result:

- MVP seed count: 15
- currently supported: 12
- fallback due to missing o12 fingering: 3 songs with MIDI `79`

Latest `npm run analyze:native-runtime-song-ir -- --limit=400` result:

- runtime catalog count: 400
- currently supported in internal runtime-probe mode: 104
- unsupported syntax count: 281
- semantic issue count: 209, mostly missing current o12 fingering coverage for out-of-range notes
- songs with recognized parenthesized groups: 279
- songs with modeled repeat markers: 131
- songs with modeled first/second ending markers: 83
- section labels such as `A:` / `B:` and safe markers such as `{mark:A}` / `{hot}` are now classified as non-melody layout markers
- repeat bars and first/second ending markers are now represented in SongIR, but still intentionally keep affected songs in fallback until native visual rendering and play-order expansion are implemented
- highest-value next syntax gaps: native visual rendering for repeats / endings, `{play:...}` play-order expansion, tuplets, and fingering / tonality directives

This means the current native renderer is safe for internal development, but not
ready for public route replacement.

## Syntax Inventory Subphase

Status: implemented as first-pass catalog audit.

The current inventory entry is:

```bash
npm run analyze:public-runtime-syntax-inventory
```

Default output:

```text
tmp/public-runtime-syntax-inventory.json
tmp/public-runtime-syntax-inventory.md
```

The report should group songs into:

- `native-mvp-candidate`
- `native-common-candidate`
- `needs-repeat-support`
- `needs-group-support`
- `needs-lyric-support`
- `integrated-runtime-fallback-required`

Latest local run on the 400-song public runtime catalog:

- `native-mvp-candidate`: 22 songs
- `native-common-candidate`: 15 songs
- `needs-repeat-support`: 200 songs
- `needs-group-support`: 109 songs
- `needs-lyric-support`: 52 songs
- `integrated-runtime-fallback-required`: 2 songs
- public songs with local MusicXML draft / candidate overlap: 56 songs
- `native-mvp-candidate` songs with local MusicXML draft overlap: 15 songs

Current implication:

- A tiny renderer MVP should start with the 15 songs that are both `native-mvp-candidate` and backed by local MusicXML draft artifacts.
- The remaining 7 `native-mvp-candidate` songs can still be useful, but they would require runtime-notation parsing first or a fresh XML source.
- Repeat support is the largest unlock because about half the public catalog uses repeat bars, numbered endings, `{play:...}`, or section labels.
- Group / parenthesized-note support is the second-largest unlock.
- Until repeat and group support exist, the public route must keep integrated-runtime fallback.

Recommended first native renderer seeds:

- `on-top-of-old-smoky`
- `the-coventry-carol`
- `good-christian-men-rejoice`
- `beautiful-isle-of-somewhere`
- `quartermasters-store`
- `camptown-races`
- `give-my-regards-to-broadway`
- `drink-to-me-only-with-thine-eyes`
- `careless-love`
- `over-there`
- `for-hes-a-jolly-good-fellow`
- `polly-wolly-doodle`
- `sometimes-i-feel-like-a-motherless-child`
- `waltzing-matilda`
- `the-bells-of-st-marys`

## Suggested Implementation Sequence

1. Define `SongIR v0`.
   - Keep it deliberately small: metadata, key/BPM, measures, events, rests, durations, simple lyric slots, and instrument fingering anchors.
   - Do not encode every Happy123 / integrated-runtime feature in v0.
   - Current status: implemented.
2. Build `MusicXML draft -> SongIR` first.
   - This is the cleanest path because the local draft artifacts still preserve more structured intent than compressed runtime notation.
   - Use runtime-notation parsing only for a small simple subset, not as the primary input path.
   - Current status: implemented for the 15 MVP seed drafts.
3. Add an explicit native/fallback contract.
   - `supported` songs can render through the native path.
   - unsupported songs must intentionally stay on the integrated runtime.
   - never silently show a partial or wrong native render.
   - Current status: implemented for dev-only routing; currently 12 of 15 MVP seeds pass the strict o12 support gate.
4. Build a dev-only native preview route before touching public `/song/<slug>`.
   - Compare event counts, pitch sequence, rest sequence, bar count, lyric slot count, and fingering anchor count.
   - Visual equality with integrated runtime SVG is not the target.
   - Current status: implemented with basic o12 fingering diagrams.
5. Expand support in unlock order.
   - reusable layout engine primitives
   - simple lyric alignment
   - repeat / play order
   - parenthesized groups / slurs
   - playback / highlight timing
   - broader instrument views
   - Current status: next work.

## Next Work

Preferred next steps:

1. Stabilize the native layout engine boundary.
   - Move from one-off flex rows toward reusable row / measure / event layout primitives.
   - Keep it visually ours; do not chase integrated-runtime SVG equality.
2. Expand semantic QA output for each supported native song.
   - event count
   - pitch sequence checksum
   - rest sequence checksum
   - measure count
   - lyric slot count
   - fingering anchor count
3. Add side-by-side internal review tooling.
   - show integrated runtime output and native sheet together for the same song
   - compare semantic stats, not SVG bytes
4. Expand parser / model support by unlock value.
   - repeat support unlocks the largest public subset
   - parenthesized group / slur support is second
   - playback / highlight timing should come after the layout model is less volatile

## Boundary With Phase 3

Phase 3 visual work should continue using `PublicRuntimeVisualTheme`.

Do not block visual work on native renderer replacement unless a visual change needs data that the integrated
runtime cannot expose safely.

The first Phase 5 output has now moved beyond knowledge and classification into a
dev-only native renderer chain. The public route should still remain integrated-runtime
backed until the native chain has semantic QA, side-by-side review, and a larger
syntax surface.
