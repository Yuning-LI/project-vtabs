'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { sendGaEvent } from '@/lib/analytics/ga'
import type { SongPresentation } from '@/lib/songbook/presentation'
import {
  buildSongPageHref,
  type PublicSongPageQueryState,
  type PublicSongInstrument
} from '@/lib/songbook/publicInstruments'
import {
  normalizeExplicitNoteLabelMode,
  normalizeFingeringIndex,
  normalizeMeasureLayout,
  normalizePracticeTool,
  normalizeSheetScale,
  normalizeToggleParam
} from '@/lib/songbook/songPageQueryState'
import {
  buildPublicRuntimeControlConfig,
  getPublicRuntimeFingeringControlLabel,
  getPublicRuntimeFingeringOptions,
  getPublicRuntimeGraphOptions
} from '@/lib/songbook/publicRuntimeControls'
import ContainerRuntimeHost from '../runtime-host/ContainerRuntimeHost'
import { dispatchContainerRuntimeCommand } from '../runtime-host/containerRuntimeTransport'
import {
  subscribeToPublicRuntimeHostMessages,
  type PublicRuntimeHostController
} from '../PublicRuntimeHostController'
import type {
  SongPageFunctionZoneActionControl,
  SongPageFunctionZoneSelectControl,
  SongPageFunctionZoneToggleControl
} from '../SongPageFunctionZone'
import { SONG_PAGE_LINK_STATE_EVENT } from '@/lib/songbook/practicePairTypes'
import {
  PUBLIC_RUNTIME_PLAYBACK_CLOSE_PANEL_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_OPEN_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_PANEL_STATUS_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_STATUS_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_STOP_MESSAGE
} from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'
import { PUBLIC_RUNTIME_API_BASE_PATH } from '@/lib/runtime-core/publicRuntimePaths'
import type { RuntimeScriptEntry } from '@/lib/runtime-core/runtimeScriptTypes'
import {
  normalizePublicRuntimeHostMode,
  type PublicRuntimeHostMode,
  type PublicRuntimeHostModeSource
} from '@/lib/runtime-core/publicRuntimeHostMode'
import { PublicRuntimeStatus } from './PublicRuntimeStatus'
import { PublicRuntimeToolbar } from './PublicRuntimeToolbar'
import { normalizeExplicitShowGraph } from './usePublicRuntimeControls'
import { usePublicRuntimePlaybackState } from './usePublicRuntimePlayback'
import { usePublicRuntimeQueryState } from './usePublicRuntimeQueryState'

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

