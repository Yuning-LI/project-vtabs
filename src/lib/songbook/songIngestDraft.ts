import type { PublicSongFamily } from './types'
import { renderExpandedHappy123Measure, renderHappy123DraftLines } from './happy123Notation.ts'

export type SongIngestLyricPolicy =
  | 'show-publicly'
  | 'hide-by-default'
  | 'do-not-expose-toggle'
  | 'no-lyrics'

export type SongIngestLyricLanguage =
  | 'none'
  | 'latin'
  | 'cjk-only'
  | 'mixed'
  | 'other'

export type ExtractedMusicXmlPart = {
  id: string
  name: string | null
}

export type ExtractedMusicXmlGraceNote = {
  midi: number | null
  slash: boolean
  voice: string
}

export type SongIngestGraceAttachment = {
  measureNumber: string | null
  voice: string
  anchorMidi: number | null
  graceNotes: Array<{
    midi: number | null
    slash: boolean
  }>
}

export type ExtractedMusicXmlEvent = {
  voice: string
  offset: number
  duration: number
  midi: number | null
  isRest: boolean
  lyric: string | null
  tieStart: boolean
  tieStop: boolean
  sourceFeatures?: {
    hasGrace: boolean
    hasChordStack: boolean
    leadingGraceNotes?: ExtractedMusicXmlGraceNote[]
    timeModification: {
      actualNotes: number | null
      normalNotes: number | null
    } | null
  }
}

export type ExtractedMusicXmlHarmony = {
  offset: number
  name: string
  root: string
  kind: string | null
  bass: string | null
}

export type ExtractedMusicXmlMeasure = {
  number: string | null
  newSystem: boolean
  divisions: number
  fifths: number | null
  beats: number | null
  beatType: number | null
  tempoBpm: number | null
  harmonies: ExtractedMusicXmlHarmony[]
  events: ExtractedMusicXmlEvent[]
}

export type ExtractedMusicXmlScore = {
  sourceKind: 'musicxml'
  title: string | null
  composer: string | null
  parts: ExtractedMusicXmlPart[]
  selectedPartId: string
  measures: ExtractedMusicXmlMeasure[]
  warnings: string[]
}

export type BuildSongIngestDraftOptions = {
  title?: string
  slug?: string
  family?: PublicSongFamily | null
  partId?: string
  voice?: string
  keynote?: string
  lyricPolicy?: SongIngestLyricPolicy
}

export type SongIngestDraft = {
  version: 1
  source: {
    kind: 'musicxml'
    partId: string
    voice: string
  }
  metadata: {
    title: string
    slug: string
    family: PublicSongFamily | null
    composer: string | null
    meter: string | null
    tempoBpm: number | null
    recommendedKeynote: string
    recommendedTonicMidi: number
    lyricPolicy: SongIngestLyricPolicy
    lyricLanguage: SongIngestLyricLanguage
  }
  stats: {
    measures: number
    noteCount: number
    restCount: number
    lyricNoteCount: number
    chordCount: number
    graceNoteCount: number
    durationUnit: number
  }
  chords: {
    count: number
    names: string[]
  }
  ornaments: {
    graceNoteCount: number
    songsWithGraceLikeSource: boolean
    graceAttachments: SongIngestGraceAttachment[]
  }
  notation: {
    lines: string[]
  }
  lyrics: {
    alignedLines: string[]
  }
  happi123Draft: {
    title: string
    meter: string | null
    keynote: string
    notationText: string
    lyricText: string | null
  }
  songDocDraft: {
    title: string
    slug: string
    family: PublicSongFamily | null
    tonicMidi: number
    meta: {
      key: string
      meter: string | null
      tempoBpm: number | null
    }
    notation: string[]
    alignedLyrics?: string[]
  }
  warnings: string[]
}

type NormalizedEvent = ExtractedMusicXmlEvent & {
  duration: number
}

const FIFTHS_TO_KEYNOTE: Record<number, string> = {
  [-7]: '1=bC',
  [-6]: '1=bG',
  [-5]: '1=bD',
  [-4]: '1=bA',
  [-3]: '1=bE',
  [-2]: '1=bB',
  [-1]: '1=F',
  [0]: '1=C',
  [1]: '1=G',
  [2]: '1=D',
  [3]: '1=A',
  [4]: '1=E',
  [5]: '1=B',
  [6]: '1=#F',
  [7]: '1=#C'
}

