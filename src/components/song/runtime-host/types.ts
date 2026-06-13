import type { CSSProperties } from 'react'
import type { PublicRuntimeHostMessage } from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'
import type { RuntimeScriptEntry } from '@/lib/runtime-core/runtimeScriptTypes'
import type {
  RuntimeScriptLoaderDiagnostics
} from './RuntimeScriptLoader'
import type {
  RuntimeContainerMeasurementSnapshot
} from './useRuntimeContainerMeasurement'

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
  style?: CSSProperties
  loadingId?: string
  overlayClassName?: string
  initialHeight?: number
  showScriptDiagnostics?: boolean
  onHostControllerChange?: (controller: PublicRuntimeHostController | null) => void
  onRuntimeReady?: () => void
  onLoadingChange?: (isLoading: boolean) => void
  onMeasurementChange?: (snapshot: RuntimeContainerMeasurementSnapshot) => void
  onScriptDiagnosticsChange?: (diagnostics: RuntimeScriptLoaderDiagnostics) => void
}
