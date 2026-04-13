import type { PublicSongInstrumentId } from './publicInstruments.ts'
import { buildSongPageHref } from './publicInstruments.ts'
import { siteUrl } from '../site.ts'

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
  fitHeight?: number
  boardName?: string
  pinTitle?: string
  pinDescription?: string
  campaignId?: string
}

export const pinterestFirstWavePresets: readonly PinterestPinPreset[] = [
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

export function getPinterestPinPreset(slug: string) {
  return pinterestFirstWavePresets.find(preset => preset.slug === slug) ?? null
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
  url.searchParams.set('utm_medium', 'social')
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
