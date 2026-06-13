'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import {
  PUBLIC_RUNTIME_PLAYBACK_CLOSE_PANEL_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_OPEN_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_PANEL_STATUS_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_STATUS_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_STOP_MESSAGE,
  PUBLIC_RUNTIME_READY_MESSAGE,
  PUBLIC_RUNTIME_REDRAW_MESSAGE,
  PUBLIC_RUNTIME_SIZE_MESSAGE
} from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'
import type {
  PublicRuntimeAsset
} from '@/lib/runtime-core/server/assembly/publicRuntimeAssetManifest'
import type { RuntimeScriptEntry } from '@/lib/runtime-core/runtimeScriptTypes'
import {
  buildPublicRuntimeControlConfig,
  getPublicRuntimeFingeringControlLabel,
  getPublicRuntimeFingeringOptions,
  getPublicRuntimeGraphOptions
} from '@/lib/songbook/publicRuntimeControls'
import {
  buildSongPageHref,
  type PublicSongInstrument,
  type PublicSongPageQueryState
} from '@/lib/songbook/publicInstruments'
import {
  normalizeExplicitNoteLabelMode,
  normalizeFingeringIndex,
  normalizeMeasureLayout,
  normalizeSheetScale,
  normalizeToggleParam
} from '@/lib/songbook/songPageQueryState'
import {
  subscribeToPublicRuntimeHostMessages,
  type PublicRuntimeHostController
} from '../PublicRuntimeHostController'
import SongPageFunctionZone, {
  type SongPageFunctionZoneActionControl,
  type SongPageFunctionZoneSelectControl,
  type SongPageFunctionZoneToggleControl
} from '../SongPageFunctionZone'
import ContainerRuntimeHost from './ContainerRuntimeHost'
import { dispatchContainerRuntimeCommand } from './containerRuntimeTransport'
import type {
  RuntimeScriptLoaderDiagnostics
} from './RuntimeScriptLoader'
import type {
  RuntimeContainerMeasurementSnapshot
} from './useRuntimeContainerMeasurement'
import { ReviewPanel } from './review/ReviewPanel'
import {
  RuntimeReviewDiagnostics,
  type RuntimeConsoleDiagnostic
} from './review/RuntimeReviewDiagnostics'

export type RuntimeHostReviewSampleSong = {
  slug: string
  title: string
}

export type RuntimeHostReviewClientProps = {
  songId: string
  title: string
  bodyHtml: string
  styles: PublicRuntimeAsset[]
  scriptEntries: RuntimeScriptEntry[]
  supportedInstruments: PublicSongInstrument[]
  queryState: PublicSongPageQueryState
  runtimeControlPayload: {
    instrumentFingerings?: Array<{
      instrument: string
      instrumentName?: string
      fingeringsList?: Array<Array<{ fingering: string; fingeringName?: string; tonalityName?: string }>>
      fingeringSetList?: Array<Array<{ fingering: string; fingeringName?: string; tonalityName?: string }>>
      graphList?: Array<{ name?: string; value?: string }>
    }>
    sheetScaleList?: number[]
  }
  basePath?: string
  sampleSongs?: RuntimeHostReviewSampleSong[]
  reviewTitle?: string
  showExtendedDiagnostics?: boolean
}

type PlaybackUiStatus = 'idle' | 'loading' | 'playing'
type RuntimeHostKey = 'container'
type RuntimeHostPlaybackState = Record<RuntimeHostKey, PlaybackUiStatus>
type RuntimeHostPanelState = Record<RuntimeHostKey, boolean>
const INITIAL_HOST_PLAYBACK_STATE: RuntimeHostPlaybackState = {
  container: 'idle'
}

const INITIAL_HOST_PANEL_STATE: RuntimeHostPanelState = {
  container: false
}

