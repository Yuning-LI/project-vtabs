import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  buildPublicRuntimeHtml,
  buildPublicRuntimeLetterTrackData,
  loadPublicRuntimeSongPayload
} from '@/lib/runtime-core/publicRuntime'
import type { PublicRuntimeState } from '@/lib/runtime-core/runtimeTypes'
import {
  loadImportedOrCandidateSongDoc
} from '@/lib/songbook/importedCatalog'
import { songCatalogBySlug } from '@/lib/songbook/catalog'
import { getSongPresentation } from '@/lib/songbook/presentation'
import { normalizePublicRuntimeVisualThemeName } from '@/lib/runtime-core/visual/publicRuntimeVisualTheme'

export const dynamic = 'force-dynamic'

type CachedRuntimeHtml = {
  html: string
  etag: string
  cacheable: boolean
  sizeBytes: number
}

const MAX_RUNTIME_HTML_CACHE_ENTRIES = 16
const MAX_RUNTIME_HTML_CACHE_BYTES = 12 * 1024 * 1024
const PUBLIC_RUNTIME_HTML_CDN_TTL_SECONDS = 300
const runtimeHtmlCache = new Map<string, CachedRuntimeHtml>()
let runtimeHtmlCacheBytes = 0

/**
 * 这个路由返回的不是 JSON，而是一整页“公开歌曲 runtime HTML”。
 *
 * 外层站点页面只负责提供 React 宿主容器；
 * 真正的 `Kit / Song / hc.parse / SVG` 渲染仍发生在这个 HTML 里。
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url)
  const publicRuntimeCompareMode = searchParams.get('runtime_compare_mode') === '1'
  const publicFeatures = searchParams
    .getAll('public_feature')
    .filter(
      (feature): feature is 'metronome' | 'playback' =>
        feature === 'metronome' || feature === 'playback'
    )
  /**
   * 公开详情页默认走最小公开资产 profile：
   * - 当前不会触发的旧模块脚本默认不注入
   * - 相关静态文件仍保留在本地快照里，方便以后恢复登录 / 播放等能力
   *
   * 如果后续需要排查完整授权 runtime 模板行为，允许临时切回 `full-template`。
   */
  const publicRuntimeAssetProfile =
    searchParams.get('runtime_asset_profile') === 'full-template'
      ? 'full-template'
      : 'public-song'
  const shouldCdnCacheRuntimeHtml = isRuntimeHtmlCdnCacheable({
    runtimeAssetProfile: publicRuntimeAssetProfile,
    runtimeCompareMode: publicRuntimeCompareMode
  })
  const cacheKey = buildRuntimeHtmlCacheKey(params.id, searchParams)
  const cached = getCachedRuntimeHtml(cacheKey)
  if (cached) {
    const headers = buildRuntimeHtmlHeaders(cached.etag, {
      cdnCacheable: cached.cacheable
    })
    if (doesRequestEtagMatch(request.headers.get('if-none-match'), cached.etag)) {
      return new NextResponse(null, {
        status: 304,
        headers
      })
    }

    return new NextResponse(cached.html, {
      headers
    })
  }

  /**
   * 这里先读可部署的 runtime raw JSON，而不是 `data/kuailepu/<slug>.json`。
   *
   * 原因：
   * - `data/kuailepu/*.json` 是给站点 catalog / SEO / 列表用的轻量 SongDoc
   * - runtime 真正需要的是详情页完整上下文
   * - 只有完整 raw JSON 才包含当前授权 runtime `Song.draw()` 会消费的所有字段
   *
   * 生产环境优先读取仓库内可提交的 `data/kuailepu-runtime/<slug>.json`；
   * `reference/songs/<slug>.json` 只保留为本地导歌 / 调试 fallback。
   */
  const payload = loadPublicRuntimeSongPayload(params.id)
  if (!payload) {
    return new NextResponse('Song not found', {
      status: 404,
      headers: {
        'X-Robots-Tag': 'noindex, nofollow, noarchive'
      }
    })
  }

  const state: PublicRuntimeState = {
    instrument: searchParams.get('instrument'),
    fingering: searchParams.get('fingering'),
    fingering_index: searchParams.get('fingering_index'),
    show_graph: searchParams.get('show_graph'),
    show_lyric: searchParams.get('show_lyric'),
    show_note_range: searchParams.get('show_note_range'),
    show_measure_num: searchParams.get('show_measure_num'),
    measure_layout: searchParams.get('measure_layout'),
    sheet_scale: searchParams.get('sheet_scale'),
    note_label_mode: searchParams.get('note_label_mode')
  }
  const song = songCatalogBySlug[params.id] ?? loadImportedOrCandidateSongDoc(params.id)
  /**
   * 未上线候选页也需要用 candidate SongDoc 参与字母谱计算。
   *
   * 否则 preview 场景下拿不到 `notation/meta.key`，`letterTrack` 会退化成空值，
   * 最终只能依赖 runtime 里的固定 mpn fallback，切换 `fingering_index` 时字母谱就不会变。
   */
  const runtimeNotationSong =
    songCatalogBySlug[params.id] ?? loadImportedOrCandidateSongDoc(params.id)
  const publicRuntimeTextMode =
    searchParams.get('runtime_text_mode') === 'english' ? 'english' : 'source'
  const publicRuntimeVisualThemeName = normalizePublicRuntimeVisualThemeName(
    searchParams.get('runtime_visual_theme')
  )
  const presentation = song ? getSongPresentation(song) : null
  /**
   * 字母谱不是修改 raw JSON 后再交给授权 runtime 重渲染，
   * 而是先让授权 runtime 按原逻辑吐出简谱 SVG，再在运行时宿主内做一层可逆的显示替换。
   *
   * 因此这里的 `letterTrack` 更像“后处理渲染指令”：
   * - `number`：不做任何替换，保留授权 runtime 的数字谱输出
   * - `letter`：把简谱那一轨的数字替换成字母音名
   * - `graph`：内部残留调试模式，前台不再暴露
   */
  const letterTrack = buildPublicRuntimeLetterTrackData({
    notation: runtimeNotationSong?.notation,
    rawNotation: typeof payload.notation === 'string' ? payload.notation : null,
    key: runtimeNotationSong?.meta?.key,
    mode: state.note_label_mode,
    payload,
    state
  })

  const html = buildPublicRuntimeHtml({
    songId: params.id,
    payload,
    state,
    letterTrack,
    textMode: publicRuntimeTextMode,
    assetProfile: publicRuntimeAssetProfile,
    publicFeatures: [...publicFeatures],
    preferredEnglishTitle:
      publicRuntimeTextMode === 'english' ? presentation?.title ?? song?.title ?? null : null,
    preferredEnglishSubtitle: null,
    compareMode: publicRuntimeCompareMode,
    visualThemeName: publicRuntimeVisualThemeName
  })
  const etag = buildRuntimeHtmlEtag(html)
  setCachedRuntimeHtml(
    cacheKey,
    {
      html,
      etag,
      cacheable: shouldCdnCacheRuntimeHtml,
      sizeBytes: Buffer.byteLength(html, 'utf8')
    },
    {
      cacheable: shouldCdnCacheRuntimeHtml
    }
  )

  return new NextResponse(html, {
    headers: buildRuntimeHtmlHeaders(etag, {
      cdnCacheable: shouldCdnCacheRuntimeHtml
    })
  })
}

