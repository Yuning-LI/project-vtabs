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
    | 'numbered-ending-expanded'
    | 'blocked-by-complex-ending'
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
  const repeatExpansion = expandRepeatMeasureSequence(song, {
    baseMeasureSequence: playOrderExpansion.expandedMeasureIndexes,
    hasRepeatMarkers,
    hasEndingMarkers
  })
  const blockers: string[] = []

  if (unresolvedPlayOrderStepCount > 0) {
    blockers.push('unresolved-play-order')
  }

  if (repeatExpansion.status === 'blocked-by-complex-ending') {
    blockers.push('repeat-markers-not-expanded')
  }

  if (hasEndingMarkers && repeatExpansion.status !== 'numbered-ending-expanded') {
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

function expandRepeatMeasureSequence(
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

  if (options.hasEndingMarkers && hasComplexEndingNumber(song)) {
    return {
      status: 'blocked-by-complex-ending' as const,
      measureSequence: options.baseMeasureSequence,
      repeatedSegmentCount: 0
    }
  }

  const output: number[] = []
  const skippedSequencePositions = new Set<number>()
  let repeatStartOutputIndex = 0
  let hasOpenRepeatStart = false
  let repeatedSegmentCount = 0
  let currentEnding:
    | {
        number: number | null
        startOutputIndex: number
        startSequencePosition: number
      }
    | null = null
  let expandedNumberedEndingCount = 0

  for (
    let sequencePosition = 0;
    sequencePosition < options.baseMeasureSequence.length;
    sequencePosition += 1
  ) {
    if (skippedSequencePositions.has(sequencePosition)) {
      continue
    }

    const measureIndex = options.baseMeasureSequence[sequencePosition]!
    const markers = song.measures[measureIndex]?.markers ?? []
    const endingStartNumber = readEndingStartNumber(markers)

    if (markers.some(marker => marker.kind === 'repeat-start')) {
      repeatStartOutputIndex = output.length
      hasOpenRepeatStart = true
    }

    if (endingStartNumber !== undefined) {
      currentEnding = {
        number: endingStartNumber,
        startOutputIndex: output.length,
        startSequencePosition: sequencePosition
      }
    }

    output.push(measureIndex)

    if (markers.some(marker => marker.kind === 'repeat-end')) {
      const repeatEndOutputIndex = output.length
      const closedEnding = markers.some(marker => marker.kind === 'ending-end')
        ? currentEnding
        : null

      if (closedEnding?.number === 1) {
        const secondEnding = findEndingRangeInSequence(song, options.baseMeasureSequence, {
          startSequencePosition: sequencePosition + 1,
          endingNumber: 2
        })
        if (!secondEnding) {
          return {
            status: 'blocked-by-complex-ending' as const,
            measureSequence: options.baseMeasureSequence,
            repeatedSegmentCount
          }
        }

        output.push(
          ...output.slice(repeatStartOutputIndex, closedEnding.startOutputIndex),
          ...secondEnding.measureIndexes
        )
        for (
          let skippedPosition = secondEnding.startSequencePosition;
          skippedPosition <= secondEnding.endSequencePosition;
          skippedPosition += 1
        ) {
          skippedSequencePositions.add(skippedPosition)
        }
        repeatedSegmentCount += 1
        expandedNumberedEndingCount += 1
      } else if (options.hasEndingMarkers) {
        return {
          status: 'blocked-by-complex-ending' as const,
          measureSequence: options.baseMeasureSequence,
          repeatedSegmentCount
        }
      } else if (repeatStartOutputIndex < repeatEndOutputIndex) {
        output.push(...output.slice(repeatStartOutputIndex, repeatEndOutputIndex))
        repeatedSegmentCount += 1
      }
      repeatStartOutputIndex = output.length
      hasOpenRepeatStart = false
    }

    if (markers.some(marker => marker.kind === 'ending-end')) {
      currentEnding = null
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
    status:
      expandedNumberedEndingCount > 0
        ? ('numbered-ending-expanded' as const)
        : ('simple-expanded' as const),
    measureSequence: output,
    repeatedSegmentCount
  }
}

function hasComplexEndingNumber(song: SongIrDocument) {
  return song.measures.some(measure =>
    (measure.markers ?? []).some(
      marker => marker.kind === 'ending-start' && marker.number !== null && marker.number > 2
    )
  )
}

function readEndingStartNumber(markers: NonNullable<SongIrDocument['measures'][number]['markers']>) {
  return markers.find(marker => marker.kind === 'ending-start')?.number
}

function findEndingRangeInSequence(
  song: SongIrDocument,
  baseMeasureSequence: number[],
  options: {
    startSequencePosition: number
    endingNumber: number
  }
) {
  let startSequencePosition: number | null = null
  const measureIndexes: number[] = []

  for (
    let sequencePosition = options.startSequencePosition;
    sequencePosition < baseMeasureSequence.length;
    sequencePosition += 1
  ) {
    const measureIndex = baseMeasureSequence[sequencePosition]!
    const markers = song.measures[measureIndex]?.markers ?? []
    const endingStartNumber = readEndingStartNumber(markers)

    if (startSequencePosition === null) {
      if (endingStartNumber !== options.endingNumber) {
        if (endingStartNumber !== undefined || markers.some(marker => marker.kind === 'repeat-start')) {
          return null
        }
        continue
      }
      startSequencePosition = sequencePosition
    }

    measureIndexes.push(measureIndex)

    if (markers.some(marker => marker.kind === 'ending-end')) {
      return {
        startSequencePosition,
        endSequencePosition: sequencePosition,
        measureIndexes
      }
    }
  }

  return null
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
