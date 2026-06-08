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
  PublicRuntimeVisualTheme
} from '../runtime-core/runtimeTypes.ts'

import type {
  PublicLetterTrackData,
  PublicLetterTrackMode,
  PublicRuntimeAssetProfileName,
  PublicRuntimePayload,
  PublicRuntimePublicFeature,
  PublicRuntimeState,
  PublicRuntimeTextMode,
  PublicRuntimeVisualTheme
} from '../runtime-core/runtimeTypes.ts'

export type KuailepuRuntimeState = PublicRuntimeState
export type KuailepuLetterTrackMode = PublicLetterTrackMode
export type KuailepuLetterTrackData = PublicLetterTrackData
export type KuailepuRuntimePayload = PublicRuntimePayload
export type KuailepuRuntimeTextMode = PublicRuntimeTextMode
export type KuailepuRuntimeAssetProfileName = PublicRuntimeAssetProfileName
export type KuailepuRuntimePublicFeature = PublicRuntimePublicFeature
export type KuailepuRuntimeVisualTheme = PublicRuntimeVisualTheme
