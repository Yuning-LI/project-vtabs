import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ContainerRuntimeHost from '@/components/song/runtime-host/ContainerRuntimeHost'
import PublicRuntimeFrame from '@/components/song/PublicRuntimeFrame'
import {
  buildPublicRuntimePackageData,
  loadPublicRuntimeSongPayload
} from '@/lib/runtime-core/publicRuntime'
import { buildPublicRuntimeUrl } from '@/lib/runtime-core/publicRuntimePaths'
import { songCatalogBySlug } from '@/lib/songbook/catalog'

export const dynamic = 'force-dynamic'

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const song = songCatalogBySlug[params.id]

  return {
    title: `${song?.title ?? params.id} Runtime Host Review`,
    description: 'Internal iframe-to-container runtime host skeleton review.',
    robots: {
      index: false,
      follow: false
    }
  }
}

export default function RuntimeHostReviewPage({ params }: { params: { id: string } }) {
  const song = songCatalogBySlug[params.id]
  if (!song) {
    notFound()
  }

  const runtimePayload = loadPublicRuntimeSongPayload(song.slug)
  if (!runtimePayload) {
    notFound()
  }
  const runtimePackage = buildPublicRuntimePackageData({
    songId: song.slug,
    payload: runtimePayload,
    state: {
      note_label_mode: 'letter',
      measure_layout: 'compact',
      sheet_scale: '10'
    },
    textMode: 'english',
    assetProfile: 'public-song',
    publicFeatures: [],
    preferredEnglishTitle: song.title,
    preferredEnglishSubtitle: null,
    visualThemeName: 'classic'
  })

  const frameSrc = buildPublicRuntimeUrl(song.slug, {
    params: new URLSearchParams({
      runtime_text_mode: 'english',
      runtime_visual_theme: 'classic',
      note_label_mode: 'letter',
      measure_layout: 'compact',
      sheet_scale: '10'
    })
  })

  return (
    <main className="min-h-screen bg-[#ece0cb] px-4 py-6 text-[#2d2118]">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-5">
        <section className="rounded-[28px] border border-[rgba(120,86,48,0.22)] bg-[rgba(255,250,241,0.94)] p-5 shadow-[0_24px_54px_rgba(70,45,24,0.12)]">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-[#806246]">
            Internal Runtime Host Review
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{song.title}</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[#6b543c]">
            Left side is the current iframe baseline. Right side is the Phase 3 React container
            skeleton. The skeleton must not execute runtime JavaScript in this phase.
          </p>
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <ReviewPanel title="Iframe Baseline">
            <PublicRuntimeFrame
              songId={song.slug}
              title={song.title}
              frameSrc={frameSrc}
              loadingId={`runtime-host-iframe-loading-${song.slug}`}
              panelClassName="relative overflow-hidden rounded-[24px] border border-[rgba(120,86,48,0.18)] bg-[#fffaf1] shadow-[0_18px_44px_rgba(70,45,24,0.1)]"
              iframeClassName="block w-full border-0 bg-[#fffaf1]"
              overlayClassName="bg-[#fffaf1]/96"
              initialHeight={900}
            />
          </ReviewPanel>

          <ReviewPanel title="Container Skeleton">
            <ContainerRuntimeHost
              songId={song.slug}
              title={song.title}
              styleAssets={runtimePackage.styles}
            />
          </ReviewPanel>
        </div>
      </div>
    </main>
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