export function buildSongIngestDraftFromMusicXmlExtract(
  extract: ExtractedMusicXmlScore,
  options: BuildSongIngestDraftOptions = {}
): SongIngestDraft {
  const selectedVoice = options.voice?.trim() || chooseDominantVoice(extract.measures)
  const normalizedSelectedMeasures = extract.measures
    .map(measure => ({
      ...measure,
      events: normalizeSelectedMeasureEvents(
        measure.events.filter(event => event.voice === selectedVoice)
      )
    }))
    .filter(measure => measure.events.length > 0)
  const pickupAdjusted = alignPickupMeasures(normalizedSelectedMeasures)
  const selectedMeasures = pickupAdjusted.measures

  const firstMeasure = selectedMeasures[0] ?? null
  const title = options.title?.trim() || extract.title?.trim() || 'Untitled Song'
  const composer = normalizeOptionalMetadataValue(extract.composer)
  const slug = sanitizeSongSlug(options.slug || title)
  const keynote = options.keynote?.trim() || guessKeynoteFromFifths(firstMeasure?.fifths)
  const tonicMidi = parseKeynoteToMidi(keynote)
  const meter =
    firstMeasure?.beats && firstMeasure?.beatType
      ? `${firstMeasure.beats}/${firstMeasure.beatType}`
      : null
  const tempoBpm =
    selectedMeasures.find(measure => typeof measure.tempoBpm === 'number' && measure.tempoBpm > 0)
      ?.tempoBpm ?? null
  const durationUnit = computeDurationUnit(selectedMeasures)
  const hasSystemBreaks = selectedMeasures.some(measure => measure.newSystem)

  const groupedLines = groupMeasuresIntoLines(selectedMeasures, hasSystemBreaks)
  const tieLyricRebalance = rebalanceLineInitialTieContinuationLyrics(groupedLines)
  const notationLines = groupedLines.map(group =>
    group
      .map(measure => measure.eventsToNotation)
      .filter(Boolean)
      .join(' | ')
      .trim()
  )
  const alignedLyricLines = groupedLines
    .map(group => group.flatMap(measure => measure.lyricSlots).join(' ').trim())
    .filter(Boolean)

  const noteCount = selectedMeasures.reduce(
    (count, measure) => count + measure.events.filter(event => !event.isRest).length,
    0
  )
  const restCount = selectedMeasures.reduce(
    (count, measure) => count + measure.events.filter(event => event.isRest).length,
    0
  )
  const chordNames = Array.from(
    new Set(selectedMeasures.flatMap(measure => measure.harmonies.map(harmony => harmony.name)))
  )
  const chordCount = selectedMeasures.reduce(
    (count, measure) => count + measure.harmonies.length,
    0
  )
  const graceNoteCount = selectedMeasures.reduce(
    (count, measure) =>
      count +
      measure.events.reduce(
        (sum, event) => sum + (event.sourceFeatures?.leadingGraceNotes?.length ?? 0),
        0
      ),
    0
  )
  const graceAttachments = selectedMeasures.flatMap(measure =>
    measure.events
      .filter(event => (event.sourceFeatures?.leadingGraceNotes?.length ?? 0) > 0)
      .map(event => ({
        measureNumber: measure.number,
        voice: event.voice,
        anchorMidi: event.midi,
        graceNotes: (event.sourceFeatures?.leadingGraceNotes ?? []).map(grace => ({
          midi: grace.midi,
          slash: grace.slash
        }))
      }))
  )
  const lyricNoteCount = selectedMeasures.reduce(
    (count, measure) =>
      count +
      measure.events.filter(event => !event.isRest && normalizeLyricSlot(event.lyric) !== '_').length,
    0
  )
  const lyricLanguage = detectLyricLanguage(groupedLines.flatMap(group => group.flatMap(measure => measure.lyricSlots)))
  const lyricPolicy = options.lyricPolicy || inferLyricPolicy(lyricLanguage)
  const warnings = [
    ...extract.warnings,
    ...(selectedMeasures.length === 0 ? ['No events remained after filtering the selected voice.'] : []),
    ...(lyricLanguage === 'cjk-only'
      ? ['Lyrics are pure CJK, so the current public rule would keep them hidden and not expose a lyric toggle.']
      : []),
    ...(lyricLanguage === 'none' ? ['No usable lyric track was found in the selected part/voice.'] : []),
    ...(graceNoteCount > 0
      ? ['Grace notes were captured as source metadata and omitted from the current runtime notation output.']
      : []),
    ...(selectedMeasures.some(measure =>
      measure.harmonies.some(harmony => harmony.offset > sumMeasureDuration(measure.events))
    )
      ? ['Some MusicXML harmony offsets fell outside the selected melody duration and were kept at the closest available notation position.']
      : []),
    ...(pickupAdjusted.applied
      ? ['Detected an incomplete opening pickup bar and synthesized leading rests for notation alignment.']
      : []),
    ...(tieLyricRebalance.rebalancedCount > 0
      ? [
          `Rebalanced ${tieLyricRebalance.rebalancedCount} line-initial tie continuation lyric slot(s) where the source appeared to restart a new word on a sustained carry-over note.`
        ]
      : [])
  ]

  return {
    version: 1,
    source: {
      kind: 'musicxml',
      partId: options.partId?.trim() || extract.selectedPartId,
      voice: selectedVoice
    },
    metadata: {
      title,
      slug,
      family: options.family ?? null,
      composer,
      meter,
      tempoBpm,
      recommendedKeynote: keynote,
      recommendedTonicMidi: tonicMidi,
      lyricPolicy,
      lyricLanguage
    },
    stats: {
      measures: selectedMeasures.length,
      noteCount,
      restCount,
      lyricNoteCount,
      chordCount,
      graceNoteCount,
      durationUnit
    },
    chords: {
      count: chordCount,
      names: chordNames
    },
    ornaments: {
      graceNoteCount,
      songsWithGraceLikeSource: graceNoteCount > 0,
      graceAttachments
    },
    notation: {
      lines: notationLines
    },
    lyrics: {
      alignedLines: alignedLyricLines
    },
    happi123Draft: {
      title,
      meter,
      keynote,
      notationText: renderHappy123DraftLines(groupedLines, tonicMidi, durationUnit).join('\n'),
      lyricText: alignedLyricLines.length > 0 ? alignedLyricLines.join('\n') : null
    },
    songDocDraft: {
      title,
      slug,
      family: options.family ?? null,
      tonicMidi,
      meta: {
        key: formatKeynoteLabel(keynote),
        meter,
        tempoBpm
      },
      notation: notationLines,
      ...(alignedLyricLines.length > 0 ? { alignedLyrics: alignedLyricLines } : {})
    },
    warnings
  }

  function groupMeasuresIntoLines(
    measures: ExtractedMusicXmlMeasure[],
    useSystemBreaks: boolean
  ) {
    const lines: Array<
      Array<{
        events: ExtractedMusicXmlEvent[]
        harmonies: ExtractedMusicXmlHarmony[]
        eventsToNotation: string
        lyricSlots: string[]
      }>
    > = []
    let currentLine: Array<{
      events: ExtractedMusicXmlEvent[]
      harmonies: ExtractedMusicXmlHarmony[]
      eventsToNotation: string
      lyricSlots: string[]
    }> = []

    measures.forEach((measure, index) => {
      if (
        currentLine.length > 0 &&
        ((useSystemBreaks && measure.newSystem) || (!useSystemBreaks && currentLine.length >= 4))
      ) {
        lines.push(currentLine)
        currentLine = []
      }

      currentLine.push({
        events: measure.events,
        harmonies: measure.harmonies,
        eventsToNotation: renderMeasureNotation(measure.events, tonicMidi, durationUnit, measure.harmonies),
        lyricSlots: renderMeasureLyricSlots(measure.events)
      })

      if (index === measures.length - 1 && currentLine.length > 0) {
        lines.push(currentLine)
      }
    })

    return lines
  }

  function rebalanceLineInitialTieContinuationLyrics(
    lines: ReturnType<typeof groupMeasuresIntoLines>
  ) {
    let rebalancedCount = 0

    for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
      const previousLine = lines[lineIndex - 1]
      const currentLine = lines[lineIndex]
      const previousMeasure = previousLine[previousLine.length - 1]
      const currentMeasure = currentLine[0]
      const previousLast = [...previousMeasure.events].reverse().find(event => !event.isRest) ?? null
      const currentFirst = currentMeasure.events.find(event => !event.isRest) ?? null

      if (
        !previousLast ||
        !currentFirst ||
        previousLast.isRest ||
        currentFirst.isRest ||
        previousLast.midi === null ||
        currentFirst.midi === null ||
        previousLast.midi !== currentFirst.midi ||
        !previousLast.tieStart ||
        !currentFirst.tieStop
      ) {
        continue
      }

      const previousLyric = normalizeLyricSlot(previousLast.lyric)
      const currentLyric = normalizeLyricSlot(currentFirst.lyric)
      if (previousLyric === '_' || currentLyric === '_') {
        continue
      }

      const flattenedSlots = currentLine.flatMap(measure => measure.lyricSlots)
      const placeholderIndex = flattenedSlots.indexOf('_')
      if (placeholderIndex <= 0) {
        continue
      }

      const shiftedSlots = ['_', ...flattenedSlots.slice(0, placeholderIndex), ...flattenedSlots.slice(placeholderIndex + 1)]
      let cursor = 0
      currentLine.forEach(measure => {
        measure.lyricSlots = shiftedSlots.slice(cursor, cursor + measure.lyricSlots.length)
        cursor += measure.lyricSlots.length
      })
      rebalancedCount += 1
    }

    return { rebalancedCount }
  }

}

