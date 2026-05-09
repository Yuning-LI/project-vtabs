import type {
  ExtractedMusicXmlEvent,
  ExtractedMusicXmlHarmony,
  ExtractedMusicXmlMeasure
} from './songIngestDraft.ts'

export type Happy123CoverageStatus = 'supported' | 'partial' | 'unsupported'

export type Happy123CoverageItem = {
  key: string
  status: Happy123CoverageStatus
  category: 'pitch' | 'duration' | 'structure' | 'metadata' | 'advanced'
  description: string
  notes: string
}

export type Happy123Event = {
  kind: 'note' | 'rest'
  token: string
  midi: number | null
  slotCount: number
}

export type Happy123ParsedNotation = {
  events: Happy123Event[]
  measures: number
  chordMarkers: string[]
}

const DEGREE_MAP: Array<{
  offset: number
  degree: string
}> = [
  { offset: 0, degree: '1' },
  { offset: 1, degree: '#1' },
  { offset: 2, degree: '2' },
  { offset: 3, degree: 'b3' },
  { offset: 4, degree: '3' },
  { offset: 5, degree: '4' },
  { offset: 6, degree: '#4' },
  { offset: 7, degree: '5' },
  { offset: 8, degree: 'b6' },
  { offset: 9, degree: '6' },
  { offset: 10, degree: 'b7' },
  { offset: 11, degree: '7' }
]

const EXPANDED_TOKEN_PATTERN = /\{cn:[^}]+\}|#?[1-7][',dg]*|b[1-7][',dg]*|0|-|\|/gi
const COMPACT_TOKEN_PATTERN = /\{cn:[^}]+\}|#?[1-7][gd]*-+_?|b[1-7][gd]*-+_?|0-+_?|#?[1-7][gd]*x?|b[1-7][gd]*x?|0x?|\|/gi

export const HAPPY123_GENERATOR_COVERAGE: Happy123CoverageItem[] = [
  {
    key: 'scale-degree-pitch',
    status: 'supported',
    category: 'pitch',
    description: 'Scale-degree note tokens `1-7` with `#` / `b` accidentals.',
    notes: 'Directly generated from MIDI pitch classes.'
  },
  {
    key: 'octave-gd',
    status: 'supported',
    category: 'pitch',
    description: 'Happy123-native octave markers `g` / `d`.',
    notes: 'Generator emits `g` for up-octave and `d` for down-octave.'
  },
  {
    key: 'rest-zero',
    status: 'supported',
    category: 'pitch',
    description: 'Rest token `0`.',
    notes: 'Rests are preserved through draft and runtime notation.'
  },
  {
    key: 'compact-duration-x-dash-underscore',
    status: 'supported',
    category: 'duration',
    description: 'Compact duration encoding with `x`, `-`, `_`.',
    notes: 'Round-trip parser and generator both support the emitted subset.'
  },
  {
    key: 'barlines',
    status: 'supported',
    category: 'structure',
    description: 'Measure bars `|` and multi-line notation.',
    notes: 'Generator preserves measure grouping from the draft.'
  },
  {
    key: 'chord-markers',
    status: 'supported',
    category: 'metadata',
    description: 'Chord markers `{cn:...}` extracted from MusicXML harmony nodes.',
    notes: 'Chord roots are transposed together with the melody.'
  },
  {
    key: 'pickup-rests',
    status: 'partial',
    category: 'structure',
    description: 'Leading pickup rests and weak-beat alignment.',
    notes: 'Works when rests are explicit in source events; still needs more corpus validation.'
  },
  {
    key: 'repeats-and-endings',
    status: 'unsupported',
    category: 'advanced',
    description: 'Repeat bars, first/second endings, DS/DC-style navigation.',
    notes: 'Current generator does not emit native repeat grammar.'
  },
  {
    key: 'grace-notes',
    status: 'unsupported',
    category: 'advanced',
    description: 'Grace-note constructs and ornamental note clusters.',
    notes: 'Current MusicXML ingest skips grace notes.'
  },
  {
    key: 'tuplets-and-complex-rhythm',
    status: 'partial',
    category: 'advanced',
    description: 'Tuplets, dotted sub-beat groupings, and richer rhythmic syntax like `.` `=`.',
    notes: 'MusicXML tuplets are flattened to raw durations; native notation emission is not full-grammar.'
  },
  {
    key: 'slur-ornament-dynamic-directive',
    status: 'unsupported',
    category: 'advanced',
    description: 'Legacy directives and symbols such as `()`, `{play:...}`, `{bpm:...}`, dynamics, tips.',
    notes: 'The generator currently focuses on melody, chord, and duration correctness.'
  },
  {
    key: 'multi-voice',
    status: 'unsupported',
    category: 'advanced',
    description: 'Multiple simultaneous voices or stacked note groups.',
    notes: 'Ingest keeps one dominant melody voice only.'
  }
]

