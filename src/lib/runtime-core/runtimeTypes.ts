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

export type PublicLetterTrackMode = 'number' | 'letter' | 'graph'

export type PublicLetterTrackData = {
  mode: PublicLetterTrackMode
  anchorLabels: string[] | null
  glyphLabels: string[] | null
  glyphTokens: string[] | null
  scale:
    | Array<{
        accidental: number
        letter: string
        octave: number
      }>
    | null
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
  instrumentFingerings?: Array<{
    instrument: string
    instrumentName?: string
    fingeringsList?: Array<
      Array<{
        fingering: string
        fingeringName?: string
        tonalityName?: string
        match?: number
      }>
    >
    fingeringSetList?: Array<
      Array<{
        fingering: string
        fingeringName?: string
        tonalityName?: string
        match?: number
      }>
    >
    graphList?: Array<{
      name?: string
      value?: string
    }>
  }>
}

export type PublicRuntimeTextMode = 'source' | 'english'
export type PublicRuntimeAssetProfileName = 'public-song' | 'full-template'
export type PublicRuntimePublicFeature = 'metronome' | 'playback'
export type PublicRuntimeVisualTheme = {
  enabled: boolean
  sheetTone: 'none' | 'classic-paper'
  fingeringPalette: 'legacy' | 'classic-public'
  typography: 'legacy' | 'classic-public'
  fingeringShape: 'legacy' | 'soft-o12'
}
