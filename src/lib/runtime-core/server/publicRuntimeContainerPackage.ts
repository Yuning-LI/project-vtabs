import {
  buildPublicRuntimeLetterTrackData,
  buildPublicRuntimePackageData
} from '../publicRuntime.ts'
import type {
  PublicRuntimePayload,
  PublicRuntimePublicFeature,
  PublicRuntimeState,
  PublicRuntimeTextMode
} from '../runtimeTypes.ts'
import type { PublicRuntimeVisualThemeName } from '../visual/publicRuntimeVisualTheme.ts'
import { songCatalogBySlug } from '@/lib/songbook/catalog'
import { loadImportedOrCandidateSongDoc } from '@/lib/songbook/importedCatalog'

export type PublicRuntimeContainerPackageData = {
  bodyHtml: string
  styles: Array<{
    src: string
  }>
  scriptEntries: ReturnType<typeof buildPublicRuntimePackageData>['scriptEntries']
}

export function buildPublicRuntimeContainerPackage(input: {
  songId: string
  payload: PublicRuntimePayload
  state: PublicRuntimeState
  preferredEnglishTitle: string | null
  preferredEnglishSubtitle?: string | null
  textMode?: PublicRuntimeTextMode
  publicFeatures?: PublicRuntimePublicFeature[]
  visualThemeName?: PublicRuntimeVisualThemeName | null
}): PublicRuntimeContainerPackageData {
  const runtimeNotationSong =
    songCatalogBySlug[input.songId] ?? loadImportedOrCandidateSongDoc(input.songId)
  const letterTrack = buildPublicRuntimeLetterTrackData({
    notation: runtimeNotationSong?.notation,
    rawNotation: typeof input.payload.notation === 'string' ? input.payload.notation : null,
    key: runtimeNotationSong?.meta?.key,
    mode: input.state.note_label_mode,
    payload: input.payload,
    state: input.state
  })
  const runtimePackage = buildPublicRuntimePackageData({
    songId: input.songId,
    payload: input.payload,
    state: input.state,
    letterTrack,
    textMode: input.textMode ?? 'english',
    assetProfile: 'full-template',
    publicFeatures: input.publicFeatures ?? [],
    preferredEnglishTitle: input.preferredEnglishTitle,
    preferredEnglishSubtitle: input.preferredEnglishSubtitle ?? null,
    visualThemeName: input.visualThemeName ?? 'classic'
  })

  return {
    bodyHtml: runtimePackage.bodyHtml,
    styles: runtimePackage.styles,
    scriptEntries: runtimePackage.scriptEntries
  }
}
