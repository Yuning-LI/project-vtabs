# Pinterest Engineering Plan

This plan turns the current internal Pinterest preview work into a scalable distribution system for public traffic.

Important constraints:

- keep public `/song/<slug>` on the existing runtime-backed main chain
- do not change runtime rendering correctness for Pinterest
- keep visible public copy in English
- do not create thin public pin-landing pages when an existing canonical song or learn page already fits

## 1. Current Project Baseline

Already present in the repo:

- Pinterest domain verification is already in root metadata:
  - `src/app/layout.tsx`
  - `p:domain_verify`
- internal pin preset definitions exist:
  - `src/lib/songbook/pinterestPins.ts`
- internal export script exists:
  - `scripts/export-pinterest-pin.ts`
- internal preview routes exist:
  - `src/app/dev/pinterest/page.tsx`
  - `src/app/dev/pinterest/song/[id]/page.tsx`

Current gap:

- Pinterest support exists as an internal production tool, not yet as a full distribution-ready system
- song pages do not yet expose a clear, consistent social-image pipeline via metadata
- preset coverage is still tiny relative to the public catalog

### 1.1 Current Internal Export Default

The current internal default is no longer "manually resize the browser and screenshot by hand".

The current default export command is:

```bash
npm run export:pinterest-portrait -- --slug <slug> --instrument <o12|o6|r8b|r8g|w6>
```

Its current behavior is:

- open `/dev/pinterest/song/[id]`
- wait for runtime and layout stability
- export the full internal Pinterest canvas instead of clipping a mid-page slice
- keep the original runtime title
- crop the blank horizontal band between the title and the first fingering-chart row after screenshot
- automatically reduce `sheet_scale` if the image is still too tall
- target a final width around `1000px`
- keep final height at or below `1700px`

This workflow is now the default internal production flow unless a specific song needs manual tuning.

Deployment note:

- keeping `src/app/dev/pinterest/...` in the repo is fine
- deploying those internal routes alongside the app should have little to no meaningful impact on public song-page performance because they are isolated dev routes
- they should still remain internal-only from a product and navigation standpoint

## 2. Product Goal

Use Pinterest as a top-of-funnel acquisition channel for selected songs and intent pages.

Primary objective:

- drive qualified visits to existing canonical song / learn pages

Secondary objective:

- create reusable visual assets that support social discovery and future sharing

Not the objective:

- creating a second public content architecture just for Pinterest

## 3. Recommended Content Model

### 3.1 Destination Rules

Pins should point to one of two destinations:

1. canonical song page
   - best for song-specific search and visual discovery
2. existing learn page
   - best for intent pins such as beginner, holiday, classroom, or instrument-specific themes

Avoid:

- separate public pin landing pages with near-duplicate copy
- public URLs whose only purpose is social preview

### 3.2 Image Rules

Each song pin should include:

- song title
- instrument or intent label
- branded preview of the notation area
- visible CTA such as:
  - `Play the full song at Play By Fingering`
  - `See the full fingering chart`
  - `Open the full song page`

Each image should not include the full practical value of the page.

Recommended preview limit:

- top 1-2 visible systems / rows only
- enough to identify the song and show value
- not enough to replace the click

### 3.3 Theme Buckets

First-wave pin buckets:

- easy beginner songs
- nursery / children / sing-along songs
- Christmas / holiday songs
- first performance / recital songs
- instrument-specific buckets:
  - 12-hole ocarina
  - 6-hole ocarina
  - recorder
  - tin whistle

## 4. Engineering Workstreams

### Workstream A: Social Metadata

Goal:

- make every share and saved URL produce a better image and summary

Recommended implementation:

1. add `openGraph` metadata to song pages
2. add `twitter` metadata to song pages
3. provide explicit image URLs
4. keep title / description aligned with current song-specific SEO profile

Suggested output shape for song pages:

- `openGraph.title`
- `openGraph.description`
- `openGraph.url`
- `openGraph.images`
- `twitter.card = summary_large_image`
- `twitter.title`
- `twitter.description`
- `twitter.images`

Why this matters:

- Pinterest Rich Pins and cross-platform previews depend on metadata quality
- even when users save pages manually, stronger metadata improves preview consistency

### Workstream B: Public OG Image Generator

Goal:

- generate social-ready images from real project data instead of manually compositing every image

Recommended implementation:

1. add a public image generation route for song pages
2. use the same song presentation data already used for SEO copy
3. render a fixed 2:3 vertical layout suitable for Pinterest-first reuse

Suggested route patterns:

- `src/app/song/[id]/opengraph-image.tsx`
- optionally later: `src/app/learn/[slug]/opengraph-image.tsx`

Recommended visual components:

- title block
- instrument / intent chip
- cropped runtime sheet preview
- subtle brand background
- URL / CTA footer

Important constraint:

- use safe backgrounds and brand textures
- avoid movie/game/anime stills or copyright-risk artwork

### Workstream C: Pinterest Preset Expansion

Goal:

- scale beyond the current first-wave internal presets

Current base:

- `src/lib/songbook/pinterestPins.ts`

Recommended next step:

- expand from hand-picked presets to a structured preset source that can support:
  - song slug
  - target instrument
  - title treatment
  - tag label
  - crop presets
  - CTA style
  - destination URL type

Suggested evolution:

