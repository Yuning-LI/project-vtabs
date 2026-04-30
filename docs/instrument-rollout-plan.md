# Instrument Rollout Plan

This document records which Kuailepu instruments are public and why the site does not expose every available instrument.

## Current Public Set

Public song pages currently expose:

- `o12` 12-Hole Ocarina
- `o6` 6-Hole Ocarina
- `r8b` Recorder (Baroque fingering)
- `r8g` Recorder (German fingering)
- `w6` Tin Whistle

The broader raw JSON payloads often also include `none`, `o3`, `a6`, `b6`, `x8`, `x10`, `hx`, `p8`, `h7`, `h9`, `sn`, `ch12`, but these are not public product surfaces by default.

## Product Position

The site is still ocarina-first, with recorder and tin whistle added because they fit western beginner search demand and the current melody-first page format.

Do not expose all Kuailepu instruments just because the raw JSON contains them. That would expand QA, confuse SEO positioning, and make public copy inaccurate.

## Why These Instruments

- `o12`: default product anchor and strongest ocarina search fit.
- `o6`: closest adjacent ocarina path.
- `r8b` / `r8g`: clear western beginner instruments with real search demand.
- `w6`: strong fit for folk, hymn, holiday, and beginner melody searches.

## Instruments To Keep Internal For Now

Hold back unless there is a separate search-demand and QA decision:

- `o3`
- `a6`
- `b6`
- `x8`
- `x10`
- `hx`
- `p8`
- `h7`
- `h9`
- `sn`
- `none`

## Validation History

The public set has passed live-vs-local number-mode parity on representative samples. Future publish checks should continue to run through:

```bash
npm run preflight:kuailepu-publish -- <slug...>
```

## Implementation Rule

If a future song only supports some public instruments:

- show only instruments that actually work for that song
- do not show disabled placeholders
- do not promise universal support in page copy

Instrument switches remain query-state modes on canonical song pages, not separate indexable URL families.
