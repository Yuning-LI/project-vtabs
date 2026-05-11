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

The `42`-song window matches roughly one week of updates when publication runs at about `5-6` songs per day.

## Update Rule

Whenever a song batch is publicly published:

1. add the newly published song slugs to the top of `RECENTLY_ADDED_SONG_SLUGS`
2. keep the list in newest-first order
3. trim the tail so the list stays at `42` songs
4. do not add unpublished or candidate-only songs
5. do not reorder older songs unless publication history was entered incorrectly

## Practical Batch Rule

For a normal publish batch:

- if `5` songs were published, insert `5` new slugs at the top and remove the oldest `5`
- if `6` songs were published, insert `6` new slugs at the top and remove the oldest `6`

That keeps the page acting like a moving one-week window instead of slowly expanding into a duplicate library page.

## When To Revisit

Revisit the window size only if publication cadence changes materially:

- if publication slows well below daily batches, reduce the window
- if publication rises well above `6` songs per day for a sustained period, consider raising the window from `42` to `56`

Do not change the window casually. Stability is useful for both crawling and editorial maintenance.
