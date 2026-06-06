/**
 * 这个文件只保留“兼容壳”职责：
 * - 继续提供旧的 `Kuailepu*` 导出名，避免外部调用点一次性大迁移
 * - 同时直接透传新的 `PublicRuntime*` 主实现
 * - 不要再把新的主逻辑继续加回这个兼容层
 *
 * 新功能与主逻辑应优先进入 `src/lib/runtime-core/publicRuntime.ts`。
 */
export {
  buildPublicRuntimeHtml as buildKuailepuRuntimeHtml,
  buildPublicRuntimeLetterTrackData as buildKuailepuLetterTrackData,
  hasPublicRuntimeLyricContent as hasKuailepuLyricContent,
  hasPublicRuntimeLyricToggle as hasPublicKuailepuLyricToggle,
  loadPublicRuntimeSongPayload as loadKuailepuSongPayload,
  resolvePublicRuntimeContextState as resolveKuailepuRuntimeState
} from '../runtime-core/publicRuntime.ts'

export {
  buildPublicRuntimeHtml,
  buildPublicRuntimeLetterTrackData,
  hasPublicRuntimeLyricContent,
  hasPublicRuntimeLyricToggle,
  loadPublicRuntimeSongPayload,
  resolvePublicRuntimeContextState
} from '../runtime-core/publicRuntime.ts'

export type {
  PublicLetterTrackData,
  PublicLetterTrackMode,
  PublicRuntimeAssetProfileName,
  PublicRuntimePayload,
  PublicRuntimePublicFeature,
  PublicRuntimeState,
  PublicRuntimeTextMode,
  KuailepuLetterTrackData,
  KuailepuLetterTrackMode,
  KuailepuRuntimeAssetProfileName,
  KuailepuRuntimePayload,
  KuailepuRuntimePublicFeature,
  KuailepuRuntimeState,
  KuailepuRuntimeTextMode
} from './runtimeTypes.ts'

/**
 * 这里定义的是“站点外壳传给归档 renderer 兼容 runtime 的状态”。
 *
 * 注意它不是我们站点原本的 SongDoc UI 状态，而是归档前端能理解的上下文字段。
 * 例如：
 * - `instrument`
 * - `fingering`
 * - `fingering_index`
 * - `show_graph`
 *
 * 这些字段最终会直接进入 `Kit.context.setContext(...)`，然后由归档下来的
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