export default function RuntimeHostReviewClient({
  songId,
  title,
  bodyHtml,
  styles,
  scriptEntries,
  supportedInstruments,
  queryState,
  runtimeControlPayload,
  basePath = '/dev/runtime-host',
  sampleSongs = [],
  reviewTitle = 'Internal Runtime Host Review',
  showExtendedDiagnostics = false
}: RuntimeHostReviewClientProps) {
  const [hostPlaybackStatus, setHostPlaybackStatus] =
    useState<RuntimeHostPlaybackState>(INITIAL_HOST_PLAYBACK_STATE)
  const [hostPlaybackPanelOpen, setHostPlaybackPanelOpen] =
    useState<RuntimeHostPanelState>(INITIAL_HOST_PANEL_STATE)
  const [hostReadyState, setHostReadyState] = useState<Record<RuntimeHostKey, boolean>>({
    container: false
  })
  const [containerMeasurement, setContainerMeasurement] =
    useState<RuntimeContainerMeasurementSnapshot | null>(null)
  const [containerScriptDiagnostics, setContainerScriptDiagnostics] =
    useState<RuntimeScriptLoaderDiagnostics | null>(null)
  const [consoleDiagnostics, setConsoleDiagnostics] = useState<RuntimeConsoleDiagnostic[]>([])
  const hostControllersRef = useRef<Partial<Record<RuntimeHostKey, PublicRuntimeHostController>>>({})
  const playbackStatus = aggregatePlaybackStatus(hostPlaybackStatus)
  const isPlaybackPanelOpen = Object.values(hostPlaybackPanelOpen).some(Boolean)

  const activeInstrument =
    supportedInstruments.find(instrument => instrument.id === queryState.instrumentId) ??
    supportedInstruments.find(instrument => instrument.id === 'o12') ??
    supportedInstruments[0]
  const fingeringOptions = useMemo(
    () => getPublicRuntimeFingeringOptions(runtimeControlPayload, activeInstrument.id),
    [activeInstrument.id, runtimeControlPayload]
  )
  const graphOptions = useMemo(
    () => getPublicRuntimeGraphOptions(runtimeControlPayload, activeInstrument.id),
    [activeInstrument.id, runtimeControlPayload]
  )
  const normalizedQueryState = useMemo<PublicSongPageQueryState>(
    () => ({
      instrumentId: activeInstrument.id,
      fingeringIndex: normalizeFingeringIndex(
        queryState.fingeringIndex,
        fingeringOptions.map(option => option.value)
      ),
      noteLabelMode: normalizeExplicitNoteLabelMode(queryState.noteLabelMode),
      showGraph: normalizeExplicitShowGraph(
        queryState.showGraph,
        graphOptions.map(option => option.value)
      ),
      showLyric: normalizeToggleParam(queryState.showLyric),
      showMeasureNum: normalizeToggleParam(queryState.showMeasureNum),
      showNoteRange: normalizeToggleParam(queryState.showNoteRange),
      measureLayout: normalizeMeasureLayout(queryState.measureLayout),
      sheetScale: normalizeSheetScale(queryState.sheetScale, runtimeControlPayload.sheetScaleList),
      practiceTool: queryState.practiceTool === 'metronome' ? 'metronome' : null,
      runtimeVisualTheme: queryState.runtimeVisualTheme === 'off' ? 'off' : 'classic'
    }),
    [activeInstrument.id, fingeringOptions, graphOptions, queryState, runtimeControlPayload.sheetScaleList]
  )
  const noteLabelMode =
    normalizedQueryState.noteLabelMode === 'number' ||
    normalizedQueryState.noteLabelMode === 'graph'
      ? normalizedQueryState.noteLabelMode
      : 'letter'
  const controlConfig = useMemo(
    () =>
      buildPublicRuntimeControlConfig(runtimeControlPayload, activeInstrument.id, {
        fingering_index: normalizedQueryState.fingeringIndex,
        show_graph: normalizedQueryState.showGraph,
        show_lyric: normalizedQueryState.showLyric,
        show_note_range: normalizedQueryState.showNoteRange,
        show_measure_num: normalizedQueryState.showMeasureNum,
        measure_layout: normalizedQueryState.measureLayout,
        sheet_scale: normalizedQueryState.sheetScale
      }),
    [activeInstrument.id, normalizedQueryState, runtimeControlPayload]
  )
  const queryDiagnostics = useMemo<Array<[string, string | number]>>(
    () =>
      [
        ['song', songId],
        ['instrument', activeInstrument.id],
        ['fingering', normalizedQueryState.fingeringIndex ?? controlConfig.activeFingeringIndex ?? 'default'],
        ['note', noteLabelMode],
        ['layout', controlConfig.activeMeasureLayout],
        ['zoom', controlConfig.activeSheetScale],
        ['chart', controlConfig.activeGraphVisibility],
        ['metronome', normalizedQueryState.practiceTool === 'metronome' ? 'on' : 'off'],
        ['theme', normalizedQueryState.runtimeVisualTheme === 'off' ? 'off' : 'classic']
      ],
    [
      activeInstrument.id,
      controlConfig.activeFingeringIndex,
      controlConfig.activeGraphVisibility,
      controlConfig.activeMeasureLayout,
      controlConfig.activeSheetScale,
      normalizedQueryState.fingeringIndex,
      normalizedQueryState.practiceTool,
      normalizedQueryState.runtimeVisualTheme,
      noteLabelMode,
      songId
    ]
  )

  useEffect(() => {
    if (!showExtendedDiagnostics) {
      return
    }

    const originalError = console.error
    const originalWarn = console.warn

    function appendConsoleDiagnostic(diagnostic: Omit<RuntimeConsoleDiagnostic, 'timestamp'>) {
      setConsoleDiagnostics(current => [
        ...current.slice(-11),
        {
          ...diagnostic,
          timestamp: performance.now()
        }
      ])
    }

    console.error = (...args: unknown[]) => {
      appendConsoleDiagnostic({
        level: 'error',
        message: formatConsoleArgs(args)
      })
      originalError.apply(console, args)
    }

    console.warn = (...args: unknown[]) => {
      appendConsoleDiagnostic({
        level: 'warn',
        message: formatConsoleArgs(args)
      })
      originalWarn.apply(console, args)
    }

    function handleWindowError(event: ErrorEvent) {
      appendConsoleDiagnostic({
        level: 'error',
        message: event.message || formatConsoleArgs([event.error])
      })
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      appendConsoleDiagnostic({
        level: 'unhandledrejection',
        message: formatConsoleArgs([event.reason])
      })
    }

    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      console.error = originalError
      console.warn = originalWarn
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [showExtendedDiagnostics])

  useEffect(
    () =>
      subscribeToPublicRuntimeHostMessages(songId, (message, meta) => {
        const hostKey = identifyRuntimeHostMessageSource(meta.source)

        if (message.type === PUBLIC_RUNTIME_PLAYBACK_STATUS_MESSAGE) {
          setHostPlaybackStatus(current =>
            updateRuntimeHostState(current, hostKey, message.status)
          )
        }
        if (message.type === PUBLIC_RUNTIME_PLAYBACK_PANEL_STATUS_MESSAGE) {
          setHostPlaybackPanelOpen(current =>
            updateRuntimeHostState(current, hostKey, Boolean(message.isOpen))
          )
        }
        if (message.type === PUBLIC_RUNTIME_READY_MESSAGE) {
          setHostReadyState(current => updateRuntimeHostState(current, hostKey, true))
        }
        if (message.type === PUBLIC_RUNTIME_SIZE_MESSAGE && hostKey === 'container') {
          setContainerMeasurement(current => ({
            height: message.height,
            hasRenderedSheet: current?.hasRenderedSheet ?? false,
            hasRuntimeContent: current?.hasRuntimeContent ?? false,
            measuredAt: performance.now()
          }))
        }
      }),
    [songId]
  )

  useEffect(() => {
    setHostReadyState({ container: false })
    setHostPlaybackStatus(INITIAL_HOST_PLAYBACK_STATE)
    setHostPlaybackPanelOpen(INITIAL_HOST_PANEL_STATE)
    setContainerMeasurement(null)
    setContainerScriptDiagnostics(null)
    setConsoleDiagnostics([])
  }, [bodyHtml])

  const setHostController = useCallback(
    (key: RuntimeHostKey) => (controller: PublicRuntimeHostController | null) => {
      if (controller) {
        hostControllersRef.current[key] = controller
        setHostReadyState(current => ({ ...current, [key]: false }))
      } else {
        delete hostControllersRef.current[key]
        setHostReadyState(current => ({ ...current, [key]: false }))
        setHostPlaybackStatus(current => ({ ...current, [key]: 'idle' }))
        setHostPlaybackPanelOpen(current => ({ ...current, [key]: false }))
      }
    },
    []
  )
  const setContainerHostController = useMemo(() => setHostController('container'), [setHostController])
  const handleContainerReady = useCallback(() => {
    setHostReadyState(current => ({ ...current, container: true }))
  }, [])

  const multicastCommand = useCallback(
    (type: string) => {
      const message = { type, songId }
      const controllers = hostControllersRef.current
      const results = (Object.values(controllers) as PublicRuntimeHostController[])
        .map(controller => controller.postMessage(message))
      if (!controllers.container) {
        results.push(dispatchContainerRuntimeCommand(message))
      }
      return results.some(Boolean)
    },
    [songId]
  )

  const navigateWithinReview = useCallback((href: string) => {
    window.location.href = href
  }, [])

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

      const isInsideRuntimeHost = (Object.values(hostControllersRef.current) as PublicRuntimeHostController[])
        .some(controller => controller.containsEventTarget(target))
      if (isInsideRuntimeHost) {
        return
      }

      if (multicastCommand(PUBLIC_RUNTIME_PLAYBACK_CLOSE_PANEL_MESSAGE)) {
        setHostPlaybackPanelOpen(INITIAL_HOST_PANEL_STATE)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isPlaybackPanelOpen, multicastCommand])

  const pageHref = useCallback(
    (nextState: PublicSongPageQueryState) =>
      buildSongPageHref({
        songId,
        basePath,
        ...nextState
      }),
    [basePath, songId]
  )
  const sampleSongHref = useCallback(
    (nextSongId: string) =>
      buildSongPageHref({
        songId: nextSongId,
        basePath,
        ...normalizedQueryState,
        instrumentId: activeInstrument.id,
        noteLabelMode
      }),
    [activeInstrument.id, basePath, normalizedQueryState, noteLabelMode]
  )

  const actions: SongPageFunctionZoneActionControl[] = [
    {
      id: 'listen',
      label: playbackStatus === 'playing' ? 'Stop' : playbackStatus === 'loading' ? 'Loading...' : 'Listen',
      ariaLabel: playbackStatus === 'playing' ? 'Stop audio playback' : 'Open audio playback controls',
      icon: playbackStatus === 'playing' ? 'stop' : playbackStatus === 'loading' ? 'loading' : 'play',
      disabled: playbackStatus === 'loading',
      onClick() {
        if (playbackStatus === 'playing') {
          if (multicastCommand(PUBLIC_RUNTIME_PLAYBACK_STOP_MESSAGE)) {
            setHostPlaybackStatus(INITIAL_HOST_PLAYBACK_STATE)
            setHostPlaybackPanelOpen(INITIAL_HOST_PANEL_STATE)
          }
          return
        }
        if (multicastCommand(PUBLIC_RUNTIME_PLAYBACK_OPEN_MESSAGE)) {
          setHostPlaybackStatus(current => markActiveRuntimeHosts(current, hostControllersRef.current, 'loading'))
        }
      }
    },
    {
      id: 'redraw',
      label: 'Redraw',
      ariaLabel: 'Redraw both runtime hosts',
      onClick() {
        multicastCommand(PUBLIC_RUNTIME_REDRAW_MESSAGE)
      }
    }
  ]

  const selects: SongPageFunctionZoneSelectControl[] = [
    ...(sampleSongs.length > 1
      ? [
          {
            id: 'sample-song',
            label: 'Sample Song',
            value: songId,
            options: sampleSongs.map(song => ({
              value: song.slug,
              label: song.title,
              href: sampleSongHref(song.slug)
            }))
          }
        ]
      : []),
    {
      id: 'instrument',
      label: 'Instrument',
      value: activeInstrument.id,
      options: supportedInstruments.map(instrument => ({
        value: instrument.id,
        label: instrument.shortLabel,
        href: pageHref({
          ...normalizedQueryState,
          instrumentId: instrument.id,
          fingeringIndex: null,
          noteLabelMode
        })
      }))
    },
    ...(controlConfig.fingeringOptions.length > 1
      ? [
          {
            id: 'fingering-key',
            label: getPublicRuntimeFingeringControlLabel(activeInstrument.id),
            value: controlConfig.activeFingeringIndex ?? controlConfig.fingeringOptions[0]!.value,
            options: controlConfig.fingeringOptions.map(option => ({
              value: option.value,
              label: option.label,
              href: pageHref({
                ...normalizedQueryState,
                instrumentId: activeInstrument.id,
                fingeringIndex: option.value,
                noteLabelMode
              })
            }))
          }
        ]
      : []),
    {
      id: 'note-view',
      label: 'Note Labels',
      value: noteLabelMode,
      options: [
        {
          value: 'letter',
          label: 'Letter Notes',
          href: pageHref({ ...normalizedQueryState, noteLabelMode: 'letter' })
        },
        {
          value: 'number',
          label: 'Numbered Notes',
          href: pageHref({ ...normalizedQueryState, noteLabelMode: 'number' })
        }
      ]
    },
    {
      id: 'layout',
      label: 'Layout',
      value: controlConfig.activeMeasureLayout,
      options: [
        {
          value: 'compact',
          label: 'Compact',
          href: pageHref({ ...normalizedQueryState, measureLayout: 'compact' })
        },
        {
          value: 'mono',
          label: 'Equal Width',
          href: pageHref({ ...normalizedQueryState, measureLayout: 'mono' })
        }
      ]
    },
    {
      id: 'zoom',
      label: 'Zoom',
      value: controlConfig.activeSheetScale,
      options: controlConfig.scaleOptions.map(option => ({
        value: option.value,
        label: option.label,
        href: pageHref({ ...normalizedQueryState, sheetScale: option.value })
      }))
    }
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
            ...normalizedQueryState,
            showGraph: controlConfig.activeGraphValue ?? controlConfig.graphOptions[0]?.value ?? 'on'
          }),
          isActive: controlConfig.activeGraphVisibility === 'on'
        },
        {
          label: 'Off',
          href: pageHref({ ...normalizedQueryState, showGraph: 'off' }),
          isActive: controlConfig.activeGraphVisibility === 'off'
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
          href: pageHref({ ...normalizedQueryState, practiceTool: 'metronome' }),
          isActive: normalizedQueryState.practiceTool === 'metronome'
        },
        {
          label: 'Off',
          href: pageHref({ ...normalizedQueryState, practiceTool: null }),
          isActive: normalizedQueryState.practiceTool !== 'metronome'
        }
      ]
    },
    {
      id: 'visual-theme',
      label: 'Visual Theme',
      variant: 'switch',
      options: [
        {
          label: 'Classic',
          href: pageHref({ ...normalizedQueryState, runtimeVisualTheme: 'classic' }),
          isActive: normalizedQueryState.runtimeVisualTheme !== 'off'
        },
        {
          label: 'Off',
          href: pageHref({ ...normalizedQueryState, runtimeVisualTheme: 'off' }),
          isActive: normalizedQueryState.runtimeVisualTheme === 'off'
        }
      ]
    }
  ]

  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-5">
      <section className="rounded-[28px] border border-[rgba(120,86,48,0.22)] bg-[rgba(255,250,241,0.94)] p-5 shadow-[0_24px_54px_rgba(70,45,24,0.12)]">
        <div className="text-xs font-black uppercase tracking-[0.22em] text-[#806246]">
          {reviewTitle}
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[#6b543c]">
          This dev-only page verifies legacy host signals now resolve to the React runtime
          container through the normalized host command channel.
        </p>
        <div className="mt-4 rounded-[22px] border border-[rgba(154,126,91,0.18)] bg-white/65 p-3">
          <SongPageFunctionZone
            selects={selects}
            toggles={toggles}
            actions={actions}
            onNavigate={navigateWithinReview}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[#6b543c]">
          <span>Container ready: {hostReadyState.container ? 'yes' : 'loading'}</span>
          <span>Container playback: {hostPlaybackStatus.container}</span>
          <span>Container panel: {hostPlaybackPanelOpen.container ? 'open' : 'closed'}</span>
          <span>
            Container height: {containerMeasurement ? `${containerMeasurement.height}px` : 'measuring'}
          </span>
          <span>
            Container sheet: {containerMeasurement?.hasRenderedSheet ? 'rendered' : 'pending'}
          </span>
          <span>
            Container JS:{' '}
            {containerScriptDiagnostics
              ? `${containerScriptDiagnostics.status} (${containerScriptDiagnostics.loadedCount}/${containerScriptDiagnostics.totalCount})`
              : 'pending'}
          </span>
        </div>
        {showExtendedDiagnostics ? (
          <RuntimeReviewDiagnostics
            queryDiagnostics={queryDiagnostics}
            containerMeasurement={containerMeasurement}
            containerScriptDiagnostics={containerScriptDiagnostics}
            consoleDiagnostics={consoleDiagnostics}
            hostReadyState={hostReadyState}
            hostPlaybackStatus={hostPlaybackStatus}
            hostPlaybackPanelOpen={hostPlaybackPanelOpen}
          />
        ) : null}
      </section>

      <ReviewPanel title="Container Host">
        <ContainerRuntimeHost
          songId={songId}
          title={title}
          bodyHtml={bodyHtml}
          styleAssets={styles}
          scriptEntries={scriptEntries}
          enableScriptLoader
          loadingId={`runtime-host-container-loading-${songId}`}
          overlayClassName="bg-[#fffaf1]/96"
          onHostControllerChange={setContainerHostController}
          onRuntimeReady={handleContainerReady}
          onMeasurementChange={setContainerMeasurement}
          onScriptDiagnosticsChange={setContainerScriptDiagnostics}
        />
      </ReviewPanel>
    </div>
  )
}

