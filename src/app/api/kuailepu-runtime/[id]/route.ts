import { NextResponse } from 'next/server'
import {
  buildKuailepuLetterTrackData,
  buildKuailepuRuntimeHtml,
  loadKuailepuSongPayload,
  type KuailepuRuntimeState
} from '@/lib/kuailepu/runtime'
import { songCatalogBySlug } from '@/lib/songbook/catalog'
import { getSongPresentation } from '@/lib/songbook/presentation'

export const dynamic = 'force-dynamic'

/**
 * 这个路由返回的不是 JSON，而是一整页“快乐谱兼容 runtime HTML”。
 *
 * 外层站点页面只负责提供 iframe 容器；
 * 真正的 `Kit / Song / hc.parse / SVG` 渲染都发生在这个 HTML 里。
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  /**
   * 这里先读可部署的 raw JSON，而不是 `data/kuailepu/<slug>.json`。
   *
   * 原因：
   * - `data/kuailepu/*.json` 是给站点 catalog / SEO / 列表用的轻量 SongDoc
   * - runtime 真正需要的是快乐谱详情页完整上下文
   * - 只有完整 raw JSON 才包含快乐谱原始 `Song.draw()` 会消费的所有字段
   *
   * 生产环境优先读取仓库内可提交的 `data/kuailepu-runtime/<slug>.json`；
   * `reference/songs/<slug>.json` 只保留为本地导歌 / 调试 fallback。
   */
  const payload = loadKuailepuSongPayload(params.id)
  if (!payload) {
    return new NextResponse('Song not found', { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const state: KuailepuRuntimeState = {
    instrument: searchParams.get('instrument'),
    fingering: searchParams.get('fingering'),
    fingering_index: searchParams.get('fingering_index'),
    show_graph: searchParams.get('show_graph'),
    show_lyric: searchParams.get('show_lyric'),
    show_measure_num: searchParams.get('show_measure_num'),
    measure_layout: searchParams.get('measure_layout'),
    sheet_scale: searchParams.get('sheet_scale'),
    note_label_mode: searchParams.get('note_label_mode')
  }
  const song = songCatalogBySlug[params.id]
  const runtimeTextMode = searchParams.get('runtime_text_mode') === 'english' ? 'english' : 'source'
  /**
   * 公开详情页默认走最小公开资产 profile：
   * - 当前不会触发的旧模块脚本默认不注入
   * - 相关静态文件仍保留在本地快照里，方便以后恢复登录 / 播放等能力
   *
   * 如果后续需要排查“完整快乐谱模板”行为，允许临时切回 `full-template`。
   */
  const runtimeAssetProfile =
    searchParams.get('runtime_asset_profile') === 'full-template'
      ? 'full-template'
      : 'public-song'
  const presentation = song ? getSongPresentation(song) : null
  /**
   * 字母谱不是修改 raw JSON 后再交给快乐谱重渲染，
   * 而是先让快乐谱按原逻辑吐出简谱 SVG，再在 iframe 内做一层可逆的显示替换。
   *
   * 因此这里的 `letterTrack` 更像“后处理渲染指令”：
   * - `number`：不做任何替换，保留快乐谱原版
   * - `letter`：把简谱那一轨的数字替换成字母音名
   * - `graph`：内部残留调试模式，前台不再暴露
   */
  const letterTrack = buildKuailepuLetterTrackData({
    notation: song?.notation,
    key: song?.meta?.key,
    mode: state.note_label_mode
  })

  const html = buildKuailepuRuntimeHtml({
    songId: params.id,
    payload,
    state,
    letterTrack,
    textMode: runtimeTextMode,
    assetProfile: runtimeAssetProfile,
    preferredEnglishTitle: runtimeTextMode === 'english' ? presentation?.title ?? song?.title ?? null : null,
    preferredEnglishSubtitle: null
  })

  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    }
  })
}
