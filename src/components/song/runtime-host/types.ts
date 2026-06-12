import type { CSSProperties } from 'react'
import type { PublicRuntimeHostMessage } from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'
import type { RuntimeScriptEntry } from '@/lib/runtime-core/runtimeScriptTypes'

export type { PublicRuntimeHostMessage } from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'

export type PublicRuntimeHostController = {
  hostElement: HTMLElement
  containsEventTarget: (target: EventTarget | null) => boolean
  postMessage: (message: unknown) => boolean
  destroy: () => void
}

export type PublicRuntimeHostMessageMeta = {
  origin: string
  source: MessageEventSource | null
}

export type PublicRuntimeHostMessageHandler = (
  message: PublicRuntimeHostMessage,
  meta: PublicRuntimeHostMessageMeta
) => void

export type RuntimeTextHideRule = {
  match: string
  mode?: 'contains' | 'exact'
  hideNextNumericSibling?: boolean
}

export type RuntimeMaskRect = {
  x: number
  y: number
  width: number
  height: number
  fill?: string
  opacity?: number
}

export type IframeRuntimeHostProps = {
  songId: string
  title: string
  frameSrc: string
  iframeClassName?: string
  iframeStyle?: CSSProperties
  initialHeight: number
  fitHeight?: number
  fitTopPadding: number
  fitCropTop: number
  fitCropBottom: number
  runtimeTextHideRules?: RuntimeTextHideRule[]
  runtimeMaskRects?: RuntimeMaskRect[]
  onHostControllerChange?: (controller: PublicRuntimeHostController | null) => void
  onFrameLoad?: () => void
  onLoadingChange?: (isLoading: boolean) => void
}

export type ContainerRuntimeHostProps = {
  songId: string
  title: string
  bodyHtml?: string
  styleAssets?: Array<{
    src: string
  }>
  scriptEntries?: RuntimeScriptEntry[]
  enableScriptLoader?: boolean
  className?: string
  onHostControllerChange?: (controller: PublicRuntimeHostController | null) => void
  onRuntimeReady?: () => void
}
