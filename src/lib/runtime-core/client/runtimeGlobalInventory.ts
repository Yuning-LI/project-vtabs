'use client'

/* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
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
