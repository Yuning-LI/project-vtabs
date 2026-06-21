import type { SongPresentation } from './presentation'
import type { PublicRuntimeHostMode } from '@/lib/runtime-core/publicRuntimeHostMode'

export type PublicSongInstrumentId = 'o12' | 'o6' | 'r8b' | 'r8g' | 'w6'

type ReservedSongInstrumentId =
  | 'none'
  | 'o3'
  | 'a6'
  | 'b6'
  | 'x8'
  | 'x10'
  | 'hx'
  | 'p8'
  | 'h7'
  | 'h9'
  | 'sn'
  | 'ch12'

type SongInstrumentConfigId = PublicSongInstrumentId | ReservedSongInstrumentId
type SongInstrumentFamily = 'ocarina' | 'recorder' | 'whistle' | 'other'

export type PublicSongInstrument = {
  id: PublicSongInstrumentId
  label: string
  shortLabel: string
  seoLabel: string
  family: 'ocarina' | 'recorder' | 'whistle'
}

type SongInstrumentConfig = {
  id: SongInstrumentConfigId
  label: string
  shortLabel: string
  seoLabel: string
  family: SongInstrumentFamily
  enabled: boolean
}

type EnabledPublicSongInstrumentConfig = SongInstrumentConfig & {
  id: PublicSongInstrumentId
  family: PublicSongInstrument['family']
  enabled: true
}

export type PublicSongPageQueryState = {
  instrumentId?: PublicSongInstrumentId | null
  fingeringIndex?: string | number | null
  noteLabelMode?: string | null
  showGraph?: string | null
  showLyric?: 'on' | 'off' | null
  showNoteRange?: 'on' | 'off' | null
  showMeasureNum?: 'on' | 'off' | null
  measureLayout?: 'compact' | 'mono' | null
  sheetScale?: string | number | null
  practiceTool?: 'metronome' | null
  runtimeVisualTheme?: 'classic' | 'off' | null
  runtimeHost?: PublicRuntimeHostMode | null
}

const DEFAULT_PUBLIC_SHOW_MEASURE_NUM = 'off'

type RuntimeInstrumentCarrier = {
  instrumentFingerings?: Array<{
    instrument?: string | null
  }>
} | null

const ENABLED_PUBLIC_SONG_INSTRUMENT_IDS = new Set<PublicSongInstrumentId>([
  'o12',
  'o6',
  'r8b',
  'r8g',
  'w6'
])

const PUBLIC_SONG_INSTRUMENT_CONFIGS: readonly SongInstrumentConfig[] = [
  {
    id: 'o12',
    label: '12-Hole Ocarina',
    shortLabel: 'Ocarina (12-Hole)',
    seoLabel: '12-hole ocarina',
    family: 'ocarina',
    enabled: true
  },
  {
    id: 'o6',
    label: '6-Hole Ocarina',
    shortLabel: 'Ocarina (6-Hole)',
    seoLabel: '6-hole ocarina',
    family: 'ocarina',
    enabled: true
  },
  {
    id: 'r8b',
    label: 'Recorder (Baroque fingering)',
    shortLabel: 'Recorder (Baroque fingering)',
    seoLabel: 'recorder with Baroque fingering',
    family: 'recorder',
    enabled: true
  },
  {
    id: 'r8g',
    label: 'Recorder (German fingering)',
    shortLabel: 'Recorder (German fingering)',
    seoLabel: 'recorder with German fingering',
    family: 'recorder',
    enabled: true
  },
  {
    id: 'w6',
    label: 'Tin Whistle',
    shortLabel: 'Tin Whistle',
    seoLabel: 'tin whistle',
    family: 'whistle',
    enabled: true
  },
  {
    id: 'none',
    label: 'No Instrument',
    shortLabel: 'No Instrument',
    seoLabel: 'no instrument',
    family: 'other',
    enabled: false
  },
  {
    id: 'o3',
    label: '3-Hole Ocarina',
    shortLabel: 'Ocarina (3-Hole)',
    seoLabel: '3-hole ocarina',
    family: 'ocarina',
    enabled: false
  },
  {
    id: 'a6',
    label: '6-Hole Alto Ocarina',
    shortLabel: 'Alto Ocarina (6-Hole)',
    seoLabel: '6-hole alto ocarina',
    family: 'ocarina',
    enabled: false
  },
  {
    id: 'b6',
    label: '6-Hole Bass Ocarina',
    shortLabel: 'Bass Ocarina (6-Hole)',
    seoLabel: '6-hole bass ocarina',
    family: 'ocarina',
    enabled: false
  },
  {
    id: 'x8',
    label: '8-Hole Xiao',
    shortLabel: 'Xiao (8-Hole)',
    seoLabel: '8-hole xiao',
    family: 'other',
    enabled: false
  },
  {
    id: 'x10',
    label: '10-Hole Xiao',
    shortLabel: 'Xiao (10-Hole)',
    seoLabel: '10-hole xiao',
    family: 'other',
    enabled: false
  },
  {
    id: 'hx',
    label: 'Hulusi',
    shortLabel: 'Hulusi',
    seoLabel: 'hulusi',
    family: 'other',
    enabled: false
  },
  {
    id: 'p8',
    label: '8-Hole Pan Flute',
    shortLabel: 'Pan Flute (8-Hole)',
    seoLabel: '8-hole pan flute',
    family: 'other',
    enabled: false
  },
  {
    id: 'h7',
    label: '7-Hole Xun',
    shortLabel: 'Xun (7-Hole)',
    seoLabel: '7-hole xun',
    family: 'other',
    enabled: false
  },
  {
    id: 'h9',
    label: '9-Hole Xun',
    shortLabel: 'Xun (9-Hole)',
    seoLabel: '9-hole xun',
    family: 'other',
    enabled: false
  },
  {
    id: 'sn',
    label: 'Suona',
    shortLabel: 'Suona',
    seoLabel: 'suona',
    family: 'other',
    enabled: false
  },
  {
    id: 'ch12',
    label: '12-Hole Chromatic Harmonica',
    shortLabel: 'Chromatic Harmonica (12-Hole)',
    seoLabel: '12-hole chromatic harmonica',
    family: 'other',
    enabled: false
  }
] as const

