import {
  buildPublicRuntimeLetterTrackData,
  buildPublicRuntimePackageData
} from '../publicRuntime.ts'
import { buildPublicRuntimeLetterTrackInput } from './assembly/publicRuntimeLetterTrackInput.ts'
import {
  applyPublicRuntimeSongLyricFallback,
  loadPublicRuntimeNotationSong
} from './payload/publicRuntimeSongData.ts'
import type {
  PublicRuntimePayload,
  PublicRuntimePublicFeature,
  PublicRuntimeState,
  PublicRuntimeTextMode
} from '../runtimeTypes.ts'
import type { PublicRuntimeVisualThemeName } from '../visual/publicRuntimeVisualTheme.ts'

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
  const runtimeNotationSong = loadPublicRuntimeNotationSong(input.songId)
  const runtimePayload = applyPublicRuntimeSongLyricFallback({
    payload: input.payload,
    song: runtimeNotationSong
  })
  const letterTrack = buildPublicRuntimeLetterTrackData(
    buildPublicRuntimeLetterTrackInput({
      song: runtimeNotationSong,
      payload: runtimePayload,
      state: input.state
    })
  )
  const runtimePackage = buildPublicRuntimePackageData({
    songId: input.songId,
    payload: runtimePayload,
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
