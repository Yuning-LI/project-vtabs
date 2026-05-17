# Song Ingest Operator Runbook

Canonical operator playbook for local `MusicXML` / `MXL` song ingest.

Use this when the goal is not just "generate something", but to move a song through a stable,
repeatable path that a new engineer or a fresh AI session can execute without re-discovering rules.

This document is the shortest end-to-end guide. Deeper rule docs still exist:

- input model and source boundary: `docs/song-ingest-input-spec.md`
- publication review rules: `docs/song-ingest-publication-playbook.md`
- public instrument exposure rules: `docs/public-instrument-selection-rules.md`
- runtime manual QA: `docs/manual-runtime-qa-checklist.md`

## Goal

For each candidate song, we want:

1. one standard source-to-candidate path
2. one standard external-review record
3. one standard readiness check before promote / publish
4. no hidden "remember to also do X" rules living only in chat history

## Non-Negotiable Rules

- Do not publish directly from raw `MusicXML`.
- Do not skip external melody/version verification for local-ingest songs.
- Do not treat local preview success as publication proof.
- Do not silently hide suspicious lyrics before a human has seen them.
- Do not move unpublished songs into public learn/hub links early.
- Do not bypass runtime validation just because the candidate is synthetic.

## Network Split

- China-reachable VPN:
  - Kuailepu login
  - Kuailepu import / compare / live-context debugging
- Foreign VPN preferred:
  - Google
  - Wikipedia
  - IMSLP
  - MuseScore cross-checks
  - western public-domain references

Do not assume both are reachable at once.

## Standard Single-Song Path

Fastest standard entry:

```bash
npm run ingest:song-candidate -- <input.xml|input.mxl> \
  --slug=<slug> \
  --title="Song Title" \
  --family=folk \
  --lyric-policy=show-publicly
```

This wrapper is now the standard candidate path.

It writes the standard draft/runtime/songdoc/report/sanity outputs and, by default:

- resolves runtime BPM from manual override or source metadata before falling back
- runs runtime fingering optimization automatically
- writes punctuation-free aligned lyric slots for stable note-to-lyric matching
- keeps a separate display lyric layer so punctuation stays attached to words instead of consuming slots
- writes a runtime audit marker into candidate runtime JSON

Use `--tempo-bpm=<number>` when external verification establishes a better BPM than the source file.
Only use `--skip-runtime-fingering-optimize=true` for bulk staging/debug work that is explicitly not
ready for publish review yet.

### 1. Prepare draft

```bash
npm run prepare:song-ingest -- <input.xml|input.mxl> \
  --title="Song Title" \
  --slug=<slug> \
  --family=folk \
  --lyric-policy=show-publicly
```

Preferred persisted output:

```bash
npm run prepare:song-ingest -- <input.xml|input.mxl> \
  --title="Song Title" \
  --slug=<slug> \
  --family=folk \
  --lyric-policy=show-publicly \
  --out=reference/song-publish-candidates/drafts/<slug>.json
```

Expected artifact:

- `reference/song-publish-candidates/drafts/<slug>.json`
- `reference/song-publish-candidates/source-sanity/<slug>.json`

### 2. Generate candidate runtime + songdoc

```bash
npm run generate:kuailepu-from-ingest -- reference/song-publish-candidates/drafts/<slug>.json \
  --template=happy-birthday-to-you \
  --slug=<slug> \
  --title="Song Title" \
  --auto-transpose=o12
```

Expected artifact set:

- `reference/song-publish-candidates/runtime/<slug>.json`
- `reference/song-publish-candidates/songdocs/<slug>.json`
- `reference/song-publish-candidates/reports/<slug>-report.json`
- `reference/song-publish-candidates/source-sanity/<slug>.json`

### 3. Run the ingest doctor

```bash
npm run doctor:song-ingest -- <slug>
```

Interpretation:

- `blocked`
  - candidate artifacts are incomplete, or HC consistency is in `warning`
- `review-needed`
  - automatic generation completed, but external verification is not yet recorded
- `ready-to-promote`
  - candidate is generated and review is recorded; still local-only
- `publish-layer-incomplete`
  - promoted into `data/`, but manifest / SEO work is incomplete
- `ready-to-publish`
  - promoted, reviewed, and metadata is prepared; run final validation/preflight
- `published`
  - already in the public layer

### 4. External verification is mandatory

Preferred lightweight review record:

```bash
npm run record:song-ingest-review -- <slug> \
  --status=verified \
  --approve=true \
  --refs=Wikipedia,MuseScore \
  --summary="Opening title, melody, and source version verified."
```

Record at least:

- references checked
- title / attribution result
- opening lyric match result
- opening melody contour result
- whether the source starts at the main tune
- remaining risk / variant note
- approve / hold decision

Minimum review targets:

