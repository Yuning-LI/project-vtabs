import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PinterestWorkbenchControls from '@/components/dev/PinterestWorkbenchControls'
import PinterestWorkbenchShell from '@/components/dev/PinterestWorkbenchShell'
import KuailepuRuntimeFrame from '@/components/song/KuailepuRuntimeFrame'
import {
  resolveKuailepuRuntimeState,
  hasPublicKuailepuLyricToggle,
  loadKuailepuSongPayload
} from '@/lib/kuailepu/runtime'
import { songCatalogBySlug } from '@/lib/songbook/catalog'
import {
  buildPublicRuntimeControlConfig
} from '@/lib/songbook/publicRuntimeControls'
import {
  buildSongPageHref,
  getSupportedPublicSongInstruments,
  normalizePublicSongInstrument
} from '@/lib/songbook/publicInstruments'
import {
  normalizeExplicitNoteLabelMode,
  normalizeMeasureLayout,
  normalizeSheetScale,
  normalizeToggleParam
} from '@/lib/songbook/songPageQueryState'
import {
  getPinterestPinPreset
} from '@/lib/songbook/pinterestPins'

export const dynamic = 'force-dynamic'

type PinterestWorkbenchSearchParams = {
  instrument?: string
  note_label_mode?: string
  show_graph?: string
  show_lyric?: string
  show_measure_num?: string
  measure_layout?: string
  sheet_scale?: string
  watermark?: string
}

export async function generateMetadata({
  params
}: {
  params: { id: string }
}): Promise<Metadata> {
  const song = songCatalogBySlug[params.id]
  return {
    title: song ? `${song.title} Pinterest Workbench` : `${params.id} Pinterest Workbench`,
    description: 'Internal Pinterest screenshot workbench.',
    robots: {
      index: false,
      follow: false
    }
  }
}

