import type { SongIrChord, SongIrDocument, SongIrEvent, SongIrMeasure } from './songIr'

const DEFAULT_MEASURE_ROW_SIZE = 4
const MIN_EVENT_CELL_WIDTH_REM = 3.05
const MAX_EVENT_CELL_WIDTH_REM = 5.1
const EVENT_SLOT_WIDTH_REM = 0.75
const CHORD_EVENT_OFFSET_REM = 3.2
const MONO_EVENT_CELL_WIDTH_REM = 3.25
const DEFAULT_NATIVE_SHEET_SCALE = 10
const MIN_NATIVE_SHEET_SCALE = 6
const MAX_NATIVE_SHEET_SCALE = 16

export type NativeMelodyMeasureLayoutMode = 'compact' | 'mono'

export type NativeMelodyLayoutOptions = {
  measureRowSize?: number
  measureLayout?: NativeMelodyMeasureLayoutMode
}

export type NativeMelodyEventLayout = {
  event: SongIrEvent
  eventIndex: number
  widthRem: number
}

export type NativeMelodyChordLayout = {
  chord: SongIrChord
  leftRem: number
}

export type NativeMelodyMeasureLayout = {
  measure: SongIrMeasure
  events: NativeMelodyEventLayout[]
  chords: NativeMelodyChordLayout[]
}

export type NativeMelodyRowLayout = {
  rowIndex: number
  measures: NativeMelodyMeasureLayout[]
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

  return {
    rows: groupMeasures(song.measures, rowSize).map((measures, rowIndex) => ({
      rowIndex,
      measures: measures.map(measure => ({
        measure,
        events: measure.events.map((event, eventIndex) => ({
          event,
          eventIndex,
          widthRem: getNativeEventCellWidthRem(event, measureLayout)
        })),
        chords: measure.chords.map(chord => ({
          chord,
          leftRem: getNativeChordLeftRem(chord)
        }))
      }))
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
  return Math.max(0, chord.eventIndex) * CHORD_EVENT_OFFSET_REM
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

function normalizeMeasureLayout(
  measureLayout: NativeMelodyMeasureLayoutMode | undefined
): NativeMelodyMeasureLayoutMode {
  return measureLayout === 'mono' ? 'mono' : 'compact'
}

function groupMeasures<T>(items: T[], size: number) {
  const groups: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size))
  }
  return groups
}
