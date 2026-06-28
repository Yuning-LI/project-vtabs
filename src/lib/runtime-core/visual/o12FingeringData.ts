export type O12FingeringState = (0 | 1)[]

export const O12_FINGERING_DICT: Record<number, O12FingeringState> = {
  57: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  58: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  59: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  60: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  61: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1],
  62: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  63: [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0],
  64: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  65: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  66: [1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0],
  67: [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  68: [1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0],
  69: [1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0],
  70: [1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
  71: [1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  72: [1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  73: [0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0],
  74: [0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  75: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  76: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  77: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
}

export const O12_MIDI_TO_NAME: Record<number, { letter: string; octave: number }> = {
  57: { letter: 'A', octave: 3 },
  58: { letter: 'Bb', octave: 3 },
  59: { letter: 'B', octave: 3 },
  60: { letter: 'C', octave: 4 },
  61: { letter: 'Db', octave: 4 },
  62: { letter: 'D', octave: 4 },
  63: { letter: 'Eb', octave: 4 },
  64: { letter: 'E', octave: 4 },
  65: { letter: 'F', octave: 4 },
  66: { letter: 'Gb', octave: 4 },
  67: { letter: 'G', octave: 4 },
  68: { letter: 'Ab', octave: 4 },
  69: { letter: 'A', octave: 4 },
  70: { letter: 'Bb', octave: 4 },
  71: { letter: 'B', octave: 4 },
  72: { letter: 'C', octave: 5 },
  73: { letter: 'Db', octave: 5 },
  74: { letter: 'D', octave: 5 },
  75: { letter: 'Eb', octave: 5 },
  76: { letter: 'E', octave: 5 },
  77: { letter: 'F', octave: 5 }
}
