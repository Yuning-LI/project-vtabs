import type { PublicRuntimePayload } from '../../runtimeTypes.ts'
import {
  extractKuailepuEnglishText,
  getKuailepuEnglishTitle,
  translateKuailepuCommonText,
  translateKuailepuFingeringName,
  translateKuailepuGraphName,
  translateKuailepuInstrumentName,
  translateKuailepuPersonName
} from '../../../songbook/kuailepuEnglish.ts'

export function getPublicRuntimeEnglishTitle(
  payload: Pick<PublicRuntimePayload, 'song_uuid' | 'song_pinyin' | 'song_name' | 'alias_name'>
) {
  return getKuailepuEnglishTitle(payload)
}

export function translatePublicRuntimePersonName(value: string | null | undefined) {
  return translateKuailepuPersonName(value)
}

export function translatePublicRuntimeInstrumentName(value: string | null | undefined) {
  return translateKuailepuInstrumentName(value)
}

export function translatePublicRuntimeGraphName(value: string | null | undefined) {
  return translateKuailepuGraphName(value)
}

export function translatePublicRuntimeFingeringName(value: string | null | undefined) {
  return translateKuailepuFingeringName(value)
}

export function translatePublicRuntimeCommonText(value: string | null | undefined) {
  return translateKuailepuCommonText(value)
}

export function extractPublicRuntimeEnglishText(value: string | null | undefined) {
  return extractKuailepuEnglishText(value)
}
