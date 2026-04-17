import type { Metadata } from 'next'
import PinterestSongPicker from '@/components/dev/PinterestSongPicker'
import { songCatalog } from '@/lib/songbook/catalog'
import { getSongSeoProfileEntry } from '@/lib/songbook/seoProfiles'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pinterest Workbench',
  description: 'Internal Pinterest screenshot workbench.',
  robots: {
    index: false,
    follow: false
  }
}

export default function PinterestPreviewIndexPage() {
  const songs = [...songCatalog]
    .sort((left, right) => left.title.localeCompare(right.title))
    .map(song => ({
      slug: song.slug,
      title: song.title,
      aliases: getSongSeoProfileEntry(song.slug)?.aliases ?? []
    }))

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7ecd8_0%,#efe0c4_44%,#e7d3b4_100%)] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[28px] border border-stone-200/80 bg-white/92 p-6 shadow-[0_20px_48px_rgba(84,58,32,0.08)]">
          <div className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
            Internal Pinterest Workflow
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-900 md:text-4xl">
            Manual Screenshot Workbench
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
            Pick any public song, open the internal workbench, resize the browser until the chart
            feels right, and screenshot the canvas directly. The workbench keeps only the runtime
            sheet, a lightweight watermark, and the call-to-action footer.
          </p>
        </section>

        <PinterestSongPicker songs={songs} />
      </div>
    </main>
  )
}
