import type { CSSProperties } from 'react'

export type PublicRuntimeHostController = {
  hostElement: HTMLElement
  containsEventTarget: (target: EventTarget | null) => boolean
  postMessage: (message: unknown) => boolean
  destroy: () => void
}

export type PublicRuntimeHostMessage = Record<string, unknown> & {
  songId: string
  type?: unknown
}

export type PublicRuntimeHostMessageHandler = (message: PublicRuntimeHostMessage) => void

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
