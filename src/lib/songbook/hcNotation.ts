import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { parseHappy123CompactNotation } from './happy123Notation.ts'
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
  encodedMeasureCount: number | null
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
    encodedMeasureCount: number | null
    mainNoteCount: number
    mainRestCount: number
    mainEventCount: number
    bpm: number | null
    totalDuration: number | null
    expectedDuration: number | null
  }
  deltas: {
    measures: number | null
    noteCount: number
    restCount: number
    eventCount: number
    tempoBpm: number | null
    durationSeconds: number | null
  }
  warnings: string[]
}

const require = createRequire(import.meta.url)

function resolveHcModulePath() {
  const candidates = [
    path.resolve(process.cwd(), 'public/k-static/cdn/js/dist/hc.min_1cfae5fe62.js'),
    path.resolve(process.cwd(), 'vendor/kuailepu-static/cdn/js/dist/hc.min_1cfae5fe62.js'),
    path.resolve(process.cwd(), 'vendor/kuailepu-static/cdn/js/dist/hc.min_02d898293e.js')
  ]

  const match = candidates.find(candidate => fs.existsSync(candidate))
  if (!match) {
    throw new Error('HC runtime module not found in public/k-static or vendor/kuailepu-static.')
  }

  return match
}

const hc = require(resolveHcModulePath()) as {
  parse: (notation: string) => HcParseResult
}

export function analyzeHcNotation(notation: string): HcNotationAnalysis {
  try {
    const parsed = hc.parse(notation)
    const nodes = parsed.mpn?.tracks?.flatMap(track => track.nodes ?? []) ?? []
    const mainMelodyNodes = nodes.filter(isMainMelodyNode)
    const events = normalizeMainMelodyNodes(mainMelodyNodes)
    const encodedMeasureCount = parseHappy123CompactNotation(notation, 60).measures

    return {
      parseOk: true,
      error: null,
      totalMeasures:
        typeof parsed.totalMeasures === 'number' ? parsed.totalMeasures : null,
      encodedMeasureCount,
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
      encodedMeasureCount: null,
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
    typeof hcValidation.encodedMeasureCount === 'number'
      ? hcValidation.encodedMeasureCount - draft.stats.measures
      : null
  const tempoDelta =
    typeof draftTempoBpm === 'number' && typeof hcTempoBpm === 'number'
      ? hcTempoBpm - draftTempoBpm
      : null
  const hcTotalDuration =
    hcValidation.events.length > 0
      ? hcValidation.events[hcValidation.events.length - 1]!.time +
        hcValidation.events[hcValidation.events.length - 1]!.duration
      : null
  const expectedDuration = estimateExpectedSongDurationSeconds(draft.stats.measures, draft.metadata.meter, hcTempoBpm)
  const durationDelta =
    typeof hcTotalDuration === 'number' && typeof expectedDuration === 'number'
      ? hcTotalDuration - expectedDuration
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
  if (measureDelta !== null && measureDelta !== 0) {
    warnings.push(`Encoded measure count differs from draft by ${measureDelta}.`)
  }
  if (tempoDelta !== null && tempoDelta !== 0) {
    warnings.push(`HC BPM differs from draft metadata by ${tempoDelta}.`)
  }
  if (
    durationDelta !== null &&
    expectedDuration !== null &&
    expectedDuration > 0 &&
    Math.abs(durationDelta) / expectedDuration > 0.15
  ) {
    warnings.push(
      `HC runtime duration differs from meter/BPM expectation by ${durationDelta.toFixed(2)}s.`
    )
  }

  const status =
    !hcValidation.parseOk ||
    measureDelta !== null && measureDelta !== 0 ||
    durationDelta !== null && expectedDuration !== null && expectedDuration > 0 &&
      Math.abs(durationDelta) / expectedDuration > 0.15 ||
    Math.abs(noteDelta) > 2 ||
    Math.abs(eventDelta) > 4
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
      encodedMeasureCount: hcValidation.encodedMeasureCount,
      mainNoteCount: hcValidation.mainNoteCount,
      mainRestCount: hcValidation.mainRestCount,
      mainEventCount: hcValidation.mainEventCount,
      bpm: hcTempoBpm,
      totalDuration: hcTotalDuration,
      expectedDuration
    },
    deltas: {
      measures: measureDelta,
      noteCount: noteDelta,
      restCount: restDelta,
      eventCount: eventDelta,
      tempoBpm: tempoDelta,
      durationSeconds: durationDelta
    },
    warnings
  }
}

function estimateExpectedSongDurationSeconds(
  measures: number,
  meter: string | null,
  bpm: number | null
) {
  if (!meter || typeof bpm !== 'number' || bpm <= 0 || measures <= 0) {
    return null
  }

  const match = meter.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (!match) {
    return null
  }

  const beats = Number(match[1])
  const beatType = Number(match[2])
  if (!Number.isFinite(beats) || !Number.isFinite(beatType) || beats <= 0 || beatType <= 0) {
    return null
  }

  return measures * beats * (60 / bpm) * (4 / beatType)
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
