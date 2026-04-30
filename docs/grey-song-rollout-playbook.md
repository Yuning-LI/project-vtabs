# Grey Song Rollout Playbook

Use this when importing high-recognition non-core songs from Kuailepu and preparing them for public grey rollout.

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
