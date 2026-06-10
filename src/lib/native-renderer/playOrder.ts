import type { SongIrDocument, SongIrPlayOrderStep, SongIrSection } from './songIr.ts'

export type SongIrSectionRange = {
  label: string
  source: SongIrSection['source']
  measureStartIndex: number
  measureEndIndex: number
  measureCount: number
}

export type SongIrResolvedPlayOrderStep = {
  status: 'resolved'
  stepIndex: number
  label: string
  raw: string
  section: SongIrSectionRange
  measureIndexes: number[]
}

export type SongIrUnresolvedPlayOrderStep = {
  status: 'unresolved'
  stepIndex: number
  label: string
  raw: string
  reason: 'missing-section'
  measureIndexes: []
}

export type SongIrExpandedPlayOrderStep =
  | SongIrResolvedPlayOrderStep
  | SongIrUnresolvedPlayOrderStep

export type SongIrPlayOrderExpansion = {
  hasExplicitPlayOrder: boolean
  sectionRanges: SongIrSectionRange[]
  steps: SongIrExpandedPlayOrderStep[]
  unresolvedSteps: SongIrUnresolvedPlayOrderStep[]
  expandedMeasureIndexes: number[]
  expandedMeasureCount: number
  uniqueExpandedMeasureCount: number
}

export function expandSongIrPlayOrder(song: SongIrDocument): SongIrPlayOrderExpansion {
  const sectionRanges = buildSongIrSectionRanges(song)
  if (song.structure.playOrder.length === 0) {
    const linearMeasureIndexes = song.measures.map(measure => measure.index)
    return {
      hasExplicitPlayOrder: false,
      sectionRanges,
      steps: [],
      unresolvedSteps: [],
      expandedMeasureIndexes: linearMeasureIndexes,
      expandedMeasureCount: linearMeasureIndexes.length,
      uniqueExpandedMeasureCount: new Set(linearMeasureIndexes).size
    }
  }

  const rangesByLabel = new Map(sectionRanges.map(range => [range.label, range]))
  const steps = song.structure.playOrder.map(step =>
    expandPlayOrderStep(step, rangesByLabel)
  )
  const unresolvedSteps = steps.filter(
    (step): step is SongIrUnresolvedPlayOrderStep => step.status === 'unresolved'
  )
  const expandedMeasureIndexes = steps.flatMap(step => step.measureIndexes)

  return {
    hasExplicitPlayOrder: true,
    sectionRanges,
    steps,
    unresolvedSteps,
    expandedMeasureIndexes,
    expandedMeasureCount: expandedMeasureIndexes.length,
    uniqueExpandedMeasureCount: new Set(expandedMeasureIndexes).size
  }
}

export function buildSongIrSectionRanges(song: SongIrDocument): SongIrSectionRange[] {
  if (song.measures.length === 0) {
    return []
  }

  const maxMeasureIndex = Math.max(0, song.measures.length - 1)
  const sortedSections = [...song.structure.sections].sort(
    (left, right) =>
      left.measureIndex - right.measureIndex || left.label.localeCompare(right.label)
  )

  return sortedSections.map(section => {
    const measureStartIndex = clampMeasureIndex(section.measureIndex, maxMeasureIndex)
    const nextSection = sortedSections.find(
      candidate => candidate.measureIndex > section.measureIndex
    )
    const measureEndIndex = clampMeasureIndex(
      nextSection ? nextSection.measureIndex - 1 : maxMeasureIndex,
      maxMeasureIndex
    )
    const safeEndIndex = Math.max(measureStartIndex, measureEndIndex)

    return {
      label: section.label,
      source: section.source,
      measureStartIndex,
      measureEndIndex: safeEndIndex,
      measureCount: safeEndIndex - measureStartIndex + 1
    }
  })
}

function expandPlayOrderStep(
  step: SongIrPlayOrderStep,
  rangesByLabel: Map<string, SongIrSectionRange>
): SongIrExpandedPlayOrderStep {
  const section = rangesByLabel.get(step.label)
  if (!section) {
    return {
      status: 'unresolved',
      stepIndex: step.index,
      label: step.label,
      raw: step.raw,
      reason: 'missing-section',
      measureIndexes: []
    }
  }

  return {
    status: 'resolved',
    stepIndex: step.index,
    label: step.label,
    raw: step.raw,
    section,
    measureIndexes: range(section.measureStartIndex, section.measureEndIndex)
  }
}

function clampMeasureIndex(value: number, maxMeasureIndex: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(maxMeasureIndex, Math.floor(value)))
}

function range(start: number, end: number) {
  const values: number[] = []
  for (let value = start; value <= end; value += 1) {
    values.push(value)
  }
  return values
}
