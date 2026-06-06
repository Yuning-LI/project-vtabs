import {
  resolveKuailepuRuntimeSongPath,
  resolvePackedKuailepuRuntimeSongPath
} from '../../../kuailepu/sourceFiles.ts'

export function resolvePublicRuntimePayloadPath(songId: string) {
  return resolveKuailepuRuntimeSongPath(songId)
}

export function resolvePackedPublicRuntimePayloadPath(songId: string) {
  return resolvePackedKuailepuRuntimeSongPath(songId)
}
