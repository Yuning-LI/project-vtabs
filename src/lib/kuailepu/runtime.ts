export {
  buildPublicRuntimeHtml as buildKuailepuRuntimeHtml,
  buildPublicRuntimeLetterTrackData as buildKuailepuLetterTrackData,
  hasPublicRuntimeLyricContent as hasKuailepuLyricContent,
  hasPublicRuntimeLyricToggle as hasPublicKuailepuLyricToggle,
  loadPublicRuntimeSongPayload as loadKuailepuSongPayload,
  resolvePublicRuntimeContextState as resolveKuailepuRuntimeState
} from '../runtime-core/publicRuntime.ts'

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