function buildRuntimeHtmlCacheKey(songId: string, searchParams: URLSearchParams) {
  const normalizedParams = new URLSearchParams()
  const cacheRelevantKeys = new Set([
    'instrument',
    'fingering',
    'fingering_index',
    'show_graph',
    'show_lyric',
    'show_note_range',
    'show_measure_num',
    'measure_layout',
    'sheet_scale',
    'note_label_mode',
    'runtime_text_mode',
    'runtime_visual_theme',
    'runtime_asset_profile',
    'runtime_compare_mode',
    'public_feature'
  ])
  const groupedValues = new Map<string, string[]>()

  Array.from(searchParams.keys())
    .filter(key => cacheRelevantKeys.has(key))
    .sort()
    .forEach(key => {
      const values = searchParams
        .getAll(key)
        .map(value => value.trim())
        .filter(value => value.length > 0)
      if (values.length === 0) {
        return
      }

      if (key === 'public_feature') {
        groupedValues.set(key, Array.from(new Set(values)).sort())
        return
      }

      groupedValues.set(key, values)
    })

  Array.from(groupedValues.keys())
    .sort()
    .forEach(key => {
      groupedValues.get(key)?.forEach(value => {
        normalizedParams.append(key, value)
      })
    })

  const query = normalizedParams.toString()
  return query ? `${songId}?${query}` : songId
}

