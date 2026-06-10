import { expandSongIrPlayOrder } from './playOrder.ts'
import type { SongIrDocument } from './songIr.ts'

export type SongIrPlaybackSequenceComplexity =
  | 'linear'
  | 'explicit-play-order'
  | 'repeat-or-ending'
  | 'play-order-with-repeat-or-ending'
  | 'unresolved-play-order'

export type SongIrPlaybackSequenceAudit = {
  complexity: SongIrPlaybackSequenceComplexity
  canUseMeasureSequenceForPlayback: boolean
  hasExplicitPlayOrder: boolean
  hasRepeatMarkers: boolean
  hasEndingMarkers: boolean
  unresolvedPlayOrderStepCount: number
  repeatExpansionStatus:
    | 'not-needed'
    | 'simple-expanded'
    | 'blocked-by-ending'
    | 'blocked-by-unmatched-repeat-start'
  repeatSegmentCount: number
  baseMeasureSequence: number[]
  measureSequence: number[]
  sequenceMeasureCount: number
  uniqueMeasureCount: number
  blockers: string[]
}

export function auditSongIrPlaybackSequence(
  song: SongIrDocument
): SongIrPlaybackSequenceAudit {
  const playOrderExpansion = expandSongIrPlayOrder(song)
  const hasRepeatMarkers = song.stats.repeatMarkerCount > 0
  const hasEndingMarkers = song.stats.endingMarkerCount > 0
  const hasRepeatOrEnding = hasRepeatMarkers || hasEndingMarkers
  const unresolvedPlayOrderStepCount = playOrderExpansion.unresolvedSteps.length
  const repeatExpansion = expandSimpleRepeatMeasureSequence(song, {
    baseMeasureSequence: playOrderExpansion.expandedMeasureIndexes,
    hasRepeatMarkers,
    hasEndingMarkers
  })
  const blockers: string[] = []

  if (unresolvedPlayOrderStepCount > 0) {
    blockers.push('unresolved-play-order')
  }

  if (repeatExpansion.status === 'blocked-by-ending') {
    blockers.push('repeat-markers-not-expanded')
  }

  if (hasEndingMarkers) {
    blockers.push('ending-markers-not-expanded')
  }

  if (repeatExpansion.status === 'blocked-by-unmatched-repeat-start') {
    blockers.push('unmatched-repeat-start')
  }

  return {
    complexity: resolvePlaybackSequenceComplexity({
      hasExplicitPlayOrder: playOrderExpansion.hasExplicitPlayOrder,
      hasRepeatOrEnding,
      unresolvedPlayOrderStepCount
    }),
    canUseMeasureSequenceForPlayback: blockers.length === 0,
    hasExplicitPlayOrder: playOrderExpansion.hasExplicitPlayOrder,
    hasRepeatMarkers,
    hasEndingMarkers,
    unresolvedPlayOrderStepCount,
    repeatExpansionStatus: repeatExpansion.status,
    repeatSegmentCount: repeatExpansion.repeatedSegmentCount,
    baseMeasureSequence: playOrderExpansion.expandedMeasureIndexes,
    measureSequence: repeatExpansion.measureSequence,
    sequenceMeasureCount: repeatExpansion.measureSequence.length,
    uniqueMeasureCount: new Set(repeatExpansion.measureSequence).size,
    blockers
  }
}

function expandSimpleRepeatMeasureSequence(
  song: SongIrDocument,
  options: {
    baseMeasureSequence: number[]
    hasRepeatMarkers: boolean
    hasEndingMarkers: boolean
  }
) {
  if (!options.hasRepeatMarkers) {
    return {
      status: 'not-needed' as const,
      measureSequence: options.baseMeasureSequence,
      repeatedSegmentCount: 0
    }
  }

  if (options.hasEndingMarkers) {
    return {
      status: 'blocked-by-ending' as const,
      measureSequence: options.baseMeasureSequence,
      repeatedSegmentCount: 0
    }
  }

  const output: number[] = []
  let repeatStartOutputIndex = 0
  let hasOpenRepeatStart = false
  let repeatedSegmentCount = 0

  for (const measureIndex of options.baseMeasureSequence) {
    const markers = song.measures[measureIndex]?.markers ?? []

    if (markers.some(marker => marker.kind === 'repeat-start')) {
      repeatStartOutputIndex = output.length
      hasOpenRepeatStart = true
    }

    output.push(measureIndex)

    if (markers.some(marker => marker.kind === 'repeat-end')) {
      const repeatEndOutputIndex = output.length
      if (repeatStartOutputIndex < repeatEndOutputIndex) {
        output.push(...output.slice(repeatStartOutputIndex, repeatEndOutputIndex))
        repeatedSegmentCount += 1
      }
      repeatStartOutputIndex = output.length
      hasOpenRepeatStart = false
    }
  }

  if (hasOpenRepeatStart) {
    return {
      status: 'blocked-by-unmatched-repeat-start' as const,
      measureSequence: options.baseMeasureSequence,
      repeatedSegmentCount
    }
  }

  return {
    status: 'simple-expanded' as const,
    measureSequence: output,
    repeatedSegmentCount
  }
}

function resolvePlaybackSequenceComplexity(options: {
  hasExplicitPlayOrder: boolean
  hasRepeatOrEnding: boolean
  unresolvedPlayOrderStepCount: number
}): SongIrPlaybackSequenceComplexity {
  if (options.unresolvedPlayOrderStepCount > 0) {
    return 'unresolved-play-order'
  }

  if (options.hasExplicitPlayOrder && options.hasRepeatOrEnding) {
    return 'play-order-with-repeat-or-ending'
  }

  if (options.hasRepeatOrEnding) {
    return 'repeat-or-ending'
  }

  if (options.hasExplicitPlayOrder) {
    return 'explicit-play-order'
  }

  return 'linear'
}
