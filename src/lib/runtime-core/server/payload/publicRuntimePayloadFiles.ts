import {
  resolvePackedPublicRuntimeSongPath,
  resolvePublicRuntimeSongPath
} from './publicRuntimePayloadSourceFiles.ts'

export function resolvePublicRuntimePayloadPath(songId: string) {
  return resolvePublicRuntimeSongPath(songId)
}

export function resolvePackedPublicRuntimePayloadPath(songId: string) {
  return resolvePackedPublicRuntimeSongPath(songId)
}
