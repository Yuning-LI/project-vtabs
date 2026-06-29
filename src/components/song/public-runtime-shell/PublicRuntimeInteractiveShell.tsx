'use client'

import { useCallback, useEffect, useRef } from 'react'
import { sendGaEvent } from '@/lib/analytics/ga'
import type { SongPresentation } from '@/lib/songbook/presentation'
import type {
  PublicSongPageQueryState,
  PublicSongInstrument
} from '@/lib/songbook/publicInstruments'
import ContainerRuntimeHost from '../runtime-host/ContainerRuntimeHost'
import {
  type PublicRuntimeHostController
} from '../PublicRuntimeHostController'
import { PUBLIC_RUNTIME_API_BASE_PATH } from '@/lib/runtime-core/publicRuntimePaths'
import {
  getBrowserPerformanceNow,
  getBrowserWindow
} from '@/lib/runtime-core/client/browserEnvironment'
import { scheduleRuntimeSoundfontIdlePreload } from '@/lib/runtime-core/client/soundfontIdlePreload'
import {
  PUBLIC_RUNTIME_CONTAINER_HOST_SIGNAL,
  LEGACY_RUNTIME_IFRAME_SIGNAL,
  type PublicRuntimeHostMode,
  type PublicRuntimeHostModeSource
} from '@/lib/runtime-core/publicRuntimeHostMode'
import { PublicRuntimeStatus } from './PublicRuntimeStatus'
import { PublicRuntimeToolbar } from './PublicRuntimeToolbar'
import { usePublicRuntimePlaybackState } from './usePublicRuntimePlayback'
import { usePublicRuntimeQueryState } from './usePublicRuntimeQueryState'
import {
  useRuntimePackageRequest,
  type PublicRuntimeContainerPackagePayload
} from './useRuntimePackageRequest'
import { useRuntimeHostSession } from './useRuntimeHostSession'
import { useRuntimeDisplaySettings } from './useRuntimeDisplaySettings'
import { useRuntimeSettingNavigation } from './useRuntimeSettingNavigation'
import { useRuntimePlaybackControls } from './useRuntimePlaybackControls'
import { useRuntimeDisplaySettingCommands } from './useRuntimeDisplaySettingCommands'

declare global {
  interface Window {
    __PUBLIC_RUNTIME_HOST_MONITOR__?: PublicRuntimeHostMonitorEvent[]
  }
}

export type PublicRuntimeControlPayload = {
  instrumentFingerings?: Array<{
    instrument: string
    instrumentName?: string
    fingeringsList?: Array<
      Array<{
        fingering: string
        fingeringName?: string
        tonalityName?: string
      }>
    >
    fingeringSetList?: Array<
      Array<{
        fingering: string
        fingeringName?: string
        tonalityName?: string
      }>
    >
    graphList?: Array<{
      name?: string
      value?: string
    }>
  }>
  sheetScaleList?: number[]
}

export type PublicRuntimeHostDiagnostics = {
  rolloutEnabled?: boolean
  rolloutPercent?: number
  rolloutBucket?: number | null
  isBot?: boolean
  reason?: string
}

type PublicRuntimeHostMonitorEvent = {
  type:
    | 'host_decision'
    | 'runtime_package_fetch_start'
    | 'runtime_package_fetch_end'
    | 'runtime_ready'
    | 'playback_open'
    | 'window_error'
    | 'unhandled_rejection'
  songId: string
  hostMode: PublicRuntimeHostMode
  source: PublicRuntimeHostModeSource
  timestamp: number
  details?: Record<string, string | number | boolean | null>
}

type PlaybackUiStatus = 'idle' | 'loading' | 'playing'

