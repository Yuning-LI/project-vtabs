const DIATONIC_MIDI = [60, 62, 64, 65, 67, 69, 71]

export function visualPitchToMidi(pitch: number): number {
  const noteIndex = pitch % 7
  const octaveShift = Math.floor(pitch / 7)
  return DIATONIC_MIDI[noteIndex] + octaveShift * 12
}