1. keep the current preset file
2. add wave-based groups
3. optionally move to data file once volume grows

### Workstream D: Batch Export Pipeline

Goal:

- make image production one command, not one-off manual work

Current base:

- `scripts/export-pinterest-pin.ts`

Recommended expansion:

- support exporting by wave
- support exporting by tag
- support exporting top-priority songs
- emit a CSV or JSON manifest for posting workflow

Useful output fields:

- slug
- image path
- destination URL
- recommended pin title
- recommended pin description
- target board

### Workstream E: Tracking

Goal:

- prove which pins and destinations actually work

Recommended implementation:

- append `utm_source=pinterest`
- append `utm_medium=social`
- append `utm_campaign=<wave-or-theme>`
- optionally add `utm_content=<slug-or-creative-id>`

Example:

- `/song/ode-to-joy?utm_source=pinterest&utm_medium=social&utm_campaign=easy-beginner-wave-1&utm_content=ode-to-joy-o12`

Important:

- canonical should remain the clean song URL
- tracking params are only for attribution, not indexing

## 5. Recommended Visual System

### 5.1 What To Keep

The current internal preview direction is already useful:

- 2:3 vertical layout
- soft branded background
- cropped runtime frame
- visible song title
- visible CTA footer

### 5.2 What To Improve

Recommended refinements:

- make title area more template-safe for long song names
- add subtitle treatment for instrument / use case
- standardize CTA copy
- standardize crop logic for songs with unusually tall headers
- support a few visual themes:
  - beginner
  - holiday
  - lyrical
  - classical
  - folk

### 5.3 Copyright-Safe Art Direction

Prefer:

- gradient backgrounds
- abstract textures
- instrument silhouettes
- decorative borders
- cropped site-generated notation preview

Avoid:

- copyrighted franchise posters
- game screenshots
- movie stills
- fan art with unclear rights

## 6. Posting Strategy

Recommended first-wave posting mix:

1. beginner evergreen songs
2. holiday songs in season
3. instrument-specific songs
4. classroom / sing-along songs
5. first-performance songs

Recommended cadence:

- small steady batches
- enough creative variation to learn what works
- not a giant dump of all 96 songs at once

Recommended board structure:

- Easy Ocarina Songs
- Recorder Letter Notes
- Tin Whistle Songs
- Christmas Songs
- Beginner Songs
- Sing-Along Songs
- First Performance Songs

This aligns well with the current learn architecture and reduces taxonomy drift.

## 7. Prioritized Execution Plan

### Phase A: Foundation

1. add song-level `openGraph` and `twitter` image metadata
2. expose a stable generated social image for song pages
3. keep image generation tied to canonical song pages

### Phase B: Pinterest Production

1. expand presets from 5 songs to a first real batch
2. batch export images
3. produce posting manifest with titles / descriptions / URLs

### Phase C: Measurement

1. post first batch
2. measure clicks, saves, top landing pages, and bounce paths
3. compare Pinterest traffic with GSC impression data and on-site engagement

### Phase D: Iteration

1. refine creatives for top-performing themes
2. add learn-page creatives where song-page direct pins underperform
3. decide whether to expand into short-form video later

## 8. Best First Batch

Recommended first serious batch:

- `twinkle-twinkle-little-star`
- `ode-to-joy`
- `amazing-grace`
- `frere-jacques`
- `london-bridge`
- `jingle-bells`
- `we-wish-you-a-merry-christmas`
- `joy-to-the-world`
- `happy-birthday-to-you`
- `mary-had-a-little-lamb`
- `row-row-row-your-boat`
- `old-macdonald`
- `scarborough-fair`
- `greensleeves`
- `canon`
- `wedding-march`
- `song-of-time`
- `carrying-you`
- `hes-a-pirate`

Reason:

- they cover beginner, seasonal, classroom, ceremonial, folk, and grey-release interest
- they also map cleanly to current learn hubs and related-guide logic

## 9. Suggested Repo Tasks

Concrete tasks for implementation:

1. add `openGraph` / `twitter` image metadata to song pages
2. create song `opengraph-image` route
3. refactor current dev Pinterest layout into reusable shared renderer
4. add richer preset schema
5. add export manifest output to `scripts/export-pinterest-pin.ts`
6. add optional learn-page image generation later

## 10. Success Metrics

Primary:

- outbound Pinterest clicks to site
- sessions landing on pinned song / learn pages
- click-through from landing page to second page

Secondary:

- saves
- branded search growth
- assisted conversions into deeper browsing
- external mentions from communities or blogs

Do not over-index on:

- raw image impressions alone
- vanity follower count alone

## 11. Source Notes

Pinterest official references useful for implementation and operations:

- claim website:
  - `https://help.pinterest.com/en/business/article/claim-your-website`
- analytics:
  - `https://help.pinterest.com/en/business/article/pinterest-analytics`
- save button:
  - `https://help.pinterest.com/en/business/article/save-button`
- rich pins:
  - `https://help.pinterest.com/en/business/article/rich-pins`

## 12. Recommended Immediate Next Move

If only one engineering move is approved next, it should be:

1. build public song-level social images
2. wire them into metadata
3. expand the export pipeline for a first 20-30 song wave

That gives the project:

- better Pinterest readiness
- better cross-platform share previews
- a reusable social-distribution asset system
- zero need to touch runtime correctness
