import fs from 'node:fs'
import path from 'node:path'

const trackedRuntimeSongsDir = path.resolve(process.cwd(), 'data', 'kuailepu-runtime')
const localReferenceSongsDir = path.resolve(process.cwd(), 'reference', 'songs')

function resolveFirstExistingPath(candidates: string[]) {
  return candidates.find(candidate => fs.existsSync(candidate)) ?? null
}

export function resolveKuailepuRuntimeSongPath(songId: string) {
  return resolveFirstExistingPath([
    path.join(trackedRuntimeSongsDir, `${songId}.json`),
    path.join(localReferenceSongsDir, `${songId}.json`)
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
