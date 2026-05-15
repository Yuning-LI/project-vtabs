import fs from 'node:fs'
import path from 'node:path'
import type { SongDoc } from './types'

const importedSongsDir = path.resolve(process.cwd(), 'data', 'kuailepu')
const candidateSongsDir = path.resolve(
  process.cwd(),
  'reference',
  'song-publish-candidates',
  'songdocs'
)

export function resolveImportedSongDocPath(slug: string) {
  return path.join(importedSongsDir, `${slug}.json`)
}

export function loadImportedSongDoc(slug: string) {
  const filePath = resolveImportedSongDocPath(slug)
  if (!fs.existsSync(filePath)) {
    return null
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as SongDoc
}

export function resolveCandidateSongDocPath(slug: string) {
  return path.join(candidateSongsDir, `${slug}.json`)
}

export function loadCandidateSongDoc(slug: string) {
  const filePath = resolveCandidateSongDocPath(slug)
  if (!fs.existsSync(filePath)) {
    return null
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as SongDoc
}

export function loadImportedOrCandidateSongDoc(slug: string) {
  return loadImportedSongDoc(slug) ?? loadCandidateSongDoc(slug)
}

/**
 * 读取仓库内可提交的快乐谱轻量导入结果。
 *
 * 原始大 JSON 继续放在 reference/ 下做本地研究材料；
 * 真正允许接入站点的数据，只读取这里的精简 SongDoc JSON。
 */
export function loadImportedSongCatalog(): SongDoc[] {
  if (!fs.existsSync(importedSongsDir)) {
    return []
  }

  return fs
    .readdirSync(importedSongsDir)
    .filter(file => file.endsWith('.json'))
    .sort()
    .map(file => loadImportedSongDoc(file.replace(/\.json$/i, '')))
    .filter((song): song is SongDoc => Boolean(song))
}

export const importedSongCatalog = loadImportedSongCatalog()
