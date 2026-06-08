import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import NativeSongIrPreview from '@/components/dev/NativeSongIrPreview'
import { loadNativeSongIrFromDraft } from '@/lib/native-renderer/loadSongIr'
import { evaluateNativeRendererSupport } from '@/lib/native-renderer/support'

export const dynamic = 'force-dynamic'

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  return {
    title: `${params.id} Native Renderer Preview`,
    description: 'Internal SongIR native renderer preview.',
    robots: {
      index: false,
      follow: false
    }
  }
}

export default function NativeRendererSongPreviewPage({ params }: { params: { id: string } }) {
  const song = loadNativeSongIrFromDraft(params.id)
  if (!song) {
    notFound()
  }
  const support = evaluateNativeRendererSupport(params.id, song)

  return <NativeSongIrPreview song={song} support={support} />
}
