'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ContainerRuntimeHostProps,
  PublicRuntimeHostController
} from './types'
import RuntimeScriptLoader from './RuntimeScriptLoader'
import RuntimeStyleInjector from './RuntimeStyleInjector'
import { PUBLIC_RUNTIME_READY_MESSAGE } from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'
import { subscribeToPublicRuntimeHostMessages } from '../PublicRuntimeHostController'
import { useRuntimeContainerMeasurement } from './useRuntimeContainerMeasurement'
import { useRuntimeHostLifecycle } from './useRuntimeHostLifecycle'
import { createContainerRuntimeHostController } from './lifecycle/containerRuntimeHostController'

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
  const [isRuntimeReady, setIsRuntimeReady] = useState(false)
  const controllerRef = useRef<PublicRuntimeHostController | null>(null)
  const onHostControllerChangeRef = useRef(onHostControllerChange)
  const onRuntimeReadyRef = useRef(onRuntimeReady)
  const { height, isLoading } = useRuntimeContainerMeasurement({
    songId,
    rootElement,
    runtimeRoot: runtimeDomRoot,
    enabled: enableScriptLoader,
    isRuntimeReady,
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

  useEffect(() => {
    onRuntimeReadyRef.current = onRuntimeReady
  }, [onRuntimeReady])

  useEffect(() => {
    setIsRuntimeReady(false)
  }, [bodyHtml, enableScriptLoader, songId])

  useEffect(() => {
    if (!enableScriptLoader) {
      return
    }

    let readyFrame: number | null = null
    const unsubscribe = subscribeToPublicRuntimeHostMessages(songId, message => {
      if (message.type !== PUBLIC_RUNTIME_READY_MESSAGE) {
        return
      }

      if (readyFrame !== null) {
        window.cancelAnimationFrame(readyFrame)
      }
      readyFrame = window.requestAnimationFrame(() => {
        readyFrame = null
        setIsRuntimeReady(current => {
          if (!current) {
            onRuntimeReadyRef.current?.()
          }
          return true
        })
      })
    })

    return () => {
      unsubscribe()
      if (readyFrame !== null) {
        window.cancelAnimationFrame(readyFrame)
      }
    }
  }, [enableScriptLoader, songId])

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

  const isRuntimeDomVisible = !enableScriptLoader || isRuntimeReady
  const shouldShowRuntimeLoading = enableScriptLoader && !isRuntimeReady && isLoading
  const visibleHeight = isRuntimeDomVisible ? height : initialHeight

  return (
    <div
      ref={assignRootRef}
      className={
        className ??
        'relative overflow-hidden rounded-[24px] border border-[rgba(120,86,48,0.18)] bg-[#fffaf1] shadow-[0_18px_44px_rgba(70,45,24,0.1)]'
      }
      style={{
        ...style,
        height: `${visibleHeight}px`
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
        data-public-runtime-dom-visible={isRuntimeDomVisible ? 'true' : 'false'}
        aria-hidden={isRuntimeDomVisible ? undefined : true}
        style={{
          height: `${visibleHeight}px`,
          visibility: isRuntimeDomVisible ? 'visible' : 'hidden'
        }}
      />
      <RuntimeScriptLoader
        entries={scriptEntries}
        runtimeRoot={runtimeDomRoot}
        bodyHtml={bodyHtml}
        enabled={enableScriptLoader}
        label={`runtime-host:${songId}`}
        showDiagnostics={showScriptDiagnostics}
        onDiagnosticsChange={onScriptDiagnosticsChange}
      />
      {shouldShowRuntimeLoading ? (
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
