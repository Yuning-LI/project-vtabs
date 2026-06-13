import type {
  PublicLetterTrackData,
  PublicRuntimeAssetProfileName,
  PublicRuntimePayload,
  PublicRuntimePublicFeature,
  PublicRuntimeState,
  PublicRuntimeTextMode,
  PublicRuntimeVisualTheme
} from '../../runtimeTypes.ts'
import {
  buildPublicLetterTrackData
} from '../../letterTrack/publicLetterTrack.ts'
import {
  applyRuntimeDefaults as applyPublicRuntimeDefaults,
  extractPayloadLyricText as extractPublicRuntimeLyricText,
  resolvePublicRuntimeState,
  shouldHideLyricTrackByDefault as shouldHidePublicRuntimeLyricTrackByDefault
} from '../../state/publicRuntimeState.ts'
import {
  serializeForInlineScript as serializeRuntimeHtmlInlineValue
} from '../html/runtimeHtmlScaffold.ts'
import {
  buildPublicRuntimePackage,
  type PublicRuntimePackage
} from './publicRuntimePackage.ts'
import {
  loadPublicRuntimePayloadArchive,
  localizePublicRuntimePayloadArchive
} from '../payload/runtimePayload.ts'
import { buildPublicRuntimeBridgeScript } from '../../bridge/publicRuntimeBridge.ts'
import { loadArchivedPublicRuntimeHtmlTemplate } from '../template/runtimeTemplate.ts'
import {
  type PublicRuntimeVisualThemeName,
  resolvePublicRuntimeVisualTheme
} from '../../visual/publicRuntimeVisualTheme.ts'

export type PublicRuntimeBuildInput = {
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
  visualThemeName?: PublicRuntimeVisualThemeName | null
  visualTheme?: PublicRuntimeVisualTheme | null
}

export type PublicRuntimeLetterTrackInput = {
  notation?: string[] | null
  rawNotation?: string | null
  key?: string | null
  mode?: string | null
  payload?: PublicRuntimePayload | null
  state?: PublicRuntimeState | null
}

export function loadPublicRuntimeSongPayload(songId: string) {
  return loadPublicRuntimePayloadArchive(songId)
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

export function buildPublicRuntimeHtml(input: PublicRuntimeBuildInput) {
  return buildPublicRuntimePackageData(input).html
}

export function buildPublicRuntimePackageData(input: PublicRuntimeBuildInput): PublicRuntimePackage {
  const { songId } = input
  const payload = applyPublicRuntimeDefaults(
    localizePublicRuntimePayloadArchive(input.payload, {
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
  const visualTheme = resolvePublicRuntimeVisualTheme({
    compareMode,
    themeName: input.visualThemeName ?? null,
    theme: input.visualTheme ?? null
  })
  const pageTitle = [payload.song_name, payload.alias_name].filter(Boolean).join(' - ') || songId
  const safePayload = serializeRuntimeHtmlInlineValue(payload)
  const template = loadArchivedPublicRuntimeHtmlTemplate()
  const hasPendingLetterMask = !compareMode && Boolean(letterTrack) && letterTrack?.mode !== 'number'
  const bridgeScriptHtml = buildPublicRuntimeBridgeScript(
    songId,
    letterTrack,
    input.textMode ?? 'source',
    publicFeatures,
    visualTheme
  )

  return buildPublicRuntimePackage({
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

export function buildPublicRuntimeLetterTrackData(
  input: PublicRuntimeLetterTrackInput
): PublicLetterTrackData {
  return buildPublicLetterTrackData(input)
}
