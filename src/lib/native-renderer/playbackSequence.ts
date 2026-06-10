import { expandSongIrPlayOrder } from './playOrder.ts'
import type { SongIrDocument } from './songIr.ts'

export type SongIrPlaybackSequenceComplexity =
  | 'linear'
  | 'explicit-play-order'
  | 'repeat-or-ending'
  | 'play-order-with-repeat-or-ending'
  | 'unresolved-play-order'

export type SongIrRepeatExpansionBlockerReason =
  | 'complex-ending-chain'
  | 'ending-number-over-2'
  | 'missing-second-ending'
  | 'missing-second-ending-end'
  | 'multiple-repeat-end-in-ending-chain'
  | 'null-ending-number'
  | 'repeat-end-without-repeat-start'
  | 'single-ending-with-no-second'

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
  repeatExpansionBlockerReasons: SongIrRepeatExpansionBlockerReason[]
  repeatSegmentCount: number
  ignoredUnmatchedRepeatStartCount: number
  baseMeasureSequence: number[]
  measureSequence: number[]
  sequenceMeasureCount: number
  uniqueMeasureCount: number
  blockers: string[]
}

type SongIrRepeatMeasureSequenceExpansion = {
  status: SongIrPlaybackSequenceAudit['repeatExpansionStatus']
  blockerReasons: SongIrRepeatExpansionBlockerReason[]
  measureSequence: number[]
  repeatedSegmentCount: number
  ignoredUnmatchedRepeatStartCount: number
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
    repeatExpansionBlockerReasons: repeatExpansion.blockerReasons,
    repeatSegmentCount: repeatExpansion.repeatedSegmentCount,
    ignoredUnmatchedRepeatStartCount: repeatExpansion.ignoredUnmatchedRepeatStartCount,
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
): SongIrRepeatMeasureSequenceExpansion {
  if (!options.hasRepeatMarkers) {
    return {
      status: 'not-needed' as const,
      blockerReasons: [],
      measureSequence: options.baseMeasureSequence,
      repeatedSegmentCount: 0,
      ignoredUnmatchedRepeatStartCount: 0
    }
  }

  const structuralEndingBlockerReasons = options.hasEndingMarkers
    ? classifyComplexEndingBlockers(song)
    : []
  const upfrontEndingBlockerReasons = structuralEndingBlockerReasons.filter(
    reason => reason === 'ending-number-over-2'
  )

  if (upfrontEndingBlockerReasons.length > 0) {
    return {
      status: 'blocked-by-complex-ending' as const,
      blockerReasons: upfrontEndingBlockerReasons,
      measureSequence: options.baseMeasureSequence,
      repeatedSegmentCount: 0,
      ignoredUnmatchedRepeatStartCount: 0
    }
  }

  const output: number[] = []
  const skippedSequencePositions = new Set<number>()
  let repeatStartOutputIndex = 0
  let hasOpenRepeatStart = false
  let repeatedSegmentCount = 0
  let ignoredUnmatchedRepeatStartCount = 0
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
            blockerReasons: pickRepeatExpansionBlockerReasons(
              structuralEndingBlockerReasons,
              ['missing-second-ending']
            ),
            measureSequence: options.baseMeasureSequence,
            repeatedSegmentCount,
            ignoredUnmatchedRepeatStartCount
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
      } else if (repeatStartOutputIndex < repeatEndOutputIndex) {
        output.push(...output.slice(repeatStartOutputIndex, repeatEndOutputIndex))
        repeatedSegmentCount += 1
      } else if (options.hasEndingMarkers) {
        return {
          status: 'blocked-by-complex-ending' as const,
          blockerReasons: pickRepeatExpansionBlockerReasons(
            structuralEndingBlockerReasons,
            ['repeat-end-without-repeat-start']
          ),
          measureSequence: options.baseMeasureSequence,
          repeatedSegmentCount,
          ignoredUnmatchedRepeatStartCount
        }
      }
      repeatStartOutputIndex = output.length
      hasOpenRepeatStart = false
    }

    if (markers.some(marker => marker.kind === 'ending-end')) {
      currentEnding = null
    }
  }

  if (hasOpenRepeatStart) {
    ignoredUnmatchedRepeatStartCount += 1
  }

  return {
    status:
      expandedNumberedEndingCount > 0
        ? ('numbered-ending-expanded' as const)
        : ('simple-expanded' as const),
    blockerReasons: [],
    measureSequence: output,
    repeatedSegmentCount,
    ignoredUnmatchedRepeatStartCount
  }
}

function pickRepeatExpansionBlockerReasons(
  candidates: SongIrRepeatExpansionBlockerReason[],
  fallback: SongIrRepeatExpansionBlockerReason[]
) {
  const actionable = candidates.filter(
    reason =>
      reason !== 'multiple-repeat-end-in-ending-chain' &&
      reason !== 'complex-ending-chain'
  )
  return actionable.length > 0 ? actionable : fallback
}

function classifyComplexEndingBlockers(
  song: SongIrDocument
): SongIrRepeatExpansionBlockerReason[] {
  const reasons = new Set<SongIrRepeatExpansionBlockerReason>()
  const endingStartNumbers: Array<number | null> = []
  let openEndingNumber: number | null | undefined
  let repeatEndCountInCurrentEndingChain = 0

  song.measures.forEach(measure => {
    const markers = measure.markers ?? []
    const endingStart = markers.find(marker => marker.kind === 'ending-start')
    if (endingStart?.kind === 'ending-start') {
      if (openEndingNumber !== undefined && repeatEndCountInCurrentEndingChain > 0) {
        reasons.add('multiple-repeat-end-in-ending-chain')
      }
      openEndingNumber = endingStart.number
      repeatEndCountInCurrentEndingChain = 0
      endingStartNumbers.push(endingStart.number)
    }

    if (openEndingNumber !== undefined && markers.some(marker => marker.kind === 'repeat-end')) {
      repeatEndCountInCurrentEndingChain += 1
    }

    if (repeatEndCountInCurrentEndingChain > 1) {
      reasons.add('multiple-repeat-end-in-ending-chain')
    }

    if (markers.some(marker => marker.kind === 'ending-end')) {
      openEndingNumber = undefined
      repeatEndCountInCurrentEndingChain = 0
    }
  })

  if (endingStartNumbers.some(number => number === null)) {
    reasons.add('null-ending-number')
  }

  if (endingStartNumbers.some(number => number !== null && number > 2)) {
    reasons.add('ending-number-over-2')
  }

  if (
    endingStartNumbers.some(number => number === 1) &&
    !endingStartNumbers.some(number => number === 2)
  ) {
    reasons.add('single-ending-with-no-second')
  }

  if (endingStartNumbers.some(number => number === 2)) {
    song.measures.forEach((measure, index) => {
      const markers = measure.markers ?? []
      if (!markers.some(marker => marker.kind === 'ending-start' && marker.number === 2)) {
        return
      }

      const hasEndingEnd = song.measures.slice(index).some(candidate => {
        const candidateMarkers = candidate.markers ?? []
        if (
          candidate.index > measure.index &&
          candidateMarkers.some(marker => marker.kind === 'ending-start')
        ) {
          return false
        }
        return candidateMarkers.some(marker => marker.kind === 'ending-end')
      })

      if (!hasEndingEnd) {
        reasons.add('missing-second-ending-end')
      }
    })
  }

  return [...reasons]
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
