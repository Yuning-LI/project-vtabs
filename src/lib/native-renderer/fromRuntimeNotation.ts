import {
  parseHappy123DurationSlotCount,
  parseHappy123PitchTokenToMidi
} from '../songbook/happy123Notation.ts'
import type { PublicRuntimePayload } from '../runtime-core/runtimeTypes.ts'
import type {
  SongIrChord,
  SongIrDocument,
  SongIrEvent,
  SongIrEventGroupMark,
  SongIrMeasureMarker,
  SongIrMeasure,
  SongIrPlayOrderStep,
  SongIrSection
} from './songIr.ts'

type RuntimeNotationToken =
  | { kind: 'directive'; value: string }
  | { kind: 'bar'; value: string }
  | { kind: 'event'; value: string }
  | { kind: 'hold'; value: '-' }
  | { kind: 'group-open'; value: '(' }
  | { kind: 'group-close'; value: ')' }
  | { kind: 'layout'; value: string }
  | { kind: 'repeat-ending'; value: string }
  | { kind: 'unknown'; value: string }

const EVENT_HEAD_PATTERN = /^(?:[#bn]?[1-7][',"gd#bn]*|0)$/i
const EVENT_SUFFIX_PATTERN = /^[\-._x/=]*$/
const REPEAT_BAR_PATTERN = /^(?::\|:|:\||\|:)$/i
const SIMPLE_BAR_PATTERN = /^\|$/i

export function buildSongIrFromRuntimePayload(slug: string, payload: PublicRuntimePayload): SongIrDocument {
  const title = readRuntimeTitle(payload, slug)
  const keynote = readRuntimeKeynote(payload)
  const tonicMidi = parseRuntimeKeynoteToMidi(keynote)
  const lyricTokens = splitRuntimeLyricTokens(payload.lyric)
  const notation = String(payload.notation ?? '')
  const scan = scanRuntimeNotation(notation)
  const unsupported = detectRuntimeNotationUnsupported(notation, scan.tokens)
  let lyricCursor = 0
  let totalEventIndex = 0
  let parenthesizedGroupCount = 0
  let repeatMarkerCount = 0
  let endingMarkerCount = 0

  const measures: SongIrMeasure[] = []
  const sections: SongIrSection[] = []
  const playOrder: SongIrPlayOrderStep[] = []
  const pendingChords: string[] = []
  const activeGroups: Array<{ id: string; eventIndexes: Array<{ measureIndex: number; eventIndex: number }> }> = []
  const pendingMeasureMarkers: SongIrMeasureMarker[] = []
  let currentMeasure = createMeasure(0)

  for (const token of scan.tokens) {
    if (token.kind === 'unknown') {
      unsupported.push(`unsupported-token:${token.value}`)
      continue
    }

    if (token.kind === 'directive') {
      const directive = token.value.slice(1, -1).trim()
      if (/^cn:/i.test(directive)) {
        pendingChords.push(directive.slice(3).trim())
        continue
      }
      const playOrderSteps = parsePlayOrderDirective(directive)
      if (playOrderSteps.length > 0) {
        playOrder.push(...playOrderSteps)
        continue
      }
      const markSection = parseMarkDirective(directive, currentMeasure.index)
      if (markSection) {
        addSection(sections, markSection)
      }
      continue
    }

    if (token.kind === 'layout') {
      addSection(sections, {
        label: normalizeSectionLabel(token.value),
        measureIndex: currentMeasure.index,
        source: 'section-label'
      })
      continue
    }

    if (token.kind === 'repeat-ending') {
      if (token.value.startsWith('[')) {
        currentMeasure.markers = [
          ...(currentMeasure.markers ?? []),
          {
            kind: 'ending-start',
            number: readRepeatEndingNumber(token.value)
          }
        ]
      } else {
        currentMeasure.markers = [
          ...(currentMeasure.markers ?? []),
          {
            kind: 'ending-end',
            number: null
          }
        ]
      }
      endingMarkerCount += 1
      continue
    }

    if (token.kind === 'bar') {
      const beforeMarkers = getRepeatMarkersBeforeBar(token.value)
      if (beforeMarkers.length > 0) {
        currentMeasure.markers = [...(currentMeasure.markers ?? []), ...beforeMarkers]
        repeatMarkerCount += beforeMarkers.length
      }
      if (REPEAT_BAR_PATTERN.test(token.value)) {
        unsupported.push(`repeat-bar:${token.value}`)
      }
      measures.push(currentMeasure)
      const afterMarkers = getRepeatMarkersAfterBar(token.value)
      pendingMeasureMarkers.push(...afterMarkers)
      repeatMarkerCount += afterMarkers.length
      currentMeasure = createMeasure(measures.length, pendingMeasureMarkers.splice(0))
      continue
    }

    if (token.kind === 'group-open') {
      const id = `g${parenthesizedGroupCount + 1}`
      parenthesizedGroupCount += 1
      activeGroups.push({ id, eventIndexes: [] })
      continue
    }

    if (token.kind === 'group-close') {
      const group = activeGroups.pop()
      if (!group) {
        unsupported.push('unmatched-group-close')
        continue
      }
      applyGroupMarks(measures, currentMeasure, group.id, group.eventIndexes)
      continue
    }

    if (token.kind === 'hold') {
      const previousEvent = currentMeasure.events[currentMeasure.events.length - 1]
      if (!previousEvent) {
        unsupported.push('dangling-hold')
        continue
      }
      previousEvent.slotCount += 4
      previousEvent.token = `${previousEvent.token}-`
      continue
    }

    const event = parseRuntimeEventToken(token.value, tonicMidi, lyricTokens, lyricCursor)
    if (!event) {
      unsupported.push(`unsupported-event:${token.value}`)
      continue
    }

    if (event.kind === 'note') {
      lyricCursor += 1
    }

    pendingChords.splice(0).forEach(name => {
      currentMeasure.chords.push({
        name,
        eventIndex: currentMeasure.events.length
      })
    })

    const eventIndex = currentMeasure.events.length
    currentMeasure.events.push(event)
    activeGroups.forEach(group =>
      group.eventIndexes.push({ measureIndex: currentMeasure.index, eventIndex })
    )
    totalEventIndex += 1
  }

  activeGroups.forEach(group => {
    unsupported.push(`unclosed-group:${group.id}`)
  })

  if (currentMeasure.events.length > 0 || currentMeasure.chords.length > 0 || measures.length === 0) {
    measures.push(currentMeasure)
  }

  const noteCount = measures.reduce(
    (count, measure) => count + measure.events.filter(event => event.kind === 'note').length,
    0
  )
  const restCount = measures.reduce(
    (count, measure) => count + measure.events.filter(event => event.kind === 'rest').length,
    0
  )
  const chordCount = measures.reduce((count, measure) => count + measure.chords.length, 0)
  const totalSlotCount = measures.reduce(
    (count, measure) => count + measure.events.reduce((sum, event) => sum + event.slotCount, 0),
    0
  )
  const lyrics = splitRuntimeLyricLines(payload.lyric)

  return {
    version: 0,
    source: {
      kind: 'runtime-notation',
      slug,
      title
    },
    metadata: {
      title,
      slug,
      family: null,
      keynote,
      tonicMidi,
      meter: typeof payload.rhythm === 'string' ? payload.rhythm : null,
      tempoBpm: readRuntimeTempoBpm(payload, notation)
    },
    measures,
    lyrics: {
      alignedLines: lyrics,
      displayLines: lyrics
    },
    structure: {
      sections,
      playOrder
    },
    stats: {
      measureCount: measures.length,
      noteCount,
      restCount,
      eventCount: totalEventIndex,
      lyricSlotCount: lyricTokens.length,
      chordCount,
      totalSlotCount,
      parenthesizedGroupCount,
      repeatMarkerCount,
      endingMarkerCount,
      sectionCount: sections.length,
      playOrderStepCount: playOrder.length
    },
    unsupported: Array.from(new Set([...unsupported, ...scan.unsupported]))
  }
}

function parsePlayOrderDirective(directive: string): SongIrPlayOrderStep[] {
  const match = directive.match(/^play\s*[:：]\s*(.+)$/i)
  if (!match) {
    return []
  }

  return match[1]!
    .split(/\s+/)
    .map(raw => raw.trim())
    .filter(Boolean)
    .map((raw, index) => ({
      label: normalizeSectionLabel(raw),
      raw,
      index
    }))
}

function parseMarkDirective(directive: string, measureIndex: number): SongIrSection | null {
  const match = directive.match(/^mark\s*[:：]\s*(.+)$/i)
  if (!match) {
    return null
  }

  return {
    label: normalizeSectionLabel(match[1]!),
    measureIndex,
    source: 'mark-directive'
  }
}

function normalizeSectionLabel(value: string) {
  return value.trim().replace(/:$/, '')
}

function addSection(sections: SongIrSection[], section: SongIrSection) {
  if (!section.label) {
    return
  }

  const existing = sections.find(item => item.label === section.label)
  if (existing) {
    existing.measureIndex = Math.min(existing.measureIndex, section.measureIndex)
    return
  }

  sections.push(section)
}

export function scanRuntimeNotation(notation: string) {
  const tokens: RuntimeNotationToken[] = []
  const unsupported: string[] = []
  let index = 0

  while (index < notation.length) {
    const char = notation[index]!

    if (/\s/.test(char)) {
      index += 1
      continue
    }

    if (char === '{') {
      const endIndex = notation.indexOf('}', index + 1)
      if (endIndex < 0) {
        tokens.push({ kind: 'unknown', value: notation.slice(index) })
        unsupported.push('unclosed-directive')
        break
      }
      tokens.push({ kind: 'directive', value: notation.slice(index, endIndex + 1) })
      index = endIndex + 1
      continue
    }

    const sectionLabel = notation.slice(index).match(/^(?:[A-Z][A-Z0-9]*|[\u4e00-\u9fff][\u4e00-\u9fffA-Z0-9]*):/i)
    if (sectionLabel) {
      tokens.push({ kind: 'layout', value: sectionLabel[0] })
      index += sectionLabel[0].length
      continue
    }

    if (char === '[') {
      const match = notation.slice(index).match(/^\[\d+:?/)
      tokens.push({ kind: 'repeat-ending', value: match?.[0] ?? char })
      index += match?.[0].length ?? 1
      continue
    }

    if (char === ']') {
      tokens.push({ kind: 'repeat-ending', value: char })
      index += 1
      continue
    }

    if (char === '(') {
      const tupletMatch = notation.slice(index).match(/^\((?:\d+|t):/i)
      if (tupletMatch) {
        tokens.push({ kind: 'unknown', value: tupletMatch[0] })
        unsupported.push('tuplet-like-group')
        index += tupletMatch[0].length
        continue
      }
      tokens.push({ kind: 'group-open', value: '(' })
      index += 1
      continue
    }

    if (char === ')') {
      tokens.push({ kind: 'group-close', value: ')' })
      index += 1
      continue
    }

    if (char === 'v') {
      tokens.push({ kind: 'layout', value: char })
      index += 1
      continue
    }

    if (char === '-') {
      tokens.push({ kind: 'hold', value: '-' })
      index += 1
      continue
    }

    const bar = notation.slice(index).match(/^(?:\|\|\||:\|:|:\||\|:|\|\||\|)/)
    if (bar) {
      tokens.push({ kind: 'bar', value: bar[0] })
      index += bar[0].length
      continue
    }

    const event = readRuntimeEventToken(notation, index)
    if (event) {
      tokens.push({ kind: 'event', value: event.value })
      index = event.endIndex
      continue
    }

    tokens.push({ kind: 'unknown', value: char })
    index += 1
  }

  return { tokens, unsupported }
}

function parseRuntimeEventToken(
  token: string,
  tonicMidi: number,
  lyricTokens: string[],
  lyricCursor: number
): SongIrEvent | null {
  const match = token.match(/^([#bn]?[1-7][',"gd#bn]*|0)([\-._x/=]*)$/i)
  if (!match) {
    return null
  }

  const head = match[1]!
  const suffix = match[2] ?? ''
  const slotCount = parseHappy123DurationSlotCount(suffix)
  if (head === '0') {
    return {
      kind: 'rest',
      token,
      slotCount
    }
  }

  const lyric = lyricTokens[lyricCursor] ?? null
  return {
    kind: 'note',
    token,
    midi: parseHappy123PitchTokenToMidi(head, tonicMidi),
    slotCount,
    lyric
  }
}

function readRuntimeEventToken(notation: string, startIndex: number) {
  let index = startIndex
  const first = notation[index]
  let head = ''

  if (first === '#' || first === 'b' || first === 'n') {
    head += first
    index += 1
  }

  const degree = notation[index]
  if (!degree || !/[0-7]/.test(degree)) {
    return null
  }
  head += degree
  index += 1

  while (index < notation.length && /[',"gd#bn]/i.test(notation[index]!)) {
    head += notation[index]!
    index += 1
  }

  if (!EVENT_HEAD_PATTERN.test(head)) {
    return null
  }

  let suffix = ''
  while (index < notation.length && /[\-._x/=]/.test(notation[index]!)) {
    suffix += notation[index]!
    index += 1
  }

  if (index < notation.length && /[#bn]/i.test(notation[index]!)) {
    head += notation[index]!
    index += 1
  }

  if (!EVENT_HEAD_PATTERN.test(head)) {
    return null
  }

  if (!EVENT_SUFFIX_PATTERN.test(suffix)) {
    return null
  }

  return {
    value: `${head}${suffix}`,
    endIndex: index
  }
}

function createMeasure(index: number, markers: SongIrMeasureMarker[] = []): SongIrMeasure {
  return {
    index,
    events: [],
    chords: [],
    ...(markers.length > 0 ? { markers } : {})
  }
}

function readRepeatEndingNumber(value: string) {
  const match = value.match(/^\[(\d+)/)
  return match ? Number(match[1]) : null
}

function getRepeatMarkersBeforeBar(value: string): SongIrMeasureMarker[] {
  if (value === ':|' || value === ':|:') {
    return [{ kind: 'repeat-end' }]
  }

  return []
}

function getRepeatMarkersAfterBar(value: string): SongIrMeasureMarker[] {
  if (value === '|:' || value === ':|:') {
    return [{ kind: 'repeat-start' }]
  }

  return []
}

function applyGroupMarks(
  closedMeasures: SongIrMeasure[],
  currentMeasure: SongIrMeasure,
  groupId: string,
  eventIndexes: Array<{ measureIndex: number; eventIndex: number }>
) {
  const count = eventIndexes.length
  eventIndexes.forEach((location, index) => {
    const measure =
      location.measureIndex === currentMeasure.index
        ? currentMeasure
        : closedMeasures[location.measureIndex]
    const event = measure?.events[location.eventIndex]
    if (!event) {
      return
    }

    const mark: SongIrEventGroupMark = {
      id: groupId,
      kind: 'parenthesized',
      position:
        count === 1
          ? 'single'
          : index === 0
            ? 'start'
            : index === count - 1
              ? 'end'
              : 'middle'
    }
    event.groups = [...(event.groups ?? []), mark]
  })
}

function detectRuntimeNotationUnsupported(notation: string, tokens: RuntimeNotationToken[]) {
  const unsupported: string[] = []

  tokens.forEach(token => {
    if (token.kind === 'directive') {
      const directive = token.value.slice(1, -1).trim()
      if (isRuntimeNotationSafeDirective(directive)) {
        return
      }
      if (/^play\s*[:：]/i.test(directive)) {
        unsupported.push('play-order-directive')
        return
      }
      unsupported.push(`non-mvp-directive:${directive}`)
    }
  })

  if (/\[\d:?/.test(notation)) {
    unsupported.push('repeat-ending')
  }

  if (tokens.some(token => token.kind === 'bar' && REPEAT_BAR_PATTERN.test(token.value))) {
    unsupported.push('repeat-or-complex-bar')
  }

  return unsupported
}

function isRuntimeNotationSafeDirective(directive: string) {
  return /^(?:cn|bpm)\s*:/i.test(directive) || /^mark\s*:/i.test(directive) || /^hot$/i.test(directive)
}

function readRuntimeTitle(payload: PublicRuntimePayload, slug: string) {
  const title =
    (typeof payload.title === 'string' && payload.title.trim()) ||
    (typeof payload.song_name === 'string' && payload.song_name.trim()) ||
    (typeof payload.alias_name === 'string' && payload.alias_name.trim())

  return title || slug
}

function readRuntimeKeynote(payload: PublicRuntimePayload) {
  return typeof payload.keynote === 'string' && payload.keynote.trim()
    ? payload.keynote.trim()
    : '1=C'
}

function readRuntimeTempoBpm(payload: PublicRuntimePayload, notation: string) {
  const payloadBpm =
    typeof payload.bpm === 'number'
      ? payload.bpm
      : typeof payload.bpm === 'string'
        ? Number(payload.bpm)
        : null
  if (payloadBpm && Number.isFinite(payloadBpm)) {
    return Math.max(1, Math.round(payloadBpm))
  }

  const match = notation.match(/\{bpm\s*:\s*(\d+)\}/i)
  if (!match) {
    return null
  }

  return Math.max(1, Number(match[1]))
}

function splitRuntimeLyricTokens(value: unknown): string[] {
  return splitRuntimeLyricLines(value)
    .join('\n')
    .split(/\s+/)
    .map((token: string) => token.trim())
    .filter(Boolean)
    .filter((token: string) => token !== '_')
}

function splitRuntimeLyricLines(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(splitRuntimeLyricLines)
  }

  if (typeof value !== 'string') {
    return []
  }

  const parsed = parseJsonStringArray(value)
  if (parsed) {
    return parsed.flatMap(splitRuntimeLyricLines)
  }

  return value
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
}

function parseJsonStringArray(value: string) {
  const trimmed = value.trim()
  if (!trimmed.startsWith('[')) {
    return null
  }

  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function parseRuntimeKeynoteToMidi(keynote: string) {
  const match = keynote.match(/^1=([#b]?)([A-G])$/i)
  if (!match) {
    return 60
  }

  const baseMap: Record<string, number> = {
    C: 60,
    D: 62,
    E: 64,
    F: 65,
    G: 67,
    A: 69,
    B: 71
  }
  const accidental = match[1] === '#' ? 1 : match[1] === 'b' ? -1 : 0
  return (baseMap[match[2]!.toUpperCase()] ?? 60) + accidental
}
