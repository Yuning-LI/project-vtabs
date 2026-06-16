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
const syncProfile = resolveSyncProfile()
// runtime 模板还保留旧 i18n hash；这里优先使用线上实测仍可访问的压缩包，
// 这样既不需要改模板，也不会退回到模板包里的膨胀版脚本。
const vendorAliasMap = new Map([
  ['cdn/js/i18n/all_09a443f1a6.js', 'cdn/js/i18n/all_2916f8e4dd.js']
])

const publicSongDisabledScriptAssets = new Set([
  'lib/jqueryui/1.11.4/jquery-ui.min.js',
  'lib/materialize/0.97.5/js/materialize.min.js',
  'lib/soundmanager2/2.97a.20150601/script/soundmanager2-nodebug-jsmin.js',
  'lib/soundmanager2/2.97a.20150601/script/bar-ui.min.js',
  'lib/art-template/3.0.1/template.js',
  'lib/clipboard.js/1.5.12/clipboard.min.js',
  'cdn/js/i18n/all_2916f8e4dd.js',
  'cdn/js/microphone_7bba73959e.js',
  'cdn/js/chip_tag_4b7d8a0043.js',
  'cdn/js/chip_tag.song_f7c06ec607.js',
  'cdn/js/media_24bd4df64f.js',
  'cdn/js/user_favorite.kit_2cf017fc27.js',
  'cdn/js/diaohao_aab9dd0b9e.js',
  'cdn/js/cangqiang_f2fb865e71.js',
  'cdn/js/cangqiang.song_1ce5916de5.js'
])

const publicSongRequiredAssetPaths = new Set([
  'cdn/font/icomoon_2604a7eea6.eot',
  'cdn/font/icomoon_2b8bd54eb2.woff',
  'cdn/font/icomoon_0f6f41a9e9.ttf',
  'cdn/font/icomoon_c2acf66c3c.svg',
  'cdn/img/icon_arrowright_11d534cc7d.png'
])

function resolveSyncProfile() {
  const explicitProfile = process.env.KUAILEPU_STATIC_SYNC_PROFILE
  if (explicitProfile === 'full-template' || explicitProfile === 'public-song') {
    return explicitProfile
  }

  const lifecycleEvent = process.env.npm_lifecycle_event
  return lifecycleEvent === 'prebuild' || lifecycleEvent === 'prestart'
    ? 'public-song'
    : 'full-template'
}

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

function getPublicSongDeployAssetPaths(assetPaths) {
  const selected = new Set(
    assetPaths.filter(assetPath => !publicSongDisabledScriptAssets.has(resolveAssetAlias(assetPath)))
  )
  publicSongRequiredAssetPaths.forEach(assetPath => selected.add(assetPath))
  return Array.from(selected).sort()
}

function resolveAssetAlias(assetPath) {
  return vendorAliasMap.get(assetPath) ?? assetPath
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

  const selectedAssetPaths =
    syncProfile === 'public-song' ? getPublicSongDeployAssetPaths(assetPaths) : assetPaths
  const copiedVendorTree =
    syncProfile === 'full-template' ? copyDirectory(vendorStaticRoot, outputRoot) : false

  let copied = 0
  let aliased = 0
  let extracted = 0

  for (const assetPath of selectedAssetPaths) {
    const vendorPath = path.join(vendorStaticRoot, assetPath)
    const targetPath = path.join(outputRoot, assetPath)

    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      copied += 1
      continue
    }

    if (fs.existsSync(vendorPath) && fs.statSync(vendorPath).isFile()) {
      copyFile(vendorPath, targetPath)
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
    `Synced Kuailepu static assets to public/k-static (${syncProfile} profile: ${selectedAssetPaths.length}/${assetPaths.length} template assets selected, vendor tree ${copiedVendorTree ? 'synced' : 'filtered'}, ${copied} matched, ${aliased} aliased, ${extracted} extracted)`
  )
}

syncKuailepuStatic()
