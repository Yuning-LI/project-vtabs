# Search Console Learn Audit

Use this when fresh GSC data is available and you want to find `/learn/<slug>` pages competing for the same queries.

## Goal

- find query overlap across learn / hub / guide pages
- separate broad-entry pages from narrow-intent pages
- decide whether to tighten copy, retitle a page, or change internal links

## Recommended GSC Export

In Google Search Console:

1. Open `Search results`.
2. Search type: `Web`.
3. Date: `Last 3 months` or `Last 28 days` if you are checking a recent rollout.
4. Add page filter: `URLs containing /learn/` if possible.
5. Export the table with both `Query` and `Page` visible.

The local script also works if the export contains the whole site, but `/learn/`-only export is cleaner.

## Command

```bash
npm run audit:learn-gsc -- /absolute/path/to/gsc-export.csv
```

Useful flags:

```bash
npm run audit:learn-gsc -- /absolute/path/to/gsc-export.csv --min-impressions 30 --top 30
npm run audit:learn-gsc -- /absolute/path/to/gsc-export.csv --json
```

Defaults:

- `--min-impressions 20`
- `--min-shared-urls 2`
- `--top 20`

## Output

The script prints three sections:

- `Top Overlapping Queries`
  - one query that lands on multiple learn URLs
- `Strongest Page Pairs`
  - learn-page pairs with the most shared-query exposure
- `Most Exposed Learn Pages`
  - pages that appear in the largest number of overlapping-query clusters

## How To Read It

Typical actions:

- broad page vs narrow page overlap
  - keep the broad page generic; make the narrow page more explicit in title, intro, and related guides
- two narrow pages sharing the same query cluster
  - decide which one is canonical for that intent and move the other toward a different angle
- event page vs repertoire page overlap
  - clarify whether the page is about use case, instrument, or song family

## Current Intended Learn Layering

Use this as the baseline when deciding which page should win a query:

- `easy-songs-for-beginners`
  - broad cross-instrument starter shelf
- `nursery-rhyme-letter-notes`
  - ultra-familiar first-step children’s repertoire
- `music-class-songs-for-beginners`
  - classroom and home-review workflow
- `simple-instruments-for-music-education`
  - education article / concept page, not a main song-list keyword target
- `folk-songs-for-beginners`
  - broad beginner folk lane
- `celtic-tin-whistle-songs`
  - whistle-native Celtic / Irish cluster
- `world-folk-letter-note-songs`
  - international traditional repertoire beyond the English-language folk lane
- `march-and-parade-letter-note-songs`
  - pulse-first march / parade repertoire
- `patriotic-and-anthem-letter-note-songs`
  - civic / anthem / assembly intent
- `wedding-and-ceremony-letter-note-songs`
  - formal event and ceremony fit

## Notes

- This script only audits `/learn/<slug>` pages.
- It does not decide rankings automatically; it only shows overlap.
- Do not create new thin pages just because a query cluster exists. First check whether an existing page can be tightened.
