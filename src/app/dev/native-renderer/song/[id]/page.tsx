import type { Metadata } from 'next'
import NativeRendererFallbackPreview from '@/components/dev/NativeRendererFallbackPreview'
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
  const support = evaluateNativeRendererSupport(params.id, song)
  if (!song) {
    return <NativeRendererFallbackPreview slug={params.id} support={support} />
  }
  if (support.status !== 'supported') {
    return <NativeRendererFallbackPreview slug={params.id} support={support} />
  }

  return <NativeSongIrPreview song={song} support={support} />
}
