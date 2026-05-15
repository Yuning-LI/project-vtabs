# Recent Song Hub Maintenance

This note defines the smallest maintenance rule for the public recent-song hub at `/learn/new-songs`.

## Purpose

The recent-song hub is not a second full library index.

Its job is to:

- give newly published song pages a stable public internal-link route
- give Google a crawlable update page beyond `sitemap.xml`
- give returning visitors one place to check recent additions

## Current Window

- rolling recent-song window: `42` songs
- homepage recent-song teaser: `12` songs
- source file: `src/lib/songbook/recentSongs.ts`
- source of truth: `data/songbook/public-song-manifest.json`

The `42`-song window matches roughly one week of updates when publication runs at about `5-6` songs per day.

## Update Rule

The recent-song hub is now automatic.

Whenever a song batch is publicly published:

1. add the public song to `data/songbook/public-song-manifest.json`
2. keep `featuredRank` increasing with real public release order
3. do not manually edit a second recent-song slug list
4. do not include unpublished or candidate-only songs in the manifest
5. only correct older `featuredRank` values if publication history was entered incorrectly

`src/lib/songbook/recentSongs.ts` now derives the recent-song window directly from the published manifest entries, sorted by descending `featuredRank`.

## When To Revisit

Revisit the window size only if publication cadence changes materially:

- if publication slows well below daily batches, reduce the window
- if publication rises well above `6` songs per day for a sustained period, consider raising the window from `42` to `56`

Do not change the window casually. Stability is useful for both crawling and editorial maintenance.
