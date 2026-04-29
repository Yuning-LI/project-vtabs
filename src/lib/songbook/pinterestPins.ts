import type { PublicSongInstrumentId } from './publicInstruments.ts'
import { buildSongPageHref } from './publicInstruments.ts'
import { siteUrl } from '../site.ts'

export type PinterestPinPreset = {
  id?: string
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
  sheetCropBottom?: number
  contentWidth?: number
  frameTopPadding?: number
  fitHeight?: number
  boardName?: string
  pinTitle?: string
  pinDescription?: string
  campaignId?: string
  utmMedium?: 'organic' | 'social'
  footerText?: string
  hideRuntimeTitle?: boolean
  artworkTheme?: 'sunrise-hills'
}

export type PinterestPinBatch = {
  id: string
  title: string
  description: string
  campaignId: string
  outputDir: string
  pins: string[]
}

export const pinterestFirstWavePresets: readonly PinterestPinPreset[] = [
  {
    slug: 'amazing-grace',
    title: 'Amazing Grace',
    instrumentId: 'o12',
    instrumentLabel: '12-Hole Ocarina',
    tagLabel: 'Hymn Melody',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'compact',
    sheetScale: '16',
    sheetCropTop: 56,
    fitHeight: 1368,
    footerText: 'More songs and interactive fingering charts at www.playbyfingering.com',
    hideRuntimeTitle: false,
    artworkTheme: undefined
  },
  {
    slug: 'frere-jacques',
    title: 'Frere Jacques',
    instrumentId: 'r8b',
    instrumentLabel: 'Recorder (Baroque fingering)',
    tagLabel: 'French Nursery Rhyme',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'compact',
    sheetScale: '20',
    sheetCropTop: 54,
    sheetCropBottom: 0,
    fitHeight: 1180,
    footerText: 'More songs and interactive fingering charts at www.playbyfingering.com',
    hideRuntimeTitle: false,
    artworkTheme: undefined
  },
  {
    slug: 'twinkle-twinkle-little-star',
    title: 'Twinkle Twinkle Little Star',
    instrumentId: 'o12',
    instrumentLabel: '12-Hole Ocarina',
    tagLabel: 'Beginner Melody',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'compact',
    sheetScale: '18',
    sheetCropTop: 56,
    sheetCropBottom: 240,
    contentWidth: 760,
    fitHeight: 1220,
    footerText: 'More songs and interactive fingering charts at www.playbyfingering.com',
    hideRuntimeTitle: false,
    artworkTheme: undefined
  },
  {
    slug: 'one-summers-day',
    title: "One Summer's Day",
    instrumentId: 'o12',
    instrumentLabel: '12-Hole Ocarina',
    tagLabel: 'Ghibli Theme',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'mono',
    sheetScale: '12',
    sheetCropTop: 148
  },
  {
    slug: 'hes-a-pirate',
    title: "He's a Pirate",
    instrumentId: 'o12',
    instrumentLabel: '12-Hole Ocarina',
    tagLabel: 'Film Theme',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'compact',
    sheetScale: '28',
    sheetCropTop: 178,
    fitHeight: 0
  },
  {
    slug: 'path-of-the-wind',
    title: 'Path of the Wind',
    instrumentId: 'w6',
    instrumentLabel: 'Tin Whistle',
    tagLabel: 'Totoro Theme',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'compact',
    sheetScale: '12',
    sheetCropTop: 142,
    frameTopPadding: 24
  }
] as const

