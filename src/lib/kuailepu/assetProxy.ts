import { NextResponse } from 'next/server'

/**
 * 浏览器直接从 `localhost` 页面去加载 `https://www.kuaiyuepu.com/static/...`
 * 的大量 JS/CSS 时，在当前 iframe/runtime 场景下容易被 ORB / 资源策略拦掉。
 *
 * 所以这里做了一个“同源静态资源代理”：
 * - 浏览器只请求我们自己的 `/k-static/...` 或 `/static/...`
 * - 服务端再代替浏览器去抓快乐谱原站静态资源
 *
 * 这样浏览器看到的是“同源资源”，快乐谱原始脚本链就能完整跑起来。
 */
export async function proxyKuailepuStaticAsset(asset: string[]) {
  const assetPath = asset.join('/')
  if (!assetPath) {
    return new NextResponse('Not found', { status: 404 })
  }

  const targetUrl = `https://www.kuaiyuepu.com/static/${assetPath}`
  const upstream = await fetch(targetUrl, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    },
    cache: 'no-store'
  })

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
