import fs from 'node:fs'
import path from 'node:path'

import { describePublicRuntimeArchiveCandidates } from '../../../kuailepu/archiveFiles.ts'
import { resolvePublicRuntimeTemplateArchivePath } from './publicRuntimeTemplateFiles.ts'

let cachedTemplateHtml: string | null = null
const PUBLIC_RUNTIME_HTML_TEMPLATE_ENTRY = 'qyiBa1mPa.html'
const ARCHIVE_FILE_MARKER_PATTERN = /^文件：(.+)$/gm

/**
 * 读取已授权集成的 public runtime 详情页 HTML 模板。
 *
 * 这一步仍然属于“服务端装配层”：
 * - 读取本地可部署模板包
 * - 从多文件拼接存档中抽出详情页 HTML
 * - 给上层 runtime HTML 组装逻辑继续做替换
 */
export function loadPublicRuntimeHtmlTemplate() {
  if (cachedTemplateHtml !== null) {
    return cachedTemplateHtml
  }

  const sourcePath = resolvePublicRuntimeTemplateArchivePath()
  if (!sourcePath) {
    throw new Error(
      `Missing deployable public runtime archive. Expected one of: ${describePublicRuntimeArchiveCandidates()}.`
    )
  }

  const sourceText = fs.readFileSync(sourcePath, 'utf8')
  const fileMap = parseMarkedFiles(sourceText)
  const html = fileMap.get(PUBLIC_RUNTIME_HTML_TEMPLATE_ENTRY)

  if (!html) {
    throw new Error(
      `Missing ${PUBLIC_RUNTIME_HTML_TEMPLATE_ENTRY} in ${path.relative(process.cwd(), sourcePath)}`
    )
  }

  cachedTemplateHtml = html
  return html
}

export const loadArchivedPublicRuntimeHtmlTemplate = loadPublicRuntimeHtmlTemplate

// Compatibility alias kept only for older imports that still use the previous getter-style public helper name.
export const getArchivedPublicRuntimeHtmlTemplate = loadPublicRuntimeHtmlTemplate

function parseMarkedFiles(sourceText: string) {
  const files = new Map<string, string>()
  const matches = Array.from(sourceText.matchAll(ARCHIVE_FILE_MARKER_PATTERN))

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index]
    const next = matches[index + 1]
    const filename = current[1]?.trim()
    const markerIndex = current.index
    if (!filename || markerIndex === undefined) {
      continue
    }
    const start = markerIndex + current[0].length + 1
    const end = next?.index ?? sourceText.length

    files.set(filename, sourceText.slice(start, end).trim())
  }

  return files
}
