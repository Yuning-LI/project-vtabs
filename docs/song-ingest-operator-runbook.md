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
  --lyric-policy=show-publicly \
  --rank-base-url=http://127.0.0.1:3000
```

This wrapper writes the standard draft/runtime/songdoc/report/sanity outputs and then tells the
operator to run `doctor:song-ingest` plus the review-note scaffold.

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
  --auto-transpose=o12 \
  --rank-base-url=http://127.0.0.1:3000
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

Generate the per-song review-note template:

```bash
npm run scaffold:song-ingest-review-note -- <slug>
```

Fill `reference/song-publish-candidates/review-notes/<slug>.md` with:

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
It now refuses by default when candidate report / source sanity / external review evidence are
missing, unless the operator explicitly overrides with `--force=true`.

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

Run:

```bash
npm run doctor:song-ingest -- <slug>
npm run validate:content
npm run validate:songbook
npm run doctor:song -- <slug>
npm run preflight:kuailepu-publish -- <slug>
```

Public publish is ready only when:

- `doctor:song-ingest` is no longer `blocked` / `review-needed`
- external review note exists
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

## Definition Of Done

A local-ingest song is ready for public release only when all are true:

- candidate draft exists
- candidate runtime exists
- candidate songdoc exists
- candidate report exists
- source sanity exists
- HC consistency is not `warning`
- external review note exists
- SEO profile exists
- manifest entry exists
- aliases are filled when applicable
- validate/content/song doctor/preflight pass

## Default Troubleshooting

- `doctor:song-ingest` says `blocked`
  - missing artifacts or generator inconsistency; fix generation first
- lyrics look suspicious
  - keep them visible in local candidate preview, record the suspicion in the review note, do not silently strip first
- source sanity says `review`
  - this is not auto-fail by itself; it means a human must explicitly clear the source/version risk
- synthetic song skips live Kuailepu compare
  - expected; local-ingest songs still need runtime validation plus external verification

## Current Canonical Commands

```bash
npm run ingest:song-candidate -- <input.xml|input.mxl> --slug=<slug> --title="Song Title" --family=folk --lyric-policy=show-publicly --rank-base-url=http://127.0.0.1:3000
npm run prepare:song-ingest -- <input.xml|input.mxl> --slug=<slug> --out=reference/song-publish-candidates/drafts/<slug>.json
npm run generate:kuailepu-from-ingest -- reference/song-publish-candidates/drafts/<slug>.json --template=happy-birthday-to-you --slug=<slug> --auto-transpose=o12 --rank-base-url=http://127.0.0.1:3000
npm run doctor:song-ingest -- <slug>
npm run scaffold:song-ingest-review-note -- <slug>
npm run promote:song-ingest-candidate -- <slug>
npm run validate:content
npm run validate:songbook
npm run doctor:song -- <slug>
npm run preflight:kuailepu-publish -- <slug>
```
