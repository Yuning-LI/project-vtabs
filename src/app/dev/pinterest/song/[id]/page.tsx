import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import KuailepuRuntimeFrame from '@/components/song/KuailepuRuntimeFrame'
import {
  hasPublicKuailepuLyricToggle,
  loadKuailepuSongPayload
} from '@/lib/kuailepu/runtime'
import { translateKuailepuPersonName } from '@/lib/songbook/kuailepuEnglish'
import { getPublicRuntimeGraphOptions } from '@/lib/songbook/publicRuntimeControls'
import { getPinterestPinPreset } from '@/lib/songbook/pinterestPins'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params
}: {
  params: { id: string }
}): Promise<Metadata> {
  return {
    title: `${params.id} Pinterest Preview`,
    description: 'Internal Pinterest export preview.',
    robots: {
      index: false,
      follow: false
    }
  }
}

export default function PinterestSongPreviewPage({
  params
}: {
  params: { id: string }
}) {
  const preset = getPinterestPinPreset(params.id)
  if (!preset) {
    notFound()
  }

  const runtimePayload = loadKuailepuSongPayload(preset.slug)
  if (!runtimePayload) {
    notFound()
  }

  const graphOptions = getPublicRuntimeGraphOptions(runtimePayload, preset.instrumentId)
  const graphValue = graphOptions[0]?.value ?? '1d'
  const showLyric = hasPublicKuailepuLyricToggle(runtimePayload) ? 'on' : 'off'
  const paramsForFrame = new URLSearchParams({
    runtime_text_mode: 'english',
    instrument: preset.instrumentId,
    note_label_mode: preset.noteLabelMode,
    show_graph: graphValue,
    show_lyric: showLyric,
    show_measure_num: preset.showMeasureNum,
    measure_layout: preset.measureLayout,
    sheet_scale: preset.sheetScale
  })

  const frameSrc = `/api/kuailepu-runtime/${preset.slug}?${paramsForFrame.toString()}`
  const loadingId = `pinterest-preview-${preset.slug}-loading`
  const composer = resolvePinterestComposer(runtimePayload)
  const runtimeTextHideRules =
    preset.slug === 'amazing-grace'
      ? [
          {
            match: 'clarke tin whistlefull pressed:',
            hideNextNumericSibling: true
          }
        ]
      : undefined

  return (
    <main className="min-h-screen bg-[#ead8bb] p-0">
      <div className="relative mx-auto h-[1500px] w-[1000px] overflow-hidden bg-[linear-gradient(180deg,#fff7ec_0%,#f3e2c4_100%)] text-stone-900">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute left-[-120px] top-[-160px] h-[360px] w-[360px] rounded-full bg-[rgba(255,255,255,0.42)] blur-3xl" />
          <div className="absolute right-[-140px] top-[280px] h-[320px] w-[320px] rounded-full bg-[rgba(226,198,154,0.34)] blur-3xl" />
          <div className="absolute bottom-[-160px] left-[120px] h-[300px] w-[420px] rounded-full bg-[rgba(255,255,255,0.24)] blur-3xl" />
        </div>

        <header className="relative flex items-start justify-between gap-6 px-8 pb-4 pt-6">
          <h1 className="max-w-[680px] text-[56px] font-black leading-[0.98] tracking-[-0.05em] text-stone-900">
            {preset.title}
          </h1>
          {composer ? (
            <div className="mt-2 min-w-0 max-w-[250px] rounded-[22px] border border-white/85 bg-white/75 px-4 py-3 text-right shadow-[0_14px_28px_rgba(84,58,32,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                Composer
              </div>
              <div className="mt-1 text-[18px] font-semibold leading-tight tracking-[0.01em] text-stone-900">
                {composer}
              </div>
            </div>
          ) : null}
        </header>

        <section className="relative px-4 pb-4">
          <div className="relative h-[1320px] overflow-hidden rounded-[34px] border border-white/80 bg-white/96 shadow-[0_24px_54px_rgba(84,58,32,0.1)]">
            <KuailepuRuntimeFrame
              songId={preset.slug}
              title={preset.title}
              frameSrc={frameSrc}
              loadingId={loadingId}
              panelClassName="relative h-full min-h-0 overflow-hidden rounded-[34px] bg-white shadow-none"
              iframeClassName="block w-full border-0"
              overlayClassName="bg-white/96"
              initialHeight={1500}
              fitHeight={1320}
              fitTopPadding={preset.frameTopPadding}
              runtimeTextHideRules={runtimeTextHideRules}
            />
          </div>
        </section>

        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2">
          <div className="rounded-full border border-white/85 bg-white/88 px-5 py-2 shadow-[0_14px_28px_rgba(84,58,32,0.08)]">
            <p className="text-[20px] font-medium tracking-[0.01em] text-stone-700">
              More songs at{' '}
              <span className="font-bold tracking-[0.005em] text-stone-900">
                playbyfingering.com
              </span>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

function resolvePinterestComposer(payload: {
  music_composer?: string
  composer?: string
  author?: string
  player?: string
}) {
  const composer = payload.music_composer ?? payload.composer ?? payload.author ?? payload.player
  const translated = translateKuailepuPersonName(composer)
  if (!translated) {
    return null
  }

  return translated.replace(/\s+/g, ' ').trim()
}
