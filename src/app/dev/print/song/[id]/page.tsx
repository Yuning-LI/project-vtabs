import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ExportRuntimeHost from '@/components/song/runtime-host/ExportRuntimeHost'
import {
  hasPublicRuntimeLyricToggle,
  loadPublicRuntimeSongPayload
} from '@/lib/runtime-core/publicRuntime'
import type { PublicRuntimeState } from '@/lib/runtime-core/runtimeTypes'
import {
  LEGACY_RUNTIME_IFRAME_SIGNAL,
  resolvePublicRuntimeHostMode
} from '@/lib/runtime-core/publicRuntimeHostMode'
import { buildPublicRuntimeContainerPackage } from '@/lib/runtime-core/server/publicRuntimeContainerPackage'
import { songCatalogBySlug } from '@/lib/songbook/catalog'
import { getSongPresentation } from '@/lib/songbook/presentation'
import {
  adaptPresentationForInstrument,
  getSupportedPublicSongInstruments,
  normalizePublicSongInstrument
} from '@/lib/songbook/publicInstruments'
import { getPublicRuntimeGraphOptions } from '@/lib/songbook/publicRuntimeControls'
import {
  normalizeExplicitNoteLabelMode,
  normalizeMeasureLayout,
  normalizeSheetScale,
  normalizeToggleParam
} from '@/lib/songbook/songPageQueryState'
import { normalizePublicRuntimeVisualThemeName } from '@/lib/runtime-core/visual/publicRuntimeVisualTheme'
import { siteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'

type PrintPageSearchParams = {
  instrument?: string
  note_label_mode?: string
  show_graph?: string
  show_lyric?: string
  show_measure_num?: string
  measure_layout?: string
  sheet_scale?: string
  runtime_visual_theme?: string
  paper?: string
  runtime_host?: string
}

export async function generateMetadata({
  params
}: {
  params: { id: string }
}): Promise<Metadata> {
  return {
    title: `${params.id} Print Preview`,
    description: 'Internal print preview for PDF export.',
    robots: {
      index: false,
      follow: false
    }
  }
}

export default function InternalPrintSongPage({
  params,
  searchParams
}: {
  params: { id: string }
  searchParams?: PrintPageSearchParams
}) {
  /**
   * 这是“内部打印壳”，不是第二套公开详情页。
   *
   * 当前边界：
   * - 继续使用 deployable raw JSON + integrated runtime 主链出谱
   * - 这里只额外负责纸张版式、导流文案和 PDF 预览
   * - 当前不要把它当成公开用户功能暴露到前台
   */
  const song = songCatalogBySlug[params.id]
  if (!song) {
    notFound()
  }

  const runtimePayload = loadPublicRuntimeSongPayload(song.slug)
  if (!runtimePayload) {
    notFound()
  }

  const supportedInstruments = getSupportedPublicSongInstruments(runtimePayload)
  const activeInstrument = normalizePublicSongInstrument(
    searchParams?.instrument,
    supportedInstruments
  )
  const hasPublicLyricToggle = hasPublicRuntimeLyricToggle(runtimePayload)
  const presentation = adaptPresentationForInstrument(
    getSongPresentation(song, { publicLyricsAvailable: hasPublicLyricToggle }),
    activeInstrument
  )
  const graphOptions = getPublicRuntimeGraphOptions(runtimePayload, activeInstrument.id)
  const noteLabelMode = normalizeExplicitNoteLabelMode(searchParams?.note_label_mode) ?? 'letter'
  const showGraph =
    searchParams?.show_graph ??
    (graphOptions[0]?.value ?? null)
  const showLyric = hasPublicLyricToggle
    ? normalizeToggleParam(searchParams?.show_lyric) ?? 'off'
    : null
  const showMeasureNum = normalizeToggleParam(searchParams?.show_measure_num) ?? 'on'
  const measureLayout = normalizeMeasureLayout(searchParams?.measure_layout) ?? 'compact'
  const sheetScale =
    String(
      normalizeSheetScale(searchParams?.sheet_scale, runtimePayload.sheetScaleList) ??
        runtimePayload.sheetScaleList?.[0] ??
        10
    )
  const paper = normalizePaper(searchParams?.paper)
  const runtimeVisualTheme = normalizePublicRuntimeVisualThemeName(
    searchParams?.runtime_visual_theme
  )
  const runtimeHostResolution = resolvePublicRuntimeHostMode({
    queryValue: searchParams?.runtime_host,
    environmentValue: LEGACY_RUNTIME_IFRAME_SIGNAL,
    hasQueryFlag: Boolean(searchParams?.runtime_host)
  })

  const runtimeState: PublicRuntimeState = {
    instrument: activeInstrument.id,
    note_label_mode: noteLabelMode,
    show_graph: showGraph,
    show_lyric: showLyric,
    show_measure_num: showMeasureNum,
    measure_layout: measureLayout,
    sheet_scale: sheetScale
  }
  const containerPackage = buildPublicRuntimeContainerPackage({
    songId: song.slug,
    payload: runtimePayload,
    state: runtimeState,
    preferredEnglishTitle: presentation.title,
    preferredEnglishSubtitle: null,
    visualThemeName: runtimeVisualTheme
  })
  const loadingId = `public-runtime-print-${song.slug}-loading`

  return (
    <main className="vtabs-print-shell min-h-screen bg-[#f3f0ea] px-4 py-6 text-stone-900 print:bg-white print:px-0 print:py-0">
      <style>{`
        @media print {
          @page {
            size: ${paper === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
            margin: 10mm;
          }
        }
      `}</style>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4 print:max-w-none print:gap-0">
        <section className="rounded-[28px] border border-stone-200 bg-white/92 px-5 py-4 shadow-[0_18px_36px_rgba(84,58,32,0.08)] print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Internal Print Preview
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-stone-900">
                {presentation.title}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link
                href={`/song/${song.slug}`}
                className="rounded-full border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-700"
              >
                Open Public Page
              </Link>
              <span className="text-stone-600">Use the browser print dialog or the export script.</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
            <span className="rounded-full bg-stone-100 px-3 py-1.5">{activeInstrument.label}</span>
            <span className="rounded-full bg-stone-100 px-3 py-1.5">
              {noteLabelMode === 'number' ? 'Numbered Notes' : 'Letter Notes'}
            </span>
            <span className="rounded-full bg-stone-100 px-3 py-1.5">
              Fingering {showGraph ? 'On' : 'Off'}
            </span>
            <span className="rounded-full bg-stone-100 px-3 py-1.5">
              Lyrics {showLyric === 'on' ? 'On' : 'Off'}
            </span>
            <span className="rounded-full bg-stone-100 px-3 py-1.5">
              Measure Numbers {showMeasureNum === 'on' ? 'On' : 'Off'}
            </span>
            <span className="rounded-full bg-stone-100 px-3 py-1.5">
              Paper {paper === 'landscape' ? 'A4 Landscape' : 'A4 Portrait'}
            </span>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[210mm] rounded-[24px] border border-stone-200 bg-white px-0 py-0 shadow-[0_18px_36px_rgba(84,58,32,0.08)] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
          <header className="border-b border-stone-200 px-6 py-5 print:border-b-0 print:px-0 print:py-0 print:pb-3">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-stone-500 print:hidden">
              Print Layout
            </div>
            <div className="mb-3 rounded-[18px] border border-[rgba(154,126,91,0.22)] bg-[linear-gradient(135deg,rgba(255,251,244,0.98)_0%,rgba(245,236,220,0.92)_100%)] px-4 py-3 print:mb-2 print:rounded-[12px] print:border-stone-300 print:bg-[rgba(247,243,236,0.95)] print:px-3 print:py-2">
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-stone-500 print:text-[8pt]">
                PlayByFingering
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-sm text-stone-700 print:mt-0.5 print:text-[9pt]">
                <span>Letter-note fingering sheets for ocarina, recorder, and tin whistle.</span>
                <span className="font-semibold text-stone-900">{siteUrl.replace(/^https?:\/\//, '')}</span>
              </div>
            </div>
            <h2 className="mt-1 text-[1.8rem] font-black leading-tight tracking-tight text-stone-900 print:mt-0 print:text-[18pt]">
              {presentation.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600 print:hidden">
              Clean preview for exporting fingering sheets as PDF. This internal route keeps lyrics off by default when available.
            </p>
          </header>

          <div className="px-3 py-3 print:px-0 print:py-0">
            <ExportRuntimeHost
              songId={song.slug}
              title={presentation.title}
              mode={runtimeHostResolution.mode}
              loadingId={loadingId}
              containerPackage={containerPackage}
              panelClassName="relative overflow-hidden rounded-[18px] border border-stone-200 bg-white shadow-none print:rounded-none print:border-0"
              overlayClassName="bg-white/96"
              initialHeight={1120}
            />
          </div>

          <footer className="border-t border-stone-200 px-6 py-3 text-sm text-stone-600 print:border-t print:border-stone-300 print:px-0 print:pt-3 print:text-[9pt]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>More fingering sheets and melody pages: {siteUrl.replace(/^https?:\/\//, '')}</span>
              <span>{activeInstrument.label}</span>
            </div>
          </footer>
        </section>
      </div>
    </main>
  )
}

function normalizePaper(value: string | undefined) {
  return value === 'landscape' ? 'landscape' : 'portrait'
}
