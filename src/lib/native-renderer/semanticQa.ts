import { DICT } from '../../components/InstrumentDicts/ocarina12.ts'
import type { SongIrDocument } from './songIr.ts'

export type SongIrSemanticQa = ReturnType<typeof buildSongIrSemanticQa>

export function buildSongIrSemanticQa(song: SongIrDocument) {
  const events = song.measures.flatMap(measure => measure.events)
  const pitchSequence = events.map(event => (event.kind === 'note' ? event.midi : null))
  const restSlots = events.map(event => (event.kind === 'rest' ? event.slotCount : 0))
  const measureSlots = song.measures.map(measure =>
    measure.events.reduce((sum, event) => sum + event.slotCount, 0)
  )
  const lyricSlots = events.map(event => (event.kind === 'note' ? event.lyric ?? '' : ''))
  const missingO12Fingerings = events
    .filter(event => event.kind === 'note')
    .filter(event => !DICT[event.midi])
    .map(event => event.midi)

  return {
    eventCount: events.length,
    noteCount: pitchSequence.filter(midi => midi !== null).length,
    restCount: restSlots.filter(slotCount => slotCount > 0).length,
    measureCount: song.measures.length,
    totalSlotCount: measureSlots.reduce((sum, slotCount) => sum + slotCount, 0),
    lyricSlotCount: lyricSlots.filter(Boolean).length,
    chordCount: song.measures.reduce((sum, measure) => sum + measure.chords.length, 0),
    missingO12FingeringCount: missingO12Fingerings.length,
    missingO12Fingerings: Array.from(new Set(missingO12Fingerings)).sort((left, right) => left - right),
    fingerprints: {
      pitch: stableHash(pitchSequence.map(midi => (midi === null ? 'r' : String(midi))).join(',')),
      rest: stableHash(restSlots.join(',')),
      measureSlots: stableHash(measureSlots.join(',')),
      lyrics: stableHash(lyricSlots.join('|')),
      chords: stableHash(
        song.measures
          .flatMap(measure =>
            measure.chords.map(chord => `${measure.index}:${chord.eventIndex}:${chord.name}`)
          )
          .join('|')
      )
    }
  }
}

function stableHash(input: string) {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
