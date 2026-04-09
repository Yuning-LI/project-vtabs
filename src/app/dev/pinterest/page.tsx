import Link from 'next/link'
import { pinterestFirstWavePresets } from '@/lib/songbook/pinterestPins'

export const dynamic = 'force-dynamic'

export default function PinterestPreviewIndexPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7ecd8_0%,#efe0c4_44%,#e7d3b4_100%)] px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[28px] border border-stone-200/80 bg-white/92 p-6 shadow-[0_20px_48px_rgba(84,58,32,0.08)]">
          <div className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
            Internal Pinterest Preview
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-900 md:text-4xl">
            Pinterest First-Wave Pins
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
            This route renders internal-only Pinterest pin previews at a fixed 2:3 vertical layout.
            It reuses the current Kuailepu runtime sheet pipeline but presents the content in a
            cleaner, shareable study-graphic format for export.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pinterestFirstWavePresets.map(preset => (
            <Link
              key={preset.slug}
              href={`/dev/pinterest/song/${preset.slug}`}
              className="rounded-[24px] border border-stone-200 bg-white/92 p-5 shadow-[0_14px_28px_rgba(84,58,32,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(84,58,32,0.1)]"
            >
              <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Pin Preview</div>
              <div className="mt-2 text-lg font-semibold text-stone-900">{preset.title}</div>
              <div className="mt-2 text-sm text-stone-600">
                {preset.instrumentLabel} · {preset.tagLabel}
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
