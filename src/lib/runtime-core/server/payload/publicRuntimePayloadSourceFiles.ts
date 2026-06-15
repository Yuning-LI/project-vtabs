import fs from 'node:fs'
import path from 'node:path'

const trackedRuntimeSongsDir = path.resolve(process.cwd(), 'data', 'kuailepu-runtime')
const packedRuntimeSongsDir = path.resolve(process.cwd(), 'data', 'kuailepu-runtime-packed')
const localReferenceSongsDir = path.resolve(process.cwd(), 'reference', 'songs')
const localCandidateRuntimeSongsDir = path.resolve(
  process.cwd(),
  'reference',
  'song-publish-candidates',
  'runtime'
)
const localGreyCandidateRuntimeSongsDir = path.resolve(
  process.cwd(),
  'reference',
  'kuailepu-candidates',
  'runtime'
)

type RuntimeSongFileSuffix = '.json' | '.json.gz'

function resolveFirstExistingPath(candidates: readonly string[]) {
  return candidates.find(candidate => fs.existsSync(candidate)) ?? null
}

function getRuntimeSongFilePath(
  directory: string,
  songId: string,
  suffix: RuntimeSongFileSuffix = '.json'
) {
  return path.join(directory, `${songId}${suffix}`)
}

function getRuntimeSongReadCandidates(songId: string) {
  return [
    getRuntimeSongFilePath(trackedRuntimeSongsDir, songId),
    getRuntimeSongFilePath(localCandidateRuntimeSongsDir, songId),
    getRuntimeSongFilePath(localGreyCandidateRuntimeSongsDir, songId),
    getRuntimeSongFilePath(localReferenceSongsDir, songId)
  ]
}

function getRuntimeSongWriteCandidates(songId: string) {
  return {
    publicRuntimePath: getRuntimeSongFilePath(trackedRuntimeSongsDir, songId),
    candidateRuntimePath: getRuntimeSongFilePath(localCandidateRuntimeSongsDir, songId),
    greyCandidateRuntimePath: getRuntimeSongFilePath(localGreyCandidateRuntimeSongsDir, songId),
    referenceRuntimePath: getRuntimeSongFilePath(localReferenceSongsDir, songId)
  }
}

export function resolvePublicRuntimeSongPath(songId: string) {
  return resolveFirstExistingPath(getRuntimeSongReadCandidates(songId))
}

/**
 * Runtime payload write targets are not identical to read fallback order.
 *
 * For maintenance scripts that mutate `instrumentFingerings` or other runtime-facing fields:
 *
 * - prefer the deployable public runtime JSON when it exists
 * - also keep the local candidate runtime in sync when it exists
 * - only fall back to `reference/songs` when neither public nor candidate runtime exists
 *
 * This avoids a broken state where a post-generation optimizer rewrites only the old
 * `reference/songs` fallback while the later publish/promote path still copies an unoptimized
 * candidate runtime into `data/kuailepu-runtime`.
 */
export function resolvePublicRuntimeWriteTargets(songId: string) {
  const {
    publicRuntimePath,
    candidateRuntimePath,
    greyCandidateRuntimePath,
    referenceRuntimePath
  } = getRuntimeSongWriteCandidates(songId)

  const targets = [publicRuntimePath, candidateRuntimePath, greyCandidateRuntimePath].filter(candidate =>
    fs.existsSync(candidate)
  )
  if (targets.length > 0) {
    return targets
  }

  return fs.existsSync(referenceRuntimePath) ? [referenceRuntimePath] : []
}

export function resolvePublicRuntimeMutationSourcePath(songId: string) {
  const {
    publicRuntimePath,
    candidateRuntimePath,
    greyCandidateRuntimePath,
    referenceRuntimePath
  } = getRuntimeSongWriteCandidates(songId)

  return resolveFirstExistingPath([
    publicRuntimePath,
    candidateRuntimePath,
    greyCandidateRuntimePath,
    referenceRuntimePath
  ])
}

export function resolvePackedPublicRuntimeSongPath(songId: string) {
  return resolveFirstExistingPath([
    getRuntimeSongFilePath(packedRuntimeSongsDir, songId, '.json.gz')
  ])
}

export function listPublicRuntimeSongFiles() {
  const runtimeSongsDir = resolveFirstExistingPath([
    trackedRuntimeSongsDir,
    localGreyCandidateRuntimeSongsDir,
    localReferenceSongsDir
  ])

  if (!runtimeSongsDir) {
    return []
  }

  return fs
    .readdirSync(runtimeSongsDir)
    .filter(file => file.endsWith('.json'))
    .sort()
}

export function getPublicRuntimeSongSourceLabel(songId: string) {
  const filePath = resolvePublicRuntimeSongPath(songId)
  if (!filePath) {
    return null
  }

  return path.relative(process.cwd(), filePath)
}
