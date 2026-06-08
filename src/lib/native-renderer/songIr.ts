import type { PublicSongFamily } from '../songbook/types'

export type SongIrVersion = 0

export type SongIrSourceKind = 'musicxml-draft' | 'runtime-notation'

export type SongIrEvent =
  | {
      kind: 'note'
      midi: number
      token: string
      slotCount: number
      lyric: string | null
    }
  | {
      kind: 'rest'
      token: string
      slotCount: number
    }

export type SongIrChord = {
  name: string
  eventIndex: number
}

export type SongIrMeasure = {
  index: number
  events: SongIrEvent[]
  chords: SongIrChord[]
}

export type SongIrDocument = {
  version: SongIrVersion
  source: {
    kind: SongIrSourceKind
    slug: string
    title: string
  }
  metadata: {
    title: string
    slug: string
    family: PublicSongFamily | null
    keynote: string
    tonicMidi: number
    meter: string | null
    tempoBpm: number | null
  }
  measures: SongIrMeasure[]
  lyrics: {
    alignedLines: string[]
    displayLines: string[]
  }
  stats: {
    measureCount: number
    noteCount: number
    restCount: number
    eventCount: number
    lyricSlotCount: number
    chordCount: number
    totalSlotCount: number
  }
  unsupported: string[]
}

export function summarizeSongIr(document: SongIrDocument) {
  return {
    slug: document.metadata.slug,
    title: document.metadata.title,
    sourceKind: document.source.kind,
    measureCount: document.stats.measureCount,
    noteCount: document.stats.noteCount,
    restCount: document.stats.restCount,
    eventCount: document.stats.eventCount,
    lyricSlotCount: document.stats.lyricSlotCount,
    chordCount: document.stats.chordCount,
    totalSlotCount: document.stats.totalSlotCount,
    unsupported: document.unsupported
  }
}
