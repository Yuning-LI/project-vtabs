import fs from 'node:fs'
import path from 'node:path'

import { resolveKuailepuRuntimeArchivePath } from '../../../kuailepu/archiveFiles.ts'

let cachedTemplateHtml: string | null = null

/**
 * 读取归档下来的快乐谱详情页 HTML 模板。
 *
 * 这一步仍然属于“服务端装配层”：
 * - 读取本地归档
 * - 从多文件拼接存档中抽出详情页 HTML
 * - 给上层 runtime HTML 组装逻辑继续做替换
 */
export function getArchivedPublicRuntimeHtmlTemplate() {
  if (cachedTemplateHtml) {
    return cachedTemplateHtml
  }

  const sourcePath = resolveKuailepuRuntimeArchivePath()
  if (!sourcePath) {
    throw new Error(
      'Missing deployable Kuailepu runtime archive. Expected vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt or local reference fallback.'
    )
  }

  const sourceText = fs.readFileSync(sourcePath, 'utf8')
  const fileMap = parseMarkedFiles(sourceText)
  const html = fileMap.get('qyiBa1mPa.html')

  if (!html) {
    throw new Error(`Missing qyiBa1mPa.html in ${path.relative(process.cwd(), sourcePath)}`)
  }

  cachedTemplateHtml = html
  return html
}

export const getArchivedKuailepuRuntimeHtmlTemplate = getArchivedPublicRuntimeHtmlTemplate

function parseMarkedFiles(sourceText: string) {
  const marker = /^文件：(.+)$/gm
  const files = new Map<string, string>()
  const matches = Array.from(sourceText.matchAll(marker))

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index]
    const next = matches[index + 1]
    const filename = current[1]?.trim()
    const start = current.index! + current[0].length + 1
    const end = next?.index ?? sourceText.length

    if (!filename) continue
    files.set(filename, sourceText.slice(start, end).trim())
  }

  return files
}