export const pinterestGrowthPinPresets: readonly PinterestPinPreset[] = [
  {
    id: 'old-macdonald-r8b',
    slug: 'old-macdonald',
    title: 'Old MacDonald Had a Farm',
    instrumentId: 'r8b',
    instrumentLabel: 'Recorder (Baroque fingering)',
    tagLabel: 'Nursery Rhyme',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'compact',
    sheetScale: '10',
    sheetCropTop: 56,
    fitHeight: 1280,
    boardName: 'Recorder Letter Notes',
    campaignId: 'third_wave',
    utmMedium: 'organic',
    pinTitle: 'Old MacDonald Had a Farm Recorder Letter Notes',
    pinDescription:
      'Play Old MacDonald Had a Farm with recorder letter notes, Baroque fingering support, and a visual chart on Play By Fingering.'
  },
  {
    id: 'red-river-valley-w6',
    slug: 'red-river-valley',
    title: 'Red River Valley',
    instrumentId: 'w6',
    instrumentLabel: 'Tin Whistle',
    tagLabel: 'Folk Song',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'compact',
    sheetScale: '11',
    sheetCropTop: 56,
    fitHeight: 1280,
    boardName: 'Tin Whistle Letter Notes',
    campaignId: 'third_wave',
    utmMedium: 'organic',
    pinTitle: 'Red River Valley Tin Whistle Letter Notes',
    pinDescription:
      'Play Red River Valley with tin whistle letter notes, fingering chart support, and a simple folk melody layout on Play By Fingering.'
  },
  {
    id: 'aura-lee-r8b',
    slug: 'aura-lee',
    title: 'Aura Lee',
    instrumentId: 'r8b',
    instrumentLabel: 'Recorder (Baroque fingering)',
    tagLabel: 'Folk Melody',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'compact',
    sheetScale: '9',
    sheetCropTop: 56,
    fitHeight: 1280,
    boardName: 'Recorder Letter Notes',
    campaignId: 'third_wave',
    utmMedium: 'organic',
    pinTitle: 'Aura Lee Recorder Letter Notes',
    pinDescription:
      'Play Aura Lee with recorder letter notes, Baroque fingering support, and a clean melody page on Play By Fingering.'
  },
  {
    id: 'greensleeves-r8b',
    slug: 'greensleeves',
    title: 'Greensleeves',
    instrumentId: 'r8b',
    instrumentLabel: 'Recorder (Baroque fingering)',
    tagLabel: 'Traditional Melody',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'compact',
    sheetScale: '7',
    sheetCropTop: 56,
    fitHeight: 1280,
    boardName: 'Recorder Letter Notes',
    campaignId: 'third_wave',
    utmMedium: 'organic',
    pinTitle: 'Greensleeves Recorder Letter Notes',
    pinDescription:
      'Play Greensleeves with recorder letter notes, Baroque fingering support, and optional numbered notes on Play By Fingering.'
  },
  {
    id: 'old-macdonald-w6',
    slug: 'old-macdonald',
    title: 'Old MacDonald Had a Farm',
    instrumentId: 'w6',
    instrumentLabel: 'Tin Whistle',
    tagLabel: 'Nursery Rhyme',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'compact',
    sheetScale: '10',
    sheetCropTop: 56,
    fitHeight: 1280,
    boardName: 'Tin Whistle Letter Notes',
    campaignId: 'third_wave',
    utmMedium: 'organic',
    pinTitle: 'Old MacDonald Had a Farm Tin Whistle Letter Notes',
    pinDescription:
      'Play Old MacDonald Had a Farm with tin whistle letter notes, a visual fingering chart, and a beginner-friendly melody page on Play By Fingering.'
  },
  {
    id: 'loch-lomond-r8b',
    slug: 'loch-lomond',
    title: 'Loch Lomond',
    instrumentId: 'r8b',
    instrumentLabel: 'Recorder (Baroque fingering)',
    tagLabel: 'Scottish Folk Song',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'compact',
    sheetScale: '11',
    sheetCropTop: 56,
    fitHeight: 1280,
    boardName: 'Recorder Letter Notes',
    campaignId: 'third_wave',
    utmMedium: 'organic',
    pinTitle: 'Loch Lomond Recorder Letter Notes',
    pinDescription:
      'Play Loch Lomond with recorder letter notes, Baroque fingering support, and a readable Scottish folk melody page on Play By Fingering.'
  },
  {
    id: 'scarborough-fair-r8b',
    slug: 'scarborough-fair',
    title: 'Scarborough Fair',
    instrumentId: 'r8b',
    instrumentLabel: 'Recorder (Baroque fingering)',
    tagLabel: 'Traditional Folk Song',
    noteLabelMode: 'letter',
    showMeasureNum: 'off',
    measureLayout: 'compact',
    sheetScale: '7',
    sheetCropTop: 56,
    fitHeight: 1280,
    boardName: 'Recorder Letter Notes',
    campaignId: 'third_wave',
    utmMedium: 'organic',
    pinTitle: 'Scarborough Fair Recorder Letter Notes',
    pinDescription:
      'Play Scarborough Fair with recorder letter notes, Baroque fingering support, and a clear traditional melody layout on Play By Fingering.'
  }
] as const

