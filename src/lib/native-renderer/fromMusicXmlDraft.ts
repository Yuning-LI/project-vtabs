import {
  parseHappy123DurationSlotCount,
  parseHappy123PitchTokenToMidi
} from '../songbook/happy123Notation.ts'
import type { SongIngestDraft } from '../songbook/songIngestDraft.ts'
import type { SongIrChord, SongIrDocument, SongIrEvent, SongIrMeasure } from './songIr.ts'

const TOKEN_PATTERN =
  /\{cn:[^}]+\}|(?:\|\|\||:\|:|:\||\|:|\|\||\|)|(?:[#bn]?[1-7][',"gd#bn]*|0)([\-._x/=]*)/gi

export function buildSongIrFromMusicXmlDraft(draft: SongIngestDraft): SongIrDocument {
  const tonicMidi = draft.metadata.recommendedTonicMidi
  const lyricTokens = splitLyricTokens(draft.lyrics.alignedLines)
  let lyricCursor = 0
  let totalEventIndex = 0
  const unsupported = detectUnsupportedDraftSyntax(draft.happi123Draft.notationText)

  const measures: SongIrMeasure[] = []
  const pendingChords: string[] = []
  const tokens = tokenizeDraftNotation(draft.happi123Draft.notationText)
  let currentMeasure = createMeasure(0)

  tokens.forEach(token => {
    if (token.startsWith('{cn:')) {
      pendingChords.push(token.slice(4, -1))
      return
    }

    if (isBarToken(token)) {
      measures.push(currentMeasure)
      currentMeasure = createMeasure(measures.length)
      return
    }

    const event = parseEventToken(token, tonicMidi, lyricTokens, lyricCursor)
    if (!event) {
      unsupported.push(`Unsupported token: ${token}`)
      return
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
    currentMeasure.events.push(event)
    totalEventIndex += 1
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

  return {
    version: 0,
    source: {
      kind: 'musicxml-draft',
      slug: draft.metadata.slug,
      title: draft.metadata.title
    },
    metadata: {
      title: draft.metadata.title,
      slug: draft.metadata.slug,
      family: draft.metadata.family,
      keynote: draft.metadata.recommendedKeynote,
      tonicMidi,
      meter: draft.metadata.meter,
      tempoBpm: draft.metadata.tempoBpm
    },
    measures,
    lyrics: {
      alignedLines: draft.lyrics.alignedLines,
      displayLines: draft.lyrics.displayLines
    },
    stats: {
      measureCount: measures.length,
      noteCount,
      restCount,
      eventCount: totalEventIndex,
      lyricSlotCount: lyricTokens.filter(token => token !== '_').length,
      chordCount,
      totalSlotCount,
      parenthesizedGroupCount: 0
    },
    unsupported: Array.from(new Set(unsupported))
  }
}

function createMeasure(index: number): SongIrMeasure {
  return {
    index,
    events: [],
    chords: []
  }
}

function parseEventToken(
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
    lyric: lyric && lyric !== '_' ? lyric : null
  }
}

function splitLyricTokens(lines: string[]) {
  return lines.flatMap(line => line.split(/\s+/).map(token => token.trim()).filter(Boolean))
}

function isBarToken(token: string) {
  return /^(?:\|\|\||:\|:|:\||\|:|\|\||\|)$/i.test(token)
}

function tokenizeDraftNotation(notation: string) {
  return notation
    .split('\n')
    .flatMap((line, index, lines) => {
      const tokens = line.match(TOKEN_PATTERN) ?? []
      if (index < lines.length - 1 && !isBarToken(tokens[tokens.length - 1] ?? '')) {
        return [...tokens, '|']
      }
      return tokens
    })
}

function detectUnsupportedDraftSyntax(notation: string) {
  const unsupported: string[] = []
  if (/(?:\|:|:\||:\|:|\|\||\|\|\|)/.test(notation)) {
    unsupported.push('repeat-or-complex-bar')
  }
  if (/\([^)]*[1-7]/.test(notation)) {
    unsupported.push('parenthesized-group')
  }
  if (/\{(?!cn:)[^}]+\}/i.test(notation)) {
    unsupported.push('non-chord-directive')
  }
  return unsupported
}
