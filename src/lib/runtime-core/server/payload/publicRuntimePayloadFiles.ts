import {
  resolveKuailepuRuntimeSongPath as resolveArchivedRuntimePayloadPath,
  resolvePackedKuailepuRuntimeSongPath as resolvePackedArchivedRuntimePayloadPath
} from '../../../kuailepu/sourceFiles.ts'

export function resolvePublicRuntimePayloadPath(songId: string) {
  return resolveArchivedRuntimePayloadPath(songId)
}

export function resolvePackedPublicRuntimePayloadPath(songId: string) {
  return resolvePackedArchivedRuntimePayloadPath(songId)
}
