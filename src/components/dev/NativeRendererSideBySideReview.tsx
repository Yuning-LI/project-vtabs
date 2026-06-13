import NativeMelodySheet from '@/components/native-renderer/NativeMelodySheet'
import ContainerRuntimeHost from '@/components/song/runtime-host/ContainerRuntimeHost'
import type { NativeMelodyMeasureLayoutMode } from '@/lib/native-renderer/layout'
import type { SongIrDocument } from '@/lib/native-renderer/songIr'
import type { NativeRendererSupportDecision } from '@/lib/native-renderer/support'
import type { PublicRuntimeContainerPackageData } from '@/lib/runtime-core/server/publicRuntimeContainerPackage'

type NativeRendererSideBySideReviewProps = {
  slug: string
  song: SongIrDocument | null
  support: NativeRendererSupportDecision
  source: 'draft' | 'runtime'
  measureLayout?: NativeMelodyMeasureLayoutMode
  showGraph?: 'on' | 'off'
  showLyric?: 'on' | 'off'
  showMeasureNum?: 'on' | 'off'
  forceNativePreview?: boolean
  sheetScale?: string | number
  runtimeContainerPackage?: PublicRuntimeContainerPackageData | null
}

export default function NativeRendererSideBySideReview({
  slug,
  song,
  support,
  source,
  measureLayout = 'compact',
  showGraph = 'on',
  showLyric = 'on',
  showMeasureNum = 'off',
  forceNativePreview = false,
  sheetScale = 10,
  runtimeContainerPackage = null
}: NativeRendererSideBySideReviewProps) {
  const title = song?.metadata.title ?? slug

  return (
    <div className="min-h-screen bg-[#ece0cb] px-4 py-6 text-[#2d2118]">
      <main className="mx-auto flex max-w-[1800px] flex-col gap-5">
        <section className="rounded-[28px] border border-[rgba(120,86,48,0.22)] bg-[rgba(255,250,241,0.94)] p-5 shadow-[0_24px_54px_rgba(70,45,24,0.12)]">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-[#806246]">
            Internal Native Renderer Review
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.12em]">
            <Badge tone="default">Archived runtime vs native</Badge>
            <Badge tone="default">{source === 'runtime' ? 'Runtime notation source' : 'MusicXML draft source'}</Badge>
            <Badge tone={support.status === 'supported' ? 'supported' : 'fallback'}>
              {support.status === 'supported' ? 'Native supported' : 'Fallback required'}
            </Badge>
            {forceNativePreview ? <Badge tone="fallback">Forced native preview</Badge> : null}
            {song ? <Badge tone="default">{song.stats.noteCount} notes</Badge> : null}
            {song ? <Badge tone="default">{song.stats.measureCount} measures</Badge> : null}
          </div>
          {support.reasons.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Fallback reasons: {support.reasons.join(', ')}
            </div>
          ) : null}
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <ReviewPanel title="Runtime Container">
            {runtimeContainerPackage ? (
              <ContainerRuntimeHost
                songId={slug}
                title={title}
                bodyHtml={runtimeContainerPackage.bodyHtml}
                styleAssets={runtimeContainerPackage.styles}
                scriptEntries={runtimeContainerPackage.scriptEntries}
                enableScriptLoader
                className="relative overflow-hidden rounded-[24px] border border-[rgba(120,86,48,0.18)] bg-[#fffaf1] shadow-[0_18px_44px_rgba(70,45,24,0.1)]"
                loadingId={`native-review-container-loading-${slug}`}
                overlayClassName="bg-[#fffaf1]/96"
                initialHeight={900}
                showScriptDiagnostics={false}
              />
            ) : (
              <div className="rounded-[30px] border border-amber-300 bg-amber-50 p-6 text-sm font-semibold leading-6 text-amber-900">
                Runtime container package unavailable.
              </div>
            )}
          </ReviewPanel>

          <ReviewPanel title="Native Renderer">
            {song && (support.status === 'supported' || forceNativePreview) ? (
              <NativeMelodySheet
                song={song}
                measureLayout={measureLayout}
                showGraph={showGraph}
                showLyric={showLyric}
                showMeasureNum={showMeasureNum}
                sheetScale={sheetScale}
                variant="sheet"
              />
            ) : (
              <div className="rounded-[30px] border border-amber-300 bg-amber-50 p-6 text-sm font-semibold leading-6 text-amber-900">
                Native renderer intentionally refused this song.
                <br />
                Reasons: {support.reasons.join(', ')}
              </div>
            )}
          </ReviewPanel>
        </div>
      </main>
    </div>
  )
}

function ReviewPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#806246]">
        {title}
      </div>
      {children}
    </section>
  )
}

function Badge({
  children,
  tone
}: {
  children: React.ReactNode
  tone: 'default' | 'supported' | 'fallback'
}) {
  const toneClass =
    tone === 'supported'
      ? 'border-[#a7c85c] bg-[#ecf7c6] text-[#405318]'
      : tone === 'fallback'
        ? 'border-amber-300 bg-amber-50 text-amber-900'
        : 'border-[rgba(120,86,48,0.2)] bg-white/70 text-[#604a36]'

  return <span className={`rounded-full border px-3 py-1.5 ${toneClass}`}>{children}</span>
}
