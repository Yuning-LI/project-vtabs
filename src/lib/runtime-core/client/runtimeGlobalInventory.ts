'use client'

/* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
const PUBLIC_RUNTIME_QUERY_GLOBAL_NAMES = [
  '$',
  'jQuery'
] as const

const PUBLIC_RUNTIME_CORE_GLOBAL_NAMES = [
  'Kit',
  'Song',
  'hc'
] as const

const PUBLIC_RUNTIME_MIDI_GLOBAL_NAMES = [
  'MIDI',
  'MidiContext',
  'MidiNumber',
  'MidiPlayer',
  'MidiPlayerEngine',
  'MidiPlayerLoader',
  'MidiPlayerUI',
  'MidiSoundFont'
] as const

const PUBLIC_RUNTIME_TOOL_GLOBAL_NAMES = [
  'MicroPhone',
  'Metronome',
  'CountDown',
  'WebAudioScheduler',
  'I18n',
  'Mousetrap',
  'soundManager',
  'template'
] as const

const PUBLIC_RUNTIME_CONTEXT_GLOBAL_NAMES = [
  'context'
] as const

export const PUBLIC_RUNTIME_GLOBAL_NAMES = [
  ...PUBLIC_RUNTIME_QUERY_GLOBAL_NAMES,
  ...PUBLIC_RUNTIME_CORE_GLOBAL_NAMES,
  ...PUBLIC_RUNTIME_MIDI_GLOBAL_NAMES,
  ...PUBLIC_RUNTIME_TOOL_GLOBAL_NAMES,
  ...PUBLIC_RUNTIME_CONTEXT_GLOBAL_NAMES
] as const

export type PublicRuntimeGlobalName = (typeof PUBLIC_RUNTIME_GLOBAL_NAMES)[number]
