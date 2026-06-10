import { buildNativeMelodyLayout } from '../src/lib/native-renderer/layout.ts'
import {
  loadNativeSongIrFromDraft,
  loadNativeSongIrFromRuntimePayload
} from '../src/lib/native-renderer/loadSongIr.ts'
import type { SongIrPlaybackSequenceComplexity } from '../src/lib/native-renderer/playbackSequence.ts'
import { auditSongIrPlaybackSequence } from '../src/lib/native-renderer/playbackSequence.ts'
import { expandSongIrPlayOrder } from '../src/lib/native-renderer/playOrder.ts'
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
  minSections?: number
  minPlayOrderSteps?: number
  minExpandedPlayMeasures?: number
  expectedUnresolvedPlaySteps?: number
  expectedPlaybackComplexity?: SongIrPlaybackSequenceComplexity
  expectedPlaybackCanUseSequence?: boolean
  minPlaybackSequenceMeasures?: number
}

const MAX_EXPECTED_ROW_WIDTH_REM = 52.01

const FIXTURES: Fixture[] = [
  {
    slug: 'on-top-of-old-smoky',
    source: 'draft',
    expectedSupport: 'supported',
    minRestEvents: 3,
    minHoldEvents: 12,
    expectedPlaybackComplexity: 'linear'
  },
  {
    slug: 'london-bridge',
    source: 'runtime',
    expectedSupport: 'supported',
    minGroupedEvents: 4,
    expectedPlaybackComplexity: 'linear'
  },
  {
    slug: 'its-a-small-world',
    source: 'runtime',
    expectedSupport: 'fallback-required',
    minRestEvents: 3,
    minHoldEvents: 5,
    minGroupedEvents: 15,
    minRepeatMarkers: 3,
    minEndingMarkers: 4,
    expectedPlaybackComplexity: 'repeat-or-ending'
  },
  {
    slug: 'upupu',
    source: 'runtime',
    expectedSupport: 'fallback-required',
    minSections: 2,
    minPlayOrderSteps: 6,
    minExpandedPlayMeasures: 34,
    expectedUnresolvedPlaySteps: 0,
    expectedPlaybackComplexity: 'explicit-play-order',
    expectedPlaybackCanUseSequence: true
  },
  {
    slug: 'mark-theme',
    source: 'runtime',
    expectedSupport: 'fallback-required',
    minRepeatMarkers: 2,
    minPlayOrderSteps: 2,
    expectedPlaybackComplexity: 'play-order-with-repeat-or-ending',
    expectedPlaybackCanUseSequence: true,
    minPlaybackSequenceMeasures: 21
  },
  {
    slug: 'careless-whisper',
    source: 'runtime',
    expectedSupport: 'fallback-required',
    minSections: 4,
    minPlayOrderSteps: 8,
    minExpandedPlayMeasures: 57,
    expectedUnresolvedPlaySteps: 0,
    expectedPlaybackComplexity: 'explicit-play-order',
    expectedPlaybackCanUseSequence: true
  },
  {
    slug: 'detective-conan-main-theme',
    source: 'runtime',
    expectedSupport: 'fallback-required',
    minSections: 4,
    minPlayOrderSteps: 6,
    minExpandedPlayMeasures: 52,
    expectedUnresolvedPlaySteps: 1,
    expectedPlaybackComplexity: 'unresolved-play-order',
    expectedPlaybackCanUseSequence: false
  },
  {
    slug: 'faded',
    source: 'runtime',
    expectedSupport: 'fallback-required',
    minCompressedMeasures: 1,
    expectedPlaybackComplexity: 'linear'
  },
  {
    slug: 'river-flows-in-you',
    source: 'runtime',
    expectedSupport: 'fallback-required',
    minCompressedMeasures: 7,
    expectedPlaybackComplexity: 'linear'
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
  const playOrderExpansion = expandSongIrPlayOrder(song)
  const playbackSequenceAudit = auditSongIrPlaybackSequence(song)
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
    sections: song.structure.sections.length,
    playOrderSteps: song.structure.playOrder.length,
    resolvedPlayOrderSteps:
      playOrderExpansion.steps.length - playOrderExpansion.unresolvedSteps.length,
    unresolvedPlayOrderSteps: playOrderExpansion.unresolvedSteps.length,
    expandedPlayMeasures: playOrderExpansion.expandedMeasureCount,
    playbackComplexity: playbackSequenceAudit.complexity,
    playbackCanUseSequence: playbackSequenceAudit.canUseMeasureSequenceForPlayback,
    playbackSequenceMeasures: playbackSequenceAudit.sequenceMeasureCount,
    repeatExpansionStatus: playbackSequenceAudit.repeatExpansionStatus,
    playbackBlockers: playbackSequenceAudit.blockers,
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
  assertAtLeast(metrics.sections, fixture.minSections, fixture.slug, 'sections')
  assertAtLeast(
    metrics.playOrderSteps,
    fixture.minPlayOrderSteps,
    fixture.slug,
    'play order steps'
  )
  assertAtLeast(
    metrics.expandedPlayMeasures,
    fixture.minExpandedPlayMeasures,
    fixture.slug,
    'expanded play measures'
  )
  if (fixture.expectedUnresolvedPlaySteps !== undefined) {
    assertEqual(
      metrics.unresolvedPlayOrderSteps,
      fixture.expectedUnresolvedPlaySteps,
      `${fixture.slug} unresolved play-order step count changed`
    )
  }
  if (fixture.expectedPlaybackComplexity !== undefined) {
    assertEqual(
      metrics.playbackComplexity,
      fixture.expectedPlaybackComplexity,
      `${fixture.slug} playback sequence complexity changed`
    )
  }
  if (fixture.expectedPlaybackCanUseSequence !== undefined) {
    assertEqual(
      metrics.playbackCanUseSequence,
      fixture.expectedPlaybackCanUseSequence,
      `${fixture.slug} playback sequence readiness changed`
    )
  }
  assertAtLeast(
    metrics.playbackSequenceMeasures,
    fixture.minPlaybackSequenceMeasures,
    fixture.slug,
    'playback sequence measures'
  )
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
