import { getNativeRendererInstrumentAdapter } from './instruments.ts'
import { expandSongIrPlayOrder } from './playOrder.ts'
import type { SongIrDocument } from './songIr.ts'

export type SongIrSemanticQa = ReturnType<typeof buildSongIrSemanticQa>

export function buildSongIrSemanticQa(song: SongIrDocument) {
  const o12Adapter = getNativeRendererInstrumentAdapter('o12')
  const events = song.measures.flatMap(measure => measure.events)
  const pitchSequence = events.map(event => (event.kind === 'note' ? event.midi : null))
  const restSlots = events.map(event => (event.kind === 'rest' ? event.slotCount : 0))
  const measureSlots = song.measures.map(measure =>
    measure.events.reduce((sum, event) => sum + event.slotCount, 0)
  )
  const measureMarkers = song.measures.flatMap(measure =>
    (measure.markers ?? []).map(marker =>
      marker.kind === 'ending-start' || marker.kind === 'ending-end'
        ? `${measure.index}:${marker.kind}:${marker.number ?? ''}`
        : `${measure.index}:${marker.kind}`
    )
  )
  const sections = song.structure.sections.map(
    section => `${section.label}:${section.measureIndex}:${section.source}`
  )
  const playOrder = song.structure.playOrder.map(
    step => `${step.index}:${step.label}:${step.raw}`
  )
  const playOrderExpansion = expandSongIrPlayOrder(song)
  const expandedPlaySteps = playOrderExpansion.steps.map(step =>
    step.status === 'resolved'
      ? `${step.stepIndex}:${step.label}:${step.section.measureStartIndex}-${step.section.measureEndIndex}`
      : `${step.stepIndex}:${step.label}:unresolved:${step.reason}`
  )
  const lyricSlots = events.map(event => (event.kind === 'note' ? event.lyric ?? '' : ''))
  const missingO12Fingerings = events
    .filter(event => event.kind === 'note')
    .filter(event => !o12Adapter.hasFingering(event.midi))
    .map(event => event.midi)

  return {
    eventCount: events.length,
    noteCount: pitchSequence.filter(midi => midi !== null).length,
    restCount: restSlots.filter(slotCount => slotCount > 0).length,
    measureCount: song.measures.length,
    totalSlotCount: measureSlots.reduce((sum, slotCount) => sum + slotCount, 0),
    lyricSlotCount: lyricSlots.filter(Boolean).length,
    chordCount: song.measures.reduce((sum, measure) => sum + measure.chords.length, 0),
    repeatMarkerCount: song.stats.repeatMarkerCount,
    endingMarkerCount: song.stats.endingMarkerCount,
    sectionCount: song.stats.sectionCount,
    playOrderStepCount: song.stats.playOrderStepCount,
    playOrderExpandedMeasureCount: playOrderExpansion.expandedMeasureCount,
    unresolvedPlayOrderStepCount: playOrderExpansion.unresolvedSteps.length,
    unresolvedPlayOrderLabels: playOrderExpansion.unresolvedSteps.map(step => step.label),
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
      ),
      measureMarkers: stableHash(measureMarkers.join('|')),
      sections: stableHash(sections.join('|')),
      playOrder: stableHash(playOrder.join('|')),
      expandedPlayOrder: stableHash(expandedPlaySteps.join('|'))
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
