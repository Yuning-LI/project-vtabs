import type {
  PublicLetterTrackData,
  PublicRuntimePublicFeature,
  PublicRuntimeTextMode,
  PublicRuntimeVisualTheme
} from '../runtimeTypes.ts'
import { serializeForInlineScript } from './serialization.ts'
import {
  buildPublicRuntimeBridgeScriptStages,
  joinPublicRuntimeBridgeScriptStages
} from './scriptStages.ts'

/* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
/**
 * 这层样式的目标不是美化集成运行时页面，而是把不需要的站点外壳彻底关掉，只留下谱面本体。
 *
 * 重点隐藏：
 * - 顶部 header
 * - footer/comment/tag/media
 * - 各类 modal
 * - Materialize 的 `.lean-overlay`
 *
 * 用户之前看到的半透明灰色遮罩，来源就是这里的 overlay。
 *
 * 另外这里会强制关闭运行时文档自己的纵向滚动。
 * 原因是公开详情页的滚动应该只由外层页面承担，哪怕测高已经基本正确，
 * 某些桌面环境仍可能因为浏览器默认的 `overflow-y: auto` 画出一条内层滚动条。
 *
 * 真正的完整谱面高度仍然依赖 runtime container script context 回传给宿主页面，
 * 所以这里关掉内层纵向滚动不会裁掉内容，只会避免运行时区域自己再出现一层滚动。
 */
/**
 * 这个桥接脚本解决两个问题：
 *
 * 1. 集成运行时页面本身并不知道自己由 React 宿主接管，
 *    所以它不会主动把谱面高度告诉外层页面。
 *
 * 2. 集成运行时页面里有很多被我们隐藏掉的节点，直接拿 `document.body.scrollHeight`
 *    往往会偏大，导致运行时区域底下出现大块空白。
 *
 * 因此这里的策略是：
 * - 优先只测量真正可见的谱面相关节点：`#sheet`、`.sheet-svg`
 * - 用这些节点的可见底部作为运行时实际高度
 * - 只有在还没出谱时，才退回 body/html 的 scrollHeight 兜底
 */
export function buildPublicRuntimeBridgeScript(
  songId: string,
  letterTrack: PublicLetterTrackData | null,
  textMode: PublicRuntimeTextMode,
  publicFeatures: Set<PublicRuntimePublicFeature>,
  visualTheme: PublicRuntimeVisualTheme
) {
  const bridgeScriptStages = buildPublicRuntimeBridgeScriptStages()
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
<script data-vtabs-runtime-bridge>
(function () {
  var songId = ${JSON.stringify(songId)};
  var letterTrack = ${safeLetterTrack};
  var textMode = ${JSON.stringify(textMode)};
  var publicRuntimeVisualTheme = ${serializeForInlineScript(visualTheme)};
  var hasPublicMetronome = ${publicFeatures.has('metronome') ? 'true' : 'false'};
  var hasPublicPlayback = ${publicFeatures.has('playback') ? 'true' : 'false'};
  var playbackLetterHighlightObservers = [];

${joinPublicRuntimeBridgeScriptStages(bridgeScriptStages)}
})();
</script>
`
}
