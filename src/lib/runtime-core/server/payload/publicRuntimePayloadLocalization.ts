import type { PublicRuntimePayload } from '../../runtimeTypes.ts'
import {
  extractKuailepuEnglishText as extractArchivedRuntimeEnglishText,
  getKuailepuEnglishTitle as getArchivedRuntimeEnglishTitle,
  translateKuailepuCommonText as translateArchivedRuntimeCommonText,
  translateKuailepuFingeringName as translateArchivedRuntimeFingeringName,
  translateKuailepuGraphName as translateArchivedRuntimeGraphName,
  translateKuailepuInstrumentName as translateArchivedRuntimeInstrumentName,
  translateKuailepuPersonName as translateArchivedRuntimePersonName
} from '../../../songbook/kuailepuEnglish.ts'

export function getPublicRuntimeEnglishTitle(
  payload: Pick<PublicRuntimePayload, 'song_uuid' | 'song_pinyin' | 'song_name' | 'alias_name'>
) {
  return getArchivedRuntimeEnglishTitle(payload)
}

export function translatePublicRuntimePersonName(value: string | null | undefined) {
  return translateArchivedRuntimePersonName(value)
}

export function translatePublicRuntimeInstrumentName(value: string | null | undefined) {
  return translateArchivedRuntimeInstrumentName(value)
}

export function translatePublicRuntimeGraphName(value: string | null | undefined) {
  return translateArchivedRuntimeGraphName(value)
}

export function translatePublicRuntimeFingeringName(value: string | null | undefined) {
  return translateArchivedRuntimeFingeringName(value)
}

export function translatePublicRuntimeCommonText(value: string | null | undefined) {
  return translateArchivedRuntimeCommonText(value)
}

export function extractPublicRuntimeEnglishText(value: string | null | undefined) {
  return extractArchivedRuntimeEnglishText(value)
}
