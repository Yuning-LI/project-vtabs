export type InstrumentProfile = {
  id: string
  name: string
  range: [number, number]
  displayChordSymbols: boolean
  preferredOctaveShiftsFirst: boolean
}

export const instrumentProfiles: Record<string, InstrumentProfile> = {
  'ocarina-12': {
    id: 'ocarina-12',
    name: '12-Hole Ocarina',
    range: [57, 77],
    displayChordSymbols: false,
    preferredOctaveShiftsFirst: true
  },
  'recorder-baroque': {
    id: 'recorder-baroque',
    name: 'Baroque Recorder',
    range: [60, 84],
    displayChordSymbols: false,
    preferredOctaveShiftsFirst: true
  },
  'recorder-german': {
    id: 'recorder-german',
    name: 'German Recorder',
    range: [60, 84],
    displayChordSymbols: false,
    preferredOctaveShiftsFirst: true
  },
  'guitar-standard': {
    id: 'guitar-standard',
    name: 'Standard Guitar',
    range: [40, 88],
    displayChordSymbols: true,
    preferredOctaveShiftsFirst: false
  }
}