function formatConsoleArgs(args: unknown[]) {
  return args
    .map(arg => {
      if (arg instanceof Error) {
        return arg.message
      }
      if (typeof arg === 'string') {
        return arg
      }
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(' ')
    .slice(0, 320)
}

function normalizeExplicitShowGraph(value: string | null | undefined, graphOptions: string[]) {
  if (!value) {
    return null
  }
  if (value === 'off' || value === 'on') {
    return value
  }
  return graphOptions.includes(value) ? value : null
}

function aggregatePlaybackStatus(state: RuntimeHostPlaybackState): PlaybackUiStatus {
  if (Object.values(state).includes('playing')) {
    return 'playing'
  }
  if (Object.values(state).includes('loading')) {
    return 'loading'
  }
  return 'idle'
}

function identifyRuntimeHostMessageSource(
  source: MessageEventSource | null
): RuntimeHostKey | null {
  if (typeof window !== 'undefined' && source === window) {
    return 'container'
  }

  return null
}

function updateRuntimeHostState<T>(
  current: Record<RuntimeHostKey, T>,
  hostKey: RuntimeHostKey | null,
  value: T
): Record<RuntimeHostKey, T> {
  if (!hostKey) {
    return {
      container: value
    }
  }

  return {
    ...current,
    [hostKey]: value
  }
}

function markActiveRuntimeHosts(
  current: RuntimeHostPlaybackState,
  controllers: Partial<Record<RuntimeHostKey, PublicRuntimeHostController>>,
  value: PlaybackUiStatus
): RuntimeHostPlaybackState {
  return {
    container: controllers.container ? value : current.container
  }
}
