import type { Metadata } from 'next'
import NativeRendererSideBySideReview from '@/components/dev/NativeRendererSideBySideReview'
import { loadNativeSongIrFromDraft } from '@/lib/native-renderer/loadSongIr'
import { evaluateNativeRendererSupport } from '@/lib/native-renderer/support'

export const dynamic = 'force-dynamic'

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  return {
    title: `${params.id} Native Renderer Review`,
    description: 'Internal native renderer side-by-side review.',
    robots: {
      index: false,
      follow: false
    }
  }
}

export default function NativeRendererReviewPage({ params }: { params: { id: string } }) {
  const song = loadNativeSongIrFromDraft(params.id)
  const support = evaluateNativeRendererSupport(params.id, song)

  return <NativeRendererSideBySideReview slug={params.id} song={song} support={support} />
}
