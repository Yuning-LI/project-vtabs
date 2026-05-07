'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { sendGaEvent } from '@/lib/analytics/ga'
import type { SongPresentation } from '@/lib/songbook/presentation'
import {
  buildSongPageHref,
  type PublicSongPageQueryState,
  type PublicSongInstrument
} from '@/lib/songbook/publicInstruments'
import {
  buildPublicRuntimeControlConfig,
  getPublicRuntimeFingeringControlLabel,
  getPublicRuntimeFingeringOptions,
  getPublicRuntimeGraphOptions
} from '@/lib/songbook/publicRuntimeControls'
import KuailepuRuntimeFrame from './KuailepuRuntimeFrame'
import SongPageFunctionZone, {
  type SongPageFunctionZoneActionControl,
  type SongPageFunctionZoneSelectControl,
  type SongPageFunctionZoneToggleControl
} from './SongPageFunctionZone'

export type KuailepuRuntimeControlPayload = {
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

type PlaybackUiStatus = 'idle' | 'loading' | 'playing'

type KuailepuRuntimeInteractiveShellProps = {
  songId: string
  supportedInstruments: PublicSongInstrument[]
  queryState: PublicSongPageQueryState
  presentationByInstrument: Partial<Record<PublicSongInstrument['id'], SongPresentation>>
  runtimeControlPayload: KuailepuRuntimeControlPayload
  runtimeDefaultInstrumentId: string | null
  runtimeDefaultFingeringIndex: string | number | null
  runtimeDefaultShowGraph: string | null
  hasLyricToggle: boolean
}

export default function KuailepuRuntimeInteractiveShell({
  songId,
  supportedInstruments,
  queryState,
  presentationByInstrument,
  runtimeControlPayload,
  runtimeDefaultInstrumentId,
  runtimeDefaultFingeringIndex,
  runtimeDefaultShowGraph,
  hasLyricToggle
}: KuailepuRuntimeInteractiveShellProps) {
  const [currentQueryState, setCurrentQueryState] = useState(queryState)
  const [isPlaybackFeatureEnabled, setIsPlaybackFeatureEnabled] = useState(false)
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackUiStatus>('idle')
  const [isPlaybackPanelOpen, setIsPlaybackPanelOpen] = useState(false)
  const runtimeFrameRef = useRef<HTMLIFrameElement | null>(null)
  const pendingPlaybackOpenRef = useRef(false)
  const trackedSongViewRef = useRef<string | null>(null)
  const previousSongRef = useRef<string | null>(null)
  const previousInstrumentRef = useRef<string | null>(null)

  useEffect(() => {
    setCurrentQueryState(queryState)
  }, [queryState])

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
      practiceTool: normalizePracticeTool(currentQueryState.practiceTool)
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
  const params = useMemo(() => {
    const next = new URLSearchParams()
    next.set('runtime_text_mode', 'english')
    if (activeInstrument.id !== 'o12' || shouldPinDefaultInstrument) {
      next.set('instrument', activeInstrument.id)
    }
    if (
      normalizedQueryState.fingeringIndex !== null &&
      normalizedQueryState.fingeringIndex !== undefined &&
      normalizedQueryState.fingeringIndex !== ''
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
    if (normalizedQueryState.showLyric) {
      next.set('show_lyric', normalizedQueryState.showLyric)
    }
    if (normalizedQueryState.showNoteRange) {
      next.set('show_note_range', normalizedQueryState.showNoteRange)
    }
    if (normalizedQueryState.showMeasureNum) {
      next.set('show_measure_num', normalizedQueryState.showMeasureNum)
    }
    if (normalizedQueryState.measureLayout) {
      next.set('measure_layout', normalizedQueryState.measureLayout)
    }
    if (
      normalizedQueryState.sheetScale !== null &&
      normalizedQueryState.sheetScale !== undefined &&
      normalizedQueryState.sheetScale !== ''
    ) {
      next.set('sheet_scale', String(normalizedQueryState.sheetScale))
    }
    if (normalizedQueryState.practiceTool === 'metronome') {
      next.append('public_feature', 'metronome')
    }
    if (isPlaybackFeatureEnabled) {
      next.append('public_feature', 'playback')
    }
    return next
  }, [
    activeInstrument.id,
    controlConfig.activeGraphValue,
    isPlaybackFeatureEnabled,
    normalizedQueryState,
    noteLabelMode,
    shouldPinDefaultGraphDirection,
    shouldPinDefaultInstrument
  ])
  const query = params.toString()
  const frameSrc = query ? `/api/kuailepu-runtime/${songId}?${query}` : `/api/kuailepu-runtime/${songId}`
  const loadingId = `kuailepu-runtime-${songId}-loading`

  useEffect(() => {
    setIsPlaybackPanelOpen(false)
  }, [frameSrc])

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

  function navigateWithinSongPage(href: string) {
    if (!href || typeof window === 'undefined') {
      return
    }

    const nextUrl = new URL(href, window.location.origin)
    if (nextUrl.pathname !== `/song/${songId}`) {
      window.location.replace(nextUrl.toString())
      return
    }

    const nextQueryState = parseSongPageQueryState(nextUrl)
    setCurrentQueryState(nextQueryState)
    window.history.replaceState(
      window.history.state,
      '',
      `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
    )
  }

  useEffect(() => {
    function handlePlaybackMessage(event: MessageEvent) {
      if (typeof window === 'undefined' || event.origin !== window.location.origin) {
        return
      }

      const data = event.data
      if (!data || typeof data !== 'object' || data.songId !== songId) {
        return
      }

      if (data.type === 'vtabs-playback-panel-status') {
        setIsPlaybackPanelOpen(Boolean(data.isOpen))
        return
      }

      if (data.type !== 'vtabs-playback-status') {
        return
      }

      if (data.status === 'idle' || data.status === 'loading' || data.status === 'playing') {
        if (pendingPlaybackOpenRef.current && data.status === 'idle') {
          return
        }
        setPlaybackStatus(data.status)
      }
    }

    window.addEventListener('message', handlePlaybackMessage)
    return () => {
      window.removeEventListener('message', handlePlaybackMessage)
    }
  }, [songId])

  const postPlaybackCommandMessage = useCallback((action: 'open' | 'stop' | 'close') => {
    if (typeof window === 'undefined') {
      return false
    }

    const frameWindow = runtimeFrameRef.current?.contentWindow
    if (!frameWindow) {
      return false
    }

    frameWindow.postMessage(
      {
        type:
          action === 'stop'
            ? 'vtabs-stop-playback'
            : action === 'close'
              ? 'vtabs-close-playback-panel'
              : 'vtabs-open-playback',
        songId
      },
      window.location.origin
    )
    return true
  }, [songId])

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

      if (runtimeFrameRef.current === target) {
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
        setPlaybackStatus('idle')
      }
      return
    }

    pendingPlaybackOpenRef.current = true
    setPlaybackStatus('loading')
    sendGaEvent('song_playback_open', {
      song_slug: songId,
      instrument_id: activeInstrument.id,
      note_label_mode: noteLabelMode
    })

    if (!isPlaybackFeatureEnabled) {
      setIsPlaybackFeatureEnabled(true)
      return
    }

    if (postPlaybackCommandMessage('open')) {
      pendingPlaybackOpenRef.current = false
    }
  }, [
    activeInstrument.id,
    isPlaybackFeatureEnabled,
    noteLabelMode,
    playbackStatus,
    postPlaybackCommandMessage,
    songId
  ])

  const handleRuntimeFrameLoad = useCallback(() => {
    if (!pendingPlaybackOpenRef.current || !isPlaybackFeatureEnabled) {
      return
    }

    window.setTimeout(() => {
      if (postPlaybackCommandMessage('open')) {
        pendingPlaybackOpenRef.current = false
      }
    }, 80)
  }, [isPlaybackFeatureEnabled, postPlaybackCommandMessage])

  const handleFrameElementChange = useCallback((frame: HTMLIFrameElement | null) => {
    runtimeFrameRef.current = frame
  }, [])

  const instrumentSelect =
    supportedInstruments.length > 1
      ? {
          id: 'instrument',
          label: 'Instrument',
          value: activeInstrument.id,
          options: supportedInstruments.map(instrument => ({
            value: instrument.id,
            label: instrument.shortLabel,
            href: buildSongPageHref({
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
            href: buildSongPageHref({
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
        href: buildSongPageHref({
          songId,
          ...normalizedQueryState,
          instrumentId: activeInstrument.id,
          noteLabelMode: 'letter'
        })
      },
      {
        value: 'number',
        label: 'Numbered Notes',
        href: buildSongPageHref({
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
      href: buildSongPageHref({
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
            href: buildSongPageHref({
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
      href: buildSongPageHref({
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
          href: buildSongPageHref({
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
          href: buildSongPageHref({
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
                href: buildSongPageHref({
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
                href: buildSongPageHref({
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
          href: buildSongPageHref({
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
          href: buildSongPageHref({
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
          href: buildSongPageHref({
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
          href: buildSongPageHref({
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
            ? 'Loading'
            : 'Listen',
      ariaLabel:
        playbackStatus === 'playing'
          ? 'Stop audio playback'
          : playbackStatus === 'loading'
            ? 'Audio playback is loading'
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
      <section
        className="page-warm-hero mb-2 px-4 py-3 md:mb-3 md:px-7 md:py-[1.125rem]"
      >
        <Link
          href="/"
          className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[rgba(61,47,34,0.16)] bg-[rgba(255,251,245,0.88)] px-3 py-1.5 text-[0.8rem] font-semibold text-stone-700 shadow-[0_10px_22px_rgba(61,47,34,0.08)] transition hover:-translate-y-0.5 hover:bg-white md:mb-3 md:gap-2 md:border-stone-900 md:bg-stone-900 md:px-4 md:py-2.5 md:text-sm md:text-stone-50 md:shadow-[0_14px_30px_rgba(61,47,34,0.18)] md:hover:bg-stone-800 md:hover:shadow-[0_18px_36px_rgba(61,47,34,0.24)]"
        >
          <span aria-hidden="true" className="text-[0.95rem] leading-none md:text-base">←</span>
          <span>Back to Song Library</span>
        </Link>
        <h1 className="mt-1.5 text-[1.7rem] font-black leading-tight tracking-tight text-stone-900 md:mt-2 md:text-[3.05rem]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 hidden text-sm leading-6 text-stone-600 md:block">{subtitle}</p>
        ) : null}
        <div className="mt-2 border-t border-[rgba(154,126,91,0.18)] pt-2 md:mt-3 md:pt-3">
          <SongPageFunctionZone
            selects={selects}
            toggles={toggles}
            actions={actions}
            onNavigate={navigateWithinSongPage}
          />
        </div>
      </section>

      <div className="mt-1 md:mt-0">
        <KuailepuRuntimeFrame
          songId={songId}
          title={title}
          frameSrc={frameSrc}
          loadingId={loadingId}
          initialHeight={320}
          onFrameElementChange={handleFrameElementChange}
          onFrameLoad={handleRuntimeFrameLoad}
        />
      </div>
    </>
  )
}

function parseSongPageQueryState(url: URL): PublicSongPageQueryState {
  return {
    instrumentId: normalizeInstrumentId(url.searchParams.get('instrument')),
    fingeringIndex: normalizeFingeringIndex(url.searchParams.get('fingering_index'), null),
    noteLabelMode: normalizeExplicitNoteLabelMode(url.searchParams.get('note_label_mode')),
    showGraph: url.searchParams.get('show_graph'),
    showLyric: normalizeToggleParam(url.searchParams.get('show_lyric')),
    showNoteRange: normalizeToggleParam(url.searchParams.get('show_note_range')),
    showMeasureNum: normalizeToggleParam(url.searchParams.get('show_measure_num')),
    measureLayout: normalizeMeasureLayout(url.searchParams.get('measure_layout')),
    sheetScale: normalizeSheetScale(url.searchParams.get('sheet_scale')),
    practiceTool: normalizePracticeTool(url.searchParams.get('practice_tool'))
  }
}

function normalizeInstrumentId(value: string | null) {
  if (value === 'o12' || value === 'o6' || value === 'r8b' || value === 'r8g' || value === 'w6') {
    return value
  }

  return null
}

function normalizeFingeringIndex(
  value: string | number | null | undefined,
  availableValues: string[] | null
) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const normalized = String(value)
  if (!/^\d+$/.test(normalized)) {
    return null
  }

  return availableValues && !availableValues.includes(normalized) ? null : normalized
}

function normalizeExplicitNoteLabelMode(value: string | null | undefined) {
  if (value === 'number' || value === 'graph') {
    return value
  }

  return null
}

function normalizeToggleParam(value: string | null | undefined) {
  if (value === 'on' || value === 'off') {
    return value
  }

  return null
}

function normalizeMeasureLayout(value: string | null | undefined) {
  if (value === 'compact' || value === 'mono') {
    return value
  }

  return null
}

function normalizeExplicitShowGraph(
  value: string | null | undefined,
  graphOptions: string[]
) {
  if (!value) {
    return null
  }

  if (value === 'off') {
    return value
  }

  if (value === 'on') {
    return graphOptions[0] ?? null
  }

  return graphOptions.includes(value) ? value : null
}

function normalizeSheetScale(
  value: string | number | null | undefined,
  sheetScaleList?: number[]
) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const normalized = String(value)
  const available = new Set((sheetScaleList ?? []).map(item => String(item)))
  if (available.size > 0) {
    return available.has(normalized) ? normalized : null
  }

  return /^\d+$/.test(normalized) ? normalized : null
}

function normalizePracticeTool(value: string | null | undefined) {
  return value === 'metronome' ? 'metronome' : null
}
