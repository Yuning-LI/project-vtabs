/**
 * 这个文件只保留旧类型名到 `runtime-core` 公共类型的兼容映射。
 *
 * 新代码应优先直接从 `src/lib/runtime-core/runtimeTypes.ts` 引用
 * `PublicRuntime*` / `PublicLetterTrack*` 主类型。
 *
 * 不要在这个兼容出口新增新的主类型定义。
 */
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
} from '../runtime-core/runtimeTypes.ts'