function normalizeOptionalMetadataValue(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return null
  }

  if (/^(unknown|unk|n\/a|na|none|null|nil|undefined|anonymous)$/i.test(normalized)) {
    return null
  }

  return normalized
}

function chooseDominantVoice(measures: ExtractedMusicXmlMeasure[]) {
  const voiceScores = new Map<
    string,
    {
      eventCount: number
      noteCount: number
      lyricNoteCount: number
      soundingDuration: number
      restDuration: number
    }
  >()

  measures.forEach(measure => {
    measure.events.forEach(event => {
      const current = voiceScores.get(event.voice) ?? {
        eventCount: 0,
        noteCount: 0,
        lyricNoteCount: 0,
        soundingDuration: 0,
        restDuration: 0
      }
      current.eventCount += 1
      if (event.isRest) {
        current.restDuration += event.duration
      } else {
        current.noteCount += 1
        current.soundingDuration += event.duration
        if (normalizeLyricSlot(event.lyric) !== '_') {
          current.lyricNoteCount += 1
        }
      }
      voiceScores.set(event.voice, current)
    })
  })

  return (
    [...voiceScores.entries()].sort((left, right) => {
      const a = left[1]
      const b = right[1]
      if (a.lyricNoteCount !== b.lyricNoteCount) {
        return b.lyricNoteCount - a.lyricNoteCount
      }
      if (a.noteCount !== b.noteCount) {
        return b.noteCount - a.noteCount
      }
      if (a.soundingDuration !== b.soundingDuration) {
        return b.soundingDuration - a.soundingDuration
      }
      if (a.restDuration !== b.restDuration) {
        return a.restDuration - b.restDuration
      }
      if (a.eventCount !== b.eventCount) {
        return b.eventCount - a.eventCount
      }
      return left[0].localeCompare(right[0])
    })[0]?.[0] ?? '1'
  )
}

