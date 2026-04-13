import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import KuailepuRuntimeFrame from '@/components/song/KuailepuRuntimeFrame'
import {
  hasPublicKuailepuLyricToggle,
  loadKuailepuSongPayload
} from '@/lib/kuailepu/runtime'
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
  const hasPublicLyrics = hasPublicKuailepuLyricToggle(runtimePayload)
  const showLyric = hasPublicLyrics ? 'on' : 'off'
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
  const runtimeTextHideRules = [
    ...(preset.slug === 'amazing-grace'
      ? [
          {
            match: 'clarke tin whistlefull pressed:',
            hideNextNumericSibling: true
          }
        ]
      : []),
    {
      match: preset.title,
      mode: 'exact' as const
    }
  ]

  return (
    <main className="min-h-screen bg-[#ece6d9] p-0">
      <div className="relative mx-auto h-[1500px] w-[1000px] overflow-hidden bg-[#ece6d9] text-stone-950">
        <section className="h-full w-full p-0">
          <div className="relative h-full w-full overflow-hidden bg-white shadow-[0_18px_48px_rgba(16,16,16,0.12)]">
            <div className="relative h-[1500px] overflow-hidden">
              <KuailepuRuntimeFrame
                songId={preset.slug}
                title={preset.title}
                frameSrc={frameSrc}
                loadingId={loadingId}
                panelClassName="relative z-0 h-full min-h-0 overflow-hidden bg-white shadow-none"
                iframeClassName="relative z-0 block w-full border-0"
                overlayClassName="bg-white/96"
                initialHeight={1760}
                fitHeight={preset.fitHeight ?? 1500}
                fitTopPadding={preset.frameTopPadding}
                runtimeTextHideRules={runtimeTextHideRules}
              />

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[210px] bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.36)_14%,rgba(250,246,239,0.92)_44%,rgba(247,241,232,1)_100%)]" />

              <div className="pointer-events-none absolute bottom-6 left-6 right-6">
                <div className="rounded-[22px] border border-stone-300/60 bg-[rgba(255,251,246,0.92)] px-5 py-4 shadow-[0_16px_36px_rgba(16,16,16,0.12)]">
                  <div className="max-w-[760px]">
                    <p className="mt-1 text-[23px] font-semibold leading-[1.08] text-stone-950">
                      Full fingering chart and full melody at www.playbyfingering.com
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