export type PublicRuntimeContainerPackagePayload = {
  bodyHtml: string
  styles: Array<{
    src: string
  }>
  scriptEntries: RuntimeScriptEntry[]
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
  runtimeHostMode = 'iframe',
  runtimeHostModeSource = 'default',
  runtimeHostQueryFlag = false,
  runtimeHostDiagnostics,
  containerRuntimePackage = null,
  pageBasePath = '/song',
  runtimeApiBasePath = PUBLIC_RUNTIME_API_BASE_PATH,
  backHref = '/',
  backLabel = 'Back to Song Library',
  onRuntimeFrameReadyChange
}: PublicRuntimeInteractiveShellProps) {
  const currentQueryState = usePublicRuntimeQueryState(queryState)
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

  const activeInstrument = useMemo(
    () =>
      supportedInstruments.find(instrument => instrument.id === currentQueryState.instrumentId) ??
      supportedInstruments.find(instrument => instrument.id === 'o12') ??
      supportedInstruments[0],
    [currentQueryState.instrumentId, supportedInstruments]
  )
  const graphOptions = useMemo(
    () => getPublicRuntimeGraphOptions(runtimeControlPayload, activeInstrument.id),
    [runtimeControlPayload, activeInstrument.id]
  )
  const fingeringOptions = useMemo(
    () => getPublicRuntimeFingeringOptions(runtimeControlPayload, activeInstrument.id),
    [runtimeControlPayload, activeInstrument.id]
  )
  const normalizedQueryState: PublicSongPageQueryState = useMemo(
    () => ({
      instrumentId:
        currentQueryState.instrumentId === activeInstrument.id ? activeInstrument.id : null,
      fingeringIndex: normalizeFingeringIndex(
        currentQueryState.fingeringIndex,
        fingeringOptions.map(item => item.value)
      ),
      noteLabelMode: normalizeExplicitNoteLabelMode(currentQueryState.noteLabelMode),
      showGraph: normalizeExplicitShowGraph(
        currentQueryState.showGraph,
        graphOptions.map(item => item.value)
      ),
      showLyric: hasLyricToggle ? normalizeToggleParam(currentQueryState.showLyric) : null,
      showNoteRange: normalizeToggleParam(currentQueryState.showNoteRange),
      showMeasureNum: normalizeToggleParam(currentQueryState.showMeasureNum),
      measureLayout: normalizeMeasureLayout(currentQueryState.measureLayout),
      sheetScale: normalizeSheetScale(
        currentQueryState.sheetScale,
        runtimeControlPayload.sheetScaleList
      ),
      practiceTool: normalizePracticeTool(currentQueryState.practiceTool),
      runtimeVisualTheme: currentQueryState.runtimeVisualTheme === 'off' ? 'off' : null,
      runtimeHost: normalizePublicRuntimeHostMode(currentQueryState.runtimeHost)
    }),
    [
      activeInstrument.id,
      currentQueryState,
      fingeringOptions,
      graphOptions,
      hasLyricToggle,
      runtimeControlPayload.sheetScaleList
    ]
  )
  const activeRuntimeHostMode: PublicRuntimeHostMode = containerRuntimePackage
    ? 'container'
    : runtimeHostMode
  const shouldEnablePlaybackRuntimeFeature = containerRuntimePackage
    ? true
    : isPlaybackFeatureEnabled
  const recordRuntimeHostMonitorEvent = useCallback(
    (
      type: PublicRuntimeHostMonitorEvent['type'],
      details?: Record<string, string | number | boolean | null>
    ) => {
      if (typeof window === 'undefined') {
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
      window.__PUBLIC_RUNTIME_HOST_MONITOR__ = [
        ...(window.__PUBLIC_RUNTIME_HOST_MONITOR__ ?? []).slice(-49),
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
  const noteLabelMode =
    normalizedQueryState.noteLabelMode === 'number' ||
    normalizedQueryState.noteLabelMode === 'graph'
      ? normalizedQueryState.noteLabelMode
      : 'letter'
  const controlFingeringIndex =
    normalizedQueryState.fingeringIndex ??
    (activeInstrument.id === 'o12'
      ? normalizeFingeringIndex(
          runtimeDefaultFingeringIndex,
          fingeringOptions.map(item => item.value)
        )
      : null)
  const controlConfig = useMemo(
    () =>
      buildPublicRuntimeControlConfig(runtimeControlPayload, activeInstrument.id, {
        fingering_index: controlFingeringIndex,
        show_graph: normalizedQueryState.showGraph ?? null,
        show_lyric: (normalizedQueryState.showLyric ?? 'on') as 'on' | 'off',
        show_note_range: (normalizedQueryState.showNoteRange ?? 'off') as 'on' | 'off',
        show_measure_num: (normalizedQueryState.showMeasureNum ?? 'off') as 'on' | 'off',
        measure_layout: normalizedQueryState.measureLayout ?? 'compact',
        sheet_scale: normalizedQueryState.sheetScale ?? 10
      }),
    [activeInstrument.id, controlFingeringIndex, normalizedQueryState, runtimeControlPayload]
  )
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
  const hasNonStandardRuntimeDefaultInstrument =
    Boolean(runtimeDefaultInstrumentId) &&
    runtimeDefaultInstrumentId !== 'none' &&
    runtimeDefaultInstrumentId !== 'o12'
  const shouldPinDefaultInstrument =
    activeInstrument.id === 'o12' && hasNonStandardRuntimeDefaultInstrument
  const shouldPinDefaultGraphDirection =
    !normalizedQueryState.showGraph &&
    controlConfig.activeGraphVisibility === 'on' &&
    Boolean(controlConfig.activeGraphValue) &&
    hasNonStandardRuntimeDefaultInstrument &&
    activeInstrument.id === runtimeDefaultInstrumentId &&
    controlConfig.activeGraphValue !== runtimeDefaultShowGraph
  const runtimeInitialFingeringIndex =
    controlConfig.fingeringOptions[0]?.value ?? null
  const runtimeDefaultShowLyric = hasLyricToggle ? 'on' : null
  const runtimeDefaultShowMeasureNum = 'off'
  const runtimeDefaultMeasureLayout = 'compact'
  const runtimeDefaultSheetScale = controlConfig.scaleOptions[0]?.value ?? String(
    runtimeControlPayload.sheetScaleList?.[0] ?? 10
  )
  const params = useMemo(() => {
    const next = new URLSearchParams()
    next.set('runtime_text_mode', 'english')
    next.set('runtime_visual_theme', normalizedQueryState.runtimeVisualTheme ?? 'classic')
    if (activeInstrument.id !== 'o12' || shouldPinDefaultInstrument) {
      next.set('instrument', activeInstrument.id)
    }
    if (
      normalizedQueryState.fingeringIndex !== null &&
      normalizedQueryState.fingeringIndex !== undefined &&
      normalizedQueryState.fingeringIndex !== '' &&
      String(normalizedQueryState.fingeringIndex) !== runtimeInitialFingeringIndex
    ) {
      next.set('fingering_index', String(normalizedQueryState.fingeringIndex))
    }
    if (noteLabelMode !== 'letter') {
      next.set('note_label_mode', noteLabelMode)
    }
    if (normalizedQueryState.showGraph) {
      next.set('show_graph', normalizedQueryState.showGraph)
    } else if (shouldPinDefaultGraphDirection && controlConfig.activeGraphValue) {
      next.set('show_graph', controlConfig.activeGraphValue)
    }
    if (
      normalizedQueryState.showLyric &&
      normalizedQueryState.showLyric !== runtimeDefaultShowLyric
    ) {
      next.set('show_lyric', normalizedQueryState.showLyric)
    }
    if (normalizedQueryState.showNoteRange) {
      next.set('show_note_range', normalizedQueryState.showNoteRange)
    }
    if (
      normalizedQueryState.showMeasureNum &&
      normalizedQueryState.showMeasureNum !== runtimeDefaultShowMeasureNum
    ) {
      next.set('show_measure_num', normalizedQueryState.showMeasureNum)
    }
    if (
      normalizedQueryState.measureLayout &&
      normalizedQueryState.measureLayout !== runtimeDefaultMeasureLayout
    ) {
      next.set('measure_layout', normalizedQueryState.measureLayout)
    }
    if (
      normalizedQueryState.sheetScale !== null &&
      normalizedQueryState.sheetScale !== undefined &&
      normalizedQueryState.sheetScale !== '' &&
      String(normalizedQueryState.sheetScale) !== runtimeDefaultSheetScale
    ) {
      next.set('sheet_scale', String(normalizedQueryState.sheetScale))
    }
    if (normalizedQueryState.practiceTool === 'metronome') {
      next.append('public_feature', 'metronome')
    }
    if (shouldEnablePlaybackRuntimeFeature) {
      next.append('public_feature', 'playback')
    }
    return next
  }, [
    activeInstrument.id,
    controlConfig.activeGraphValue,
    normalizedQueryState,
    noteLabelMode,
    runtimeInitialFingeringIndex,
    runtimeDefaultMeasureLayout,
    runtimeDefaultSheetScale,
    runtimeDefaultShowLyric,
    runtimeDefaultShowMeasureNum,
    shouldEnablePlaybackRuntimeFeature,
    shouldPinDefaultGraphDirection,
    shouldPinDefaultInstrument
  ])
  const runtimeQueryString = params.toString()
  const runtimeHostSessionKey = `${activeRuntimeHostMode}:${runtimeApiBasePath}:${songId}:${runtimeQueryString}`
  const loadingId = `public-runtime-${songId}-loading`
  const pageHref = useCallback(
    (nextQueryState: PublicSongPageQueryState & { songId?: string }) =>
      buildSongPageHref({
        songId,
        basePath: pageBasePath,
        ...nextQueryState
      }),
    [pageBasePath, songId]
  )

  useEffect(() => {
    setIsPlaybackPanelOpen(false)
  }, [runtimeHostSessionKey])

  useEffect(() => {
    runtimeHostMountedAtRef.current = performance.now()
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
    runtimeHostSessionKey
  ])

  useEffect(() => {
    onRuntimeFrameReadyChange?.(false)
  }, [onRuntimeFrameReadyChange, runtimeHostSessionKey])

  useEffect(() => {
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

    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [recordRuntimeHostMonitorEvent])

  useEffect(() => {
    if (playbackStatus !== 'loading') {
      if (playbackStatus === 'playing') {
        completePlaybackLoadingProgress()
      } else {
        resetPlaybackLoadingProgress()
      }
      return
    }

    if (playbackLoadingStartTimeRef.current === null) {
      playbackLoadingStartTimeRef.current = performance.now()
      setPlaybackLoadingProgress(0)
    }

    if (playbackLoadingIntervalRef.current !== null) {
      return
    }

    const syntheticLoadingDurationMs = 5300

    playbackLoadingIntervalRef.current = window.setInterval(() => {
      const startedAt = playbackLoadingStartTimeRef.current ?? performance.now()
      setPlaybackLoadingProgress(current => {
        const elapsed = Math.max(0, performance.now() - startedAt)
        const ratio = Math.min(1, elapsed / syntheticLoadingDurationMs)
        const easedRatio = 1 - Math.pow(1 - ratio, 2.2)
        const next = Math.min(95, Math.round(easedRatio * 95))
        return next > current ? next : current
      })
    }, 90)

    return () => {
      clearPlaybackLoadingInterval()
    }
  }, [
    clearPlaybackLoadingInterval,
    completePlaybackLoadingProgress,
    playbackStatus,
    resetPlaybackLoadingProgress
  ])

  useEffect(() => {
    if (playbackStatus === 'loading' && isPlaybackPanelOpen) {
      completePlaybackLoadingProgress()
    }
  }, [completePlaybackLoadingProgress, isPlaybackPanelOpen, playbackStatus])

  useEffect(
    () => () => {
      clearPlaybackLoadingInterval()
      clearPlaybackActivationTimeout()
    },
    [clearPlaybackActivationTimeout, clearPlaybackLoadingInterval]
  )

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
    if (typeof window === 'undefined') {
      return
    }

    window.dispatchEvent(
      new CustomEvent(SONG_PAGE_LINK_STATE_EVENT, {
        detail: {
          instrumentId: activeInstrument.id,
          noteLabelMode
        }
      })
    )
  }, [activeInstrument.id, noteLabelMode, runtimeQueryString])

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

  function navigateWithinSongPage(href: string) {
    if (!href || typeof window === 'undefined') {
      return
    }

    const nextUrl = new URL(href, window.location.origin)
    if (nextUrl.pathname !== `${pageBasePath}/${songId}`) {
      window.location.replace(nextUrl.toString())
      return
    }

    window.location.replace(nextUrl.toString())
  }

  useEffect(
    () =>
      subscribeToPublicRuntimeHostMessages(songId, data => {
        if (data.type === PUBLIC_RUNTIME_PLAYBACK_PANEL_STATUS_MESSAGE) {
          if (data.isOpen) {
            resolvePlaybackActivationGuard()
          }
          setIsPlaybackPanelOpen(Boolean(data.isOpen))
          return
        }

        if (data.type !== PUBLIC_RUNTIME_PLAYBACK_STATUS_MESSAGE) {
          return
        }

        if (data.status === 'idle' || data.status === 'loading' || data.status === 'playing') {
          if (
            (pendingPlaybackOpenRef.current || playbackActivationPendingRef.current) &&
            data.status === 'idle'
          ) {
            return
          }
          if (data.status === 'loading' || data.status === 'playing') {
            resolvePlaybackActivationGuard()
          }
          setPlaybackStatus(data.status)
        }
      }),
    [resolvePlaybackActivationGuard, songId]
  )

  const postPlaybackCommandMessage = useCallback(
    (action: 'open' | 'stop' | 'close') => {
      if (typeof window === 'undefined') {
        return false
      }

      const message = {
        type:
          action === 'stop'
            ? PUBLIC_RUNTIME_PLAYBACK_STOP_MESSAGE
            : action === 'close'
              ? PUBLIC_RUNTIME_PLAYBACK_CLOSE_PANEL_MESSAGE
              : PUBLIC_RUNTIME_PLAYBACK_OPEN_MESSAGE,
        songId
      }
      const runtimeHost = runtimeHostControllerRef.current
      if (runtimeHost?.postMessage(message)) {
        return true
      }

      if (containerRuntimePackage) {
        return dispatchContainerRuntimeCommand(message)
      }

      return false
    },
    [containerRuntimePackage, songId]
  )

  useEffect(() => {
    function handleRuntimePlaybackCloseClick(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) {
        return
      }

      if (!target.closest('.vtabs-public-playback-close')) {
        return
      }

      if (!runtimeHostControllerRef.current?.containsEventTarget(target)) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      postPlaybackCommandMessage('close')
    }

    document.addEventListener('click', handleRuntimePlaybackCloseClick, true)
    return () => {
      document.removeEventListener('click', handleRuntimePlaybackCloseClick, true)
    }
  }, [postPlaybackCommandMessage])

  useEffect(() => {
    if (!isPlaybackPanelOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      if (
        target instanceof Element &&
        target.closest('a, button, select, input, textarea, label, summary, [role="button"]')
      ) {
        return
      }

      if (runtimeHostControllerRef.current?.containsEventTarget(target)) {
        return
      }

      postPlaybackCommandMessage('close')
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isPlaybackPanelOpen, postPlaybackCommandMessage])

  const handlePlaybackAction = useCallback(() => {
    if (playbackStatus === 'loading') {
      return
    }

    if (playbackStatus === 'playing') {
      sendGaEvent('song_playback_stop', {
        song_slug: songId,
        instrument_id: activeInstrument.id,
        note_label_mode: noteLabelMode
      })
      if (postPlaybackCommandMessage('stop')) {
        resolvePlaybackActivationGuard()
        setPlaybackStatus('idle')
      }
      return
    }

    pendingPlaybackOpenRef.current = true
    startPlaybackActivationGuard()
    setPlaybackStatus('loading')
    sendGaEvent('song_playback_open', {
      song_slug: songId,
      instrument_id: activeInstrument.id,
      note_label_mode: noteLabelMode
    })
    recordRuntimeHostMonitorEvent('playback_open', {
      instrumentId: activeInstrument.id,
      noteLabelMode
    })

    if (!isPlaybackFeatureEnabled) {
      setIsPlaybackFeatureEnabled(true)
      if (activeRuntimeHostMode !== 'container') {
        return
      }
    }

    if (postPlaybackCommandMessage('open')) {
      pendingPlaybackOpenRef.current = false
    }
  }, [
    activeInstrument.id,
    activeRuntimeHostMode,
    isPlaybackFeatureEnabled,
    noteLabelMode,
    playbackStatus,
    postPlaybackCommandMessage,
    recordRuntimeHostMonitorEvent,
    resolvePlaybackActivationGuard,
    songId,
    startPlaybackActivationGuard
  ])

  const handleRuntimeFrameLoad = useCallback(() => {
    onRuntimeFrameReadyChange?.(true)
    if (runtimeReadyTrackedRef.current !== runtimeHostSessionKey) {
      runtimeReadyTrackedRef.current = runtimeHostSessionKey
      const mountedAt = runtimeHostMountedAtRef.current
      recordRuntimeHostMonitorEvent('runtime_ready', {
        readyMs: mountedAt ? Math.max(0, Math.round(performance.now() - mountedAt)) : null
      })
    }

    if (
      !pendingPlaybackOpenRef.current ||
      (!containerRuntimePackage && !isPlaybackFeatureEnabled)
    ) {
      return
    }

    window.setTimeout(() => {
      if (postPlaybackCommandMessage('open')) {
        pendingPlaybackOpenRef.current = false
      }
    }, 80)
  }, [
    containerRuntimePackage,
    isPlaybackFeatureEnabled,
    onRuntimeFrameReadyChange,
    postPlaybackCommandMessage,
    recordRuntimeHostMonitorEvent,
    runtimeHostSessionKey
  ])

  const handleRuntimeHostControllerChange = useCallback(
    (controller: PublicRuntimeHostController | null) => {
      runtimeHostControllerRef.current = controller
      if (controller && runtimeReadyTrackedRef.current !== runtimeHostSessionKey) {
        window.setTimeout(() => {
          if (runtimeReadyTrackedRef.current === runtimeHostSessionKey) {
            return
          }

          runtimeReadyTrackedRef.current = runtimeHostSessionKey
          const mountedAt = runtimeHostMountedAtRef.current
          recordRuntimeHostMonitorEvent('runtime_ready', {
            readyMs: mountedAt ? Math.max(0, Math.round(performance.now() - mountedAt)) : null,
            source: 'host-controller'
          })
        }, 250)
      }
    },
    [recordRuntimeHostMonitorEvent, runtimeHostSessionKey]
  )

  const instrumentSelect =
    supportedInstruments.length > 1
      ? {
          id: 'instrument',
          label: 'Instrument',
          value: activeInstrument.id,
          options: supportedInstruments.map(instrument => ({
            value: instrument.id,
            label: instrument.shortLabel,
            href: pageHref({
              songId,
              ...normalizedQueryState,
              instrumentId: instrument.id,
              fingeringIndex: null,
              noteLabelMode,
              showGraph: null
            })
          }))
        }
      : null

  const fingeringSelect =
    controlConfig.fingeringOptions.length > 1 && controlConfig.activeFingeringIndex !== null
      ? {
          id: 'fingering-key',
          label: getPublicRuntimeFingeringControlLabel(activeInstrument.id),
          value: controlConfig.activeFingeringIndex,
          options: controlConfig.fingeringOptions.map(option => ({
            value: option.value,
            label: option.label,
            href: pageHref({
              songId,
              ...normalizedQueryState,
              instrumentId: activeInstrument.id,
              fingeringIndex: option.value,
              noteLabelMode
            })
          }))
        }
      : null

  const noteViewSelect = {
    id: 'note-view',
    label: 'Note Labels',
    value: noteLabelMode,
    options: [
      {
        value: 'letter',
        label: 'Letter Notes',
        href: pageHref({
          songId,
          ...normalizedQueryState,
          instrumentId: activeInstrument.id,
          noteLabelMode: 'letter'
        })
      },
      {
        value: 'number',
        label: 'Numbered Notes',
        href: pageHref({
          songId,
          ...normalizedQueryState,
          instrumentId: activeInstrument.id,
          noteLabelMode: 'number'
        })
      }
    ]
  }

  const layoutSelect = {
    id: 'layout',
    label: 'Layout',
    value: controlConfig.activeMeasureLayout,
    options: ([
      { value: 'compact', label: 'Compact' },
      { value: 'mono', label: 'Equal Width' }
    ] as const).map(option => ({
      value: option.value,
      label: option.label,
      href: pageHref({
        songId,
        ...normalizedQueryState,
        instrumentId: activeInstrument.id,
        noteLabelMode,
        measureLayout: option.value
      })
    }))
  }

  const chartDirectionSelect =
    controlConfig.graphOptions.length > 1
      ? {
          id: 'chart-direction',
          label: 'Diagram Direction',
          value: controlConfig.activeGraphValue ?? controlConfig.graphOptions[0]!.value,
          options: controlConfig.graphOptions.map(option => ({
            value: option.value,
            label: option.label,
            href: pageHref({
              songId,
              ...normalizedQueryState,
              instrumentId: activeInstrument.id,
              noteLabelMode,
              showGraph: option.value
            })
          }))
        }
      : null

  const zoomSelect = {
    id: 'zoom',
    label: 'Zoom',
    value: controlConfig.activeSheetScale,
    options: controlConfig.scaleOptions.map(option => ({
      value: option.value,
      label: option.label,
      href: pageHref({
        songId,
        ...normalizedQueryState,
        instrumentId: activeInstrument.id,
        noteLabelMode,
        sheetScale: option.value
      })
    }))
  }

  const selects: SongPageFunctionZoneSelectControl[] = [
    ...(instrumentSelect ? [instrumentSelect] : []),
    ...(fingeringSelect ? [fingeringSelect] : []),
    noteViewSelect,
    ...(chartDirectionSelect ? [chartDirectionSelect] : []),
    layoutSelect,
    zoomSelect
  ]

  const toggles: SongPageFunctionZoneToggleControl[] = [
    {
      id: 'fingering-chart',
      label: 'Fingering Chart',
      variant: 'switch',
      options: [
        {
          label: 'On',
          href: pageHref({
            songId,
            ...normalizedQueryState,
            instrumentId: activeInstrument.id,
            noteLabelMode,
            showGraph:
              controlConfig.activeGraphValue ?? controlConfig.graphOptions[0]?.value ?? 'on'
          }),
          isActive: controlConfig.activeGraphVisibility === 'on'
        },
        {
          label: 'Off',
          href: pageHref({
            songId,
            ...normalizedQueryState,
            instrumentId: activeInstrument.id,
            noteLabelMode,
            showGraph: 'off'
          }),
          isActive: controlConfig.activeGraphVisibility === 'off'
        }
      ]
    },
    ...(hasLyricToggle
      ? [
          {
            id: 'lyrics',
            label: 'Lyrics',
            variant: 'switch',
            options: [
              {
                label: 'On',
                href: pageHref({
                  songId,
                  ...normalizedQueryState,
                  instrumentId: activeInstrument.id,
                  noteLabelMode,
                  showLyric: 'on'
                }),
                isActive: controlConfig.activeShowLyric === 'on'
              },
              {
                label: 'Off',
                href: pageHref({
                  songId,
                  ...normalizedQueryState,
                  instrumentId: activeInstrument.id,
                  noteLabelMode,
                  showLyric: 'off'
                }),
                isActive: controlConfig.activeShowLyric === 'off'
              }
            ]
          } satisfies SongPageFunctionZoneToggleControl
        ]
      : []),
    {
      id: 'measure-numbers',
      label: 'Measure Numbers',
      variant: 'switch',
      options: [
        {
          label: 'On',
          href: pageHref({
            songId,
            ...normalizedQueryState,
            instrumentId: activeInstrument.id,
            noteLabelMode,
            showMeasureNum: 'on'
          }),
          isActive: controlConfig.activeShowMeasureNum === 'on'
        },
        {
          label: 'Off',
          href: pageHref({
            songId,
            ...normalizedQueryState,
            instrumentId: activeInstrument.id,
            noteLabelMode,
            showMeasureNum: 'off'
          }),
          isActive: controlConfig.activeShowMeasureNum === 'off'
        }
      ]
    },
    {
      id: 'metronome',
      label: 'Metronome',
      variant: 'switch',
      options: [
        {
          label: 'On',
          href: pageHref({
            songId,
            ...normalizedQueryState,
            instrumentId: activeInstrument.id,
            noteLabelMode,
            practiceTool: 'metronome'
          }),
          isActive: normalizedQueryState.practiceTool === 'metronome'
        },
        {
          label: 'Off',
          href: pageHref({
            songId,
            ...normalizedQueryState,
            instrumentId: activeInstrument.id,
            noteLabelMode,
            practiceTool: null
          }),
          isActive: normalizedQueryState.practiceTool !== 'metronome'
        }
      ]
    }
  ]
  const actions: SongPageFunctionZoneActionControl[] = [
    {
      id: 'listen',
      label:
        playbackStatus === 'playing'
          ? 'Stop'
          : playbackStatus === 'loading'
            ? `Loading ${Math.max(0, Math.min(100, Math.round(playbackLoadingProgress)))}%`
            : 'Listen',
      ariaLabel:
        playbackStatus === 'playing'
          ? 'Stop audio playback'
          : playbackStatus === 'loading'
            ? `Audio playback is loading, ${Math.max(
                0,
                Math.min(100, Math.round(playbackLoadingProgress))
              )} percent`
            : 'Open audio playback controls',
      icon:
        playbackStatus === 'playing'
          ? 'stop'
          : playbackStatus === 'loading'
            ? 'loading'
            : 'play',
      disabled: playbackStatus === 'loading',
      onClick: handlePlaybackAction
    }
  ]

  return (
    <>
      <PublicRuntimeToolbar
        backHref={backHref}
        backLabel={backLabel}
        title={title}
        subtitle={subtitle}
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
        {containerRuntimePackage ? (
          <ContainerRuntimeHost
            key={runtimeHostSessionKey}
            songId={songId}
            title={title}
            bodyHtml={containerRuntimePackage.bodyHtml}
            styleAssets={containerRuntimePackage.styles}
            scriptEntries={containerRuntimePackage.scriptEntries}
            enableScriptLoader
            className="page-warm-panel relative overflow-hidden"
            loadingId={loadingId}
            initialHeight={320}
            showScriptDiagnostics={false}
            onHostControllerChange={handleRuntimeHostControllerChange}
            onRuntimeReady={handleRuntimeFrameLoad}
          />
        ) : (
          <PublicRuntimeStatus />
        )}
      </div>
    </>
  )
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
