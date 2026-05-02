import type { SongPresentation } from './presentation'

export type PublicSongInstrumentId = 'o12' | 'o6' | 'r8b' | 'r8g' | 'w6'

export type PublicSongInstrument = {
  id: PublicSongInstrumentId
  label: string
  shortLabel: string
  seoLabel: string
  family: 'ocarina' | 'recorder' | 'whistle'
}

export type PublicSongPageQueryState = {
  instrumentId?: PublicSongInstrumentId | null
  noteLabelMode?: string | null
  showGraph?: string | null
  showLyric?: 'on' | 'off' | null
  showNoteRange?: 'on' | 'off' | null
  showMeasureNum?: 'on' | 'off' | null
  measureLayout?: 'compact' | 'mono' | null
  sheetScale?: string | number | null
  practiceTool?: 'metronome' | null
}

const DEFAULT_PUBLIC_SHOW_MEASURE_NUM = 'off'

type RuntimeInstrumentCarrier = {
  instrumentFingerings?: Array<{
    instrument?: string | null
  }>
} | null

const PUBLIC_SONG_INSTRUMENTS: readonly PublicSongInstrument[] = [
  {
    id: 'o12',
    label: '12-Hole Ocarina',
    shortLabel: '12-Hole Ocarina',
    seoLabel: '12-hole ocarina',
    family: 'ocarina'
  },
  {
    id: 'o6',
    label: '6-Hole Ocarina',
    shortLabel: '6-Hole Ocarina',
    seoLabel: '6-hole ocarina',
    family: 'ocarina'
  },
  {
    id: 'r8b',
    label: 'Recorder (Baroque fingering)',
    shortLabel: 'Recorder (Baroque fingering)',
    seoLabel: 'recorder with Baroque fingering',
    family: 'recorder'
  },
  {
    id: 'r8g',
    label: 'Recorder (German fingering)',
    shortLabel: 'Recorder (German fingering)',
    seoLabel: 'recorder with German fingering',
    family: 'recorder'
  },
  {
    id: 'w6',
    label: 'Tin Whistle',
    shortLabel: 'Tin Whistle',
    seoLabel: 'tin whistle',
    family: 'whistle'
  }
] as const

export function getSupportedPublicSongInstruments(payload: RuntimeInstrumentCarrier) {
  const available = new Set(
    (payload?.instrumentFingerings ?? [])
      .map(option => option.instrument?.trim())
      .filter((value): value is string => Boolean(value))
  )

  const supported = PUBLIC_SONG_INSTRUMENTS.filter(instrument => available.has(instrument.id))

  return supported.length > 0 ? supported : [PUBLIC_SONG_INSTRUMENTS[0]]
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
  } & PublicSongPageQueryState
) {
  const params = new URLSearchParams()

  if (input.instrumentId && input.instrumentId !== 'o12') {
    params.set('instrument', input.instrumentId)
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

  if (input.practiceTool === 'metronome') {
    params.set('practice_tool', 'metronome')
  }

  const query = params.toString()
  return query ? `/song/${input.songId}?${query}` : `/song/${input.songId}`
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