function mergeTiedEvents(events: ExtractedMusicXmlEvent[]) {
  const merged: NormalizedEvent[] = []

  events.forEach(event => {
    const previous = merged[merged.length - 1]
    if (
      previous &&
      !previous.isRest &&
      !event.isRest &&
      previous.midi === event.midi &&
      previous.offset + previous.duration === event.offset &&
      previous.tieStart &&
      event.tieStop
    ) {
      previous.duration += event.duration
      previous.tieStart = event.tieStart
      return
    }

    merged.push({
      ...event,
      duration: event.duration
    })
  })

  return merged
}

function normalizeSelectedMeasureEvents(events: ExtractedMusicXmlEvent[]) {
  const sortedEvents = [...events]
    .map(event => ({
      ...event,
      offset: Math.max(0, event.offset),
      duration: Math.max(1, event.duration)
    }))
    .sort((left, right) => {
      if (left.offset !== right.offset) {
        return left.offset - right.offset
      }
      if (left.isRest !== right.isRest) {
        return left.isRest ? -1 : 1
      }
      return 0
    })

  const normalized: ExtractedMusicXmlEvent[] = []
  let cursor = 0

  sortedEvents.forEach(event => {
    if (event.offset > cursor) {
      normalized.push({
        voice: event.voice,
        offset: cursor,
        duration: event.offset - cursor,
        midi: null,
        isRest: true,
        lyric: null,
        tieStart: false,
        tieStop: false
      })
      cursor = event.offset
    }

    if (event.offset < cursor) {
      const overlap = cursor - event.offset
      const trimmedDuration = event.duration - overlap
      if (trimmedDuration <= 0) {
        return
      }

      normalized.push({
        ...event,
        offset: cursor,
        duration: trimmedDuration
      })
      cursor += trimmedDuration
      return
    }

    normalized.push(event)
    cursor += event.duration
  })

  return mergeTiedEvents(normalized)
}

