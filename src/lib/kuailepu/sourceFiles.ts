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

function resolveFirstExistingPath(candidates: string[]) {
  return candidates.find(candidate => fs.existsSync(candidate)) ?? null
}

export function resolveKuailepuRuntimeSongPath(songId: string) {
  return resolveFirstExistingPath([
    path.join(trackedRuntimeSongsDir, `${songId}.json`),
    path.join(localReferenceSongsDir, `${songId}.json`),
    path.join(localCandidateRuntimeSongsDir, `${songId}.json`)
  ])
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
export function resolveKuailepuRuntimeWriteTargets(songId: string) {
  const publicRuntimePath = path.join(trackedRuntimeSongsDir, `${songId}.json`)
  const candidateRuntimePath = path.join(localCandidateRuntimeSongsDir, `${songId}.json`)
  const referenceRuntimePath = path.join(localReferenceSongsDir, `${songId}.json`)

  const targets = [publicRuntimePath, candidateRuntimePath].filter(candidate => fs.existsSync(candidate))
  if (targets.length > 0) {
    return targets
  }

  return fs.existsSync(referenceRuntimePath) ? [referenceRuntimePath] : []
}

export function resolvePackedKuailepuRuntimeSongPath(songId: string) {
  return resolveFirstExistingPath([
    path.join(packedRuntimeSongsDir, `${songId}.json.gz`)
  ])
}

export function listKuailepuRuntimeSongFiles() {
  const runtimeSongsDir = resolveFirstExistingPath([
    trackedRuntimeSongsDir,
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

export function getKuailepuRuntimeSongSourceLabel(songId: string) {
  const filePath = resolveKuailepuRuntimeSongPath(songId)
  if (!filePath) {
    return null
  }

  return path.relative(process.cwd(), filePath)
}
