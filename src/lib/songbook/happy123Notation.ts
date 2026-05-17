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

const BAR_TOKEN_PATTERN = /(?:\|\|\||:\|:|:\||\|:|\|\||\|)/i
const BPM_DIRECTIVE_PATTERN = /\{bpm\s*:\s*\d+\}/i
const EXPANDED_TOKEN_PATTERN = /\{cn:[^}]+\}|[#bn]?[1-7][',dg]*[#bn]?|0|-|\|/gi
const COMPACT_TOKEN_PATTERN =
  /\{[^}]+\}|(?:\|\|\||:\|:|:\||\|:|\|\||\|)|(?:[#bn]?[1-7][',"gd#bn]*|0)[\-._x/=]*/gi

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
    description: 'Happy123/Kuailepu octave markers `g` / `d` with parser support for `\'` / `,` / `\"` aliases.',
    notes:
      'Generator emits normalized `g` / `d`; parser also accepts engine-native apostrophe/comma aliases seen in Kuailepu originals.'
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
    description: 'Compact duration encoding with native Happy123 suffixes such as `x`, `_`, `.`, and additive `-` segments.',
    notes:
      'Generator now emits an HC-aligned canonical subset instead of treating `-` as a local-only hold suffix.'
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
  const accidentalPrefix = mapping.degree.startsWith('#')
    ? '#'
    : mapping.degree.startsWith('b')
      ? 'b'
      : ''
  const degree = accidentalPrefix ? mapping.degree.slice(1) : mapping.degree
  const accidentalSuffix = accidentalPrefix

  // HC 的 note 语法是“级数 + 关键字”组合式。
  // 对自动生成谱，优先输出更贴近原生 lexer 的形式：`7db` / `4#`，
  // 避免 `b7d._1__` 这类前缀降号在紧凑相邻音里被 runtime 误绑到下一个音。
  return `${degree}${octaveMarks}${accidentalSuffix}`
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
      .map(ensureTrailingSingleBar)
      .join('')
      .trim()
  )
}

export function renderHappy123NotationFromExpandedLines(lines: string[]) {
  const compactLines = lines
    .map(compactExpandedHappy123Line)
    .map(line => stripTrailingBarToken(line.trim()))
    .filter(Boolean)

  if (compactLines.length === 0) {
    return '|||'
  }

  const body = compactLines.map((line, index) =>
    index < compactLines.length - 1 ? ensureTrailingSingleBar(line) : line
  )

  return `${body.join('\n')} |||`
}

