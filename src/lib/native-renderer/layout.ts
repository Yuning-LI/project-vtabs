import type { SongIrChord, SongIrDocument, SongIrEvent, SongIrMeasure } from './songIr'

const DEFAULT_MEASURE_ROW_SIZE = 4
const DEFAULT_TARGET_ROW_WIDTH_REM = 52
const MIN_TARGET_ROW_WIDTH_REM = 28
const MIN_EVENT_CELL_WIDTH_REM = 3.05
const MIN_COMPRESSED_EVENT_CELL_WIDTH_REM = 2.15
const MAX_EVENT_CELL_WIDTH_REM = 5.1
const EVENT_SLOT_WIDTH_REM = 0.75
const MONO_EVENT_CELL_WIDTH_REM = 3.25
const MEASURE_BASE_WIDTH_REM = 1.15
const REPEAT_MARKER_WIDTH_REM = 0.55
const ENDING_MARKER_WIDTH_REM = 0.8
const DEFAULT_NATIVE_SHEET_SCALE = 10
const MIN_NATIVE_SHEET_SCALE = 6
const MAX_NATIVE_SHEET_SCALE = 16

export type NativeMelodyMeasureLayoutMode = 'compact' | 'mono'

export type NativeMelodyLayoutOptions = {
  measureRowSize?: number
  measureLayout?: NativeMelodyMeasureLayoutMode
  targetRowWidthRem?: number
}

export type NativeMelodyEventLayout = {
  event: SongIrEvent
  eventIndex: number
  widthRem: number
  rawWidthRem: number
  visualScale: number
}

export type NativeMelodyChordLayout = {
  chord: SongIrChord
  leftRem: number
}

export type NativeMelodyMeasureLayout = {
  measure: SongIrMeasure
  events: NativeMelodyEventLayout[]
  chords: NativeMelodyChordLayout[]
  widthRem: number
  rawWidthRem: number
  compressionRatio: number
}

export type NativeMelodyRowLayout = {
  rowIndex: number
  measures: NativeMelodyMeasureLayout[]
  widthRem: number
}

export type NativeMelodySheetLayout = {
  rows: NativeMelodyRowLayout[]
}

export function buildNativeMelodyLayout(
  song: SongIrDocument,
  options: NativeMelodyLayoutOptions = {}
): NativeMelodySheetLayout {
  const rowSize = normalizeMeasureRowSize(options.measureRowSize)
  const measureLayout = normalizeMeasureLayout(options.measureLayout)
  const targetRowWidthRem = normalizeTargetRowWidthRem(options.targetRowWidthRem)
  const measureLayouts = song.measures.map(measure =>
    buildNativeMeasureLayout(measure, {
      measureLayout,
      targetMeasureWidthRem: targetRowWidthRem
    })
  )

  return {
    rows: groupMeasuresIntoRows(measureLayouts, {
      maxMeasureCount: rowSize,
      targetRowWidthRem
    }).map((measures, rowIndex) => ({
      rowIndex,
      measures,
      widthRem: getNativeRowWidthRem(measures)
    }))
  }
}

export function getNativeEventCellWidthRem(
  event: SongIrEvent,
  measureLayout: NativeMelodyMeasureLayoutMode = 'compact'
) {
  if (measureLayout === 'mono') {
    return MONO_EVENT_CELL_WIDTH_REM
  }

  return Math.max(
    MIN_EVENT_CELL_WIDTH_REM,
    Math.min(MAX_EVENT_CELL_WIDTH_REM, event.slotCount * EVENT_SLOT_WIDTH_REM)
  )
}

export function getNativeChordLeftRem(chord: SongIrChord) {
  return Math.max(0, chord.eventIndex) * MONO_EVENT_CELL_WIDTH_REM
}

export function getNativeMeasureWidthRem(
  measure: SongIrMeasure,
  events: NativeMelodyEventLayout[]
) {
  const eventWidthRem = events.reduce((sum, event) => sum + event.widthRem, 0)
  const markerWidthRem = getNativeMeasureMarkerWidthRem(measure)
  return eventWidthRem + markerWidthRem + MEASURE_BASE_WIDTH_REM
}

function buildNativeMeasureLayout(
  measure: SongIrMeasure,
  options: {
    measureLayout: NativeMelodyMeasureLayoutMode
    targetMeasureWidthRem: number
  }
): NativeMelodyMeasureLayout {
  const rawEventWidths = measure.events.map(event =>
    getNativeEventCellWidthRem(event, options.measureLayout)
  )
  const markerWidthRem = getNativeMeasureMarkerWidthRem(measure)
  const fixedWidthRem = markerWidthRem + MEASURE_BASE_WIDTH_REM
  const rawEventWidthRem = rawEventWidths.reduce((sum, widthRem) => sum + widthRem, 0)
  const rawWidthRem = rawEventWidthRem + fixedWidthRem
  const eventWidths = compressEventWidths(rawEventWidths, {
    fixedWidthRem,
    targetMeasureWidthRem: options.targetMeasureWidthRem
  })
  const events = measure.events.map((event, eventIndex) => {
    const rawWidthRem = rawEventWidths[eventIndex] ?? MIN_EVENT_CELL_WIDTH_REM
    const widthRem = eventWidths[eventIndex] ?? rawWidthRem
    const visualScale = Math.max(0.62, Math.min(1, widthRem / rawWidthRem))

    return {
      event,
      eventIndex,
      widthRem,
      rawWidthRem,
      visualScale
    }
  })
  const widthRem = eventWidths.reduce((sum, value) => sum + value, 0) + fixedWidthRem

  return {
    measure,
    events,
    chords: measure.chords.map(chord => ({
      chord,
      leftRem: getNativeChordLeftRemFromEvents(chord, events)
    })),
    widthRem,
    rawWidthRem,
    compressionRatio: rawWidthRem > 0 ? widthRem / rawWidthRem : 1
  }
}

