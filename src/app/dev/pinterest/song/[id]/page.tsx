import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import KuailepuRuntimeFrame from '@/components/song/KuailepuRuntimeFrame'
import {
  hasPublicKuailepuLyricToggle,
  loadKuailepuSongPayload
} from '@/lib/kuailepu/runtime'
import { getPublicRuntimeGraphOptions } from '@/lib/songbook/publicRuntimeControls'
import {
  getPinterestPinFooterText,
  getPinterestPinPreset,
  shouldHidePinterestRuntimeTitle
} from '@/lib/songbook/pinterestPins'

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
  const footerText = getPinterestPinFooterText(preset)
  const showFooter = footerText.trim().length > 0
  const hideRuntimeTitle = shouldHidePinterestRuntimeTitle(preset)
  const showArtwork = preset.artworkTheme === 'sunrise-hills'
  const contentWidth = preset.contentWidth ?? 1000
  const runtimeTextHideRules = [
    ...(preset.slug === 'amazing-grace'
      ? [
          {
            match: 'clarke tin whistlefull pressed:',
            hideNextNumericSibling: true
          }
        ]
      : []),
    ...(hideRuntimeTitle
      ? [
          {
            match: preset.title,
            mode: 'exact' as const
          }
        ]
      : [])
  ]

  return (
    <main className="min-h-screen bg-[#ece6d9] p-0">
      <div
        data-pinterest-export-root="true"
        className={`relative mx-auto w-[1000px] overflow-hidden bg-[#ece6d9] text-stone-950 ${showArtwork ? 'h-[1500px]' : ''}`}
      >
        <section className={`w-full p-0 ${showArtwork ? 'h-full' : ''}`}>
          <div className={`relative w-full overflow-hidden bg-white shadow-[0_18px_48px_rgba(16,16,16,0.12)] ${showArtwork ? 'h-full' : ''}`}>
            {showArtwork ? (
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
                  fitCropTop={preset.sheetCropTop}
                  fitCropBottom={preset.sheetCropBottom}
                  runtimeTextHideRules={runtimeTextHideRules}
                />

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[292px] overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(252,248,241,0.62)_18%,rgba(248,228,195,0.94)_48%,rgba(221,183,132,1)_100%)]" />
                  <div className="absolute right-[90px] top-[72px] h-[122px] w-[122px] rounded-full bg-[radial-gradient(circle,rgba(255,248,212,0.98)_0%,rgba(255,232,171,0.9)_42%,rgba(255,211,130,0.18)_72%,rgba(255,211,130,0)_100%)]" />
                  <div className="absolute left-[72px] top-[94px] h-[34px] w-[160px] rounded-full bg-white/45 blur-[8px]" />
                  <div className="absolute right-[224px] top-[116px] h-[26px] w-[126px] rounded-full bg-white/35 blur-[7px]" />
                  <div className="absolute left-[-96px] bottom-[94px] h-[184px] w-[560px] rounded-[50%] bg-[#cdae84]/88" />
                  <div className="absolute right-[-34px] bottom-[82px] h-[172px] w-[520px] rounded-[50%] bg-[#b58d61]/92" />
                  <div className="absolute left-[210px] bottom-[112px] h-[132px] w-[320px] rounded-[50%] bg-[#ddc19b]/88" />
                  <div className="absolute inset-x-0 bottom-0 h-[122px] bg-[linear-gradient(180deg,rgba(155,108,66,0)_0%,rgba(140,95,58,0.18)_18%,rgba(117,73,42,0.62)_100%)]" />
                </div>

                {showFooter ? (
                  <div
                    data-pinterest-export-end="true"
                    className="pointer-events-none absolute bottom-5 left-5 right-5"
                  >
                    <div className="rounded-[22px] border border-white/45 bg-[rgba(88,55,31,0.34)] px-5 py-4 shadow-[0_18px_34px_rgba(16,16,16,0.16)] backdrop-blur-[8px]">
                      <div className="max-w-[860px]">
                        <p className="text-[28px] font-semibold leading-[1.05] text-white">
                          {footerText}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="bg-white">
                <div
                  className="mx-auto"
                  style={{ width: `${contentWidth}px`, maxWidth: '100%' }}
                >
                  <KuailepuRuntimeFrame
                    songId={preset.slug}
                    title={preset.title}
                    frameSrc={frameSrc}
                    loadingId={loadingId}
                    panelClassName="relative z-0 overflow-hidden bg-white shadow-none"
                    iframeClassName="relative z-0 block w-full border-0"
                    overlayClassName="bg-white/96"
                    initialHeight={1760}
                    fitHeight={preset.fitHeight}
                    fitTopPadding={preset.frameTopPadding}
                    fitCropTop={preset.sheetCropTop}
                    fitCropBottom={preset.sheetCropBottom}
                    runtimeTextHideRules={runtimeTextHideRules}
                  />
                </div>

                {showFooter ? (
                  <div
                    data-pinterest-export-end="true"
                    className="border-t border-stone-200 bg-[rgba(255,251,246,0.98)] px-4 py-3"
                  >
                    <p className="text-[25px] font-semibold leading-[1.08] text-stone-950">
                      {footerText}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