export function buildRuntimeHappy123NotationFromCompactBody(bodyText: string) {
  const normalizedLines = String(bodyText || '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(ensureTrailingSingleBar)

  if (normalizedLines.length === 0) {
    return '|||'
  }

  const lastLine = normalizedLines[normalizedLines.length - 1] ?? '|'
  normalizedLines[normalizedLines.length - 1] = stripTrailingBarToken(lastLine)

  return `${normalizedLines.join('\n')} |||`
}

export function stripHappy123TempoDirective(notation: string) {
  return String(notation || '').replace(BPM_DIRECTIVE_PATTERN, '').trim()
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
  const normalized = notation.replace(/\s+/g, ' ').trim()
  const tokens = normalized.match(COMPACT_TOKEN_PATTERN) ?? []
  const events: Happy123Event[] = []
  const chordMarkers: string[] = []
  let measures = 0

  tokens.forEach(token => {
    if (token.startsWith('{')) {
      if (token.startsWith('{cn:')) {
        chordMarkers.push(token)
      }
      return
    }

    if (isBarToken(token)) {
      measures += 1
      return
    }

    const match = token.match(/^([#bn]?[1-7][',"gd#bn]*|0)([\-._x/=]*)$/i)
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

function ensureTrailingSingleBar(line: string) {
  const normalized = stripTrailingBarToken(line.trim())
  return normalized ? `${normalized}|` : '|'
}

function stripTrailingBarToken(line: string) {
  return line.replace(/(?:\|\|\||:\|:|:\||\|:|\|\||\|)\s*$/i, '').trim()
}

function isBarToken(token: string) {
  return BAR_TOKEN_PATTERN.test(token)
}

export function detectHappy123NotationFeatures(notation: string) {
  const notationWithoutKnownMetadata = notation
    .replace(/\{cn:[^}]+\}/gi, '')
    .replace(/\{bpm\s*:\s*[^}]+\}/gi, '')

  return {
    usesChordMarkers: /\{cn:[^}]+\}/.test(notation),
    usesOctaveG: /[1-7](?:g|'|")/.test(notation),
    usesOctaveD: /[1-7](?:d|,)/.test(notation),
    usesCompactX: /(?:^|[^A-Za-z])(?:[#bn]?[1-7][',"gd#bn]*|0)x/i.test(notation),
    usesCompactUnderscore: /(?:[#bn]?[1-7][',"gd#bn]*|0)[\-._x/=]*_/i.test(notation),
    usesRepeats: /:\||\|:|\[\d/.test(notation),
    usesGraceLike: /\{[^}]+\}/.test(notationWithoutKnownMetadata),
    usesTupletLike: /\(\d|=|\./.test(notation),
    usesSlurLike: /\([^)]*[1-7]/.test(notation)
  }
}

function renderHappy123DurationToken(token: string, holdCount: number) {
  return `${token}${renderHappy123DurationSuffix(holdCount + 1)}`
}

function parseHappy123DurationSlotCount(suffix: string) {
  const leadingDashCount = suffix.match(/^-+/)?.[0]?.length ?? 0
  const tail = suffix.slice(leadingDashCount)
  const tailSlots = parseHappy123BaseDurationSuffix(tail)
  return leadingDashCount * 4 + tailSlots
}

function parseHappy123PitchTokenToMidi(token: string, tonicMidi: number) {
  const normalizedToken = normalizeHappy123NativePitchToken(token)
  let accidental = 0
  let body = normalizedToken

  if (normalizedToken.startsWith('#')) {
    accidental = 1
    body = normalizedToken.slice(1)
  } else if (normalizedToken.startsWith('b')) {
    accidental = -1
    body = normalizedToken.slice(1)
  }

  const degree = Number(body[0])
  const octaveShift =
    (body.match(/g/gi)?.length ?? 0) - (body.match(/d/gi)?.length ?? 0)
  const baseOffset = DEGREE_MAP.find(candidate => candidate.degree === String(degree))?.offset ?? 0

  return tonicMidi + baseOffset + accidental + octaveShift * 12
}

function normalizeHappy123NativePitchToken(token: string) {
  if (token === '0') {
    return token
  }

  let accidental: '' | '#' | 'b' = ''
  let cursor = 0
  const prefix = token[cursor]?.toLowerCase()

  if (prefix === '#' || prefix === 'b' || prefix === 'n') {
    accidental = prefix === 'n' ? '' : (prefix as '' | '#' | 'b')
    cursor += 1
  }

  const degree = token[cursor]
  if (!degree || !/[1-7]/.test(degree)) {
    return token
  }

  let octaveShift = 0
  for (const char of token.slice(cursor + 1)) {
    const normalized = char.toLowerCase()
    if (normalized === 'g' || normalized === "'") {
      octaveShift += 1
      continue
    }
    if (normalized === 'd' || normalized === ',') {
      octaveShift -= 1
      continue
    }
    if (char === '"') {
      octaveShift += 2
      continue
    }
    if (normalized === '#' || normalized === 'b' || normalized === 'n') {
      accidental = normalized === 'n' ? '' : (normalized as '' | '#' | 'b')
    }
  }

  const octaveMarks =
    octaveShift > 0 ? 'g'.repeat(octaveShift) : octaveShift < 0 ? 'd'.repeat(-octaveShift) : ''

  return `${accidental}${degree}${octaveMarks}`
}

function renderHappy123DurationSuffix(slotCount: number): string {
  if (slotCount <= 0) {
    return 'x'
  }

  const direct = HAPPY123_CANONICAL_DURATION_SUFFIX[slotCount]
  if (direct !== undefined) {
    return direct
  }

  let best: string | null = null
  for (let carried = 1; carried * 4 < slotCount; carried += 1) {
    const remainder = slotCount - carried * 4
    const tail = renderHappy123DurationSuffix(remainder)
    const candidate = `${'-'.repeat(carried)}${tail}`
    if (best === null || candidate.length < best.length) {
      best = candidate
    }
  }

  return best ?? `${'-'.repeat(Math.max(1, Math.floor((slotCount - 1) / 4)))}__`
}

function parseHappy123BaseDurationSuffix(suffix: string) {
  if (suffix in HAPPY123_DURATION_SUFFIX_TO_SLOTS) {
    return HAPPY123_DURATION_SUFFIX_TO_SLOTS[suffix as keyof typeof HAPPY123_DURATION_SUFFIX_TO_SLOTS]
  }

  let slots = 4
  for (const char of suffix) {
    if (char === 'x' || char === '_' || char === '/') {
      slots /= 2
      continue
    }
    if (char === '=') {
      slots /= 4
      continue
    }
    if (char === '.') {
      slots += slots / 2
    }
  }

  return Math.max(1, Math.round(slots))
}

const HAPPY123_CANONICAL_DURATION_SUFFIX: Record<number, string> = {
  1: '__',
  2: 'x',
  3: '._',
  4: '',
  5: '-__',
  6: '.',
  7: '..',
  8: '-'
}

const HAPPY123_DURATION_SUFFIX_TO_SLOTS = {
  '': 4,
  x: 2,
  _: 2,
  '/': 2,
  __: 1,
  '=': 1,
  x_: 1,
  '//': 1,
  '._': 3,
  'x.': 3,
  '/.': 3,
  '.': 6,
  '..': 7
} as const
