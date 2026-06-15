/**
 * Compatibility facade for historical `Kuailepu*` source-file helpers.
 *
 * New runtime payload source resolution belongs in
 * `src/lib/runtime-core/server/payload/publicRuntimePayloadSourceFiles.ts`.
 */
export {
  getPublicRuntimeSongSourceLabel,
  getPublicRuntimeSongSourceLabel as getKuailepuRuntimeSongSourceLabel,
  listPublicRuntimeSongFiles,
  listPublicRuntimeSongFiles as listKuailepuRuntimeSongFiles,
  resolvePackedPublicRuntimeSongPath,
  resolvePackedPublicRuntimeSongPath as resolvePackedKuailepuRuntimeSongPath,
  resolvePublicRuntimeMutationSourcePath,
  resolvePublicRuntimeMutationSourcePath as resolveKuailepuRuntimeMutationSourcePath,
  resolvePublicRuntimeSongPath,
  resolvePublicRuntimeSongPath as resolveKuailepuRuntimeSongPath,
  resolvePublicRuntimeWriteTargets,
  resolvePublicRuntimeWriteTargets as resolveKuailepuRuntimeWriteTargets
} from '../runtime-core/server/payload/publicRuntimePayloadSourceFiles.ts'
