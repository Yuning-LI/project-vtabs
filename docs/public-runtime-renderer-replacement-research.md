# Public Runtime Renderer Replacement Research

This document is the Phase 5 research entry for replacing the archived renderer.

It does not start the renderer rewrite.

Its purpose is to keep future renderer work scoped, measurable, and separated from
Phase 3 visual differentiation.

## Current Truth

Public song pages still use:

```text
runtime JSON -> Kit.context.setContext(...) -> Song.draw()/compile() -> hc.parse/render -> SVG
```

The current visual theme layer changes the rendered SVG after the archived runtime
has produced it. That is correct for Phase 3, but it is not renderer independence.

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
- which songs require fallback to archived runtime

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

The first independent renderer should not try to match every archived runtime feature.

Suggested MVP:

- one instrument family first, likely `o12`
- letter-note output first
- simple bars and line wrapping
- inline fingering charts
- lyric alignment only for simple public-lyrics songs
- no full repeat expansion at first
- archived runtime fallback for unsupported syntax

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
  render archived runtime fallback
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

## Syntax Inventory Subphase

Status: started.

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
- `archived-fallback-required`

Latest local run on the 400-song public runtime catalog:

- `native-mvp-candidate`: 22 songs
- `native-common-candidate`: 15 songs
- `needs-repeat-support`: 200 songs
- `needs-group-support`: 109 songs
- `needs-lyric-support`: 52 songs
- `archived-fallback-required`: 2 songs

Current implication:

- A tiny renderer MVP can start with the 22 `native-mvp-candidate` songs, but that is not enough to replace the public route broadly.
- Repeat support is the largest unlock because about half the public catalog uses repeat bars, numbered endings, `{play:...}`, or section labels.
- Group / parenthesized-note support is the second-largest unlock.
- Until repeat and group support exist, the public route must keep archived-runtime fallback.

## Boundary With Phase 3

Phase 3 visual work should continue using `PublicRuntimeVisualTheme`.

Do not block Phase 3 on Phase 5 unless a visual change needs data that the archived
runtime cannot expose safely.

The first Phase 5 output should be knowledge and classification, not a public route
replacement.
