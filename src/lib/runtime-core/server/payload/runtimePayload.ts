import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'

import type {
  KuailepuRuntimePayload,
  KuailepuRuntimeTextMode
} from '../../../kuailepu/runtimeTypes.ts'
import {
  extractKuailepuEnglishText,
  getKuailepuEnglishTitle,
  translateKuailepuCommonText,
  translateKuailepuFingeringName,
  translateKuailepuGraphName,
  translateKuailepuInstrumentName,
  translateKuailepuPersonName
} from '../../../songbook/kuailepuEnglish.ts'
import {
  resolveKuailepuRuntimeSongPath,
  resolvePackedKuailepuRuntimeSongPath
} from '../../../kuailepu/sourceFiles.ts'

export function loadArchivedKuailepuSongPayload(songId: string) {
  const packedFilePath = resolvePackedKuailepuRuntimeSongPath(songId)
  const filePath = resolveKuailepuRuntimeSongPath(songId)
  if (filePath && fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as KuailepuRuntimePayload
  }

  if (process.env.NODE_ENV === 'production' && packedFilePath && fs.existsSync(packedFilePath)) {
    return JSON.parse(
      gunzipSync(fs.readFileSync(packedFilePath)).toString('utf8')
    ) as KuailepuRuntimePayload
  }

  return null
}

export function localizeArchivedRuntimePayload(
  payload: KuailepuRuntimePayload,
  options: {
    mode: KuailepuRuntimeTextMode
    preferredTitle?: string | null
    preferredSubtitle?: string | null
  }
) {
  const sourceSanitized: KuailepuRuntimePayload = {
    ...payload,
    music_composer: sanitizeSourceRuntimePersonField(payload.music_composer),
    lyric_composer: sanitizeSourceRuntimePersonField(payload.lyric_composer),
    composer: sanitizeSourceRuntimePersonField(payload.composer),
    lyricist: sanitizeSourceRuntimePersonField(payload.lyricist),
    arranger: sanitizeSourceRuntimePersonField(payload.arranger),
    player: sanitizeSourceRuntimePersonField(payload.player),
    author: sanitizeSourceRuntimePersonField(payload.author)
  }

  if (options.mode !== 'english') {
    return sourceSanitized
  }

  const englishTitle = getKuailepuEnglishTitle(sourceSanitized)
  const localized: KuailepuRuntimePayload = {
    ...sourceSanitized,
    song_name:
      options.preferredTitle?.trim() ||
      englishTitle.title?.trim() ||
      sourceSanitized.song_name,
    alias_name:
      normalizeLocalizedText(
        options.preferredSubtitle ??
          englishTitle.subtitle ??
          translateNonLatinText(sourceSanitized.alias_name)
      ) ?? '',
    title:
      normalizeLocalizedText(
        options.preferredTitle ??
          englishTitle.title ??
          translateNonLatinText(sourceSanitized.title)
      ) ?? sourceSanitized.title,
    subtitle:
      normalizeLocalizedText(
        options.preferredSubtitle ??
          englishTitle.subtitle ??
          translateNonLatinText(sourceSanitized.subtitle)
      ) ?? '',
    music_composer: normalizeRuntimePersonField(sourceSanitized.music_composer),
    lyric_composer: normalizeRuntimePersonField(sourceSanitized.lyric_composer),
    composer: normalizeRuntimePersonField(sourceSanitized.composer),
    lyricist: normalizeRuntimePersonField(sourceSanitized.lyricist),
    arranger: normalizeRuntimePersonField(sourceSanitized.arranger),
    player: normalizeRuntimePersonField(sourceSanitized.player),
    author: normalizeRuntimePersonField(sourceSanitized.author),
    nickname: normalizeLocalizedText(translateKuailepuPersonName(sourceSanitized.nickname)) ?? undefined
  }

  localized.instrumentFingerings = sourceSanitized.instrumentFingerings?.map(option => ({
    ...option,
    instrumentName:
      normalizeLocalizedText(
        translateKuailepuInstrumentName(sanitizeInstrumentLabel(option.instrumentName))
      ) ?? option.instrumentName,
    fingeringsList: option.fingeringsList?.map(group =>
      group.map(item => ({
        ...item,
        fingeringName:
          normalizeLocalizedText(translateKuailepuFingeringName(item.fingeringName)) ??
          item.fingeringName
      }))
    ),
    fingeringSetList: option.fingeringSetList?.map(group =>
      group.map(item => ({
        ...item,
        fingeringName:
          normalizeLocalizedText(translateKuailepuFingeringName(item.fingeringName)) ??
          item.fingeringName
      }))
    ),
    graphList: option.graphList?.map(item => ({
      ...item,
      name:
        normalizeLocalizedText(
          translateKuailepuGraphName(item.name?.replace(/\s+/g, '') ?? item.name)
        ) ?? item.name
    }))
  }))

  return localized
}

function sanitizeInstrumentLabel(value: string | null | undefined) {
  if (!value) {
    return value
  }

  return value.replace(/[（）()]/g, '').replace(/\s+/g, '')
}

function translateNonLatinText(value: string | null | undefined) {
  if (!value) {
    return value ?? null
  }

  const extractedEnglish = extractKuailepuEnglishText(value)
  if (extractedEnglish && /[A-Za-z]/.test(extractedEnglish)) {
    return extractedEnglish
  }

  const translatedCommonText = translateKuailepuCommonText(value)
  if (translatedCommonText) {
    return translatedCommonText
  }

  const translatedPersonName = translateKuailepuPersonName(value)
  if (translatedPersonName && /[A-Za-z]/.test(translatedPersonName)) {
    return translatedPersonName
  }

  return null
}

function normalizeLocalizedText(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const text = normalizeLocalizedPunctuation(value)
  if (!text) {
    return null
  }

  if (/^(unknown|unk|n\/a|na|none|null|nil|undefined|anonymous)$/i.test(text)) {
    return null
  }

  return /[\u3400-\u9fff]/.test(text) && !/[A-Za-z]/.test(text) ? null : text
}

function normalizeRuntimePersonField(value: string | null | undefined) {
  const text = normalizeLocalizedText(translateKuailepuPersonName(value))
  if (!text) {
    return undefined
  }

  return isGenericRuntimePersonLabel(text) ? undefined : text
}

function sanitizeSourceRuntimePersonField(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return undefined
  }

  const text = normalizeLocalizedPunctuation(value).trim()
  if (!text) {
    return undefined
  }

  return isGenericRuntimePersonLabel(text) ? undefined : text
}

function isGenericRuntimePersonLabel(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[()[\]{}"'.;,!?/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) {
    return true
  }

  if (
    normalized === 'traditional' ||
    normalized === 'traditionnel' ||
    normalized === 'traditional english' ||
    normalized === 'anonymous' ||
    normalized === 'folk song' ||
    normalized === 'spiritual'
  ) {
    return true
  }

  if (normalized.startsWith('traditional ')) {
    return true
  }

  if (normalized.startsWith('traditionnel ')) {
    return true
  }

  return /(?:folk song|nursery rhyme|spiritual|carol|hymn|tune|air|ballad|melody)$/.test(normalized)
}

function normalizeLocalizedPunctuation(value: string) {
  return value
    .replace(/\u3000/g, ' ')
    .replace(/[，、]/g, ', ')
    .replace(/；/g, '; ')
    .replace(/：/g, ': ')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/！/g, '!')
    .replace(/？/g, '?')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .replace(/\s+([)\]}])/g, '$1')
    .replace(/([,.;:!?])(?=[A-Za-z0-9(])/g, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