export const pinterestPinPresets: readonly PinterestPinPreset[] = [
  ...pinterestFirstWavePresets,
  ...pinterestGrowthPinPresets
] as const

export const pinterestPinBatches: readonly PinterestPinBatch[] = [
  {
    id: 'first-wave',
    title: 'Pinterest First Wave',
    description: 'Baseline internal Pinterest export batch for the first set of melody pins.',
    campaignId: 'pinterest-first-wave',
    outputDir: 'exports/pinterest/first-wave',
    pins: pinterestFirstWavePresets.map(preset => getPinterestPinPresetId(preset))
  },
  {
    id: 'third-wave',
    title: 'Pinterest Third Wave',
    description:
      'Recorder and tin whistle pins prepared for organic Pinterest distribution with stable UTM content ids.',
    campaignId: 'third_wave',
    outputDir: 'exports/pinterest/third-wave',
    pins: pinterestGrowthPinPresets.map(preset => getPinterestPinPresetId(preset))
  }
] as const

export function getPinterestPinPresetId(preset: PinterestPinPreset) {
  return preset.id ?? `${preset.slug}-${preset.instrumentId}`
}

export function getPinterestPinPresetById(id: string) {
  return pinterestPinPresets.find(preset => getPinterestPinPresetId(preset) === id) ?? null
}

export function getPinterestPinPreset(slug: string) {
  return pinterestPinPresets.find(preset => preset.slug === slug) ?? null
}

export function getPinterestPinBatch(id: string) {
  return pinterestPinBatches.find(batch => batch.id === id) ?? null
}

export function getPinterestPinBoardName(preset: PinterestPinPreset) {
  if (preset.boardName) {
    return preset.boardName
  }

  if (preset.instrumentId === 'r8b' || preset.instrumentId === 'r8g') {
    return 'Recorder Letter Notes'
  }

  if (preset.instrumentId === 'w6') {
    return 'Tin Whistle Letter Notes'
  }

  return 'Ocarina Letter Notes'
}

export function getPinterestPinDestinationUrl(preset: PinterestPinPreset) {
  const href = buildSongPageHref({
    songId: preset.slug,
    instrumentId: preset.instrumentId === 'o12' ? null : preset.instrumentId
  })

  return `${siteUrl}${href}`
}

export function getPinterestPinTrackingUrl(preset: PinterestPinPreset) {
  const url = new URL(getPinterestPinDestinationUrl(preset))
  url.searchParams.set('utm_source', 'pinterest')
  url.searchParams.set('utm_medium', preset.utmMedium ?? 'organic')
  url.searchParams.set('utm_campaign', preset.campaignId ?? 'pinterest-first-wave')
  url.searchParams.set('utm_content', `${preset.slug}-${preset.instrumentId}`)
  return url.toString()
}

export function getPinterestPinTitle(preset: PinterestPinPreset) {
  if (preset.pinTitle) {
    return preset.pinTitle
  }

  return `${preset.title} ${preset.instrumentLabel} Letter Notes`
}

export function getPinterestPinDescription(preset: PinterestPinPreset) {
  if (preset.pinDescription) {
    return preset.pinDescription
  }

  return `Play ${preset.title} with letter notes, fingering charts, and optional numbered notes on Play By Fingering.`
}

export function getPinterestPinFooterText(preset: PinterestPinPreset) {
  return (
    preset.footerText ??
    'More songs and interactive fingering charts at www.playbyfingering.com'
  )
}

export function shouldHidePinterestRuntimeTitle(preset: PinterestPinPreset) {
  return preset.hideRuntimeTitle ?? true
}