const PUBLIC_SONG_INSTRUMENTS: readonly PublicSongInstrument[] =
  PUBLIC_SONG_INSTRUMENT_CONFIGS
    .filter(isEnabledPublicSongInstrumentConfig)
    .map(({ id, label, shortLabel, seoLabel, family }) => ({
      id,
      label,
      shortLabel,
      seoLabel,
      family
    }))

function isEnabledPublicSongInstrumentConfig(
  instrument: SongInstrumentConfig
): instrument is EnabledPublicSongInstrumentConfig {
  return instrument.enabled && isPublicSongInstrumentId(instrument.id)
}

function isPublicSongInstrumentId(value: SongInstrumentConfigId): value is PublicSongInstrumentId {
  return ENABLED_PUBLIC_SONG_INSTRUMENT_IDS.has(value as PublicSongInstrumentId)
}

export function getSupportedPublicSongInstruments(payload: RuntimeInstrumentCarrier) {
  const available = new Set(
    (payload?.instrumentFingerings ?? [])
      .map(option => option.instrument?.trim())
      .filter((value): value is string => Boolean(value))
  )

  const supported = PUBLIC_SONG_INSTRUMENTS.filter(instrument => available.has(instrument.id))

  return supported.length > 0 ? supported : [PUBLIC_SONG_INSTRUMENTS[0]]
}

export function resolveDefaultPublicSongInstrumentId(supported: PublicSongInstrument[]) {
  return (
    supported.find(instrument => instrument.id === 'o12')?.id ??
    supported[0]?.id ??
    null
  )
}

export function normalizePublicSongInstrument(
  value: string | undefined,
  supported: PublicSongInstrument[]
) {
  const requested = supported.find(instrument => instrument.id === value)
  if (requested) {
    return requested
  }

  return supported.find(instrument => instrument.id === 'o12') ?? supported[0]
}

export function buildSongPageHref(
  input: {
    songId: string
    basePath?: string
  } & PublicSongPageQueryState
) {
  const params = new URLSearchParams()
  const basePath = input.basePath?.trim() || '/song'

  if (input.instrumentId && input.instrumentId !== 'o12') {
    params.set('instrument', input.instrumentId)
  }

  if (input.fingeringIndex !== null && input.fingeringIndex !== undefined && input.fingeringIndex !== '') {
    params.set('fingering_index', String(input.fingeringIndex))
  }

  if (input.noteLabelMode && input.noteLabelMode !== 'letter') {
    params.set('note_label_mode', input.noteLabelMode)
  }

  if (input.showGraph) {
    params.set('show_graph', input.showGraph)
  }

  if (input.showLyric) {
    params.set('show_lyric', input.showLyric)
  }

  if (input.showNoteRange === 'on') {
    params.set('show_note_range', 'on')
  }

  if (input.showMeasureNum && input.showMeasureNum !== DEFAULT_PUBLIC_SHOW_MEASURE_NUM) {
    params.set('show_measure_num', input.showMeasureNum)
  }

  if (input.measureLayout) {
    params.set('measure_layout', input.measureLayout)
  }

  if (input.sheetScale !== null && input.sheetScale !== undefined && input.sheetScale !== '') {
    params.set('sheet_scale', String(input.sheetScale))
  }

  if (input.runtimeVisualTheme === 'off') {
    params.set('runtime_visual_theme', 'off')
  }

  if (input.practiceTool === 'metronome') {
    params.set('practice_tool', 'metronome')
  }

  if (input.runtimeHost) {
    params.set('runtime_host', input.runtimeHost)
  }

  const query = params.toString()
  return query ? `${basePath}/${input.songId}?${query}` : `${basePath}/${input.songId}`
}