export function midiToHappy123PitchToken(midi: number, tonicMidi: number) {
  const diff = midi - tonicMidi
  const pitchClass = ((diff % 12) + 12) % 12
  const mapping = DEGREE_MAP[pitchClass] ?? DEGREE_MAP[0]
  const baseOffset = DEGREE_MAP.findIndex(candidate => candidate.offset === pitchClass)
  const octaveShift = Math.floor((diff - (DEGREE_MAP[baseOffset]?.offset ?? 0)) / 12)
  const octaveMarks =
    octaveShift > 0 ? 'g'.repeat(octaveShift) : octaveShift < 0 ? 'd'.repeat(-octaveShift) : ''

  return `${mapping.degree}${octaveMarks}`
}

export function renderExpandedHappy123Measure(
  events: ExtractedMusicXmlEvent[],
  tonicMidi: number,
  durationUnit: number,
  harmonies: ExtractedMusicXmlHarmony[] = []
) {
  const output: string[] = []
  const remainingHarmonies = [...harmonies].sort((left, right) => left.offset - right.offset)
  let cursor = 0

  events.forEach(event => {
    while (remainingHarmonies.length > 0 && remainingHarmonies[0]!.offset <= cursor) {
      output.push(renderHappy123ChordMarker(remainingHarmonies.shift()!.name))
    }

    const slotCount = Math.max(1, Math.round(event.duration / durationUnit))
    const head = event.isRest ? '0' : midiToHappy123PitchToken(event.midi ?? tonicMidi, tonicMidi)

    output.push(head, ...Array.from({ length: Math.max(0, slotCount - 1) }, () => '-'))
    cursor += event.duration
  })

  while (remainingHarmonies.length > 0) {
    output.push(renderHappy123ChordMarker(remainingHarmonies.shift()!.name))
  }

  return output.join(' ').trim()
}

export function renderHappy123DraftLines(
  groupedMeasures: Array<Array<Pick<ExtractedMusicXmlMeasure, 'events' | 'harmonies'>>>,
  tonicMidi: number,
  durationUnit: number
) {
  return groupedMeasures.map(group =>
    group
      .map(measure =>
        compactExpandedHappy123Line(
          renderExpandedHappy123Measure(measure.events, tonicMidi, durationUnit, measure.harmonies)
        )
      )
      .filter(Boolean)
      .join('|')
      .trim()
  )
}

export function renderHappy123NotationFromExpandedLines(lines: string[]) {
  return `${lines.map(compactExpandedHappy123Line).join('\n')} |||`
}

export function compactExpandedHappy123Line(line: string) {
  const tokens = line.match(EXPANDED_TOKEN_PATTERN) ?? []
  const output: string[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!

    if (token.startsWith('{cn:')) {
      output.push(token)
      continue
    }

    if (token === '|') {
      output.push('|')
      continue
    }

    if (token === '-') {
      output.push('-')
      continue
    }

    let holdCount = 0
    while (tokens[index + 1] === '-') {
      holdCount += 1
      index += 1
    }

    output.push(renderHappy123DurationToken(token, holdCount))
  }

  return output
    .join('')
    .replace(/\s*\|\s*/g, '|')
    .trim()
}

