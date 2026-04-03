import type { SongPresentation } from './presentation'

export type PublicSongInstrumentId = 'o12' | 'o6' | 'r8b' | 'r8g'

export type PublicSongInstrument = {
  id: PublicSongInstrumentId
  label: string
  shortLabel: string
  seoLabel: string
  family: 'ocarina' | 'recorder'
}

type RuntimeInstrumentCarrier = {
  instrumentFingerings?: Array<{
    instrument?: string | null
  }>
} | null

const PUBLIC_SONG_INSTRUMENTS: readonly PublicSongInstrument[] = [
  {
    id: 'o12',
    label: '12-Hole AC Ocarina',
    shortLabel: '12-Hole Ocarina',
    seoLabel: '12-hole AC ocarina',
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
    label: 'English 8-Hole Recorder',
    shortLabel: 'English Recorder',
    seoLabel: 'English 8-hole recorder',
    family: 'recorder'
  },
  {
    id: 'r8g',
    label: 'German 8-Hole Recorder',
    shortLabel: 'German Recorder',
    seoLabel: 'German 8-hole recorder',
    family: 'recorder'
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

export function buildSongPageHref(input: {
  songId: string
  instrumentId?: PublicSongInstrumentId | null
  noteLabelMode?: string | null
}) {
  const params = new URLSearchParams()

  if (input.instrumentId && input.instrumentId !== 'o12') {
    params.set('instrument', input.instrumentId)
  }

  if (input.noteLabelMode && input.noteLabelMode !== 'letter') {
    params.set('note_label_mode', input.noteLabelMode)
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
  const seoLabel = instrument.seoLabel
  const articleWithInstrument = `${getIndefiniteArticle(seoLabel)} ${seoLabel}`
  let next = text
    .replaceAll(/a 12-hole AC ocarina/gi, articleWithInstrument)
    .replaceAll(/an 12-hole AC ocarina/gi, articleWithInstrument)
    .replaceAll(/12-hole AC ocarina/gi, seoLabel)
    .replaceAll(/12-hole ocarina/gi, seoLabel)
    .replaceAll(/12-Hole AC Ocarina/g, instrument.label)
    .replaceAll(/12-hole AC/gi, seoLabel)

  if (instrument.family === 'ocarina') {
    return next
  }

  next = next
    .replaceAll(/searchable beginner ocarina tabs/gi, 'searchable beginner recorder notes')
    .replaceAll(/readable ocarina tabs/gi, 'readable recorder notes')
    .replaceAll(/beginner ocarina tabs/gi, 'beginner recorder notes')
    .replaceAll(/ocarina letter notes/gi, 'recorder letter notes')
    .replaceAll(/ocarina tabs/gi, 'recorder notes')
    .replaceAll(/ocarina version/gi, 'recorder version')
    .replaceAll(/ocarina page/gi, 'recorder page')
    .replaceAll(/on ocarina/gi, `on ${seoLabel}`)
    .replaceAll(/\bocarina\b/gi, 'recorder')

  return next
}

function getIndefiniteArticle(value: string) {
  return /^[aeiou]/i.test(value.trim()) ? 'an' : 'a'
}
