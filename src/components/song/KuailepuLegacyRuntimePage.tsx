'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { SongPresentation } from '@/lib/songbook/presentation'
import {
  buildSongPageHref,
  type PublicSongPageQueryState,
  type PublicSongInstrument
} from '@/lib/songbook/publicInstruments'
import {
  buildPublicRuntimeControlConfig,
  getPublicRuntimeGraphOptions,
  type PublicRuntimeControlConfig
} from '@/lib/songbook/publicRuntimeControls'
import KuailepuRuntimeFrame from './KuailepuRuntimeFrame'
import SongPageFunctionZone, {
  type SongPageFunctionZoneSelectControl,
  type SongPageFunctionZoneToggleControl
} from './SongPageFunctionZone'

type KuailepuLegacyRuntimePageProps = {
  songId: string
  supportedInstruments: PublicSongInstrument[]
  queryState: PublicSongPageQueryState
  presentationByInstrument: Partial<Record<PublicSongInstrument['id'], SongPresentation>>
  runtimeControlPayload: {
    instrumentFingerings?: Array<{
      instrument: string
      instrumentName?: string
      graphList?: Array<{
        name?: string
        value?: string
      }>
    }>
    sheetScaleList?: number[]
  }
  hasLyricToggle: boolean
}

/**
 * 这个组件是“站点自己的页面壳”。
 *
 * 关键职责只有两个：
 * 1. 生成 iframe URL，把当前曲目的运行时状态传给 `/api/kuailepu-runtime/[id]`。
 * 2. 把 iframe 的真实装载和 loading / 高度同步交给单独的 client 组件。
 *
 * 这里仍然保留 server component，是为了把“站点页面壳”和“runtime 装载行为”
 * 明确拆开：SEO 文案、模式链接、标题区在这里；iframe 生命周期在
 * `KuailepuRuntimeFrame` 里，避免两层职责继续缠在一起。
 */
