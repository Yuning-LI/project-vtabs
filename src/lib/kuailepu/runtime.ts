import type {
  KuailepuLetterTrackData,
  KuailepuRuntimeAssetProfileName,
  KuailepuRuntimePayload,
  KuailepuRuntimePublicFeature,
  KuailepuRuntimeState,
  KuailepuRuntimeTextMode
} from './runtimeTypes.ts'
import {
  buildPublicKuailepuLetterTrackData
} from '../runtime-core/letterTrack/publicLetterTrack.ts'
import {
  applyRuntimeDefaults as applyPublicRuntimeDefaults,
  extractPayloadLyricText as extractPublicRuntimeLyricText,
  resolvePublicRuntimeState,
  shouldHideLyricTrackByDefault as shouldHidePublicRuntimeLyricTrackByDefault
} from '../runtime-core/state/publicRuntimeState.ts'
import {
  buildPublicRuntimeHtmlDocument
} from '../runtime-core/server/html/runtimeHtmlDocument.ts'
import {
  serializeForInlineScript as serializeRuntimeHtmlInlineValue
} from '../runtime-core/server/html/runtimeHtmlScaffold.ts'
import {
  loadArchivedKuailepuSongPayload,
  localizeArchivedRuntimePayload
} from '../runtime-core/server/payload/runtimePayload.ts'
import { buildPublicRuntimeBridgeScript } from '../runtime-core/bridge/publicRuntimeBridge.ts'
import { getArchivedKuailepuRuntimeHtmlTemplate } from '../runtime-core/server/template/runtimeTemplate.ts'

/**
 * 这里定义的是“站点外壳传给快乐谱兼容 runtime 的状态”。
 *
 * 注意它不是我们站点原本的 SongDoc UI 状态，而是快乐谱原始前端能理解的上下文字段。
 * 例如：
 * - `instrument`
 * - `fingering`
 * - `fingering_index`
 * - `show_graph`
 *
 * 这些字段最终会直接进入 `Kit.context.setContext(...)`，然后由快乐谱原始
 * `Song.draw -> Song.compile -> hc.parse -> renderSheet` 链条继续消费。
 *
 * 这也是当前维护时最重要的边界之一：
 * - 不要把 HC 理解成“只负责最后吐 SVG 的 renderer”
 * - 历史公开版里，`hc` 主文件本身就承担 parser / lexer / layout / render 主链
 * - 历史 `hc.kit` 还承担过 MIDI / harmonizer / chord / instrument / fingering 支撑职责
 *
 * 所以后面如果继续收缩公开页脚本集，是否能默认停用某个旧模块，
 * 应该先沿着这条主链判断，而不是只看文件名猜它是不是“非核心 UI 脚本”。
 */
/**
 * 公开 song page 现在不再默认把快乐谱模板里的所有历史脚本一股脑注入。
 *
 * 但这里的策略不是“把旧文件从仓库里删掉”，而是：
 * - 公开详情页默认只加载当前验证过的最小必需集
 * - 登录 / 播放 / 收藏 / 节拍器等未来可能恢复的脚本继续保留在本地快照里
 * - 如果以后要恢复这些功能，优先调整 asset profile，而不是重新回源抓线上资源
 *
 * 这样做的目标是同时满足两件事：
 * 1. 当前公开页少加载一批不会触发的旧模块
 * 2. 未来恢复功能时，仓库内仍有明确的资产和恢复路径
 *
 * 截至 2026-04-02 当前建议先停在这版：
 * - `public-song` 默认 6 个脚本
 * - `full-template` 作为恢复入口
 *
 * 不建议继续无限扩张这层 profile / stub，把越来越多模板行为都手工接管。
 * 如果未来再继续减载，优先先看收益是否真的明显，再决定是否值得增加维护复杂度。
 */
/**
 * 读取公开 runtime 所需的完整快乐谱 raw JSON。
 *
 * 读取顺序：
 * 1. 生产构建生成的 `data/kuailepu-runtime-packed/<slug>.json.gz`
 * 2. `data/kuailepu-runtime/<slug>.json`（生产真相源）
 * 3. `reference/songs/<slug>.json`（本地导歌 / 调试 fallback）
 *
 * 它不是站点公开用的轻量 SongDoc，而是当前快乐谱兼容 runtime 的真相源。
 */
