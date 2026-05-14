import { createRequire } from 'node:module'
import type { SongIngestDraft } from './songIngestDraft.ts'

type HcParseResult = {
  totalMeasures?: number
  paperCount?: number
  svgWidth?: number
  svgHeight?: number
  mpn?: {
    bpm?: number
    tracks?: Array<{
      name?: string
      nodes?: HcRuntimeNode[]
    }>
  }
}

type HcRuntimeNode = {
  channel?: number
  priority?: number
  type?: string
  id?: string
  time?: number
  duration?: number | string
  playDuration?: number
  noteNumber?: number
  scale?: number
  accidental?: number
  octave?: number
  keyName?: string
}

export type HcMainMelodyEvent = {
  kind: 'note' | 'rest'
  midi: number | null
  duration: number
  time: number
  scale: number
  accidental: number
  octave: number
}

export type HcNotationAnalysis = {
  parseOk: boolean
  error: string | null
  totalMeasures: number | null
  paperCount: number | null
  bpm: number | null
  mainEventCount: number
  mainNoteCount: number
  mainRestCount: number
  events: HcMainMelodyEvent[]
}

export type HcConsistencySummary = {
  status: 'ok' | 'review' | 'warning'
  draft: {
    measures: number
    noteCount: number
    restCount: number
    eventCount: number
    tempoBpm: number | null
  }
  hc: {
    totalMeasures: number | null
    mainNoteCount: number
    mainRestCount: number
    mainEventCount: number
    bpm: number | null
  }
  deltas: {
    measures: number | null
    noteCount: number
    restCount: number
    eventCount: number
    tempoBpm: number | null
  }
  warnings: string[]
}

const require = createRequire(import.meta.url)
const hc = require('../../../public/k-static/cdn/js/dist/hc.min_1cfae5fe62.js') as {
  parse: (notation: string) => HcParseResult
}

export function analyzeHcNotation(notation: string): HcNotationAnalysis {
  try {
    const parsed = hc.parse(notation)
    const nodes = parsed.mpn?.tracks?.flatMap(track => track.nodes ?? []) ?? []
    const mainMelodyNodes = nodes.filter(isMainMelodyNode)
    const events = normalizeMainMelodyNodes(mainMelodyNodes)

    return {
      parseOk: true,
      error: null,
      totalMeasures:
        typeof parsed.totalMeasures === 'number' ? parsed.totalMeasures : null,
      paperCount: typeof parsed.paperCount === 'number' ? parsed.paperCount : null,
      bpm: typeof parsed.mpn?.bpm === 'number' ? parsed.mpn.bpm : null,
      mainEventCount: events.length,
      mainNoteCount: events.filter(event => event.kind === 'note').length,
      mainRestCount: events.filter(event => event.kind === 'rest').length,
      events
    }
  } catch (error) {
    return {
      parseOk: false,
      error: error instanceof Error ? error.message : String(error),
      totalMeasures: null,
      paperCount: null,
      bpm: null,
      mainEventCount: 0,
      mainNoteCount: 0,
      mainRestCount: 0,
      events: []
    }
  }
}

export function buildHcConsistencySummary(
  draft: SongIngestDraft,
  hcValidation: HcNotationAnalysis
): HcConsistencySummary {
  const draftEventCount = draft.stats.noteCount + draft.stats.restCount
  const draftTempoBpm = draft.metadata.tempoBpm
  const hcTempoBpm = hcValidation.bpm
  const noteDelta = hcValidation.mainNoteCount - draft.stats.noteCount
  const restDelta = hcValidation.mainRestCount - draft.stats.restCount
  const eventDelta = hcValidation.mainEventCount - draftEventCount
  const measureDelta =
    typeof hcValidation.totalMeasures === 'number'
      ? hcValidation.totalMeasures - draft.stats.measures
      : null
  const tempoDelta =
    typeof draftTempoBpm === 'number' && typeof hcTempoBpm === 'number'
      ? hcTempoBpm - draftTempoBpm
      : null

  const warnings: string[] = []
  if (!hcValidation.parseOk) {
    warnings.push('HC parser could not parse the generated notation.')
  }
  if (noteDelta !== 0) {
    warnings.push(`HC main note count differs from draft by ${noteDelta}.`)
  }
  if (restDelta !== 0) {
    warnings.push(`HC main rest count differs from draft by ${restDelta}.`)
  }
  if (eventDelta !== 0) {
    warnings.push(`HC main event count differs from draft by ${eventDelta}.`)
  }
  if (tempoDelta !== null && tempoDelta !== 0) {
    warnings.push(`HC BPM differs from draft metadata by ${tempoDelta}.`)
  }

  const status =
    !hcValidation.parseOk || Math.abs(noteDelta) > 2 || Math.abs(eventDelta) > 4
      ? 'warning'
      : warnings.length > 0
        ? 'review'
        : 'ok'

  return {
    status,
    draft: {
      measures: draft.stats.measures,
      noteCount: draft.stats.noteCount,
      restCount: draft.stats.restCount,
      eventCount: draftEventCount,
      tempoBpm: draftTempoBpm
    },
    hc: {
      totalMeasures: hcValidation.totalMeasures,
      mainNoteCount: hcValidation.mainNoteCount,
      mainRestCount: hcValidation.mainRestCount,
      mainEventCount: hcValidation.mainEventCount,
      bpm: hcTempoBpm
    },
    deltas: {
      measures: measureDelta,
      noteCount: noteDelta,
      restCount: restDelta,
      eventCount: eventDelta,
      tempoBpm: tempoDelta
    },
    warnings
  }
}

function isMainMelodyNode(node: HcRuntimeNode) {
  return node.channel === 0 && node.type === 'note' && node.priority === 2
}

function normalizeMainMelodyNodes(nodes: HcRuntimeNode[]) {
  const events: HcMainMelodyEvent[] = []
  const noteSpans = nodes
    .map(node => ({
      start: normalizeNumber(node.time, 0),
      end: normalizeNumber(node.time, 0) + normalizeNumber(node.duration, 0),
      midi:
        typeof node.noteNumber === 'number' && node.noteNumber > 0 ? node.noteNumber : null
    }))
    .filter(
      (span): span is { start: number; end: number; midi: number } =>
        span.midi !== null && span.end > span.start
    )

  nodes.forEach(node => {
    const duration = normalizeNumber(node.duration, 0)
    const time = normalizeNumber(node.time, 0)
    const scale = normalizeNumber(node.scale, 0)
    const accidental = normalizeNumber(node.accidental, 0)
    const octave = normalizeNumber(node.octave, 0)
    const midi =
      typeof node.noteNumber === 'number' && node.noteNumber > 0 ? node.noteNumber : null
    const playDuration = normalizeNumber(node.playDuration, 0)
    const overlapsRenderedNote =
      midi === null &&
      duration > 0 &&
      noteSpans.some(span => time < span.end && span.start < time + duration)

    if (overlapsRenderedNote) {
      return
    }

    if (midi === null && playDuration === 0 && events.length > 0) {
      events[events.length - 1]!.duration += duration
      return
    }

    events.push({
      kind: midi === null ? 'rest' : 'note',
      midi,
      duration,
      time,
      scale,
      accidental,
      octave
    })
  })

  return events
}

function normalizeNumber(value: unknown, fallback: number) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : fallback
}
