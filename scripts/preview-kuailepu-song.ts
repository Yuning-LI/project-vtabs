import fs from 'node:fs'
import path from 'node:path'
import { buildKuailepuRenderablePreview } from '../src/lib/songbook/kuailepuImport.ts'

/**
 * 本地查看快乐谱 JSON 的导入预览。
 *
 * 用途：
 * - 不直接修改曲库
 * - 先确认原始 JSON 是否足够支撑当前项目接入
 * - 快速看到标题 / 拍号 / 歌词槽位 / 简化旋律骨架
 *
 * 用法：
 * node --experimental-strip-types --experimental-specifier-resolution=node scripts/preview-kuailepu-song.ts reference/songs/silent-night.json
 */
const inputPath = process.argv[2]

if (!inputPath) {
  console.error('Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/preview-kuailepu-song.ts <json-file>')
  process.exit(1)
}

const absolutePath = path.resolve(process.cwd(), inputPath)
const rawText = fs.readFileSync(absolutePath, 'utf8')
const payload = JSON.parse(rawText)
const preview = buildKuailepuRenderablePreview(payload)

console.log(JSON.stringify(preview, null, 2))