export function loadKuailepuSongPayload(songId: string) {
  return loadArchivedKuailepuSongPayload(songId)
}

export function resolveKuailepuRuntimeState(
  payload: KuailepuRuntimePayload,
  state: KuailepuRuntimeState | null
) {
  return resolvePublicRuntimeState(payload, state)
}

export function hasKuailepuLyricContent(
  payload: Pick<KuailepuRuntimePayload, 'lyric' | 'lyric_text'>
) {
  return extractPublicRuntimeLyricText(payload).trim().length > 0
}

export function hasPublicKuailepuLyricToggle(
  payload: Pick<KuailepuRuntimePayload, 'lyric' | 'lyric_text'>
) {
  return hasKuailepuLyricContent(payload) && !shouldHidePublicRuntimeLyricTrackByDefault(payload)
}

export function buildKuailepuRuntimeHtml(input: {
  songId: string
  payload: KuailepuRuntimePayload
  state?: KuailepuRuntimeState | null
  letterTrack?: KuailepuLetterTrackData | null
  textMode?: KuailepuRuntimeTextMode | null
  assetProfile?: KuailepuRuntimeAssetProfileName | null
  publicFeatures?: KuailepuRuntimePublicFeature[] | null
  preferredEnglishTitle?: string | null
  preferredEnglishSubtitle?: string | null
  compareMode?: boolean | null
}) {
  const { songId } = input
  const payload = applyPublicRuntimeDefaults(
    localizeArchivedRuntimePayload(input.payload, {
      mode: input.textMode ?? 'source',
      preferredTitle: input.preferredEnglishTitle ?? null,
      preferredSubtitle: input.preferredEnglishSubtitle ?? null
    }),
    input.state ?? null
  )
  const letterTrack = input.letterTrack ?? null
  const assetProfile = input.assetProfile ?? 'public-song'
  const publicFeatures = new Set(input.publicFeatures ?? [])
  const compareMode = Boolean(input.compareMode)
  const pageTitle = [payload.song_name, payload.alias_name].filter(Boolean).join(' - ') || songId
  const safePayload = serializeRuntimeHtmlInlineValue(payload)
  const template = getArchivedKuailepuRuntimeHtmlTemplate()
  const hasPendingLetterMask = !compareMode && Boolean(letterTrack) && letterTrack?.mode !== 'number'
  const bridgeScriptHtml = buildPublicRuntimeBridgeScript(
    songId,
    letterTrack,
    input.textMode ?? 'source',
    publicFeatures
  )

  /**
   * 这一步不是“重写快乐谱页面”，而是在一份保存下来的快乐谱原始 HTML 模板上做最小替换：
   * 1. 替换 `<title>`
   * 2. 把原页面里的 `Kit.context.setContext("压缩串")` 改成我们自己的 raw JSON 对象
   * 3. 把所有 `/static/...` 资源改到本地代理 `/k-static/...`
   * 4. 注入一层覆盖样式，隐藏快乐谱原页面里对我们站点没意义的外壳
   * 5. 注入桥接脚本，把 iframe 内部真实谱面高度发回宿主页面
   * 6. 按公开页 asset profile 停用当前不会触发、但未来可能恢复的旧模块脚本
   */
  return buildPublicRuntimeHtmlDocument({
    template,
    songId,
    payloadJson: safePayload,
    pageTitle,
    assetProfile,
    publicFeatures,
    compareMode,
    hasPendingLetterMask,
    bridgeScriptHtml
  })
}

export function buildKuailepuLetterTrackData(input: {
  notation?: string[] | null
  rawNotation?: string | null
  key?: string | null
  mode?: string | null
  payload?: KuailepuRuntimePayload | null
  state?: KuailepuRuntimeState | null
}): KuailepuLetterTrackData {
  return buildPublicKuailepuLetterTrackData(input)
}