type PublicRuntimeInteractiveShellProps = {
  songId: string
  supportedInstruments: PublicSongInstrument[]
  queryState: PublicSongPageQueryState
  presentationByInstrument: Partial<Record<PublicSongInstrument['id'], SongPresentation>>
  runtimeControlPayload: PublicRuntimeControlPayload
  runtimeDefaultInstrumentId: string | null
  runtimeDefaultFingeringIndex: string | number | null
  runtimeDefaultShowGraph: string | null
  hasLyricToggle: boolean
  runtimeHostMode?: PublicRuntimeHostMode
  runtimeHostModeSource?: PublicRuntimeHostModeSource
  runtimeHostQueryFlag?: boolean
  runtimeHostDiagnostics?: PublicRuntimeHostDiagnostics
  containerRuntimePackage?: PublicRuntimeContainerPackagePayload | null
  seoSummary?: string | null
  pageBasePath?: string
  runtimeApiBasePath?: string
  backHref?: string
  backLabel?: string
  onRuntimeFrameReadyChange?: (ready: boolean) => void
}

export default function PublicRuntimeInteractiveShell({
  songId,
  supportedInstruments,
  queryState,
  presentationByInstrument,
  runtimeControlPayload,
  runtimeDefaultInstrumentId,
  runtimeDefaultFingeringIndex,
  runtimeDefaultShowGraph,
  hasLyricToggle,
  runtimeHostMode = LEGACY_RUNTIME_IFRAME_SIGNAL,
  runtimeHostModeSource = 'default',
  runtimeHostQueryFlag = false,
  runtimeHostDiagnostics,
  containerRuntimePackage = null,
  seoSummary = null,
  pageBasePath = '/song',
  runtimeApiBasePath = PUBLIC_RUNTIME_API_BASE_PATH,
  backHref = '/',
  backLabel = 'Back to Song Library',
  onRuntimeFrameReadyChange
}: PublicRuntimeInteractiveShellProps) {
  const {
    currentQueryState,
    applyRuntimeQueryStateFromUrl
  } = usePublicRuntimeQueryState(queryState)
  const {
    isPlaybackFeatureEnabled,
    setIsPlaybackFeatureEnabled,
    playbackStatus,
    setPlaybackStatus,
    isPlaybackPanelOpen,
    setIsPlaybackPanelOpen,
    playbackLoadingProgress,
    setPlaybackLoadingProgress,
    pendingPlaybackOpenRef,
    playbackLoadingIntervalRef,
    playbackLoadingStartTimeRef,
    playbackActivationPendingRef,
    clearPlaybackLoadingInterval,
    clearPlaybackActivationTimeout,
    startPlaybackActivationGuard,
    resolvePlaybackActivationGuard,
    resetPlaybackLoadingProgress,
    completePlaybackLoadingProgress
  } = usePublicRuntimePlaybackState()
  const runtimeHostControllerRef = useRef<PublicRuntimeHostController | null>(null)
  const trackedSongViewRef = useRef<string | null>(null)
  const previousSongRef = useRef<string | null>(null)
  const previousInstrumentRef = useRef<string | null>(null)
  const runtimeHostMountedAtRef = useRef<number | null>(null)
  const runtimeReadyTrackedRef = useRef<string | null>(null)
  const pendingPlaybackCommandTimeoutRef = useRef<number | null>(null)
  const runtimeReadyFallbackTimeoutRef = useRef<number | null>(null)
  const hasServerContainerRuntimePackage = Boolean(containerRuntimePackage)
  const shouldUseContainerRuntimeHost = true
  const activeRuntimeHostMode: PublicRuntimeHostMode = shouldUseContainerRuntimeHost
    ? PUBLIC_RUNTIME_CONTAINER_HOST_SIGNAL
    : runtimeHostMode
  const shouldEnablePlaybackRuntimeFeature = isPlaybackFeatureEnabled
  const recordRuntimeHostMonitorEvent = useCallback(
    (
      type: PublicRuntimeHostMonitorEvent['type'],
      details?: Record<string, string | number | boolean | null>
    ) => {
      const runtimeWindow = getBrowserWindow()
      if (!runtimeWindow) {
        return
      }

      const event: PublicRuntimeHostMonitorEvent = {
        type,
        songId,
        hostMode: activeRuntimeHostMode,
        source: runtimeHostModeSource,
        timestamp: Date.now(),
        details
      }
      runtimeWindow.__PUBLIC_RUNTIME_HOST_MONITOR__ = [
        ...(runtimeWindow.__PUBLIC_RUNTIME_HOST_MONITOR__ ?? []).slice(-49),
        event
      ]
      sendGaEvent('public_runtime_host_monitor', {
        signal_type: type,
        song_slug: songId,
        runtime_host_mode: activeRuntimeHostMode,
        runtime_host_source: runtimeHostModeSource,
        rollout_enabled: runtimeHostDiagnostics?.rolloutEnabled ?? false,
        rollout_percent: runtimeHostDiagnostics?.rolloutPercent ?? 0,
        rollout_bucket: runtimeHostDiagnostics?.rolloutBucket ?? null,
        is_bot: runtimeHostDiagnostics?.isBot ?? false
      })
    },
    [activeRuntimeHostMode, runtimeHostDiagnostics, runtimeHostModeSource, songId]
  )
  const recordRuntimePackageFetchEvent = useCallback(
    (type: 'runtime_package_fetch_start' | 'runtime_package_fetch_end', details?: Record<string, string | number | boolean | null>) => {
      recordRuntimeHostMonitorEvent(type, details)
    },
    [recordRuntimeHostMonitorEvent]
  )
  const display = useRuntimeDisplaySettings({
    songId,
    supportedInstruments,
    queryState: currentQueryState,
    runtimeControlPayload,
    runtimeDefaultInstrumentId,
    runtimeDefaultFingeringIndex,
    runtimeDefaultShowGraph,
    hasLyricToggle,
    activeRuntimeHostMode,
    runtimeApiBasePath,
    shouldEnablePlaybackRuntimeFeature,
    pageBasePath
  })
  const {
    activeInstrument,
    normalizedQueryState,
    noteLabelMode,
    runtimeQueryString,
    runtimeHostSessionKey,
    selects,
    toggles
  } = display
  const seo =
    presentationByInstrument[activeInstrument.id] ??
    presentationByInstrument['o12'] ??
    Object.values(presentationByInstrument)[0] ?? {
      title: songId,
      aliases: [],
      metaTitle: null,
      subtitle: null,
      familyLabel: 'Melody Page',
      difficultyLabel: 'Unknown',
      keyLabel: '',
      meterLabel: '',
      tempoLabel: '',
      overview: '',
      background: '',
      practiceNotes: '',
      includes: [],
      faqs: [],
      metaDescription: ''
    }
  const title = seo.title
  const subtitle = seo.subtitle
  const {
    runtimePackageRequest,
    activeContainerRuntimePackage,
    isRuntimePackageLoading
  } = useRuntimePackageRequest({
    songId,
    runtimeApiBasePath,
    runtimeQueryString,
    shouldUseContainerRuntimeHost,
    hasServerContainerRuntimePackage: Boolean(containerRuntimePackage),
    initialActivePackage: containerRuntimePackage,
    recordRuntimePackageFetchEvent
  })
  const loadingId = `public-runtime-${songId}-loading`
  const shouldMonitorRuntimeGlobalErrors =
    runtimeHostQueryFlag ||
    Boolean(runtimeHostDiagnostics?.rolloutEnabled) ||
    process.env.NODE_ENV !== 'production'
  const { navigateWithinSongPage } = useRuntimeSettingNavigation({
    songId,
    pageBasePath,
    activeInstrumentId: activeInstrument.id,
    noteLabelMode,
    runtimeQueryString,
    applyRuntimeQueryStateFromUrl
  })
  const { applyRuntimeDisplaySettings } = useRuntimeDisplaySettingCommands({
    songId,
    sheetScale: normalizedQueryState.sheetScale,
    showGraph: normalizedQueryState.showGraph ?? display.controlConfig.activeGraphValue,
    showLyric: hasLyricToggle ? normalizedQueryState.showLyric ?? 'on' : null,
    showMeasureNum: normalizedQueryState.showMeasureNum ?? 'off',
    enabled: Boolean(activeContainerRuntimePackage),
    runtimeHostControllerRef
  })

  useEffect(() => {
    setIsPlaybackPanelOpen(false)
  }, [runtimeHostSessionKey, setIsPlaybackPanelOpen])

  useEffect(() => {
    const controller = scheduleRuntimeSoundfontIdlePreload({
      enabled: shouldEnablePlaybackRuntimeFeature
    })

    return () => {
      controller.cancel()
    }
  }, [shouldEnablePlaybackRuntimeFeature, runtimeHostSessionKey])

  useEffect(() => {
    const runtimeWindow = getBrowserWindow()
    if (!runtimeWindow) {
      return
    }

    if (playbackStatus !== 'loading') {
      if (playbackStatus === 'playing') {
        completePlaybackLoadingProgress()
      } else {
        resetPlaybackLoadingProgress()
      }
      return
    }

    if (playbackLoadingStartTimeRef.current === null) {
      playbackLoadingStartTimeRef.current = getBrowserPerformanceNow()
      setPlaybackLoadingProgress(0)
    }

    if (playbackLoadingIntervalRef.current !== null) {
      return
    }

    const syntheticLoadingDurationMs = 5300

    playbackLoadingIntervalRef.current = runtimeWindow.setInterval(() => {
      const startedAt = playbackLoadingStartTimeRef.current ?? getBrowserPerformanceNow()
      setPlaybackLoadingProgress(current => {
        const elapsed = Math.max(0, getBrowserPerformanceNow() - startedAt)
        const ratio = Math.min(1, elapsed / syntheticLoadingDurationMs)
        const easedRatio = 1 - Math.pow(1 - ratio, 2.2)
        const next = Math.min(95, Math.round(easedRatio * 95))
        return next > current ? next : current
      })
    }, 180)

    return () => {
      clearPlaybackLoadingInterval()
    }
  }, [
    clearPlaybackLoadingInterval,
    completePlaybackLoadingProgress,
    playbackLoadingIntervalRef,
    playbackLoadingStartTimeRef,
    playbackStatus,
    resetPlaybackLoadingProgress,
    setPlaybackLoadingProgress
  ])

  useEffect(() => {
    if (playbackStatus === 'loading' && isPlaybackPanelOpen) {
      completePlaybackLoadingProgress()
    }
  }, [completePlaybackLoadingProgress, isPlaybackPanelOpen, playbackStatus])

  useEffect(() => {
    if (trackedSongViewRef.current === songId) {
      return
    }

    trackedSongViewRef.current = songId
    sendGaEvent('song_page_view', {
      song_slug: songId,
      instrument_id: activeInstrument.id,
      note_label_mode: noteLabelMode,
      has_lyric_toggle: hasLyricToggle
    })
  }, [activeInstrument.id, hasLyricToggle, noteLabelMode, songId])

  useEffect(() => {
    if (previousSongRef.current !== songId) {
      previousSongRef.current = songId
      previousInstrumentRef.current = activeInstrument.id
      return
    }

    if (!previousInstrumentRef.current) {
      previousInstrumentRef.current = activeInstrument.id
      return
    }

    if (previousInstrumentRef.current !== activeInstrument.id) {
      sendGaEvent('instrument_switch', {
        song_slug: songId,
        from_instrument_id: previousInstrumentRef.current,
        to_instrument_id: activeInstrument.id,
        note_label_mode: noteLabelMode
      })
      previousInstrumentRef.current = activeInstrument.id
    }
  }, [activeInstrument.id, noteLabelMode, songId])

  const {
    actions,
    handleRuntimeReadyPlaybackCommand
  } = useRuntimePlaybackControls({
    songId,
    activeInstrumentId: activeInstrument.id,
    noteLabelMode,
    shouldUseContainerRuntimeHost,
    isPlaybackFeatureEnabled,
    setIsPlaybackFeatureEnabled,
    playbackStatus,
    setPlaybackStatus,
    isPlaybackPanelOpen,
    setIsPlaybackPanelOpen,
    playbackLoadingProgress,
    pendingPlaybackOpenRef,
    playbackActivationPendingRef,
    pendingPlaybackCommandTimeoutRef,
    runtimeHostControllerRef,
    resolvePlaybackActivationGuard,
    startPlaybackActivationGuard,
    recordRuntimeHostMonitorEvent
  })
  const handleRuntimeReady = useCallback(() => {
    handleRuntimeReadyPlaybackCommand()
    applyRuntimeDisplaySettings()
  }, [applyRuntimeDisplaySettings, handleRuntimeReadyPlaybackCommand])

  const {
    handleRuntimeFrameLoad,
    handleRuntimeHostControllerChange
  } = useRuntimeHostSession({
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
    onRuntimeReady: handleRuntimeReady
  })

  useEffect(
    () => () => {
      clearPlaybackLoadingInterval()
      clearPlaybackActivationTimeout()
      const runtimeWindow = getBrowserWindow()
      if (runtimeWindow && pendingPlaybackCommandTimeoutRef.current !== null) {
        runtimeWindow.clearTimeout(pendingPlaybackCommandTimeoutRef.current)
      }
      pendingPlaybackCommandTimeoutRef.current = null
    },
    [
      clearPlaybackActivationTimeout,
      clearPlaybackLoadingInterval
    ]
  )

  useEffect(
    () => () => {
      const runtimeWindow = getBrowserWindow()
      if (runtimeWindow && pendingPlaybackCommandTimeoutRef.current !== null) {
        runtimeWindow.clearTimeout(pendingPlaybackCommandTimeoutRef.current)
      }
      pendingPlaybackCommandTimeoutRef.current = null
    },
    [
      runtimeHostSessionKey
    ]
  )

  return (
    <>
      <PublicRuntimeToolbar
        backHref={backHref}
        backLabel={backLabel}
        title={title}
        subtitle={subtitle}
        seoSummary={seoSummary}
        selects={selects}
        toggles={toggles}
        actions={actions}
        onNavigate={navigateWithinSongPage}
        songId={songId}
        runtimeHostMode={runtimeHostMode}
        normalizedQueryState={normalizedQueryState}
        pageBasePath={pageBasePath}
        runtimeHostModeSource={runtimeHostModeSource}
        runtimeHostQueryFlag={runtimeHostQueryFlag}
      />

      <div className="mt-1 md:mt-0" data-public-runtime-host-mode={activeRuntimeHostMode}>
        {activeContainerRuntimePackage ? (
          <ContainerRuntimeHost
            key={runtimeHostSessionKey}
            songId={songId}
            title={title}
            bodyHtml={activeContainerRuntimePackage.bodyHtml}
            styleAssets={activeContainerRuntimePackage.styles}
            scriptEntries={activeContainerRuntimePackage.scriptEntries}
            enableScriptLoader
            className="page-warm-panel relative overflow-hidden"
            loadingId={loadingId}
            initialHeight={320}
            showScriptDiagnostics={false}
            onHostControllerChange={handleRuntimeHostControllerChange}
            onRuntimeReady={handleRuntimeFrameLoad}
          />
        ) : shouldUseContainerRuntimeHost ? (
          <PublicRuntimePackageLoading
            isLoading={isRuntimePackageLoading}
            errorMessage={runtimePackageRequest.errorMessage}
          />
        ) : (
          <PublicRuntimeStatus />
        )}
      </div>
    </>
  )
}

function PublicRuntimePackageLoading({
  isLoading,
  errorMessage
}: {
  isLoading: boolean
  errorMessage: string | null
}) {
  return (
    <div
      className="page-warm-panel relative overflow-hidden px-6 py-8 text-sm font-semibold text-stone-700"
      role={errorMessage ? 'alert' : 'status'}
      aria-live="polite"
      data-public-runtime-package-loading={isLoading ? 'true' : undefined}
      data-public-runtime-package-error={errorMessage ? 'true' : undefined}
    >
      {errorMessage ? `Sheet runtime failed to reload. ${errorMessage}` : 'Loading sheet...'}
    </div>
  )
}
