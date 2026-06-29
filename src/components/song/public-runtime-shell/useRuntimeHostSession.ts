'use client'

import { useCallback, useEffect } from 'react'
import { getBrowserPerformanceNow, getBrowserWindow } from '@/lib/runtime-core/client/browserEnvironment'
import type { PublicRuntimeHostController } from '../PublicRuntimeHostController'
import type { PublicRuntimeHostDiagnostics } from './PublicRuntimeInteractiveShell'

type UseRuntimeHostSessionInput = {
  songId: string
  runtimeHostSessionKey: string
  runtimeHostQueryFlag: boolean
  runtimeHostDiagnostics?: PublicRuntimeHostDiagnostics
  runtimeHostControllerRef: React.MutableRefObject<PublicRuntimeHostController | null>
  runtimeHostMountedAtRef: React.MutableRefObject<number | null>
  runtimeReadyTrackedRef: React.MutableRefObject<string | null>
  runtimeReadyFallbackTimeoutRef: React.MutableRefObject<number | null>
  shouldMonitorRuntimeGlobalErrors: boolean
  recordRuntimeHostMonitorEvent: (
    type:
      | 'host_decision'
      | 'runtime_package_fetch_start'
      | 'runtime_package_fetch_end'
      | 'runtime_ready'
      | 'playback_open'
      | 'window_error'
      | 'unhandled_rejection',
    details?: Record<string, string | number | boolean | null>
  ) => void
  onRuntimeFrameReadyChange?: (ready: boolean) => void
  onRuntimeReady?: () => void
}

export function useRuntimeHostSession({
  songId,
  runtimeHostSessionKey,
  runtimeHostQueryFlag,
  runtimeHostDiagnostics,
  runtimeHostControllerRef,
  runtimeHostMountedAtRef,
  runtimeReadyTrackedRef,
  runtimeReadyFallbackTimeoutRef,
  shouldMonitorRuntimeGlobalErrors,
  recordRuntimeHostMonitorEvent,
  onRuntimeFrameReadyChange,
  onRuntimeReady
}: UseRuntimeHostSessionInput) {
  useEffect(() => {
    runtimeHostMountedAtRef.current = getBrowserPerformanceNow()
    runtimeReadyTrackedRef.current = null
    recordRuntimeHostMonitorEvent('host_decision', {
      queryFlag: runtimeHostQueryFlag,
      rolloutEnabled: runtimeHostDiagnostics?.rolloutEnabled ?? false,
      rolloutPercent: runtimeHostDiagnostics?.rolloutPercent ?? 0,
      rolloutBucket: runtimeHostDiagnostics?.rolloutBucket ?? null,
      isBot: runtimeHostDiagnostics?.isBot ?? false,
      reason: runtimeHostDiagnostics?.reason ?? null
    })
  }, [
    recordRuntimeHostMonitorEvent,
    runtimeHostDiagnostics,
    runtimeHostQueryFlag,
    runtimeHostMountedAtRef,
    runtimeReadyTrackedRef,
    runtimeHostSessionKey
  ])

  useEffect(() => {
    onRuntimeFrameReadyChange?.(false)
  }, [onRuntimeFrameReadyChange, runtimeHostSessionKey])

  useEffect(() => {
    const runtimeWindow = getBrowserWindow()
    if (!runtimeWindow || !shouldMonitorRuntimeGlobalErrors) {
      return
    }

    function handleWindowError(event: ErrorEvent) {
      recordRuntimeHostMonitorEvent('window_error', {
        message: event.message || 'window error',
        filename: event.filename || null,
        line: event.lineno || null
      })
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      recordRuntimeHostMonitorEvent('unhandled_rejection', {
        message: formatRuntimeMonitorError(event.reason)
      })
    }

    runtimeWindow.addEventListener('error', handleWindowError)
    runtimeWindow.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      runtimeWindow.removeEventListener('error', handleWindowError)
      runtimeWindow.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [recordRuntimeHostMonitorEvent, shouldMonitorRuntimeGlobalErrors])

  useEffect(
    () => () => {
      const runtimeWindow = getBrowserWindow()
      if (runtimeWindow && runtimeReadyFallbackTimeoutRef.current !== null) {
        runtimeWindow.clearTimeout(runtimeReadyFallbackTimeoutRef.current)
      }
      runtimeReadyFallbackTimeoutRef.current = null
      runtimeHostControllerRef.current = null
    },
    [runtimeHostControllerRef, runtimeHostSessionKey, runtimeReadyFallbackTimeoutRef]
  )

  const handleRuntimeFrameLoad = useCallback(() => {
    const runtimeWindow = getBrowserWindow()
    if (!runtimeWindow) {
      return
    }

    onRuntimeFrameReadyChange?.(true)
    onRuntimeReady?.()
    if (runtimeReadyTrackedRef.current === runtimeHostSessionKey) {
      return
    }

    runtimeReadyTrackedRef.current = runtimeHostSessionKey
    const mountedAt = runtimeHostMountedAtRef.current
    recordRuntimeHostMonitorEvent('runtime_ready', {
      readyMs: mountedAt ? Math.max(0, Math.round(getBrowserPerformanceNow() - mountedAt)) : null
    })
  }, [
    onRuntimeFrameReadyChange,
    onRuntimeReady,
    recordRuntimeHostMonitorEvent,
    runtimeHostMountedAtRef,
    runtimeHostSessionKey,
    runtimeReadyTrackedRef
  ])

  const handleRuntimeHostControllerChange = useCallback(
    (controller: PublicRuntimeHostController | null) => {
      const runtimeWindow = getBrowserWindow()
      runtimeHostControllerRef.current = controller
      if (controller && runtimeWindow && runtimeReadyTrackedRef.current !== runtimeHostSessionKey) {
        if (runtimeReadyFallbackTimeoutRef.current !== null) {
          runtimeWindow.clearTimeout(runtimeReadyFallbackTimeoutRef.current)
        }
        runtimeReadyFallbackTimeoutRef.current = runtimeWindow.setTimeout(() => {
          runtimeReadyFallbackTimeoutRef.current = null
          if (runtimeReadyTrackedRef.current === runtimeHostSessionKey) {
            return
          }

          runtimeReadyTrackedRef.current = runtimeHostSessionKey
          const mountedAt = runtimeHostMountedAtRef.current
          recordRuntimeHostMonitorEvent('runtime_ready', {
            readyMs: mountedAt
              ? Math.max(0, Math.round(getBrowserPerformanceNow() - mountedAt))
              : null,
            source: 'host-controller'
          })
        }, 250)
      }
    },
    [
      recordRuntimeHostMonitorEvent,
      runtimeHostControllerRef,
      runtimeHostMountedAtRef,
      runtimeHostSessionKey,
      runtimeReadyFallbackTimeoutRef,
      runtimeReadyTrackedRef
    ]
  )

  return { handleRuntimeFrameLoad, handleRuntimeHostControllerChange }
}

function formatRuntimeMonitorError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}
