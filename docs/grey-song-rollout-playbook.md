# Grey Song Rollout Playbook

This document defines the standing workflow for importing and rolling out "grey" high-interest songs after the first public-domain expansion phase.

Use this playbook when the task is:

- identify new high-recognition non-core songs
- import them from Kuailepu
- clean the public English presentation layer
- wire them into existing learn / hub internal linking

## 1. Strategy

Current growth strategy is no longer "keep adding more hubs".

Instead, the grey-song lane exists to:

- bring in a small number of high-interest songs with strong real-world recognition
- keep the public site structure stable
- improve the value of existing song pages and existing learn / hub entry pages

Important:

- grey-song rollout is still content-layer work
- it must not change runtime rendering behavior
- it must not change fingering-chart correctness logic
- it must not change the compare / publish parity gate

## 2. Fixed Workflow

The workflow is:

1. AI proposes candidates
2. user manually approves which candidates to pursue
3. AI searches Kuailepu and imports selected songs
4. AI cleans the public English presentation layer only
5. AI updates internal linking in existing learn / hub pages
6. AI runs preflight compare
7. user reviews results
8. only after user confirmation does the task move toward push

Short form:

`AI recommend -> user approve -> AI import and English-clean -> AI update learn/hub internal linking -> AI preflight -> user review -> push later`

## 3. Hard Rules

### 3.1 What Must Stay English

The public-facing layer must stay English:

- slug
- compact SongDoc title / description
- song SEO profile
- metaTitle
- overview
- metaDescription
- extraFaqs
- aliases
- fallback presentation copy

### 3.2 What Must Not Be Cleaned Without Confirmation

Do not proactively clean upstream Chinese metadata inside:

- `data/kuailepu-runtime/<slug>.json`

Reason:

- runtime payload changes can create compare / parity risk
- public English output should be solved first in the presentation layer

If there is ever a proposal to clean runtime payload fields directly, ask the user first.

### 3.3 Runtime Safety Boundary

Grey-song rollout must not directly modify:

- `src/lib/kuailepu/runtime.ts`
- iframe bridge logic
- public fingering-chart behavior
- compare mode rules

Grey-song work belongs to:

- imported song data
- manifest
- song SEO profiles
- learn / hub internal linking

## 4. Candidate Selection Rules

Prioritize songs that satisfy most of the following:

- high English recognition
- strong melody identity as a single-line page
- realistic search intent for ocarina / recorder / tin whistle players
- a usable Kuailepu detail page exists
- page works as melody-first practice content

De-prioritize or skip songs when:

- the page identity is unclear
- Kuailepu search only returns junk fallback results
- the song is a poor fit for single-line melody practice
- rights risk or page provenance looks too unclear for the current stage

## 5. Required Implementation Steps For Every Grey Song

For every accepted grey song, do all of the following.

### 5.1 Import Layer

- run `npm run import:kuailepu -- <url> --slug=<slug>`
- confirm files exist in:
  - `reference/songs/<slug>.json`
  - `data/kuailepu-runtime/<slug>.json`
  - `data/kuailepu/<slug>.json`

### 5.2 Public Content Layer

- update `data/kuailepu/<slug>.json`
  - English title
  - English description
  - `published: true` only after the song is intended for the public layer in this branch
- update `data/songbook/public-song-manifest.json`
- update `data/songbook/song-seo-profiles.json`

### 5.3 Internal Linking Layer

This is now mandatory for every newly added grey song.

Do not stop at import + manifest.

For each new grey song:

- add it to the most relevant existing `learn / hub` pages in `src/lib/learn/content.ts`
- update `featuredSongSlugs` when the song clearly improves the hub
- update section-level `songSlugs` where the song matches the page intent
- update song-to-guide recommendation sets when needed so the song page itself gets the right related guides

Rule:

- update existing hubs in real time
- do not create a new hub just because a new grey song exists

### 5.4 Validation Layer

Always run:

- `npm run validate:content`
- `npm run doctor:song -- <slug>`
- `npm run preflight:kuailepu-publish -- <slug...>`

Publish readiness requires:

- content validation passes
- doctor output looks correct
- preflight compare passes in `number` mode

## 6. Learn / Hub Linking Rules

Grey songs should be linked into existing hubs by intent, not by arbitrary genre tagging.

Examples:

- lyrical / emotional film themes:
  - `calm-and-lyrical-letter-note-songs`
  - `easy-songs-for-adult-beginners`
- waltz-like / moving / dance-shaped themes:
  - `dance-and-waltz-letter-note-songs`
- bright ceremonial or public-performance themes:
  - `first-performance-letter-note-songs`
  - `march-and-parade-letter-note-songs`
- internationally recognized traditional-style melodies:
  - `world-folk-letter-note-songs`

Use judgment, but default to:

- fewer, stronger placements
- no random over-linking
- no new hub unless the user explicitly asks

## 7. Current Standing Rule

From now on:

- every newly added grey song must be evaluated for learn / hub internal-link placement in the same task
- "imported but not wired into internal linking" is considered incomplete rollout

## 8. Notes For Future Sessions

If a future session adds new grey songs, follow this document first and then cross-check:

- `docs/handoff.md`
- `docs/agent-handoff.md`
- `docs/seo-growth-roadmap.md`

If the branch already contains unpublished local work, do not push automatically.
