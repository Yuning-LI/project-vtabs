import type { PublicSongFamily } from '../songbook/types'

export type SongIrVersion = 0

export type SongIrSourceKind = 'musicxml-draft' | 'runtime-notation'

export type SongIrEventGroupMark = {
  id: string
  kind: 'parenthesized'
  position: 'start' | 'middle' | 'end' | 'single'
}

export type SongIrEvent =
  | {
      kind: 'note'
      midi: number
      token: string
      slotCount: number
      lyric: string | null
      groups?: SongIrEventGroupMark[]
    }
  | {
      kind: 'rest'
      token: string
      slotCount: number
      groups?: SongIrEventGroupMark[]
    }

export type SongIrChord = {
  name: string
  eventIndex: number
}

export type SongIrMeasureMarker =
  | {
      kind: 'repeat-start' | 'repeat-end'
    }
  | {
      kind: 'ending-start' | 'ending-end'
      number: number | null
    }

export type SongIrMeasure = {
  index: number
  events: SongIrEvent[]
  chords: SongIrChord[]
  markers?: SongIrMeasureMarker[]
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
    parenthesizedGroupCount: number
    repeatMarkerCount: number
    endingMarkerCount: number
  }
  unsupported: string[]
}

export type SongIrSummary = ReturnType<typeof summarizeSongIr>

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
    parenthesizedGroupCount: document.stats.parenthesizedGroupCount,
    repeatMarkerCount: document.stats.repeatMarkerCount,
    endingMarkerCount: document.stats.endingMarkerCount,
    unsupported: document.unsupported
  }
}