function getCachedRuntimeHtml(cacheKey: string) {
  if (process.env.NODE_ENV !== 'production') {
    return null
  }

  const cached = runtimeHtmlCache.get(cacheKey)
  if (!cached) {
    return null
  }

  runtimeHtmlCache.delete(cacheKey)
  runtimeHtmlCache.set(cacheKey, cached)
  return cached
}

function setCachedRuntimeHtml(
  cacheKey: string,
  cached: CachedRuntimeHtml,
  options: { cacheable: boolean }
) {
  if (process.env.NODE_ENV !== 'production' || !options.cacheable) {
    return
  }

  const previous = runtimeHtmlCache.get(cacheKey)
  if (previous) {
    runtimeHtmlCacheBytes -= previous.sizeBytes
    runtimeHtmlCache.delete(cacheKey)
  }

  runtimeHtmlCache.set(cacheKey, cached)
  runtimeHtmlCacheBytes += cached.sizeBytes

  while (
    runtimeHtmlCache.size > MAX_RUNTIME_HTML_CACHE_ENTRIES ||
    runtimeHtmlCacheBytes > MAX_RUNTIME_HTML_CACHE_BYTES
  ) {
    const oldestKey = runtimeHtmlCache.keys().next().value
    if (!oldestKey) {
      break
    }
    const oldest = runtimeHtmlCache.get(oldestKey)
    if (oldest) {
      runtimeHtmlCacheBytes -= oldest.sizeBytes
    }
    runtimeHtmlCache.delete(oldestKey)
  }
}

function buildRuntimeHtmlEtag(html: string) {
  return `"${createHash('sha256').update(html).digest('base64url')}"`
}

function buildRuntimeHtmlHeaders(etag: string, options?: { cdnCacheable?: boolean }) {
  const cdnCacheable = Boolean(options?.cdnCacheable)
  const headers: Record<string, string> = {
    'content-type': 'text/html; charset=utf-8',
    'cache-control':
      process.env.NODE_ENV === 'production'
        ? cdnCacheable
          ? `public, max-age=0, s-maxage=${PUBLIC_RUNTIME_HTML_CDN_TTL_SECONDS}, stale-while-revalidate=${PUBLIC_RUNTIME_HTML_CDN_TTL_SECONDS}, must-revalidate`
          : 'private, max-age=0, must-revalidate'
        : 'no-store',
    etag,
    'X-Robots-Tag': 'noindex, nofollow, noarchive'
  }

  if (process.env.NODE_ENV === 'production' && cdnCacheable) {
    const cdnCacheControl = `public, s-maxage=${PUBLIC_RUNTIME_HTML_CDN_TTL_SECONDS}, stale-while-revalidate=${PUBLIC_RUNTIME_HTML_CDN_TTL_SECONDS}`
    headers['CDN-Cache-Control'] = cdnCacheControl
    headers['Vercel-CDN-Cache-Control'] = cdnCacheControl
  }

  return headers
}

function isRuntimeHtmlCdnCacheable(input: {
  runtimeAssetProfile: string
  runtimeCompareMode: boolean
}) {
  return input.runtimeAssetProfile === 'public-song' && !input.runtimeCompareMode
}

function doesRequestEtagMatch(header: string | null, etag: string) {
  if (!header) {
    return false
  }

  return header
    .split(',')
    .map(value => value.trim())
    .some(value => value === etag || value === `W/${etag}`)
}
