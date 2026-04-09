import type { PublicSongInstrumentId } from './publicInstruments'

export type PinterestPinPreset = {
  slug: string
  title: string
  instrumentId: PublicSongInstrumentId
  instrumentLabel: string
  tagLabel: string
  noteLabelMode: 'letter'
  showMeasureNum: 'on' | 'off'
  measureLayout: 'compact' | 'mono'
  sheetScale: string
  sheetCropTop: number
  frameTopPadding?: number
}

export const pinterestFirstWavePresets: readonly PinterestPinPreset[] = [
  {
    slug: 'ode-to-joy',
    title: 'Ode to Joy',
    instrumentId: 'o12',
    instrumentLabel: '12-Hole Ocarina',
    tagLabel: 'Beginner-Friendly',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'mono',
    sheetScale: '12',
    sheetCropTop: 164
  },
  {
    slug: 'twinkle-twinkle-little-star',
    title: 'Twinkle Twinkle Little Star',
    instrumentId: 'o12',
    instrumentLabel: '12-Hole Ocarina',
    tagLabel: 'Easy Song',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'mono',
    sheetScale: '12',
    sheetCropTop: 168
  },
  {
    slug: 'frere-jacques',
    title: 'Frere Jacques',
    instrumentId: 'r8b',
    instrumentLabel: 'Recorder Notes',
    tagLabel: 'Beginner Practice',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'compact',
    sheetScale: '14',
    sheetCropTop: 174
  },
  {
    slug: 'london-bridge',
    title: 'London Bridge',
    instrumentId: 'r8b',
    instrumentLabel: 'Recorder Notes',
    tagLabel: 'Easy Practice',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'mono',
    sheetScale: '14',
    sheetCropTop: 172
  },
  {
    slug: 'amazing-grace',
    title: 'Amazing Grace',
    instrumentId: 'w6',
    instrumentLabel: 'Tin Whistle',
    tagLabel: 'Beginner-Friendly',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'compact',
    sheetScale: '12',
    sheetCropTop: 148,
    frameTopPadding: 28
  }
] as const

export function getPinterestPinPreset(slug: string) {
  return pinterestFirstWavePresets.find(preset => preset.slug === slug) ?? null
}