export default function PinterestSongPreviewPage({
  params,
  searchParams
}: {
  params: { id: string }
  searchParams?: PinterestWorkbenchSearchParams
}) {
  const song = songCatalogBySlug[params.id]
  if (!song) {
    notFound()
  }

  const preset = getPinterestPinPreset(params.id)
  const runtimePayload = loadKuailepuSongPayload(song.slug)
  if (!runtimePayload) {
    notFound()
  }

  const supportedInstruments = getSupportedPublicSongInstruments(runtimePayload)
  const activeInstrument = normalizePublicSongInstrument(
    searchParams?.instrument ?? preset?.instrumentId,
    supportedInstruments
  )
  const hasPublicLyrics = hasPublicKuailepuLyricToggle(runtimePayload)
  const noteLabelMode =
    normalizeExplicitNoteLabelMode(searchParams?.note_label_mode) === 'number'
      ? 'number'
      : 'letter'
  const defaultSheetScale = normalizeSheetScale(
    preset?.sheetScale ?? null,
    runtimePayload.sheetScaleList
  )
  const controlState = resolveKuailepuRuntimeState(runtimePayload, {
    instrument: activeInstrument.id,
    show_graph: searchParams?.show_graph ?? null,
    show_lyric: hasPublicLyrics
      ? normalizeToggleParam(searchParams?.show_lyric) ?? 'on'
      : 'off',
    show_measure_num: normalizeToggleParam(searchParams?.show_measure_num) ?? preset?.showMeasureNum ?? 'off',
    measure_layout: normalizeMeasureLayout(searchParams?.measure_layout) ?? preset?.measureLayout ?? 'compact',
    sheet_scale:
      normalizeSheetScale(searchParams?.sheet_scale, runtimePayload.sheetScaleList) ??
      defaultSheetScale ??
      null,
    note_label_mode: noteLabelMode
  })
  const controlConfig = buildPublicRuntimeControlConfig(runtimePayload, activeInstrument.id, {
    show_graph: controlState.show_graph,
    show_lyric: controlState.show_lyric,
    show_note_range: controlState.show_note_range,
    show_measure_num: controlState.show_measure_num,
    measure_layout: controlState.measure_layout,
    sheet_scale: controlState.sheet_scale
  })
  const watermark = normalizeWatermark(searchParams?.watermark)
  const paramsForFrame = new URLSearchParams({
    runtime_text_mode: 'english',
    instrument: activeInstrument.id,
    note_label_mode: noteLabelMode,
    show_lyric: controlConfig.activeShowLyric,
    show_measure_num: controlConfig.activeShowMeasureNum,
    measure_layout: controlConfig.activeMeasureLayout,
    sheet_scale: controlConfig.activeSheetScale
  })
  if (controlConfig.activeGraphVisibility === 'off') {
    paramsForFrame.set('show_graph', 'off')
  } else if (controlConfig.activeGraphValue) {
    paramsForFrame.set('show_graph', controlConfig.activeGraphValue)
  }

  const frameSrc = `/api/kuailepu-runtime/${song.slug}?${paramsForFrame.toString()}`
  const loadingId = `pinterest-preview-${song.slug}-loading`
  const publicSongHref = buildSongPageHref({
    songId: song.slug,
    instrumentId: activeInstrument.id === 'o12' ? null : activeInstrument.id,
    noteLabelMode: noteLabelMode === 'number' ? 'number' : null,
    showGraph:
      controlConfig.activeGraphVisibility === 'off'
        ? 'off'
        : controlConfig.activeGraphValue,
    showLyric: controlConfig.activeShowLyric,
    showMeasureNum: controlConfig.activeShowMeasureNum,
    measureLayout: controlConfig.activeMeasureLayout,
    sheetScale: controlConfig.activeSheetScale
  })

  return (
    <main className="min-h-screen bg-white text-stone-950">
      <PinterestWorkbenchShell
        controls={
          <PinterestWorkbenchControls
            songTitle={song.title}
            publicSongHref={publicSongHref}
            supportedInstruments={supportedInstruments}
            activeInstrumentId={activeInstrument.id}
            graphOptions={controlConfig.graphOptions}
            activeGraphValue={
              controlConfig.activeGraphVisibility === 'off' ? 'off' : controlConfig.activeGraphValue
            }
            noteLabelMode={noteLabelMode}
            showLyric={controlConfig.activeShowLyric}
            showMeasureNum={controlConfig.activeShowMeasureNum}
            measureLayout={controlConfig.activeMeasureLayout}
            scaleOptions={controlConfig.scaleOptions}
            activeSheetScale={controlConfig.activeSheetScale}
            watermark={watermark}
            lyricToggleAvailable={hasPublicLyrics}
          />
        }
        footer={
          <div className="px-4 py-3 md:px-6 md:py-3.5">
            <p className="mx-auto max-w-5xl text-center text-[1.02rem] font-medium leading-[1.25] text-stone-900 md:text-[1.18rem]">
              <span aria-hidden="true">🔍</span>{' '}
              <span>More songs with visual tabs at </span>
              <span className="font-black tracking-[0.01em] text-stone-950">
                PlayByFingering.com
              </span>
            </p>
          </div>
        }
      >
        <div className="relative bg-[#fcfaf7]">
            <KuailepuRuntimeFrame
              songId={song.slug}
              title={song.title}
              frameSrc={frameSrc}
              loadingId={loadingId}
              panelClassName="relative z-0 overflow-hidden rounded-none border-0 bg-[#fcfaf7] shadow-none"
              iframeClassName="relative z-0 block w-full border-0"
              overlayClassName="bg-[#fcfaf7]/96"
              initialHeight={1520}
            />
            {watermark === 'on' ? <PinterestWatermarkOverlay /> : null}
        </div>
      </PinterestWorkbenchShell>
    </main>
  )
}

function PinterestWatermarkOverlay() {
  return (
    <div className="pointer-events-none absolute bottom-3 right-4 z-[5] select-none md:bottom-4 md:right-5">
      <span className="inline-flex items-center rounded-full border border-stone-400/20 bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-800/35 shadow-[0_6px_18px_rgba(255,255,255,0.38)] backdrop-blur-[2px] md:text-[11px]">
        playbyfingering.com
      </span>
    </div>
  )
}

function normalizeWatermark(value: string | undefined) {
  return value === 'off' ? 'off' : 'on'
}
