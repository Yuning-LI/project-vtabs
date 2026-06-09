import { DICT as O12_DICT, MIDI_TO_NAME as O12_MIDI_TO_NAME } from '../../components/InstrumentDicts/ocarina12.ts'

export type NativeRendererInstrumentId = 'o12'

export type NativeRendererInstrumentAdapter = {
  id: NativeRendererInstrumentId
  label: string
  hasFingering: (midi: number) => boolean
  formatMidiLabel: (midi: number) => string
}

const O12_DISPLAY_OCTAVE_OFFSET = 1

const O12_ADAPTER: NativeRendererInstrumentAdapter = {
  id: 'o12',
  label: '12-hole ocarina',
  hasFingering(midi) {
    return Boolean(O12_DICT[midi])
  },
  formatMidiLabel(midi) {
    const value = O12_MIDI_TO_NAME[midi]
    if (!value) {
      return String(midi)
    }

    // Public runtime letter labels use fingering-scale display octaves: C fingering starts at C5.
    return `${value.letter}${value.octave + O12_DISPLAY_OCTAVE_OFFSET}`
  }
}

export function getNativeRendererInstrumentAdapter(
  instrumentId: NativeRendererInstrumentId = 'o12'
) {
  if (instrumentId === 'o12') {
    return O12_ADAPTER
  }

  return O12_ADAPTER
}

export function getNativeRendererInstrumentIds(): NativeRendererInstrumentId[] {
  return ['o12']
}
