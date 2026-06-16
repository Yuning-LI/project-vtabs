import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { resolveKuailepuRuntimeArchivePath } from './archiveFiles'

type RuntimeStaticAsset = {
  body: BodyInit
  headers: Headers
}

const PUBLIC_RUNTIME_STATIC_VENDOR_ROOT = path.resolve(
  process.cwd(),
  'vendor',
  'kuailepu-static'
)

const PUBLIC_RUNTIME_REMOTE_STATIC_ORIGIN = 'https://www.kuaiyuepu.com/static'
const PUBLIC_RUNTIME_REMOTE_STATIC_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const PUBLIC_RUNTIME_REMOTE_FALLBACK_ENV = 'PUBLIC_RUNTIME_ALLOW_REMOTE_STATIC_FALLBACK'
const LEGACY_RUNTIME_REMOTE_FALLBACK_ENV = 'KUAILEPU_ALLOW_REMOTE_STATIC_FALLBACK'
const PUBLIC_RUNTIME_IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable'
const PUBLIC_RUNTIME_REMOTE_CACHE_CONTROL = 'public, max-age=3600'
const RUNTIME_ARCHIVE_ENTRY_PATTERN = /^文件：(.+)$/gm
const RUNTIME_ARCHIVE_TEMPLATE_ENTRY = 'qyiBa1mPa.html'

const RUNTIME_STATIC_CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
}

/**
 * 浏览器直接从 `localhost` 页面去加载授权 runtime 原站静态资源
 * 的大量 JS/CSS 时，在当前 runtime 宿主场景下容易被 ORB / 资源策略拦掉。
 *
 * 所以这里做了一个“同源静态资源代理”：
 * - 浏览器只请求我们自己的 `/k-static/...` 或 `/static/...`
 * - 服务端优先读取仓库内已提交资源与 runtime 模板包
 * - 最后才在显式允许时回源授权 runtime 原站静态资源
 *
 * 这样浏览器看到的是“同源资源”，授权 runtime 原始脚本链就能完整跑起来。
 */
export async function proxyPublicRuntimeStaticAsset(asset: readonly string[]) {
  const assetPath = normalizeRuntimeStaticAssetPath(asset)
  if (!assetPath) {
    return new NextResponse('Not found', { status: 404 })
  }

  const localAsset = loadBundledPublicRuntimeStaticAsset(assetPath)
  if (localAsset) {
    return new NextResponse(localAsset.body, {
      headers: localAsset.headers
    })
  }

  if (!isRemoteStaticFallbackEnabled()) {
    return new NextResponse(`Missing bundled public runtime static asset: ${assetPath}`, {
      status: 404
    })
  }

  const targetUrl = buildRemoteStaticAssetUrl(assetPath)
  let upstream: Response
  try {
    upstream = await fetch(targetUrl, {
      headers: {
        'user-agent': PUBLIC_RUNTIME_REMOTE_STATIC_USER_AGENT
      },
      cache: 'no-store'
    })
  } catch (error) {
    return new NextResponse(
      `Upstream asset fetch failed for ${assetPath}: ${error instanceof Error ? error.message : String(error)}`,
      { status: 502 }
    )
  }

  if (!upstream.ok) {
    return new NextResponse(`Upstream asset error: ${upstream.status}`, {
      status: upstream.status
    })
  }

  const headers = new Headers()
  const contentType = upstream.headers.get('content-type')
  if (contentType) {
    headers.set('content-type', contentType)
  }
  // 这里不做长期缓存，只给一个短期浏览器缓存，避免调试期反复请求过慢。
  headers.set('cache-control', PUBLIC_RUNTIME_REMOTE_CACHE_CONTROL)
  headers.set('access-control-allow-origin', '*')

  return new NextResponse(await upstream.arrayBuffer(), {
    headers
  })
}

export const proxyKuailepuStaticAsset = proxyPublicRuntimeStaticAsset

let archivedStaticAssets: Map<string, string> | null = null

function normalizeRuntimeStaticAssetPath(asset: readonly string[]) {
  const assetPath = path.posix
    .normalize(asset.join('/').replace(/\\/g, '/'))
    .replace(/^\/+/, '')

  if (
    !assetPath ||
    assetPath === '.' ||
    assetPath === '..' ||
    assetPath.startsWith('../') ||
    assetPath.includes('\0')
  ) {
    return ''
  }

  return assetPath
}

function loadBundledPublicRuntimeStaticAsset(assetPath: string): RuntimeStaticAsset | null {
  const vendorPath = path.resolve(PUBLIC_RUNTIME_STATIC_VENDOR_ROOT, assetPath)
  if (isPathInside(PUBLIC_RUNTIME_STATIC_VENDOR_ROOT, vendorPath)) {
    const vendorAsset = readLocalStaticAsset(vendorPath)
    if (vendorAsset) {
      return vendorAsset
    }
  }

  const archived = getArchivedStaticAssets().get(getRuntimeArchiveAssetKey(assetPath))
  if (archived !== undefined) {
    return {
      body: archived,
      headers: buildImmutableRuntimeAssetHeaders(assetPath)
    }
  }

  return null
}

function readLocalStaticAsset(filePath: string): RuntimeStaticAsset | null {
  try {
    if (!fs.statSync(filePath).isFile()) {
      return null
    }

    const body = fs.readFileSync(filePath)

    return {
      body: body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
      headers: buildImmutableRuntimeAssetHeaders(filePath)
    }
  } catch {
    return null
  }
}

function getArchivedStaticAssets() {
  if (archivedStaticAssets) {
    return archivedStaticAssets
  }

  const sourcePath = resolveKuailepuRuntimeArchivePath()
  if (!sourcePath) {
    return new Map()
  }
  const sourceText = fs.readFileSync(sourcePath, 'utf8')
  const matches = Array.from(sourceText.matchAll(RUNTIME_ARCHIVE_ENTRY_PATTERN))
  archivedStaticAssets = new Map()

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index]
    const next = matches[index + 1]
    const filename = current[1]?.trim()
    const start = current.index! + current[0].length + 1
    const end = next?.index ?? sourceText.length

    if (!filename || filename === RUNTIME_ARCHIVE_TEMPLATE_ENTRY) {
      continue
    }

    archivedStaticAssets.set(filename, sourceText.slice(start, end).trim())
  }

  return archivedStaticAssets
}

function getRuntimeArchiveAssetKey(assetPath: string) {
  return path.posix.basename(assetPath)
}

function buildImmutableRuntimeAssetHeaders(filePath: string) {
  const headers = new Headers()
  headers.set('content-type', getContentType(filePath))
  headers.set('cache-control', PUBLIC_RUNTIME_IMMUTABLE_CACHE_CONTROL)
  return headers
}

function getContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  return RUNTIME_STATIC_CONTENT_TYPES[ext] ?? 'application/octet-stream'
}

function isRemoteStaticFallbackEnabled() {
  return (
    process.env[PUBLIC_RUNTIME_REMOTE_FALLBACK_ENV] === '1' ||
    process.env[LEGACY_RUNTIME_REMOTE_FALLBACK_ENV] === '1'
  )
}

function buildRemoteStaticAssetUrl(assetPath: string) {
  return `${PUBLIC_RUNTIME_REMOTE_STATIC_ORIGIN}/${assetPath}`
}

function isPathInside(rootPath: string, candidatePath: string) {
  const relativePath = path.relative(rootPath, candidatePath)
  return (
    Boolean(relativePath) &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  )
}