function alignPickupMeasures(measures: ExtractedMusicXmlMeasure[]) {
  if (measures.length < 2) {
    return { measures, applied: false }
  }

  const firstMeasure = measures[0]!
  const lastMeasure = measures[measures.length - 1]!
  const expectedDuration = getExpectedMeasureDuration(firstMeasure)
  const lastExpectedDuration = getExpectedMeasureDuration(lastMeasure)
  if (!expectedDuration || !lastExpectedDuration) {
    return { measures, applied: false }
  }

  const firstActualDuration = sumMeasureDuration(firstMeasure.events)
  const lastActualDuration = sumMeasureDuration(lastMeasure.events)
  const missingDuration = expectedDuration - firstActualDuration
  const durationUnit = computeDurationUnit(measures)
  const hasLeadingExplicitRest = firstMeasure.events.some(event => event.isRest && event.offset === 0)
  const hasFullMeasureLater = measures
    .slice(1)
    .some(measure => sumMeasureDuration(measure.events) === getExpectedMeasureDuration(measure))
  const plausiblePickupLength =
    missingDuration > 0 &&
    durationUnit > 0 &&
    missingDuration % durationUnit === 0
  const clearlyShortOpeningMeasure = firstActualDuration > 0 && firstActualDuration <= expectedDuration * 0.75

  const shouldPadLeadingPickup =
    plausiblePickupLength &&
    firstMeasure.events[0]?.offset === 0 &&
    !hasLeadingExplicitRest &&
    (
      (
        expectedDuration === lastExpectedDuration &&
        lastActualDuration > 0 &&
        lastActualDuration < expectedDuration &&
        firstActualDuration + lastActualDuration === expectedDuration
      ) ||
      (
        clearlyShortOpeningMeasure &&
        hasFullMeasureLater
      )
    )

  if (!shouldPadLeadingPickup) {
    return { measures, applied: false }
  }

  const shiftedFirstMeasure: ExtractedMusicXmlMeasure = {
    ...firstMeasure,
    events: [
      {
        voice: firstMeasure.events[0]?.voice ?? '1',
        offset: 0,
        duration: missingDuration,
        midi: null,
        isRest: true,
        lyric: null,
        tieStart: false,
        tieStop: false
      },
      ...firstMeasure.events.map(event => ({
        ...event,
        offset: event.offset + missingDuration
      }))
    ],
    harmonies: firstMeasure.harmonies.map(harmony => ({
      ...harmony,
      offset: harmony.offset + missingDuration
    }))
  }

  return {
    measures: [
      shiftedFirstMeasure,
      ...measures.slice(1, -1),
      lastMeasure
    ],
    applied: true
  }
}

