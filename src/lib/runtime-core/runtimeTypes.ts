export type PublicRuntimeState = {
  instrument?: string | null
  fingering?: string | null
  fingering_index?: string | number | null
  show_graph?: string | null
  show_lyric?: string | null
  show_note_range?: string | null
  show_measure_num?: string | null
  measure_layout?: string | null
  sheet_scale?: string | number | null
  note_label_mode?: string | null
}

export const PUBLIC_LETTER_TRACK_MODES = ['number', 'letter', 'graph'] as const
export type PublicLetterTrackMode = (typeof PUBLIC_LETTER_TRACK_MODES)[number]

export type PublicRuntimeScaleTone = {
  accidental: number
  letter: string
  octave: number
}

export type PublicLetterTrackData = {
  mode: PublicLetterTrackMode
  anchorLabels: string[] | null
  glyphLabels: string[] | null
  glyphTokens: string[] | null
  scale: PublicRuntimeScaleTone[] | null
}

export type PublicRuntimeFingeringChoice = {
  fingering: string
  fingeringName?: string
  tonalityName?: string
  match?: number
}

export type PublicRuntimeFingeringChoiceGroup = PublicRuntimeFingeringChoice[]

export type PublicRuntimeGraphChoice = {
  name?: string
  value?: string
}

export type PublicRuntimeInstrumentFingering = {
  instrument: string
  instrumentName?: string
  fingeringsList?: PublicRuntimeFingeringChoiceGroup[]
  fingeringSetList?: PublicRuntimeFingeringChoiceGroup[]
  graphList?: PublicRuntimeGraphChoice[]
}

export type PublicRuntimePayload = Record<string, unknown> & {
  song_name?: string
  alias_name?: string
  song_uuid?: string
  song_pinyin?: string
  keynote?: string
  rhythm?: string
  lyric?: unknown
  lyric_text?: unknown
  music_composer?: string
  lyric_composer?: string
  composer?: string
  lyricist?: string
  arranger?: string
  player?: string
  author?: string
  nickname?: string
  title?: string
  subtitle?: string
  instrument?: string
  fingering?: string
  fingering_index?: string | number | null
  show_graph?: string
  show_lyric?: string
  show_note_range?: string
  show_measure_num?: string
  measure_layout?: string
  sheet_scale?: string | number | null
  sheetScaleList?: number[]
  instrumentFingerings?: PublicRuntimeInstrumentFingering[]
}

export const PUBLIC_RUNTIME_TEXT_MODES = ['source', 'english'] as const
export type PublicRuntimeTextMode = (typeof PUBLIC_RUNTIME_TEXT_MODES)[number]

export const PUBLIC_RUNTIME_ASSET_PROFILE_NAMES = ['public-song', 'full-template'] as const
export type PublicRuntimeAssetProfileName = (typeof PUBLIC_RUNTIME_ASSET_PROFILE_NAMES)[number]

export const PUBLIC_RUNTIME_PUBLIC_FEATURES = ['metronome', 'playback'] as const
export type PublicRuntimePublicFeature = (typeof PUBLIC_RUNTIME_PUBLIC_FEATURES)[number]

export const PUBLIC_RUNTIME_SHEET_TONES = ['none', 'classic-paper'] as const
export type PublicRuntimeSheetTone = (typeof PUBLIC_RUNTIME_SHEET_TONES)[number]

export const PUBLIC_RUNTIME_FINGERING_PALETTES = ['legacy', 'classic-public'] as const
export type PublicRuntimeFingeringPalette = (typeof PUBLIC_RUNTIME_FINGERING_PALETTES)[number]

export const PUBLIC_RUNTIME_TYPOGRAPHY_OPTIONS = ['legacy', 'classic-public'] as const
export type PublicRuntimeTypography = (typeof PUBLIC_RUNTIME_TYPOGRAPHY_OPTIONS)[number]

export const PUBLIC_RUNTIME_FINGERING_SHAPES = ['legacy', 'soft-o12'] as const
export type PublicRuntimeFingeringShape = (typeof PUBLIC_RUNTIME_FINGERING_SHAPES)[number]

export type PublicRuntimeVisualTheme = {
  enabled: boolean
  sheetTone: PublicRuntimeSheetTone
  fingeringPalette: PublicRuntimeFingeringPalette
  typography: PublicRuntimeTypography
  fingeringShape: PublicRuntimeFingeringShape
}
