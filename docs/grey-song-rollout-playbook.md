# Grey Song Rollout Playbook

Use this when importing high-recognition non-core songs from Kuailepu and preparing them for public grey rollout.

For browser behavior, follow `docs/kuailepu-operation-playbook.md`.

## Strategy

Grey songs should increase the value of existing public song pages and existing learn / hub pages. Do not create a new hub just because a grey song was added.

Grey-song work is content-layer work. It must not change:

- runtime rendering behavior
- fingering-chart correctness logic
- compare / publish parity rules
- public song route architecture

## Workflow

1. Candidate selection or user-approved target list.
2. Search Kuailepu and import only approved targets.
3. Clean public English presentation layer.
4. Add manifest, SEO profile, aliases, FAQ copy.
5. Add relevant learn / hub internal links.
6. Update grey rollout tracker.
7. Run validation and preflight.
8. Commit / push only when requested.

If an approved song fails at search, import, identity check, compare, or preflight, report the exact failure and wait for replacement approval.

## Stock Pool vs Queue

Keep these layers separate:

- `reference/kuailepu-candidates/publish-drafts/**`
  - publish-ready grey stock pool
  - contains songs that already passed the Kuailepu compare and readiness gates
- `data/songbook/grey-song-rollout.json`
  - live rollout tracker
  - record songs as `live` after they are pushed
- `data/songbook/kuailepu-grey-import-queue.json`
  - local managed grey import queue
  - do not commit or publish it
  - starts with `stock-unpublished`, then `queued`, then `live` records
- `data/songbook/song-import-pick-queue.json`
  - selection-only queue
  - helps choose the next song quickly, but does not define publish state

For a current status snapshot, use:

```bash
npm run report:kuailepu-stock-status
```

This report is the safest way to answer:

- which Kuailepu stock items are already public
- which ones remain unpublished in the stock pool
- whether the rollout tracker and public manifest agree

Rule of thumb:

- do not trust the raw stock-pool file count alone
- do not trust the selection queue alone
- always cross-check against `data/songbook/public-song-manifest.json` before selecting the next publish target

Rule:

- before promoting a grey stock song, always confirm it is not already `published: true` in `data/songbook/public-song-manifest.json`
- if the song is already live, mark it as already handled in the rollout tracker or queue record instead of treating it as a new publish target
- this stock-pool workflow does not apply to the XML lane

## Execution Tiers

Use the lightest tier that still protects parity and release quality.

### Tier A: Per-song minimum gate

Use this for each newly imported Kuailepu song before it is treated as release-ready.

Required:

```bash
npm run import:kuailepu -- <kuailepu-url> --slug=<slug> --title="<English Title>" --publish
npm run doctor:song -- <slug>
npm run preflight:kuailepu-publish -- <slug>
```

Meaning:

- import raw runtime JSON and compact SongDoc
- confirm manifest/runtime/songdoc assumptions are coherent
- run the live Kuailepu parity gate in `number` mode

Do not skip Tier A for a newly imported Kuailepu-backed song.

### Tier B: Batch content validation

Use this after finishing several songs in one editing batch.

Required once per batch, not once per song:

```bash
npm run validate:content
npm run validate:songbook
npm run build
```

Meaning:

- check manifest / SEO / learn content integrity
- verify the site still builds after all publication-layer edits

This is the main place to save time. Do not rerun these after every single song unless the batch is only one song.

### Tier C: Content-only follow-up edits after a passing compare

If a song already passed `preflight:kuailepu-publish` in the current work cycle, and the runtime payload did not change afterward, a second live compare is usually unnecessary.

Typical safe-to-skip cases:

- only `data/songbook/song-seo-profiles.json` changed
- only `src/lib/learn/content.ts` changed
- only `data/songbook/public-song-manifest.json` changed
- only `data/songbook/grey-song-rollout.json` changed

Do not skip live compare if any of these changed after the last passing compare:

- `data/kuailepu-runtime/<slug>.json`
- `data/kuailepu/<slug>.json`
- runtime rendering code
- instrument pruning / fingering / note-mode behavior

Rule of thumb:

- runtime changed: rerun `doctor:song` and `preflight:kuailepu-publish`
- content only changed: rerun batch validation, skip extra live compare if one already passed for the same runtime payload

## Import Command

Typical command:

```bash
npm run import:kuailepu -- <kuailepu-url> --slug=<slug> --title="<English Title>" --publish
```

Expected public files:

- `data/kuailepu-runtime/<slug>.json`
- `data/kuailepu/<slug>.json`
- `data/songbook/public-song-manifest.json`
- `data/songbook/song-seo-profiles.json`
- `data/songbook/grey-song-rollout.json`

Generated local fallback:

- `reference/songs/<slug>.json`

`reference/` is local/debug material and may be gitignored.

Unpublished Kuailepu candidates:

- do not park unpublished candidate SongDocs under `data/kuailepu/`
- do not park unpublished candidate runtime JSON under `data/kuailepu-runtime/`
- keep local-only Kuailepu candidate material under `reference/kuailepu-candidates/**`
- current local convention:
  - candidate songdocs: `reference/kuailepu-candidates/songdocs/<slug>.json`
  - candidate runtime payloads when needed: `reference/kuailepu-candidates/runtime/<slug>.json`
  - local priority / operating queues: `reference/kuailepu-candidates/queues/**`

Reason:

- `data/kuailepu/**` and `data/kuailepu-runtime/**` are production-facing public asset directories
- unpublished candidates in those directories create dirty-worktree noise and make it easier to accidentally treat local drafts as release assets

## Public English Layer

Public-facing English fields belong in:

- `data/kuailepu/<slug>.json`
- `data/songbook/song-seo-profiles.json`
- `src/lib/learn/content.ts`

Do not proactively rewrite upstream Chinese metadata inside `data/kuailepu-runtime/<slug>.json` unless there is a parity-safe reason and user approval.

## SEO Profile Minimum

Each grey song needs:

- stable English title
- aliases / alternate spellings / translated title when useful
- `metaTitle`
- `metaDescription`
- `overview`
- `searchTerms`
- `background`
- `practice`
- `extraFaqs`

Natural coverage should include ocarina tabs, recorder notes, tin whistle notes, letter notes, and common title aliases when relevant.

## Learn / Hub Linking

Add each grey song to existing hubs by intent:

- lyrical / emotional themes: `calm-and-lyrical-letter-note-songs`, `easy-songs-for-adult-beginners`
- energetic / dance-shaped themes: `dance-and-waltz-letter-note-songs`
- public-performance themes: `first-performance-letter-note-songs`
- internationally recognized traditional-style melodies: `world-folk-letter-note-songs`

Prefer fewer, stronger placements. Do not over-link.

## Validation

Run:

```bash
npm run validate:content
npm run validate:songbook
npm run doctor:song -- <slug>
npm run preflight:kuailepu-publish -- <slug...>
npm run build
```

Publish readiness requires content validation, acceptable doctor output, and number-mode preflight compare passing.

## Network / Footprint Notes

- Prefer importing from a known Kuailepu detail URL instead of repeating on-site search.
- Keep a local catalog of approved song names and detail URLs when possible.
- Batch local content work, then do compare close to publish time.
- Current compare tooling reuses one live detail-page visit per song and switches instrument state inside the same page, which reduces repeated detail-page reloads during parity checks.
