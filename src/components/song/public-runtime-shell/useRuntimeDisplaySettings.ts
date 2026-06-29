'use client'

import { useCallback, useMemo } from 'react'
import {
  buildSongPageHref,
  type PublicSongInstrument,
  type PublicSongPageQueryState
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
import type {
  SongPageFunctionZoneSelectControl,
  SongPageFunctionZoneToggleControl
} from '../SongPageFunctionZone'
import type { PublicRuntimeControlPayload } from './PublicRuntimeInteractiveShell'
import type { PublicRuntimeHostMode } from '@/lib/runtime-core/publicRuntimeHostMode'
import { normalizeExplicitShowGraph } from './usePublicRuntimeControls'

type UseRuntimeDisplaySettingsInput = {
  songId: string
  supportedInstruments: PublicSongInstrument[]
  queryState: PublicSongPageQueryState
  runtimeControlPayload: PublicRuntimeControlPayload
  runtimeDefaultInstrumentId: string | null
  runtimeDefaultFingeringIndex: string | number | null
  runtimeDefaultShowGraph: string | null
  hasLyricToggle: boolean
  activeRuntimeHostMode: PublicRuntimeHostMode
  runtimeApiBasePath: string
  shouldEnablePlaybackRuntimeFeature: boolean
  pageBasePath: string
}

export function useRuntimeDisplaySettings({
  songId,
  supportedInstruments,
  queryState,
  runtimeControlPayload,
  runtimeDefaultInstrumentId,
  runtimeDefaultFingeringIndex,
  runtimeDefaultShowGraph,
  hasLyricToggle,
  activeRuntimeHostMode,
  runtimeApiBasePath,
  shouldEnablePlaybackRuntimeFeature,
  pageBasePath
}: UseRuntimeDisplaySettingsInput) {
  const activeInstrument = useMemo(
    () =>
      supportedInstruments.find(instrument => instrument.id === queryState.instrumentId) ??
      supportedInstruments.find(instrument => instrument.id === 'o12') ??
      supportedInstruments[0],
    [queryState.instrumentId, supportedInstruments]
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
        queryState.instrumentId === activeInstrument.id ? activeInstrument.id : null,
      fingeringIndex: normalizeFingeringIndex(
        queryState.fingeringIndex,
        fingeringOptions.map(item => item.value)
      ),
      noteLabelMode: normalizeExplicitNoteLabelMode(queryState.noteLabelMode),
      showGraph: normalizeExplicitShowGraph(
        queryState.showGraph,
        graphOptions.map(item => item.value)
      ),
      showLyric: hasLyricToggle ? normalizeToggleParam(queryState.showLyric) : null,
      showNoteRange: normalizeToggleParam(queryState.showNoteRange),
      showMeasureNum: normalizeToggleParam(queryState.showMeasureNum),
      measureLayout: normalizeMeasureLayout(queryState.measureLayout),
      sheetScale: normalizeSheetScale(
        queryState.sheetScale,
        runtimeControlPayload.sheetScaleList
      ),
      practiceTool: normalizePracticeTool(queryState.practiceTool),
      runtimeVisualTheme: queryState.runtimeVisualTheme === 'off' ? 'off' : null,
      runtimeHost: queryState.runtimeHost
    }),
    [
      activeInstrument.id,
      fingeringOptions,
      graphOptions,
      hasLyricToggle,
      queryState,
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

  const runtimeInitialFingeringIndex = controlConfig.fingeringOptions[0]?.value ?? null
  const runtimeDefaultShowLyric = hasLyricToggle ? 'on' : null
  const runtimeDefaultShowMeasureNum = 'off'
  const runtimeDefaultMeasureLayout = 'compact'
  const runtimeDefaultSheetScale = controlConfig.scaleOptions[0]?.value ?? String(
    runtimeControlPayload.sheetScaleList?.[0] ?? 10
  )

  const runtimeQueryString = useMemo(() => {
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
      normalizedQueryState.measureLayout &&
      normalizedQueryState.measureLayout !== runtimeDefaultMeasureLayout
    ) {
      next.set('measure_layout', normalizedQueryState.measureLayout)
    }
    if (normalizedQueryState.practiceTool === 'metronome') {
      next.append('public_feature', 'metronome')
    }
    if (shouldEnablePlaybackRuntimeFeature) {
      next.append('public_feature', 'playback')
    }
    return next.toString()
  }, [
    activeInstrument.id,
    controlConfig.activeGraphValue,
    noteLabelMode,
    normalizedQueryState,
    runtimeDefaultMeasureLayout,
    runtimeDefaultShowLyric,
    runtimeInitialFingeringIndex,
    shouldEnablePlaybackRuntimeFeature,
    shouldPinDefaultGraphDirection,
    shouldPinDefaultInstrument
  ])

  const runtimeHostSessionKey = `${activeRuntimeHostMode}:${runtimeApiBasePath}:${songId}:${runtimeQueryString}`

  const pageHref = useCallback(
    (nextQueryState: PublicSongPageQueryState & { songId?: string }) =>
      buildSongPageHref({
        songId,
        basePath: pageBasePath,
        ...nextQueryState
      }),
    [pageBasePath, songId]
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

  return {
    activeInstrument,
    graphOptions,
    fingeringOptions,
    normalizedQueryState,
    noteLabelMode,
    controlConfig,
    controlFingeringIndex,
    runtimeInitialFingeringIndex,
    runtimeDefaultShowLyric,
    runtimeDefaultShowMeasureNum,
    runtimeDefaultMeasureLayout,
    runtimeDefaultSheetScale,
    runtimeQueryString,
    runtimeHostSessionKey,
    shouldPinDefaultInstrument,
    shouldPinDefaultGraphDirection,
    pageHref,
    selects,
    toggles
  }
}
