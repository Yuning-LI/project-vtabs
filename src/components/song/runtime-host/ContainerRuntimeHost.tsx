'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ContainerRuntimeHostProps,
  PublicRuntimeHostController
} from './types'
import RuntimeScriptLoader from './RuntimeScriptLoader'
import RuntimeStyleInjector from './RuntimeStyleInjector'
import { dispatchContainerRuntimeCommand } from './containerRuntimeTransport'
import { PUBLIC_RUNTIME_READY_MESSAGE } from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'
import { useRuntimeContainerMeasurement } from './useRuntimeContainerMeasurement'
import { useRuntimeHostLifecycle } from './useRuntimeHostLifecycle'

/**
 * Dev-only native DOM host.
 *
 * Keep this component limited to host integration concerns: scoped style
 * injection, runtime DOM mounting, script loading, measurement, and teardown.
 */
export default function ContainerRuntimeHost({
  songId,
  title,
  bodyHtml = '',
  styleAssets = [],
  scriptEntries = [],
  enableScriptLoader = false,
  className,
  style,
  loadingId,
  overlayClassName,
  initialHeight = 900,
  showScriptDiagnostics = false,
  onHostControllerChange,
  onRuntimeReady,
  onLoadingChange,
  onMeasurementChange,
  onScriptDiagnosticsChange
}: ContainerRuntimeHostProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null)
  const [runtimeDomRoot, setRuntimeDomRoot] = useState<HTMLDivElement | null>(null)
  const controllerRef = useRef<PublicRuntimeHostController | null>(null)
  const onHostControllerChangeRef = useRef(onHostControllerChange)
  const { height, isLoading } = useRuntimeContainerMeasurement({
    songId,
    rootElement,
    runtimeRoot: runtimeDomRoot,
    enabled: enableScriptLoader,
    initialHeight,
    onLoadingChange,
    onMeasurementChange
  })

  useRuntimeHostLifecycle({
    rootElement,
    runtimeRoot: runtimeDomRoot,
    enabled: enableScriptLoader
  })

  useEffect(() => {
    onHostControllerChangeRef.current = onHostControllerChange
  }, [onHostControllerChange])

  const assignRootRef = useCallback((node: HTMLDivElement | null) => {
    rootRef.current = node
    setRootElement(node)

    controllerRef.current?.destroy()
    controllerRef.current = node ? createContainerRuntimeHostController(node) : null
    onHostControllerChangeRef.current?.(controllerRef.current)
  }, [])

  useEffect(() => {
    return () => {
      controllerRef.current?.destroy()
      controllerRef.current = null
      onHostControllerChangeRef.current?.(null)
    }
  }, [])

  const dispatchRuntimeReady = useCallback(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: PUBLIC_RUNTIME_READY_MESSAGE,
          songId
        },
        origin: window.location.origin,
        source: window
      })
    )
    onRuntimeReady?.()
  }, [onRuntimeReady, songId])

  return (
    <div
      ref={assignRootRef}
      className={
        className ??
        'relative overflow-hidden rounded-[24px] border border-[rgba(120,86,48,0.18)] bg-[#fffaf1] shadow-[0_18px_44px_rgba(70,45,24,0.1)]'
      }
      style={{
        ...style,
        height: `${height}px`
      }}
      data-public-runtime-container-host="active"
      data-public-runtime-root
      data-song-id={songId}
      role="region"
      aria-label={`${title} container runtime`}
    >
      <RuntimeStyleInjector assets={styleAssets} />
      <div
        ref={setRuntimeDomRoot}
        data-public-runtime-dom-root
        style={{
          height: `${height}px`
        }}
      />
      <RuntimeScriptLoader
        entries={scriptEntries}
        runtimeRoot={runtimeDomRoot}
        bodyHtml={bodyHtml}
        enabled={enableScriptLoader}
        label={`runtime-host:${songId}`}
        showDiagnostics={showScriptDiagnostics}
        onRuntimeReady={dispatchRuntimeReady}
        onDiagnosticsChange={onScriptDiagnosticsChange}
      />
      {enableScriptLoader && isLoading ? (
        <div
          id={loadingId}
          data-runtime-loading="true"
          className={
            overlayClassName
              ? `pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center ${overlayClassName}`
              : 'pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center bg-[#fffaf1]/96'
          }
        >
          <div className="runtime-loading-card" role="status" aria-live="polite">
            <div className="runtime-loading-notes" aria-hidden="true">
              <span>🎶</span>
              <span>♪</span>
              <span>♫</span>
            </div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-stone-800">
              Loading sheet...
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              The fingering chart is opening.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function createContainerRuntimeHostController(
  root: HTMLElement
): PublicRuntimeHostController {
  return {
    hostElement: root,
    containsEventTarget(target) {
      return target instanceof Node && root.contains(target)
    },
    destroy() {
      /**
       * React owns the host wrapper. Runtime DOM teardown is handled by the
       * container lifecycle hook and script bootstrap disposer.
       */
    },
    postMessage(message) {
      return dispatchContainerRuntimeCommand(message)
    }
  }
}
