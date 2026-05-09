# Song Ingest Publication Playbook

Use this when publishing songs that originate from local `MusicXML` / `MXL` files rather than from Kuailepu.

## Goal

Keep two truths separate:

1. **Technical ingest success**
   The song can be parsed, converted, and rendered through the Kuailepu runtime path.
2. **Public melody correctness**
   The source is the common version that search users expect, not a fragment, bridge-only extract, or uncommon arrangement.

Both are required before public publication.

## Required Pipeline

### 1. Generate local candidates

```bash
npm run generate:song-ingest-batch -- private/openewld/dataset \
  --slug-prefix=openewld- \
  --out-draft-dir=tmp/openewld-<date>/drafts \
  --out-sanity-dir=tmp/openewld-<date>/sanity \
  --report=tmp/openewld-<date>/batch-generate.json
```

This produces:

- per-song draft JSON
- per-song `source sanity` JSON
- a batch generation summary

### 2. Run technical ingest audit

```bash
npm run audit:song-ingest-batch -- private/openewld/dataset \
  --template=happy-birthday-to-you \
  --auto-transpose=o12 \
  --report=tmp/openewld-<date>/batch-audit.json
```

This checks:

- round-trip notation stability
- grace-note / tuplet / multi-voice risks
- unsupported grammar categories

### 3. Classify candidates

```bash
npm run classify:song-ingest-batch -- \
  --generate-report=tmp/openewld-<date>/batch-generate.json \
  --audit-report=tmp/openewld-<date>/batch-audit.json \
  --out=tmp/openewld-<date>/classified.json
```

Current buckets mean:

- `publish`: technically stable, no automatic source-risk flag
- `review`: technically stable, but source sanity or source structure needs human confirmation
- `reject`: generation/audit failed; do not publish

Important: `publish` means **candidate for public review**, not “already safe to publish”.

### 4. Export a web-review queue

```bash
npm run export:song-ingest-review-queue -- \
  --classified-report=tmp/openewld-<date>/classified.json \
  --sanity-dir=tmp/openewld-<date>/sanity \
  --bucket=publish \
  --limit=50 \
  --out=tmp/openewld-<date>/publish-review-queue.md
```

The queue includes:

- slug and source file
- opening lyric fragment
- opening note names
- suggested search queries
- next action

## Mandatory External Verification

Before a song enters the public import/publish layer, do a lightweight web verification.

### What to compare

Check at least these:

1. title and composer match the expected song
2. opening lyric line matches the expected version when lyrics exist
3. opening melody contour matches a common public version
4. the source begins at the main tune, not a bridge, coda, or verse-only fragment

### Acceptable reference types

Prefer primary or widely trusted sources:

- IMSLP / Mutopia / Library of Congress
- public-domain hymn or folk archives
- reputable ABC / lead-sheet references
- well-known educational sheet-music references

### Do not trust by itself

- AI summaries
- random tab sites with no score reference
- user uploads with unclear version provenance

## Publication Rule

Only after the external verification step passes should a song move into:

- `data/kuailepu-runtime/<slug>.json`
- `data/kuailepu/<slug>.json`
- `data/songbook/public-song-manifest.json`
- `data/songbook/song-seo-profiles.json`
- learn / hub / rollout files as needed

Then run:

```bash
npm run validate:content
npm run validate:songbook
npm run doctor:song -- <slug>
npm run preflight:kuailepu-publish -- <slug...>
```

## Working Rule

- `review` bucket songs: external verification is mandatory before any publish decision.
- `publish` bucket songs: still require external verification before public import.
- `reject` bucket songs: fix source or ingest first; do not review for release.

## Practical Default

For large corpora:

1. generate everything locally
2. classify everything
3. pick a small `publish` subset based on Google value
4. web-verify that subset
5. publish in batches

This keeps the ingest pipeline fast without pretending that automatic parsing alone proves public correctness.
