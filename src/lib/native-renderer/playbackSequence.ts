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
  const blockers: string[] = []

  if (unresolvedPlayOrderStepCount > 0) {
    blockers.push('unresolved-play-order')
  }

  if (hasRepeatMarkers) {
    blockers.push('repeat-markers-not-expanded')
  }

  if (hasEndingMarkers) {
    blockers.push('ending-markers-not-expanded')
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
    measureSequence: playOrderExpansion.expandedMeasureIndexes,
    sequenceMeasureCount: playOrderExpansion.expandedMeasureCount,
    uniqueMeasureCount: playOrderExpansion.uniqueExpandedMeasureCount,
    blockers
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
