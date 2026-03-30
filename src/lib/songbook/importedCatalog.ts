import fs from 'node:fs'
import path from 'node:path'
import type { SongDoc } from './types'

const importedSongsDir = path.resolve(process.cwd(), 'data', 'kuailepu')

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
    .map(file => {
      const filePath = path.join(importedSongsDir, file)
      return JSON.parse(fs.readFileSync(filePath, 'utf8')) as SongDoc
    })
}

export const importedSongCatalog = loadImportedSongCatalog()