1. title and attribution
2. opening lyric identity when lyrics exist
3. opening melody contour
4. source starts at the common tune, not bridge/coda/fragment

Preferred references:

- IMSLP / Mutopia / Library of Congress
- Wikipedia for identity / attribution
- trusted traditional / hymn archives
- MuseScore as secondary cross-check, not sole authority

Legacy compatibility:

- `reference/song-publish-candidates/review-notes/<slug>.md` is still accepted
- but the central `reference/song-publish-candidates/review-log.json` ledger is now the preferred operator path

### 5. Local preview and manual QA

Open:

- `/dev/kuailepu-preview/<slug>`
- `/dev/unpublished-song-preview`
- `http://127.0.0.1:3000/song/<slug>` only after promote

Required automated checks before public publish:

```bash
npm run validate:content
npm run validate:songbook
npm run doctor:song -- <slug>
npm run preflight:kuailepu-publish -- <slug>
```

Use `docs/manual-runtime-qa-checklist.md` when the song is near publication or when runtime-facing
rules changed.

### 6. Promote only after review passes

```bash
npm run promote:song-ingest-candidate -- <slug>
```

This copies only the runtime/songdoc payloads into the public data layer.
It now refuses by default when any of these are missing:

- candidate report
- source sanity
- approval-grade external review evidence
- runtime fingering audit marker with `optimized` status
- resolved `{bpm:...}` directive in runtime notation

That gate exists to prevent "jumping straight into data/" with an incompletely reviewed candidate.

It does not replace:

- SEO profile work
- manifest work
- aliases
- FAQ copy
- final validation

### 7. Complete public-layer metadata

Before publication, ensure:

- `data/songbook/public-song-manifest.json`
- `data/songbook/song-seo-profiles.json`
- aliases are present when the song has stable alternate English names / translated names
- learn / hub links are added only if the song is actually approved for public release

### 8. Final publish gate

Preferred final command:

```bash
npm run publish:song-ingest-candidate -- <slug>
```

This canonical publish entry now runs:

- promote candidate runtime/songdoc
- pack deployable runtime archive
- `doctor:song-ingest`
- `validate:content`
- `validate:songbook`
- `doctor:song`
- `preflight:kuailepu-publish`

Equivalent manual checks:

```bash
npm run doctor:song-ingest -- <slug>
npm run validate:content
npm run validate:songbook
npm run doctor:song -- <slug>
npm run preflight:kuailepu-publish -- <slug>
```

Public publish is ready only when:

- `doctor:song-ingest` is no longer `blocked` / `review-needed`
- external review record exists
- manifest entry exists
- SEO profile exists
- final validation passes

## Batch Workflow

For large corpora:

1. batch-generate candidates
2. batch-audit
3. batch-classify
4. export a review queue
5. review only the highest-value songs
6. publish in small daily batches

Core commands:

```bash
npm run generate:song-ingest-batch -- private/openewld/dataset ...
npm run audit:song-ingest-batch -- private/openewld/dataset ...
npm run classify:song-ingest-batch -- ...
npm run export:song-ingest-review-queue -- ...
```

Even in batch mode, every song still needs:

- per-song external review evidence
- per-song `doctor:song-ingest` passable state
- per-song publish metadata
- per-song runtime fingering audit completion before promote

## Definition Of Done

A local-ingest song is ready for public release only when all are true:

- candidate draft exists
- candidate runtime exists
- candidate songdoc exists
- candidate report exists
- source sanity exists
- HC consistency is not `warning`
- external review record exists
- SEO profile exists
- manifest entry exists
- aliases are filled when applicable
- validate/content/song doctor/preflight pass

## Default Troubleshooting

- `doctor:song-ingest` says `blocked`
  - missing artifacts or generator inconsistency; fix generation first
- lyrics look suspicious
  - keep them visible in local candidate preview, record the suspicion in the review ledger, do not silently strip first
- source sanity says `review`
  - this is not auto-fail by itself; it means a human must explicitly clear the source/version risk
- synthetic song skips live Kuailepu compare
  - expected; local-ingest songs still need runtime validation plus external verification

## Current Canonical Commands

```bash
npm run ingest:song-candidate -- <input.xml|input.mxl> --slug=<slug> --title="Song Title" --family=folk --lyric-policy=show-publicly
npm run prepare:song-ingest -- <input.xml|input.mxl> --slug=<slug> --out=reference/song-publish-candidates/drafts/<slug>.json
npm run generate:kuailepu-from-ingest -- reference/song-publish-candidates/drafts/<slug>.json --template=happy-birthday-to-you --slug=<slug> --auto-transpose=o12
npm run doctor:song-ingest -- <slug>
npm run record:song-ingest-review -- <slug> --status=verified --approve=true --refs=Wikipedia,MuseScore --summary="External review passed."
npm run promote:song-ingest-candidate -- <slug>
npm run publish:song-ingest-candidate -- <slug>
```
