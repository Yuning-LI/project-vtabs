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
  /**
   * 这里显式把状态拼进 iframe query，而不是做父子窗口共享状态管理，
   * 是为了让每个 song page URL 都能独立复现当前阅读模式。
   *
   * 这对两个场景都重要：
   * - SEO / 外链抓取：URL 本身就是页面真相
   * - 交接 / 排障：复制一个详情页地址就能复现当前模式，不依赖 React 内存状态
   */
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
  const instrumentLinks = supportedInstruments.map(instrument => ({
    href: buildSongPageHref({
      songId,
      ...queryState,
      instrumentId: instrument.id,
      noteLabelMode
    }),
    label: instrument.shortLabel,
    instrumentId: instrument.id
  }))
  const modeLinks = [
    {
      href: buildSongPageHref({
        songId,
        ...queryState,
        instrumentId: activeInstrument.id,
        noteLabelMode: 'letter'
      }),
      label: 'Letter Notes',
      mode: 'letter'
    },
    {
      href: buildSongPageHref({
        songId,
        ...queryState,
        instrumentId: activeInstrument.id,
        noteLabelMode: 'number'
      }),
      label: 'Numbered Notes',
      mode: 'number'
    }
  ] as const

  return (
    <main className="page-warm-shell">
      <div className="page-warm-container">
        <section className="page-warm-hero mb-6 px-6 py-6 md:px-8 md:py-7">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-900 bg-stone-900 px-5 py-3 text-sm font-semibold text-stone-50 shadow-[0_14px_30px_rgba(61,47,34,0.18)] transition hover:-translate-y-0.5 hover:bg-stone-800 hover:shadow-[0_18px_36px_rgba(61,47,34,0.24)]"
          >
            <span aria-hidden="true" className="text-base leading-none">←</span>
            <span>Back to Song Library</span>
          </Link>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            {seo.familyLabel} · {seo.difficultyLabel}
          </div>
          <h1 className="mt-3 text-[2.1rem] font-black leading-tight tracking-tight text-stone-900 md:text-[3.35rem]">
            {title}
          </h1>
          {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600">{subtitle}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
            <span className="page-warm-pill px-3 py-1">Key {seo.keyLabel}</span>
            <span className="page-warm-pill px-3 py-1">{seo.meterLabel}</span>
            <span className="page-warm-pill px-3 py-1">{seo.tempoLabel}</span>
            <span className="page-warm-pill px-3 py-1">{activeInstrument.label}</span>
          </div>
          <div className="mt-5 flex flex-col gap-4">
            {instrumentLinks.length > 1 ? (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Instrument
                </div>
                <div className="flex flex-wrap gap-2">
                  {instrumentLinks.map(link => {
                    const isActive = link.instrumentId === activeInstrument.id

                    return (
                      <Link
                        key={link.instrumentId}
                        href={link.href}
                        className={
                          isActive
                            ? 'page-warm-pill-active px-4 py-2 text-sm font-semibold'
                            : 'page-warm-pill-muted px-4 py-2 text-sm font-semibold transition hover:border-[rgba(126,95,58,0.3)] hover:bg-[rgba(255,248,238,0.96)]'
                        }
                      >
                        {link.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Note View
              </div>
              <div className="flex flex-wrap gap-2">
                {modeLinks.map(link => {
                  const isActive = link.mode === noteLabelMode

                  return (
                    <Link
                      key={link.mode}
                      href={link.href}
                      className={
                        isActive
                          ? 'page-warm-pill-active px-4 py-2 text-sm font-semibold'
                          : 'page-warm-pill-muted px-4 py-2 text-sm font-semibold transition hover:border-[rgba(126,95,58,0.3)] hover:bg-[rgba(255,248,238,0.96)]'
                      }
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Fingering Chart
                </div>
                <div className="flex flex-wrap gap-2">
                  {([
                    {
                      label: 'Chart On',
                      value: controlConfig.activeGraphValue ?? controlConfig.graphOptions[0]?.value ?? 'on'
                    },
                    {
                      label: 'Chart Off',
                      value: 'off'
                    }
                  ] as const).map(option => {
                    const isActive =
                      option.value === 'off'
                        ? controlConfig.activeGraphVisibility === 'off'
                        : controlConfig.activeGraphVisibility === 'on'

                    return (
                      <Link
                        key={option.label}
                        href={buildSongPageHref({
                          songId,
                          ...queryState,
                          instrumentId: activeInstrument.id,
                          noteLabelMode,
                          showGraph: option.value
                        })}
                        className={
                          isActive
                            ? 'page-warm-pill-active px-4 py-2 text-sm font-semibold'
                            : 'page-warm-pill-muted px-4 py-2 text-sm font-semibold transition hover:border-[rgba(126,95,58,0.3)] hover:bg-[rgba(255,248,238,0.96)]'
                        }
                      >
                        {option.label}
                      </Link>
                    )
                  })}
                </div>
              </div>

              {controlConfig.graphOptions.length > 1 && controlConfig.activeGraphVisibility === 'on' ? (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Chart View
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {controlConfig.graphOptions.map(option => {
                      const isActive = option.value === controlConfig.activeGraphValue

                      return (
                        <Link
                          key={option.value}
                          href={buildSongPageHref({
                            songId,
                            ...queryState,
                            instrumentId: activeInstrument.id,
                            noteLabelMode,
                            showGraph: option.value
                          })}
                          className={
                            isActive
                              ? 'page-warm-pill-active px-4 py-2 text-sm font-semibold'
                              : 'page-warm-pill-muted px-4 py-2 text-sm font-semibold transition hover:border-[rgba(126,95,58,0.3)] hover:bg-[rgba(255,248,238,0.96)]'
                          }
                        >
                          {option.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {hasLyricToggle ? (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Lyrics
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { label: 'Lyrics On', value: 'on' },
                      { label: 'Lyrics Off', value: 'off' }
                    ] as const).map(option => {
                      const isActive = option.value === controlConfig.activeShowLyric

                      return (
                        <Link
                          key={option.value}
                          href={buildSongPageHref({
                            songId,
                            ...queryState,
                            instrumentId: activeInstrument.id,
                            noteLabelMode,
                            showLyric: option.value
                          })}
                          className={
                            isActive
                              ? 'page-warm-pill-active px-4 py-2 text-sm font-semibold'
                              : 'page-warm-pill-muted px-4 py-2 text-sm font-semibold transition hover:border-[rgba(126,95,58,0.3)] hover:bg-[rgba(255,248,238,0.96)]'
                          }
                        >
                          {option.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Measure Numbers
                </div>
                <div className="flex flex-wrap gap-2">
                  {([
                    { label: 'Numbers On', value: 'on' },
                    { label: 'Numbers Off', value: 'off' }
                  ] as const).map(option => {
                    const isActive = option.value === controlConfig.activeShowMeasureNum

                    return (
                      <Link
                        key={option.value}
                        href={buildSongPageHref({
                          songId,
                          ...queryState,
                          instrumentId: activeInstrument.id,
                          noteLabelMode,
                          showMeasureNum: option.value
                        })}
                        className={
                          isActive
                            ? 'page-warm-pill-active px-4 py-2 text-sm font-semibold'
                            : 'page-warm-pill-muted px-4 py-2 text-sm font-semibold transition hover:border-[rgba(126,95,58,0.3)] hover:bg-[rgba(255,248,238,0.96)]'
                        }
                      >
                        {option.label}
                      </Link>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Layout
                </div>
                <div className="flex flex-wrap gap-2">
                  {([
                    { label: 'Compact', value: 'compact' },
                    { label: 'Equal Width', value: 'mono' }
                  ] as const).map(option => {
                    const isActive = option.value === controlConfig.activeMeasureLayout

                    return (
                      <Link
                        key={option.value}
                        href={buildSongPageHref({
                          songId,
                          ...queryState,
                          instrumentId: activeInstrument.id,
                          noteLabelMode,
                          measureLayout: option.value
                        })}
                        className={
                          isActive
                            ? 'page-warm-pill-active px-4 py-2 text-sm font-semibold'
                            : 'page-warm-pill-muted px-4 py-2 text-sm font-semibold transition hover:border-[rgba(126,95,58,0.3)] hover:bg-[rgba(255,248,238,0.96)]'
                        }
                      >
                        {option.label}
                      </Link>
                    )
                  })}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Zoom
                </div>
                <div className="flex flex-wrap gap-2">
                  {controlConfig.scaleOptions.map(option => {
                    const isActive = option.value === controlConfig.activeSheetScale

                    return (
                      <Link
                        key={option.value}
                        href={buildSongPageHref({
                          songId,
                          ...queryState,
                          instrumentId: activeInstrument.id,
                          noteLabelMode,
                          sheetScale: option.value
                        })}
                        className={
                          isActive
                            ? 'page-warm-pill-active px-4 py-2 text-sm font-semibold'
                            : 'page-warm-pill-muted px-4 py-2 text-sm font-semibold transition hover:border-[rgba(126,95,58,0.3)] hover:bg-[rgba(255,248,238,0.96)]'
                        }
                      >
                        {option.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <KuailepuRuntimeFrame
          songId={songId}
          title={title}
          frameSrc={frameSrc}
          loadingId={loadingId}
        />

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
                Use the default letter-note view for fast reading, switch to numbered notes only when you want a backup reference, and keep the fingering chart visible as you work through each phrase. The layout is built so you can land on the melody and start playing quickly.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  )
}