export default function KuailepuLegacyRuntimePage({
  songId,
  supportedInstruments,
  queryState,
  presentationByInstrument,
  runtimeControlPayload,
  hasLyricToggle,
}: KuailepuLegacyRuntimePageProps) {
  const [currentQueryState, setCurrentQueryState] = useState(queryState)
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
  const normalizedQueryState: PublicSongPageQueryState = useMemo(
    () => ({
      instrumentId:
        currentQueryState.instrumentId === activeInstrument.id ? activeInstrument.id : null,
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
  const controlConfig = useMemo(
    () =>
      buildPublicRuntimeControlConfig(runtimeControlPayload, activeInstrument.id, {
        show_graph: normalizedQueryState.showGraph ?? null,
        show_lyric: (normalizedQueryState.showLyric ?? 'on') as 'on' | 'off',
        show_note_range: (normalizedQueryState.showNoteRange ?? 'off') as 'on' | 'off',
        show_measure_num: (normalizedQueryState.showMeasureNum ?? 'on') as 'on' | 'off',
        measure_layout: normalizedQueryState.measureLayout ?? 'compact',
        sheet_scale: normalizedQueryState.sheetScale ?? 10
      }),
    [activeInstrument.id, normalizedQueryState, runtimeControlPayload]
  )
  const seo =
    presentationByInstrument[activeInstrument.id] ??
    presentationByInstrument['o12'] ??
    Object.values(presentationByInstrument)[0] ?? {
      title: songId,
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
  const params = useMemo(() => {
    const next = new URLSearchParams()
    next.set('runtime_text_mode', 'english')
    if (activeInstrument.id !== 'o12') {
      next.set('instrument', activeInstrument.id)
    }
    if (noteLabelMode !== 'letter') {
      next.set('note_label_mode', noteLabelMode)
    }
    if (normalizedQueryState.showGraph) {
      next.set('show_graph', normalizedQueryState.showGraph)
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
      next.set('public_feature', 'metronome')
    }
    return next
  }, [activeInstrument.id, normalizedQueryState, noteLabelMode])
  const query = params.toString()
  const frameSrc = query ? `/api/kuailepu-runtime/${songId}?${query}` : `/api/kuailepu-runtime/${songId}`
  const loadingId = `kuailepu-runtime-${songId}-loading`

  function navigateWithinSongPage(href: string) {
    if (!href || typeof window === 'undefined') {
      return
    }

    const nextUrl = new URL(href, window.location.origin)
    if (nextUrl.pathname !== `/song/${songId}`) {
      window.location.replace(nextUrl.toString())
      return
    }

    setCurrentQueryState(parseSongPageQueryState(nextUrl))
    window.history.replaceState(window.history.state, '', nextUrl.pathname + nextUrl.search)
  }

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
              noteLabelMode,
              showGraph: null
            })
          }))
        }
      : null

  const fingeringChartSelect = {
    id: 'fingering-chart',
    label: 'Fingering Chart',
    value:
      controlConfig.activeGraphVisibility === 'off'
        ? 'off'
        : (controlConfig.activeGraphValue ?? 'chart-on'),
    options: buildFingeringChartSelectOptions({
      songId,
      queryState: normalizedQueryState,
      noteLabelMode,
      activeInstrument,
      controlConfig
    })
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
    fingeringChartSelect,
    layoutSelect,
    zoomSelect
  ]

  const toggles: SongPageFunctionZoneToggleControl[] = [
    {
      id: 'note-view',
      label: 'Note View',
      options: [
        {
          label: 'Letter Notes',
          href: buildSongPageHref({
            songId,
            ...normalizedQueryState,
            instrumentId: activeInstrument.id,
            noteLabelMode: 'letter'
          }),
          isActive: noteLabelMode === 'letter'
        },
        {
          label: 'Numbered Notes',
          href: buildSongPageHref({
            songId,
            ...normalizedQueryState,
            instrumentId: activeInstrument.id,
            noteLabelMode: 'number'
          }),
          isActive: noteLabelMode === 'number'
        }
      ]
    },
    ...(hasLyricToggle
      ? [
          {
            id: 'lyrics',
            label: 'Lyrics',
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

  return (
    <main className="page-warm-shell">
      <div className="page-warm-container">
        <section className="page-warm-hero mb-3 px-5 py-4 md:px-7 md:py-[1.125rem]">
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-stone-900 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-50 shadow-[0_14px_30px_rgba(61,47,34,0.18)] transition hover:-translate-y-0.5 hover:bg-stone-800 hover:shadow-[0_18px_36px_rgba(61,47,34,0.24)]"
          >
            <span aria-hidden="true" className="text-base leading-none">←</span>
            <span>Back to Song Library</span>
          </Link>
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
            {seo.familyLabel} · {seo.difficultyLabel}
          </div>
          <h1 className="mt-2 text-[1.95rem] font-black leading-tight tracking-tight text-stone-900 md:text-[3.05rem]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-4xl text-sm leading-6 text-stone-600">{subtitle}</p>
          ) : null}
          <div className="mt-3 border-t border-[rgba(154,126,91,0.18)] pt-3">
            <SongPageFunctionZone
              selects={selects}
              toggles={toggles}
              onNavigate={navigateWithinSongPage}
            />
          </div>
        </section>

        <div>
          <KuailepuRuntimeFrame
            songId={songId}
            title={title}
            frameSrc={frameSrc}
            loadingId={loadingId}
          />
        </div>

        <article className="mt-6 grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
          <section className="page-warm-panel p-6 md:p-7">
            <h2 className="text-2xl font-bold text-stone-900">About {title}</h2>
            <p className="mt-4 text-sm leading-7 text-stone-700">{seo.overview}</p>
            <p className="mt-4 text-sm leading-7 text-stone-700">{seo.background}</p>
            <p className="mt-4 text-sm leading-7 text-stone-700">{seo.practiceNotes}</p>
          </section>

          <div className="grid gap-6">
            <section className="page-warm-panel-soft p-6">
              <h2 className="text-xl font-bold text-stone-900">What This Page Includes</h2>
              <ul className="mt-4 grid gap-3 text-sm leading-6 text-stone-700">
                {seo.includes.map(item => (
                  <li key={item} className="rounded-2xl bg-[rgba(255,247,237,0.85)] px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="page-warm-panel-soft p-6">
              <h2 className="text-xl font-bold text-stone-900">FAQ</h2>
              <div className="mt-4 grid gap-4">
                {seo.faqs.map(item => (
                  <div
                    key={item.question}
                    className="rounded-2xl bg-[rgba(255,247,237,0.82)] px-4 py-4"
                  >
                    <h3 className="text-sm font-semibold text-stone-900">{item.question}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-700">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="page-warm-panel-soft p-6">
              <h2 className="text-xl font-bold text-stone-900">How To Use This Page</h2>
              <p className="mt-3 text-sm leading-6 text-stone-700">
                Use the default letter-note view for fast reading, switch to numbered notes only
                when you want a backup reference, and keep the fingering chart visible as you work
                through each phrase. The layout is built so you can land on the melody and start
                playing quickly.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  )
}

function parseSongPageQueryState(url: URL): PublicSongPageQueryState {
  return {
    instrumentId: normalizeInstrumentId(url.searchParams.get('instrument')),
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

function buildFingeringChartSelectOptions(input: {
  songId: string
  queryState: PublicSongPageQueryState
  noteLabelMode: 'letter' | 'number' | 'graph'
  activeInstrument: PublicSongInstrument
  controlConfig: PublicRuntimeControlConfig
}) {
  const { songId, queryState, noteLabelMode, activeInstrument, controlConfig } = input

  if (controlConfig.graphOptions.length > 1) {
    return [
      {
        value: 'off',
        label: 'Chart Off',
        href: buildSongPageHref({
          songId,
          ...queryState,
          instrumentId: activeInstrument.id,
          noteLabelMode,
          showGraph: 'off'
        })
      },
      ...controlConfig.graphOptions.map(option => ({
        value: option.value,
        label: option.label,
        href: buildSongPageHref({
          songId,
          ...queryState,
          instrumentId: activeInstrument.id,
          noteLabelMode,
          showGraph: option.value
        })
      }))
    ]
  }

  const chartOnValue = controlConfig.activeGraphValue ?? controlConfig.graphOptions[0]?.value ?? 'on'

  return [
    {
      value: chartOnValue,
      label: 'Chart On',
      href: buildSongPageHref({
        songId,
        ...queryState,
        instrumentId: activeInstrument.id,
        noteLabelMode,
        showGraph: chartOnValue
      })
    },
    {
      value: 'off',
      label: 'Chart Off',
      href: buildSongPageHref({
        songId,
        ...queryState,
        instrumentId: activeInstrument.id,
        noteLabelMode,
        showGraph: 'off'
      })
    }
  ]
}
