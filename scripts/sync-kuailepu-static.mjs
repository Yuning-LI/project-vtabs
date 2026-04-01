import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const archivePath = path.join(
  repoRoot,
  'vendor',
  'kuailepu-runtime',
  'kuaiyuepu-runtime-archive.txt'
)
const vendorStaticRoot = path.join(repoRoot, 'vendor', 'kuailepu-static')
const outputRoot = path.join(repoRoot, 'public', 'k-static')
// runtime 模板还保留旧 i18n hash；这里优先复用线上实测仍可访问的压缩包，
// 这样既不需要改模板，也不会退回到归档里的膨胀版脚本。
const vendorAliasMap = new Map([
  ['cdn/js/i18n/all_09a443f1a6.js', 'cdn/js/i18n/all_2916f8e4dd.js']
])

function parseMarkedFiles(sourceText) {
  const marker = /^文件：(.+)$/gm
  const matches = Array.from(sourceText.matchAll(marker))
  const files = new Map()

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index]
    const next = matches[index + 1]
    const filename = current[1]?.trim()
    const start = current.index + current[0].length + 1
    const end = next?.index ?? sourceText.length

    if (!filename) {
      continue
    }

    files.set(filename, sourceText.slice(start, end).trim())
  }

  return files
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function copyFile(sourcePath, targetPath) {
  ensureDirectory(targetPath)
  fs.copyFileSync(sourcePath, targetPath)
}

function copyDirectory(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
    return false
  }

  fs.cpSync(sourcePath, targetPath, { recursive: true })
  return true
}

function writeTextFile(targetPath, value) {
  ensureDirectory(targetPath)
  fs.writeFileSync(targetPath, value, 'utf8')
}

function collectStaticAssetPaths(templateHtml) {
  const paths = new Set()
  const pattern = /(?:href|src)="\/static\/([^"]+)"/g

  for (const match of templateHtml.matchAll(pattern)) {
    if (match[1]) {
      paths.add(match[1])
    }
  }

  return Array.from(paths).sort()
}

function syncKuailepuStatic() {
  const archiveText = fs.readFileSync(archivePath, 'utf8')
  const fileMap = parseMarkedFiles(archiveText)
  const templateHtml = fileMap.get('qyiBa1mPa.html')

  if (!templateHtml) {
    throw new Error('Missing qyiBa1mPa.html in Kuailepu runtime archive')
  }

  const assetPaths = collectStaticAssetPaths(templateHtml)
  fs.rmSync(outputRoot, { recursive: true, force: true })

  // 先整棵复制 vendor 静态资源，确保 CSS 二次引用到的字体 / 图片也能一起带上，
  // 不会只覆盖 HTML 直引的 39 个入口文件。
  const copiedVendorTree = copyDirectory(vendorStaticRoot, outputRoot)

  let copied = 0
  let aliased = 0
  let extracted = 0

  for (const assetPath of assetPaths) {
    const vendorPath = path.join(vendorStaticRoot, assetPath)
    const targetPath = path.join(outputRoot, assetPath)

    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      copied += 1
      continue
    }

    const aliasPath = vendorAliasMap.get(assetPath)
    if (aliasPath) {
      const aliasTargetPath = path.join(outputRoot, aliasPath)
      if (fs.existsSync(aliasTargetPath) && fs.statSync(aliasTargetPath).isFile()) {
        copyFile(aliasTargetPath, targetPath)
        aliased += 1
        continue
      }
    }

    const archived = fileMap.get(path.basename(assetPath))
    if (archived !== undefined) {
      writeTextFile(targetPath, archived)
      extracted += 1
      continue
    }

    throw new Error(`Missing bundled Kuailepu static asset: ${assetPath}`)
  }

  console.log(
    `Synced Kuailepu static assets to public/k-static (${assetPaths.length} template assets verified: vendor tree ${copiedVendorTree ? 'copied' : 'missing'}, ${copied} matched, ${aliased} aliased, ${extracted} extracted)`
  )
}

syncKuailepuStatic()
