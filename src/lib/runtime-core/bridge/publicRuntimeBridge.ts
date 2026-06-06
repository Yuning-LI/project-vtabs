import type {
  PublicLetterTrackData,
  PublicRuntimePublicFeature,
  PublicRuntimeTextMode
} from '../runtimeTypes.ts'
import { buildPublicRuntimeHeightBridgeScript } from './height/publicRuntimeHeightBridge.ts'
import { buildPublicRuntimeMetronomeBridgeScript } from './metronome/publicRuntimeMetronomeBridge.ts'
import { buildPublicRuntimePlaybackBridgeScript } from './playback/publicRuntimePlaybackBridge.ts'
import { buildPublicRuntimeBootstrapScript } from './script/publicRuntimeBootstrap.ts'
import { buildPublicRuntimeSvgBridgeScript } from './svg/publicRuntimeSvgBridge.ts'

function serializeForInlineScript(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/**
 * 这层样式的目标不是“美化快乐谱页面”，而是把不需要的原站外壳彻底关掉，只留下谱面本体。
 *
 * 重点隐藏：
 * - 顶部 header
 * - footer/comment/tag/media
 * - 各类 modal
 * - Materialize 的 `.lean-overlay`
 *
 * 用户之前看到的半透明灰色遮罩，来源就是这里的 overlay。
 *
 * 另外这里会强制关闭 iframe 内文档自己的纵向滚动。
 * 原因是公开详情页的滚动应该只由外层页面承担，哪怕测高已经基本正确，
 * 某些桌面环境仍可能因为浏览器默认的 `overflow-y: auto` 画出一条内层滚动条。
 *
 * 真正的完整谱面高度仍然依赖 bridge script 回传给父页面，
 * 所以这里关掉内层纵向滚动不会裁掉内容，只会避免 iframe 自己再出现一层滚动。
 */
/**
 * 这个桥接脚本解决两个问题：
 *
 * 1. 快乐谱原始页面本身并不知道自己是被放进我们站点 iframe 里的，
 *    所以它不会主动把谱面高度告诉父页面。
 *
 * 2. 快乐谱页面里有很多被我们隐藏掉的节点，直接拿 `document.body.scrollHeight`
 *    往往会偏大，导致 iframe 底下出现大块空白。
 *
 * 因此这里的策略是：
 * - 优先只测量真正可见的谱面相关节点：`#sheet`、`.sheet-svg`
 * - 用这些节点的可见底部作为 iframe 实际高度
 * - 只有在还没出谱时，才退回 body/html 的 scrollHeight 兜底
 */
export function buildPublicRuntimeBridgeScript(
  songId: string,
  letterTrack: PublicLetterTrackData | null,
  textMode: PublicRuntimeTextMode,
  publicFeatures: Set<PublicRuntimePublicFeature>
) {
  const heightBridgeScript = buildPublicRuntimeHeightBridgeScript()
  const metronomeBridgeScript = buildPublicRuntimeMetronomeBridgeScript()
  const playbackBridgeScript = buildPublicRuntimePlaybackBridgeScript()
  const svgBridgeScript = buildPublicRuntimeSvgBridgeScript()
  const bootstrapScript = buildPublicRuntimeBootstrapScript()
  const safeLetterTrack = serializeForInlineScript(
    letterTrack ?? {
      mode: 'number',
      anchorLabels: null,
      glyphLabels: null,
      glyphTokens: null,
      scale: null
    }
  )

  return `
<script data-kuailepu-runtime-bridge>
(function () {
  var songId = ${JSON.stringify(songId)};
  var letterTrack = ${safeLetterTrack};
  var textMode = ${JSON.stringify(textMode)};
  var hasPublicMetronome = ${publicFeatures.has('metronome') ? 'true' : 'false'};
  var hasPublicPlayback = ${publicFeatures.has('playback') ? 'true' : 'false'};
  var resizeTimer = null;
  var initialSyncTimer = null;
  var playbackLetterHighlightObservers = [];

${metronomeBridgeScript}
${playbackBridgeScript}
${svgBridgeScript}

${heightBridgeScript}
${bootstrapScript}
})();
</script>
`
}
