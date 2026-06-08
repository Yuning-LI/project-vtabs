import type { NativeRendererSupportDecision } from '@/lib/native-renderer/support'

type NativeRendererFallbackPreviewProps = {
  slug: string
  support: NativeRendererSupportDecision
}

export default function NativeRendererFallbackPreview({
  slug,
  support
}: NativeRendererFallbackPreviewProps) {
  return (
    <div className="min-h-screen bg-[#eee0c5] px-4 py-6 text-[#2d2118]">
      <main className="mx-auto flex max-w-4xl flex-col gap-5">
        <section className="rounded-[30px] border border-amber-300 bg-[rgba(255,250,241,0.95)] p-6 shadow-[0_24px_54px_rgba(70,45,24,0.12)]">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-amber-800">
            Internal Native Renderer Preview
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight">{slug}</h1>
          <div className="mt-5 inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-amber-900">
            Fallback required
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#6d5743]">
            This internal route intentionally refuses to render a native sheet when the current
            SongIR renderer cannot support the song safely.
          </p>
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            Fallback reasons: {support.reasons.join(', ')}
          </div>
        </section>
      </main>
    </div>
  )
}
