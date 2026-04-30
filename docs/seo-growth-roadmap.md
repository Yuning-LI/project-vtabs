# SEO Growth Roadmap

This document defines current public growth boundaries for song, learn, hub, guide, Pinterest, and external-resource outreach work.

## Current Priority

1. Keep public song runtime stable.
2. Improve song pages as search landing pages.
3. Improve learn / hub topic fit and internal linking.
4. Add new intent pages only when existing pages cannot serve the query cluster.

## Allowed Content Work

Default allowed scope:

- song SEO profile copy and metadata
- song aliases / alternate titles
- related guides / internal links
- learn / hub / guide copy
- sitemap / metadata / canonical / FAQ / ItemList shell
- Pinterest assets that point to canonical pages

Default not allowed without explicit product decision:

- runtime rendering logic
- fingering-chart correctness logic
- public song route architecture
- creating thin duplicate public landing pages

## File Map

- Song SEO profiles: `data/songbook/song-seo-profiles.json`
- Public manifest: `data/songbook/public-song-manifest.json`
- Learn / hub content: `src/lib/learn/content.ts`
- Pinterest presets: `src/lib/songbook/pinterestPins.ts`

## SEO Copy Rules

- Public visible copy stays English.
- Do not expose Kuailepu/source wording.
- Prioritize real search terms over brand suffixes.
- Cover instrument terms naturally: ocarina tabs, recorder notes, tin whistle notes, letter notes, fingering chart.
- Add aliases before publishing when a song has common alternate titles or translated names.

## Learn / Hub Rules

- Link songs into existing hubs by intent.
- Keep song lists useful and early enough on the page for visitors and outreach targets.
- Do not create a hub just because one new song was imported.
- Avoid over-linking that weakens topic focus.

## 2026-04-23 GSC Batch Boundary

This completed pass was deliberately narrow:

- no new URLs
- no slug changes
- no runtime / route changes
- edited only `data/songbook/song-seo-profiles.json` and `src/lib/learn/content.ts`

Completed song pages:

- `frere-jacques`
- `lightly-row`
- `always-with-me`
- `wedding-march-alt`
- `scotland-the-brave`
- `flight-of-the-bumblebee`
- `jasmine-flower`
- `turkish-march`
- `ode-to-joy`

Completed learn pages:

- `12-hole-ocarina-letter-notes`
- `easy-recorder-songs-for-beginners`
- `easy-12-hole-ocarina-songs`
- `how-to-start-recorder-with-letter-notes`

Do not continue that exact batch without fresh GSC data.

## Next Decision Order

After fresh data:

1. high-impression song pages with low CTR
2. learn / hub pages with impressions but weak ranking
3. only then, new intent pages
