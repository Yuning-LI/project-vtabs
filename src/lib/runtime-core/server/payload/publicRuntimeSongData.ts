import type { PublicRuntimePayload } from '../../runtimeTypes.ts'
import { songCatalogBySlug } from '@/lib/songbook/catalog'
import { loadImportedOrCandidateSongDoc } from '@/lib/songbook/importedCatalog'

export function loadPublicRuntimeNotationSong(songId: string) {
  return songCatalogBySlug[songId] ?? loadImportedOrCandidateSongDoc(songId)
}

export function applyPublicRuntimeSongLyricFallback(input: {
  payload: PublicRuntimePayload
  song: ReturnType<typeof loadPublicRuntimeNotationSong> | null | undefined
}): PublicRuntimePayload {
  const lyrics = input.song?.alignedLyrics ?? input.song?.lyrics ?? null
  if (!lyrics || lyrics.length === 0) {
    return input.payload
  }

  const hasRuntimeLyric =
    typeof input.payload.lyric === 'string'
      ? input.payload.lyric.trim().length > 0
      : input.payload.lyric !== null && input.payload.lyric !== undefined
  const hasRuntimeLyricText =
    typeof input.payload.lyric_text === 'string'
      ? input.payload.lyric_text.trim().length > 0
      : input.payload.lyric_text !== null && input.payload.lyric_text !== undefined

  if (hasRuntimeLyric && hasRuntimeLyricText) {
    return input.payload
  }

  return {
    ...input.payload,
    lyric: hasRuntimeLyric ? input.payload.lyric : JSON.stringify(lyrics),
    lyric_text: hasRuntimeLyricText ? input.payload.lyric_text : lyrics.join('\n')
  }
}
