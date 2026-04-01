import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { resolveKuailepuRuntimeArchivePath } from './archiveFiles'

/**
 * 浏览器直接从 `localhost` 页面去加载 `https://www.kuaiyuepu.com/static/...`
 * 的大量 JS/CSS 时，在当前 iframe/runtime 场景下容易被 ORB / 资源策略拦掉。
 *
 * 所以这里做了一个“同源静态资源代理”：
 * - 浏览器只请求我们自己的 `/k-static/...` 或 `/static/...`
 * - 服务端优先读取仓库内已提交资源与 runtime 归档
 * - 最后才在显式允许时回源快乐谱原站静态资源
 *
 * 这样浏览器看到的是“同源资源”，快乐谱原始脚本链就能完整跑起来。
 */
export async function proxyKuailepuStaticAsset(asset: string[]) {
  const assetPath = asset.join('/')
  if (!assetPath) {
    return new NextResponse('Not found', { status: 404 })
  }

  const localAsset = loadBundledKuailepuStaticAsset(assetPath)
  if (localAsset) {
    return new NextResponse(localAsset.body, {
      headers: localAsset.headers
    })
  }

  if (!isRemoteStaticFallbackEnabled()) {
    return new NextResponse(`Missing bundled Kuailepu static asset: ${assetPath}`, {
      status: 404
    })
  }

  const targetUrl = `https://www.kuaiyuepu.com/static/${assetPath}`
  let upstream: Response
  try {
    upstream = await fetch(targetUrl, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
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
  headers.set('cache-control', 'public, max-age=3600')
  headers.set('access-control-allow-origin', '*')

  return new NextResponse(await upstream.arrayBuffer(), {
    headers
  })
}

let archivedStaticAssets: Map<string, string> | null = null

function loadBundledKuailepuStaticAsset(assetPath: string) {
  const vendorPath = path.resolve(process.cwd(), 'vendor', 'kuailepu-static', assetPath)
  if (fs.existsSync(vendorPath) && fs.statSync(vendorPath).isFile()) {
    const headers = new Headers()
    headers.set('content-type', getContentType(vendorPath))
    headers.set('cache-control', 'public, max-age=31536000, immutable')

    return {
      body: fs.readFileSync(vendorPath),
      headers
    }
  }

  const archived = getArchivedStaticAssets().get(path.basename(assetPath))
  if (archived !== undefined) {
    const headers = new Headers()
    headers.set('content-type', getContentType(assetPath))
    headers.set('cache-control', 'public, max-age=31536000, immutable')

    return {
      body: archived,
      headers
    }
  }

  return null
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
  const marker = /^文件：(.+)$/gm
  const matches = Array.from(sourceText.matchAll(marker))
  archivedStaticAssets = new Map()

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index]
    const next = matches[index + 1]
    const filename = current[1]?.trim()
    const start = current.index! + current[0].length + 1
    const end = next?.index ?? sourceText.length

    if (!filename || filename === 'qyiBa1mPa.html') {
      continue
    }

    archivedStaticAssets.set(filename, sourceText.slice(start, end).trim())
  }

  return archivedStaticAssets
}

function getContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.css':
      return 'text/css; charset=utf-8'
    case '.js':
      return 'application/javascript; charset=utf-8'
    case '.ico':
      return 'image/x-icon'
    case '.svg':
      return 'image/svg+xml'
    case '.woff':
      return 'font/woff'
    case '.woff2':
      return 'font/woff2'
    case '.ttf':
      return 'font/ttf'
    case '.eot':
      return 'application/vnd.ms-fontobject'
    default:
      return 'application/octet-stream'
  }
}

function isRemoteStaticFallbackEnabled() {
  return process.env.KUAILEPU_ALLOW_REMOTE_STATIC_FALLBACK === '1'
}
