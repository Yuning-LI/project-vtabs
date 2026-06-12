'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction
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
import PublicRuntimeFrame from '../PublicRuntimeFrame'
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

type RuntimeHostReviewClientProps = {
  songId: string
  title: string
  frameSrc: string
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
}

type PlaybackUiStatus = 'idle' | 'loading' | 'playing'
type RuntimeHostKey = 'iframe' | 'container'
type RuntimeHostPlaybackState = Record<RuntimeHostKey, PlaybackUiStatus>
type RuntimeHostPanelState = Record<RuntimeHostKey, boolean>

const INITIAL_HOST_PLAYBACK_STATE: RuntimeHostPlaybackState = {
  iframe: 'idle',
  container: 'idle'
}

const INITIAL_HOST_PANEL_STATE: RuntimeHostPanelState = {
  iframe: false,
  container: false
}

export default function RuntimeHostReviewClient({
  songId,
  title,
  frameSrc,
  bodyHtml,
  styles,
  scriptEntries,
  supportedInstruments,
  queryState,
  runtimeControlPayload
}: RuntimeHostReviewClientProps) {
  const [hostPlaybackStatus, setHostPlaybackStatus] =
    useState<RuntimeHostPlaybackState>(INITIAL_HOST_PLAYBACK_STATE)
  const [hostPlaybackPanelOpen, setHostPlaybackPanelOpen] =
    useState<RuntimeHostPanelState>(INITIAL_HOST_PANEL_STATE)
  const [hostReadyState, setHostReadyState] = useState<Record<RuntimeHostKey, boolean>>({
    iframe: false,
    container: false
  })
  const [containerMeasurement, setContainerMeasurement] =
    useState<RuntimeContainerMeasurementSnapshot | null>(null)
  const [containerScriptDiagnostics, setContainerScriptDiagnostics] =
    useState<RuntimeScriptLoaderDiagnostics | null>(null)
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

  useEffect(
    () =>
      subscribeToPublicRuntimeHostMessages(songId, (message, meta) => {
        const hostKey = identifyRuntimeHostMessageSource(meta.source, hostControllersRef.current)

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
    setHostReadyState({ iframe: false, container: false })
    setHostPlaybackStatus(INITIAL_HOST_PLAYBACK_STATE)
    setHostPlaybackPanelOpen(INITIAL_HOST_PANEL_STATE)
    setContainerMeasurement(null)
    setContainerScriptDiagnostics(null)
  }, [bodyHtml, frameSrc])

  const setHostController = useCallback(
    (key: RuntimeHostKey) => (controller: PublicRuntimeHostController | null) => {
      if (controller) {
        hostControllersRef.current[key] = controller
        setHostReadyState(current => ({ ...current, [key]: false }))
        if (key === 'iframe') {
          startIframeReadyProbe(controller.hostElement, setHostReadyState)
        }
      } else {
        delete hostControllersRef.current[key]
        setHostReadyState(current => ({ ...current, [key]: false }))
        setHostPlaybackStatus(current => ({ ...current, [key]: 'idle' }))
        setHostPlaybackPanelOpen(current => ({ ...current, [key]: false }))
      }
    },
    []
  )
  const setIframeHostController = useMemo(() => setHostController('iframe'), [setHostController])
  const setContainerHostController = useMemo(() => setHostController('container'), [setHostController])
  const handleIframeReady = useCallback(() => {
    setHostReadyState(current => ({ ...current, iframe: true }))
  }, [])
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
        basePath: '/dev/runtime-host',
        ...nextState
      }),
    [songId]
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
          Internal Runtime Host Review
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[#6b543c]">
          This dev-only page drives the iframe baseline and the React container host through the same
          shell controls and normalized host command channel.
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
          <span>Iframe ready: {hostReadyState.iframe ? 'yes' : 'loading'}</span>
          <span>Container ready: {hostReadyState.container ? 'yes' : 'loading'}</span>
          <span>Iframe playback: {hostPlaybackStatus.iframe}</span>
          <span>Container playback: {hostPlaybackStatus.container}</span>
          <span>Iframe panel: {hostPlaybackPanelOpen.iframe ? 'open' : 'closed'}</span>
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
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <ReviewPanel title="Iframe Baseline">
          <PublicRuntimeFrame
            songId={songId}
            title={title}
            frameSrc={frameSrc}
            loadingId={`runtime-host-iframe-loading-${songId}`}
            panelClassName="relative overflow-hidden rounded-[24px] border border-[rgba(120,86,48,0.18)] bg-[#fffaf1] shadow-[0_18px_44px_rgba(70,45,24,0.1)]"
            iframeClassName="block w-full border-0 bg-[#fffaf1]"
            overlayClassName="bg-[#fffaf1]/96"
            initialHeight={900}
            onHostControllerChange={setIframeHostController}
            onFrameLoad={handleIframeReady}
          />
        </ReviewPanel>

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
    </div>
  )
}

function ReviewPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#806246]">
        {title}
      </div>
      {children}
    </section>
  )
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
  source: MessageEventSource | null,
  controllers: Partial<Record<RuntimeHostKey, PublicRuntimeHostController>>
): RuntimeHostKey | null {
  if (typeof window !== 'undefined' && source === window) {
    return 'container'
  }

  const iframeHost = controllers.iframe?.hostElement
  if (iframeHost instanceof HTMLIFrameElement && source === iframeHost.contentWindow) {
    return 'iframe'
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
      iframe: value,
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
    iframe: controllers.iframe ? value : current.iframe,
    container: controllers.container ? value : current.container
  }
}

function startIframeReadyProbe(
  hostElement: HTMLElement,
  setHostReadyState: Dispatch<SetStateAction<Record<RuntimeHostKey, boolean>>>
) {
  if (!(hostElement instanceof HTMLIFrameElement)) {
    return
  }

  let attempts = 0
  const timer = window.setInterval(() => {
    attempts += 1
    try {
      if (hostElement.contentDocument?.querySelector('#sheet svg, #sheet .sheet-svg')) {
        setHostReadyState(current => ({ ...current, iframe: true }))
        window.clearInterval(timer)
        return
      }
    } catch {
      // Keep probing while the iframe document is still booting.
    }

    if (attempts >= 100 || !hostElement.isConnected) {
      window.clearInterval(timer)
    }
  }, 100)
}
