import { buildNativeMelodyLayout } from '../src/lib/native-renderer/layout.ts'
import {
  loadNativeSongIrFromDraft,
  loadNativeSongIrFromRuntimePayload
} from '../src/lib/native-renderer/loadSongIr.ts'
import type { SongIrDocument } from '../src/lib/native-renderer/songIr.ts'
import { evaluateNativeRendererSupport } from '../src/lib/native-renderer/support.ts'

type FixtureSource = 'draft' | 'runtime'

type Fixture = {
  slug: string
  source: FixtureSource
  expectedSupport: 'supported' | 'fallback-required'
  minRestEvents?: number
  minHoldEvents?: number
  minGroupedEvents?: number
  minRepeatMarkers?: number
  minEndingMarkers?: number
  minCompressedMeasures?: number
}

const MAX_EXPECTED_ROW_WIDTH_REM = 52.01

const FIXTURES: Fixture[] = [
  {
    slug: 'on-top-of-old-smoky',
    source: 'draft',
    expectedSupport: 'supported',
    minRestEvents: 3,
    minHoldEvents: 12
  },
  {
    slug: 'london-bridge',
    source: 'runtime',
    expectedSupport: 'supported',
    minGroupedEvents: 4
  },
  {
    slug: 'its-a-small-world',
    source: 'runtime',
    expectedSupport: 'fallback-required',
    minRestEvents: 3,
    minHoldEvents: 5,
    minGroupedEvents: 15,
    minRepeatMarkers: 3,
    minEndingMarkers: 4
  },
  {
    slug: 'faded',
    source: 'runtime',
    expectedSupport: 'fallback-required',
    minCompressedMeasures: 1
  },
  {
    slug: 'river-flows-in-you',
    source: 'runtime',
    expectedSupport: 'fallback-required',
    minCompressedMeasures: 7
  }
]

const results = FIXTURES.map(checkFixture)

console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      fixtureCount: results.length,
      maxExpectedRowWidthRem: MAX_EXPECTED_ROW_WIDTH_REM,
      results
    },
    null,
    2
  )
)

function checkFixture(fixture: Fixture) {
  const song = loadFixtureSong(fixture)
  const support = evaluateNativeRendererSupport(fixture.slug, song, {
    mode: fixture.source === 'runtime' ? 'runtime-probe' : 'draft-mvp'
  })
  assertEqual(
    support.status,
    fixture.expectedSupport,
    `${fixture.slug} support status changed`
  )

  const events = song.measures.flatMap(measure => measure.events)
  const markers = song.measures.flatMap(measure => measure.markers ?? [])
  const layout = buildNativeMelodyLayout(song, { measureLayout: 'compact' })
  const layoutMeasures = layout.rows.flatMap(row => row.measures)
  const maxRowWidthRem = Math.max(...layout.rows.map(row => row.widthRem))
  const compressedMeasureCount = layoutMeasures.filter(
    measure => measure.compressionRatio < 0.999
  ).length

  const metrics = {
    restEvents: events.filter(event => event.kind === 'rest').length,
    holdEvents: events.filter(event => /-+$/.test(event.token)).length,
    groupedEvents: events.filter(event => event.groups && event.groups.length > 0).length,
    repeatMarkers: markers.filter(marker => marker.kind.startsWith('repeat')).length,
    endingMarkers: markers.filter(marker => marker.kind.startsWith('ending')).length,
    rowCount: layout.rows.length,
    maxRowWidthRem: Number(maxRowWidthRem.toFixed(2)),
    compressedMeasureCount,
    minCompressionRatio: Number(
      Math.min(...layoutMeasures.map(measure => measure.compressionRatio)).toFixed(3)
    )
  }

  assertAtLeast(metrics.restEvents, fixture.minRestEvents, fixture.slug, 'rest events')
  assertAtLeast(metrics.holdEvents, fixture.minHoldEvents, fixture.slug, 'hold events')
  assertAtLeast(metrics.groupedEvents, fixture.minGroupedEvents, fixture.slug, 'grouped events')
  assertAtLeast(metrics.repeatMarkers, fixture.minRepeatMarkers, fixture.slug, 'repeat markers')
  assertAtLeast(metrics.endingMarkers, fixture.minEndingMarkers, fixture.slug, 'ending markers')
  assertAtLeast(
    metrics.compressedMeasureCount,
    fixture.minCompressedMeasures,
    fixture.slug,
    'compressed measures'
  )

  if (maxRowWidthRem > MAX_EXPECTED_ROW_WIDTH_REM) {
    throw new Error(
      `${fixture.slug} max row width ${maxRowWidthRem.toFixed(
        2
      )}rem exceeds ${MAX_EXPECTED_ROW_WIDTH_REM}rem`
    )
  }

  return {
    slug: fixture.slug,
    source: fixture.source,
    supportStatus: support.status,
    metrics
  }
}

function loadFixtureSong(fixture: Fixture): SongIrDocument {
  const song =
    fixture.source === 'runtime'
      ? loadNativeSongIrFromRuntimePayload(fixture.slug)
      : loadNativeSongIrFromDraft(fixture.slug)

  if (!song) {
    throw new Error(`Missing native renderer fixture: ${fixture.source}:${fixture.slug}`)
  }

  return song
}

function assertAtLeast(
  actual: number,
  expected: number | undefined,
  slug: string,
  label: string
) {
  if (expected === undefined) {
    return
  }

  if (actual < expected) {
    throw new Error(`${slug} expected at least ${expected} ${label}, got ${actual}`)
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
  }
}