function compressEventWidths(
  rawEventWidths: number[],
  options: {
    fixedWidthRem: number
    targetMeasureWidthRem: number
  }
) {
  const rawEventWidthRem = rawEventWidths.reduce((sum, value) => sum + value, 0)
  const rawMeasureWidthRem = rawEventWidthRem + options.fixedWidthRem
  if (rawMeasureWidthRem <= options.targetMeasureWidthRem || rawEventWidths.length === 0) {
    return rawEventWidths
  }

  const availableEventWidthRem = Math.max(
    rawEventWidths.length * MIN_COMPRESSED_EVENT_CELL_WIDTH_REM,
    options.targetMeasureWidthRem - options.fixedWidthRem
  )
  const compressionRatio = availableEventWidthRem / rawEventWidthRem

  return rawEventWidths.map(widthRem =>
    Math.max(MIN_COMPRESSED_EVENT_CELL_WIDTH_REM, widthRem * compressionRatio)
  )
}

function getNativeChordLeftRemFromEvents(
  chord: SongIrChord,
  events: NativeMelodyEventLayout[]
) {
  return events
    .slice(0, Math.max(0, chord.eventIndex))
    .reduce((sum, event) => sum + event.widthRem, 0)
}

export function normalizeNativeSheetScale(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return DEFAULT_NATIVE_SHEET_SCALE
  }

  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_NATIVE_SHEET_SCALE
  }

  return Math.max(MIN_NATIVE_SHEET_SCALE, Math.min(MAX_NATIVE_SHEET_SCALE, parsed))
}

export function getNativeSheetScaleFactor(value: string | number | null | undefined) {
  return normalizeNativeSheetScale(value) / DEFAULT_NATIVE_SHEET_SCALE
}

function normalizeMeasureRowSize(measureRowSize: number | undefined) {
  if (!measureRowSize || !Number.isFinite(measureRowSize)) {
    return DEFAULT_MEASURE_ROW_SIZE
  }
  return Math.max(1, Math.floor(measureRowSize))
}

function normalizeTargetRowWidthRem(value: number | undefined) {
  if (!value || !Number.isFinite(value)) {
    return DEFAULT_TARGET_ROW_WIDTH_REM
  }

  return Math.max(MIN_TARGET_ROW_WIDTH_REM, value)
}

function normalizeMeasureLayout(
  measureLayout: NativeMelodyMeasureLayoutMode | undefined
): NativeMelodyMeasureLayoutMode {
  return measureLayout === 'mono' ? 'mono' : 'compact'
}

function groupMeasuresIntoRows(
  measures: NativeMelodyMeasureLayout[],
  options: {
    maxMeasureCount: number
    targetRowWidthRem: number
  }
) {
  const rows: NativeMelodyMeasureLayout[][] = []
  let currentRow: NativeMelodyMeasureLayout[] = []
  let currentWidthRem = 0

  for (const measure of measures) {
    const nextWidthRem = currentWidthRem + measure.widthRem
    const exceedsTargetWidth =
      currentRow.length > 0 && nextWidthRem > options.targetRowWidthRem
    const exceedsMeasureCount = currentRow.length >= options.maxMeasureCount

    if (exceedsTargetWidth || exceedsMeasureCount) {
      rows.push(currentRow)
      currentRow = []
      currentWidthRem = 0
    }

    currentRow.push(measure)
    currentWidthRem += measure.widthRem
  }

  if (currentRow.length > 0) {
    rows.push(currentRow)
  }

  return rows
}

function getNativeRowWidthRem(measures: NativeMelodyMeasureLayout[]) {
  return measures.reduce((sum, measure) => sum + measure.widthRem, 0)
}

function getNativeMeasureMarkerWidthRem(measure: SongIrMeasure) {
  const markers = measure.markers ?? []
  return markers.reduce((sum, marker) => {
    if (marker.kind === 'repeat-start' || marker.kind === 'repeat-end') {
      return sum + REPEAT_MARKER_WIDTH_REM
    }

    if (marker.kind === 'ending-start' || marker.kind === 'ending-end') {
      return sum + ENDING_MARKER_WIDTH_REM
    }

    return sum
  }, 0)
}