export function renderHappy123ChordMarker(name: string) {
  return `{cn:${sanitizeHappy123ChordName(name)}}`
}

export function sanitizeHappy123ChordName(name: string) {
  return name.replace(/[^A-Ga-g0-9#b/+\-().]/g, '').slice(0, 24) || 'C'
}

export function parseHappy123CompactNotation(notation: string, tonicMidi: number): Happy123ParsedNotation {
  const normalized = notation.replace(/\|\|\|/g, ' ').replace(/\s+/g, ' ').trim()
  const tokens = normalized.match(COMPACT_TOKEN_PATTERN) ?? []
  const events: Happy123Event[] = []
  const chordMarkers: string[] = []
  let measures = 0

  tokens.forEach(token => {
    if (token.startsWith('{cn:')) {
      chordMarkers.push(token)
      return
    }

    if (token === '|') {
      measures += 1
      return
    }

    const match = token.match(/^(#?[1-7][gd]*|b[1-7][gd]*|0)(x|-+_?)?$/i)
    if (!match) {
      return
    }

    const head = match[1]!
    const suffix = match[2] ?? ''
    const slotCount = parseHappy123DurationSlotCount(suffix)

    events.push({
      kind: head === '0' ? 'rest' : 'note',
      token,
      midi: head === '0' ? null : parseHappy123PitchTokenToMidi(head, tonicMidi),
      slotCount
    })
  })

  return {
    events,
    measures,
    chordMarkers
  }
}

export function detectHappy123NotationFeatures(notation: string) {
  return {
    usesChordMarkers: /\{cn:[^}]+\}/.test(notation),
    usesOctaveG: /[1-7]g/.test(notation),
    usesOctaveD: /[1-7]d/.test(notation),
    usesCompactX: /(?:^|[^A-Za-z])(?:#?[1-7][gd]*|b[1-7][gd]*|0)x/.test(notation),
    usesCompactUnderscore: /(?:#?[1-7][gd]*|b[1-7][gd]*|0)-+_/.test(notation),
    usesRepeats: /:\||\|:|\[\d/.test(notation),
    usesGraceLike: /\{[^}]+}/.test(notation.replace(/\{cn:[^}]+\}/g, '')),
    usesTupletLike: /\(\d|=|\./.test(notation),
    usesSlurLike: /\([^)]*[1-7]/.test(notation)
  }
}

function renderHappy123DurationToken(token: string, holdCount: number) {
  if (holdCount === 0) {
    return `${token}x`
  }

  if (holdCount === 1) {
    return token
  }

  if (holdCount % 2 === 1) {
    return `${token}${'-'.repeat(Math.max(1, (holdCount - 1) / 2))}`
  }

  return `${token}${'-'.repeat(Math.max(1, Math.floor(holdCount / 2)))}_`
}

function parseHappy123DurationSlotCount(suffix: string) {
  if (!suffix) return 2
  if (suffix === 'x') return 1

  const dashCount = (suffix.match(/-/g) ?? []).length
  if (suffix.endsWith('_')) {
    return dashCount * 2 + 1
  }

  return dashCount * 2 + 2
}

function parseHappy123PitchTokenToMidi(token: string, tonicMidi: number) {
  let accidental = 0
  let body = token

  if (token.startsWith('#')) {
    accidental = 1
    body = token.slice(1)
  } else if (token.startsWith('b')) {
    accidental = -1
    body = token.slice(1)
  }

  const degree = Number(body[0])
  const octaveShift =
    (body.match(/g/gi)?.length ?? 0) - (body.match(/d/gi)?.length ?? 0)
  const baseOffset = DEGREE_MAP.find(candidate => candidate.degree === String(degree))?.offset ?? 0

  return tonicMidi + baseOffset + accidental + octaveShift * 12
}