function computeDurationUnit(measures: ExtractedMusicXmlMeasure[]) {
  const durations = measures
    .flatMap(measure => measure.events)
    .map(event => Math.max(1, event.duration))

  const gcdDurationUnit = durations.reduce((current, value) => gcd(current, value), durations[0] ?? 1)

  /**
   * Happy123/Kuailepu 的紧凑时值语法不是“最小事件时值 = 1 槽”。
   *
   * 例如：
   * - `3`   => 4 槽
   * - `3x`  => 2 槽
   * - `3__` => 1 槽
   *
   * 也就是说，四分音符应当稳定落到 4 槽，而不是在“整首歌只有四分/二分音”
   * 的情况下被压成 1 槽。否则 runtime 会把整首歌按约 4 倍速解释，连带让
   * 小节号、播放、节拍器对齐一起出错。
   *
   * 当前公开导歌链路优先用“十六分音符槽位”作为最低基准：
   * - 如果源谱的 gcd 已经细到十六分或更细（如三连音），保留 gcd
   * - 如果源谱只有四分/二分等较粗时值，就把单位下探到 divisions/4
   */
  const sixteenthUnits = measures
    .map(measure =>
      measure.divisions && measure.divisions > 0
        ? Math.max(1, Math.round(measure.divisions / 4))
        : null
    )
    .filter((value): value is number => Number.isFinite(value) && value > 0)

  const sixteenthBaseline =
    sixteenthUnits.length > 0
      ? sixteenthUnits.reduce((current, value) => gcd(current, value), sixteenthUnits[0]!)
      : null

  if (sixteenthBaseline && gcdDurationUnit > sixteenthBaseline) {
    return sixteenthBaseline
  }

  return gcdDurationUnit
}

function renderMeasureNotation(
  events: ExtractedMusicXmlEvent[],
  tonicMidi: number,
  durationUnit: number,
  harmonies: ExtractedMusicXmlHarmony[] = []
) {
  return renderExpandedHappy123Measure(events, tonicMidi, durationUnit, harmonies).replace(
    /#?[1-7][gd]*|b[1-7][gd]*/g,
    token => token.replace(/g/g, "'").replace(/d/g, ',')
  )
}

function renderMeasureLyricSlots(events: ExtractedMusicXmlEvent[]) {
  return events
    .filter(event => !event.isRest)
    .map(event => normalizeLyricSlot(event.lyric))
}

function normalizeLyricSlot(value: string | null) {
  const normalized =
    value
      ?.replace(/\s+/g, ' ')
      .trim()
      .replace(/^\d+(?:[.)_-]{2,}|[.]{2,})(?=[A-Za-z])/, '')
      .replace(/["“”]+/g, '') ?? ''
  return normalized.length > 0 ? normalized : '_'
}

function detectLyricLanguage(slots: string[]): SongIngestLyricLanguage {
  const filtered = slots.filter(slot => slot !== '_')
  if (filtered.length === 0) {
    return 'none'
  }

  const hasLatin = filtered.some(slot => /[A-Za-z]/.test(slot))
  const hasCjk = filtered.some(slot => /[\u3400-\u9fff]/.test(slot))

  if (hasLatin && hasCjk) {
    return 'mixed'
  }
  if (hasCjk) {
    return 'cjk-only'
  }
  if (hasLatin) {
    return 'latin'
  }

  return 'other'
}

function inferLyricPolicy(language: SongIngestLyricLanguage): SongIngestLyricPolicy {
  if (language === 'none') {
    return 'no-lyrics'
  }
  if (language === 'cjk-only') {
    return 'do-not-expose-toggle'
  }
  if (language === 'latin' || language === 'mixed') {
    return 'show-publicly'
  }

  return 'hide-by-default'
}

function guessKeynoteFromFifths(fifths: number | null | undefined) {
  if (typeof fifths === 'number' && fifths in FIFTHS_TO_KEYNOTE) {
    return FIFTHS_TO_KEYNOTE[fifths]
  }

  return '1=C'
}

export function parseKeynoteToMidi(keynote: string) {
  const match = keynote.match(/^1=([#b]?)([A-G])$/)
  if (!match) return 60

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
  return (baseMap[match[2]] ?? 60) + accidental
}

function formatKeynoteLabel(keynote: string) {
  const match = keynote.match(/^1=([#b]?)([A-G])$/)
  if (!match) return keynote
  return `1 = ${match[1]}${match[2]}`
}

function sanitizeSongSlug(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'untitled-song'
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left)
  let b = Math.abs(right)

  while (b !== 0) {
    const temp = b
    b = a % b
    a = temp
  }

  return a || 1
}

function sumMeasureDuration(events: ExtractedMusicXmlEvent[]) {
  return events.reduce((sum, event) => Math.max(sum, event.offset + event.duration), 0)
}

function getExpectedMeasureDuration(measure: ExtractedMusicXmlMeasure) {
  if (!measure.beats || !measure.beatType || !measure.divisions) {
    return null
  }

  return Math.round((measure.divisions * 4 * measure.beats) / measure.beatType)
}
