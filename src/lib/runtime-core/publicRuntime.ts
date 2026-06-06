import type {
  PublicLetterTrackData,
  PublicRuntimeAssetProfileName,
  PublicRuntimePayload,
  PublicRuntimePublicFeature,
  PublicRuntimeState,
  PublicRuntimeTextMode
} from './runtimeTypes.ts'
import {
  buildPublicLetterTrackData
} from './letterTrack/publicLetterTrack.ts'
import {
  applyRuntimeDefaults as applyPublicRuntimeDefaults,
  extractPayloadLyricText as extractPublicRuntimeLyricText,
  resolvePublicRuntimeState,
  shouldHideLyricTrackByDefault as shouldHidePublicRuntimeLyricTrackByDefault
} from './state/publicRuntimeState.ts'
import {
  buildPublicRuntimeHtmlDocument
} from './server/html/runtimeHtmlDocument.ts'
import {
  serializeForInlineScript as serializeRuntimeHtmlInlineValue
} from './server/html/runtimeHtmlScaffold.ts'
import {
  loadArchivedPublicRuntimePayload,
  localizePublicRuntimePayload
} from './server/payload/runtimePayload.ts'
import { buildPublicRuntimeBridgeScript } from './bridge/publicRuntimeBridge.ts'
import { getArchivedPublicRuntimeHtmlTemplate } from './server/template/runtimeTemplate.ts'

export function loadPublicRuntimeSongPayload(songId: string) {
  return loadArchivedPublicRuntimePayload(songId)
}

export function resolvePublicRuntimeContextState(
  payload: PublicRuntimePayload,
  state: PublicRuntimeState | null
) {
  return resolvePublicRuntimeState(payload, state)
}

export function hasPublicRuntimeLyricContent(
  payload: Pick<PublicRuntimePayload, 'lyric' | 'lyric_text'>
) {
  return extractPublicRuntimeLyricText(payload).trim().length > 0
}

export function hasPublicRuntimeLyricToggle(
  payload: Pick<PublicRuntimePayload, 'lyric' | 'lyric_text'>
) {
  return (
    hasPublicRuntimeLyricContent(payload) &&
    !shouldHidePublicRuntimeLyricTrackByDefault(payload)
  )
}

export function buildPublicRuntimeHtml(input: {
  songId: string
  payload: PublicRuntimePayload
  state?: PublicRuntimeState | null
  letterTrack?: PublicLetterTrackData | null
  textMode?: PublicRuntimeTextMode | null
  assetProfile?: PublicRuntimeAssetProfileName | null
  publicFeatures?: PublicRuntimePublicFeature[] | null
  preferredEnglishTitle?: string | null
  preferredEnglishSubtitle?: string | null
  compareMode?: boolean | null
}) {
  const { songId } = input
  const payload = applyPublicRuntimeDefaults(
    localizePublicRuntimePayload(input.payload, {
      mode: input.textMode ?? 'source',
      preferredTitle: input.preferredEnglishTitle ?? null,
      preferredSubtitle: input.preferredEnglishSubtitle ?? null
    }),
    input.state ?? null
  )
  const letterTrack = input.letterTrack ?? null
  const assetProfile = input.assetProfile ?? 'public-song'
  const publicFeatures = new Set(input.publicFeatures ?? [])
  const compareMode = Boolean(input.compareMode)
  const pageTitle = [payload.song_name, payload.alias_name].filter(Boolean).join(' - ') || songId
  const safePayload = serializeRuntimeHtmlInlineValue(payload)
  const template = getArchivedPublicRuntimeHtmlTemplate()
  const hasPendingLetterMask = !compareMode && Boolean(letterTrack) && letterTrack?.mode !== 'number'
  const bridgeScriptHtml = buildPublicRuntimeBridgeScript(
    songId,
    letterTrack,
    input.textMode ?? 'source',
    publicFeatures
  )

  return buildPublicRuntimeHtmlDocument({
    template,
    songId,
    payloadJson: safePayload,
    pageTitle,
    assetProfile,
    publicFeatures,
    compareMode,
    hasPendingLetterMask,
    bridgeScriptHtml
  })
}

export function buildPublicRuntimeLetterTrackData(input: {
  notation?: string[] | null
  rawNotation?: string | null
  key?: string | null
  mode?: string | null
  payload?: PublicRuntimePayload | null
  state?: PublicRuntimeState | null
}): PublicLetterTrackData {
  return buildPublicLetterTrackData(input)
}
