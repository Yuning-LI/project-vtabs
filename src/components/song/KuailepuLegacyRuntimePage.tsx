import Link from 'next/link'
import type { KuailepuRuntimeState } from '@/lib/kuailepu/runtime'
import type { SongPresentation } from '@/lib/songbook/presentation'
import {
  buildSongPageHref,
  type PublicSongPageQueryState,
  type PublicSongInstrument
} from '@/lib/songbook/publicInstruments'
import type { PublicRuntimeControlConfig } from '@/lib/songbook/publicRuntimeControls'
import KuailepuRuntimeFrame from './KuailepuRuntimeFrame'
import SongPageFunctionZone, {
  type SongPageFunctionZoneSelectControl,
  type SongPageFunctionZoneToggleControl
} from './SongPageFunctionZone'

type KuailepuLegacyRuntimePageProps = {
  songId: string
  title: string
  subtitle?: string | null
  seo: SongPresentation
  activeInstrument: PublicSongInstrument
  supportedInstruments: PublicSongInstrument[]
  queryState: PublicSongPageQueryState
  controlConfig: PublicRuntimeControlConfig
  hasLyricToggle: boolean
  state?: KuailepuRuntimeState | null
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
  title,
  subtitle = null,
  seo,
  activeInstrument,
  supportedInstruments,
  queryState,
  controlConfig,
  hasLyricToggle,
  state = null
}: KuailepuLegacyRuntimePageProps) {
  const params = new URLSearchParams()
  params.set('runtime_text_mode', 'english')
  if (state?.instrument) params.set('instrument', state.instrument)
  if (state?.fingering) params.set('fingering', state.fingering)
  if (state?.fingering_index !== null && state?.fingering_index !== undefined) {
    params.set('fingering_index', String(state.fingering_index))
  }
  if (state?.show_graph) params.set('show_graph', state.show_graph)
  if (state?.show_lyric) params.set('show_lyric', state.show_lyric)
  if (state?.show_measure_num) params.set('show_measure_num', state.show_measure_num)
  if (state?.measure_layout) params.set('measure_layout', state.measure_layout)
  if (state?.sheet_scale !== null && state?.sheet_scale !== undefined) {
    params.set('sheet_scale', String(state.sheet_scale))
  }
  if (state?.note_label_mode && state.note_label_mode !== 'letter') {
    params.set('note_label_mode', state.note_label_mode)
  }
  if (queryState.practiceTool === 'metronome') {
    params.set('public_feature', 'metronome')
  }

  const query = params.toString()
  const frameSrc = query
    ? `/api/kuailepu-runtime/${songId}?${query}`
    : `/api/kuailepu-runtime/${songId}`
  const loadingId = `kuailepu-runtime-${songId}-loading`
  const noteLabelMode =
    state?.note_label_mode === 'letter' ||
    state?.note_label_mode === 'number' ||
    state?.note_label_mode === 'graph'
      ? state.note_label_mode
      : 'letter'

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
              ...queryState,
              instrumentId: instrument.id,
              noteLabelMode
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
      queryState,
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
        ...queryState,
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
        ...queryState,
        instrumentId: activeInstrument.id,
        noteLabelMode,
        sheetScale: option.value
      })
    }))
  }

  const practiceSelect = {
    id: 'practice-tool',
    label: 'Practice Tool',
    value: queryState.practiceTool === 'metronome' ? 'metronome' : 'off',
    options: [
      {
        value: 'off',
        label: 'Off',
        href: buildSongPageHref({
          songId,
          ...queryState,
          instrumentId: activeInstrument.id,
          noteLabelMode,
          practiceTool: null
        })
      },
      {
        value: 'metronome',
        label: 'Metronome',
        href: buildSongPageHref({
          songId,
          ...queryState,
          instrumentId: activeInstrument.id,
          noteLabelMode,
          practiceTool: 'metronome'
        })
      }
    ]
  }

  const selects: SongPageFunctionZoneSelectControl[] = [
    ...(instrumentSelect ? [instrumentSelect] : []),
    fingeringChartSelect,
    layoutSelect,
    zoomSelect,
    practiceSelect
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
            ...queryState,
            instrumentId: activeInstrument.id,
            noteLabelMode: 'letter'
          }),
          isActive: noteLabelMode === 'letter'
        },
        {
          label: 'Numbered Notes',
          href: buildSongPageHref({
            songId,
            ...queryState,
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
                  ...queryState,
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
                  ...queryState,
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
            ...queryState,
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
            ...queryState,
            instrumentId: activeInstrument.id,
            noteLabelMode,
            showMeasureNum: 'off'
          }),
          isActive: controlConfig.activeShowMeasureNum === 'off'
        }
      ]
    }
  ]

  return (
    <main className="page-warm-shell">
      <div className="page-warm-container">
        <section className="page-warm-hero mb-4 px-5 py-5 md:px-7 md:py-6">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-stone-900 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-50 shadow-[0_14px_30px_rgba(61,47,34,0.18)] transition hover:-translate-y-0.5 hover:bg-stone-800 hover:shadow-[0_18px_36px_rgba(61,47,34,0.24)]"
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
            <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600">{subtitle}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
            <span className="page-warm-pill px-3 py-1">Key {seo.keyLabel}</span>
            <span className="page-warm-pill px-3 py-1">{seo.meterLabel}</span>
            <span className="page-warm-pill px-3 py-1">{seo.tempoLabel}</span>
            <span className="page-warm-pill px-3 py-1">{activeInstrument.label}</span>
          </div>
          <div className="mt-4 border-t border-[rgba(154,126,91,0.18)] pt-4">
            <SongPageFunctionZone selects={selects} toggles={toggles} />
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
