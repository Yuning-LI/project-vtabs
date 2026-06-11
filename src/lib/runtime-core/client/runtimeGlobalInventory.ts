'use client'

export const PUBLIC_RUNTIME_GLOBAL_NAMES = [
  '$',
  'jQuery',
  'Kit',
  'Song',
  'hc',
  'MIDI',
  'MidiContext',
  'MidiNumber',
  'MidiPlayer',
  'MidiPlayerEngine',
  'MidiPlayerLoader',
  'MidiPlayerUI',
  'MidiSoundFont',
  'MicroPhone',
  'Metronome',
  'CountDown',
  'WebAudioScheduler',
  'I18n',
  'Mousetrap',
  'soundManager',
  'template',
  'context'
] as const

export type PublicRuntimeGlobalName = (typeof PUBLIC_RUNTIME_GLOBAL_NAMES)[number]