export function adaptPresentationForInstrument(
  presentation: SongPresentation,
  instrument: PublicSongInstrument
) {
  if (instrument.id === 'o12') {
    return presentation
  }

  return {
    ...presentation,
    subtitle: replaceInstrumentReferences(presentation.subtitle, instrument),
    metaDescription: replaceInstrumentReferences(presentation.metaDescription, instrument),
    overview: replaceInstrumentReferences(presentation.overview, instrument),
    background: replaceInstrumentReferences(presentation.background, instrument),
    practiceNotes: replaceInstrumentReferences(presentation.practiceNotes, instrument),
    includes: presentation.includes.map(item => replaceInstrumentReferences(item, instrument)),
    faqs: presentation.faqs.map(item => ({
      question: replaceInstrumentReferences(item.question, instrument),
      answer: replaceInstrumentReferences(item.answer, instrument)
    }))
  }
}

function replaceInstrumentReferences(text: string, instrument: PublicSongInstrument) {
  const protectedInstrumentLists: string[] = []
  const protectedText = text.replace(/ocarina, recorder, and tin whistle/gi, match => {
    const token = `__VTABS_INSTRUMENT_LIST_${protectedInstrumentLists.length}__`
    protectedInstrumentLists.push(match)
    return token
  })
  const seoLabel = instrument.seoLabel
  const articleWithInstrument = `${getIndefiniteArticle(seoLabel)} ${seoLabel}`
  let next = protectedText
    .replaceAll(/a 12-hole ocarina/gi, articleWithInstrument)
    .replaceAll(/an 12-hole ocarina/gi, articleWithInstrument)
    .replaceAll(/a 12-hole AC ocarina/gi, articleWithInstrument)
    .replaceAll(/an 12-hole AC ocarina/gi, articleWithInstrument)
    .replaceAll(/12-hole ocarina/gi, seoLabel)
    .replaceAll(/12-hole AC ocarina/gi, seoLabel)
    .replaceAll(/12-Hole Ocarina/g, instrument.label)
    .replaceAll(/12-Hole AC Ocarina/g, instrument.label)
    .replaceAll(/12-hole AC/gi, '12-hole')

  next = replaceInstrumentFamilyTerms(next, instrument)

  return protectedInstrumentLists.reduce(
    (result, value, index) => result.replaceAll(`__VTABS_INSTRUMENT_LIST_${index}__`, value),
    next
  )
}

function replaceInstrumentFamilyTerms(text: string, instrument: PublicSongInstrument) {
  if (instrument.family === 'ocarina') {
    return text
  }

  const familyLabel = instrument.family === 'recorder' ? 'recorder' : 'tin whistle'

  return text
    .replaceAll(
      /searchable beginner ocarina tabs/gi,
      `searchable beginner ${familyLabel} notes`
    )
    .replaceAll(/readable ocarina tabs/gi, `readable ${familyLabel} notes`)
    .replaceAll(/beginner ocarina tabs/gi, `beginner ${familyLabel} notes`)
    .replaceAll(/ocarina letter notes/gi, `${familyLabel} letter notes`)
    .replaceAll(/ocarina tabs/gi, `${familyLabel} notes`)
    .replaceAll(/ocarina version/gi, `${familyLabel} version`)
    .replaceAll(/ocarina page/gi, `${familyLabel} page`)
    .replaceAll(/on ocarina/gi, `on ${instrument.seoLabel}`)
    .replaceAll(/\bocarina\b/gi, familyLabel)
}

function getIndefiniteArticle(value: string) {
  return /^[aeiou]/i.test(value.trim()) ? 'an' : 'a'
}
