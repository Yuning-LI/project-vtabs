import type {
  PublicLetterTrackData,
  PublicRuntimeAssetProfileName,
  PublicRuntimePayload,
  PublicRuntimePublicFeature,
  PublicRuntimeState,
  PublicRuntimeTextMode,
  PublicRuntimeVisualTheme
} from './runtimeTypes.ts'
import {
  buildPublicRuntimeHtml as buildPublicRuntimeHtmlImpl,
  buildPublicRuntimeLetterTrackData as buildPublicRuntimeLetterTrackDataImpl,
  buildPublicRuntimePackageData as buildPublicRuntimePackageDataImpl,
  hasPublicRuntimeLyricContent as hasPublicRuntimeLyricContentImpl,
  hasPublicRuntimeLyricToggle as hasPublicRuntimeLyricToggleImpl,
  loadPublicRuntimeSongPayload as loadPublicRuntimeSongPayloadImpl,
  resolvePublicRuntimeContextState as resolvePublicRuntimeContextStateImpl
} from './server/assembly/publicRuntimeBuildInput.ts'
import type { PublicRuntimePackage } from './server/assembly/publicRuntimePackage.ts'
import type { PublicRuntimeVisualThemeName } from './visual/publicRuntimeVisualTheme.ts'

export function loadPublicRuntimeSongPayload(songId: string) {
  return loadPublicRuntimeSongPayloadImpl(songId)
}

export function resolvePublicRuntimeContextState(
  payload: PublicRuntimePayload,
  state: PublicRuntimeState | null
) {
  return resolvePublicRuntimeContextStateImpl(payload, state)
}

export function hasPublicRuntimeLyricContent(
  payload: Pick<PublicRuntimePayload, 'lyric' | 'lyric_text'>
) {
  return hasPublicRuntimeLyricContentImpl(payload)
}

export function hasPublicRuntimeLyricToggle(
  payload: Pick<PublicRuntimePayload, 'lyric' | 'lyric_text'>
) {
  return hasPublicRuntimeLyricToggleImpl(payload)
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
  visualThemeName?: PublicRuntimeVisualThemeName | null
  visualTheme?: PublicRuntimeVisualTheme | null
}) {
  return buildPublicRuntimeHtmlImpl(input)
}

export function buildPublicRuntimePackageData(input: {
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
}): PublicRuntimePackage {
  return buildPublicRuntimePackageDataImpl(input)
}

export function buildPublicRuntimeLetterTrackData(input: {
  notation?: string[] | null
  rawNotation?: string | null
  key?: string | null
  mode?: string | null
  payload?: PublicRuntimePayload | null
  state?: PublicRuntimeState | null
}): PublicLetterTrackData {
  return buildPublicRuntimeLetterTrackDataImpl(input)
}
