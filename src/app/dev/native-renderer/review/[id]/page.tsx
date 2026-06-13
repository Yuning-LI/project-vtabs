import type { Metadata } from 'next'
import NativeRendererSideBySideReview from '@/components/dev/NativeRendererSideBySideReview'
import { loadPublicRuntimeSongPayload } from '@/lib/runtime-core/publicRuntime'
import type { PublicRuntimeState } from '@/lib/runtime-core/runtimeTypes'
import { buildPublicRuntimeContainerPackage } from '@/lib/runtime-core/server/publicRuntimeContainerPackage'
import {
  loadNativeSongIrFromDraft,
  loadNativeSongIrFromRuntimePayload
} from '@/lib/native-renderer/loadSongIr'
import { evaluateNativeRendererSupport } from '@/lib/native-renderer/support'
import {
  normalizeMeasureLayout,
  normalizeSheetScale,
  normalizeToggleParam
} from '@/lib/songbook/songPageQueryState'

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

export default function NativeRendererReviewPage({
  params,
  searchParams
}: {
  params: { id: string }
  searchParams?: {
    measure_layout?: string | string[]
    sheet_scale?: string | string[]
    show_graph?: string | string[]
    show_lyric?: string | string[]
    show_measure_num?: string | string[]
    force_native_preview?: string | string[]
    source?: string | string[]
  }
}) {
  const requestedSource = Array.isArray(searchParams?.source)
    ? searchParams?.source[0]
    : searchParams?.source
  const source = requestedSource === 'runtime' ? 'runtime' : 'draft'
  const song =
    source === 'runtime'
      ? loadNativeSongIrFromRuntimePayload(params.id)
      : loadNativeSongIrFromDraft(params.id)
  const support = evaluateNativeRendererSupport(params.id, song, {
    mode: source === 'runtime' ? 'runtime-probe' : 'draft-mvp'
  })
  const requestedMeasureLayout = Array.isArray(searchParams?.measure_layout)
    ? searchParams?.measure_layout[0]
    : searchParams?.measure_layout
  const measureLayout = normalizeMeasureLayout(requestedMeasureLayout) ?? 'compact'
  const requestedSheetScale = Array.isArray(searchParams?.sheet_scale)
    ? searchParams?.sheet_scale[0]
    : searchParams?.sheet_scale
  const sheetScale = normalizeSheetScale(requestedSheetScale) ?? 10
  const requestedShowGraph = Array.isArray(searchParams?.show_graph)
    ? searchParams?.show_graph[0]
    : searchParams?.show_graph
  const requestedShowLyric = Array.isArray(searchParams?.show_lyric)
    ? searchParams?.show_lyric[0]
    : searchParams?.show_lyric
  const requestedShowMeasureNum = Array.isArray(searchParams?.show_measure_num)
    ? searchParams?.show_measure_num[0]
    : searchParams?.show_measure_num
  const requestedForceNativePreview = Array.isArray(searchParams?.force_native_preview)
    ? searchParams?.force_native_preview[0]
    : searchParams?.force_native_preview
  const showGraph = normalizeToggleParam(requestedShowGraph) ?? 'on'
  const showLyric = normalizeToggleParam(requestedShowLyric) ?? 'on'
  const showMeasureNum = normalizeToggleParam(requestedShowMeasureNum) ?? 'off'
  const forceNativePreview = requestedForceNativePreview === '1'
  const runtimePayload = loadPublicRuntimeSongPayload(params.id)
  const runtimeState: PublicRuntimeState = {
    note_label_mode: 'letter',
    show_graph: showGraph,
    show_lyric: showLyric,
    show_measure_num: showMeasureNum,
    measure_layout: measureLayout,
    sheet_scale: String(sheetScale)
  }
  const runtimeContainerPackage = runtimePayload
    ? buildPublicRuntimeContainerPackage({
        songId: params.id,
        payload: runtimePayload,
        state: runtimeState,
        preferredEnglishTitle: song?.metadata.title ?? params.id,
        preferredEnglishSubtitle: null,
        visualThemeName: 'classic'
      })
    : null

  return (
    <NativeRendererSideBySideReview
      slug={params.id}
      song={song}
      support={support}
      source={source}
      measureLayout={measureLayout}
      showGraph={showGraph}
      showLyric={showLyric}
      showMeasureNum={showMeasureNum}
      forceNativePreview={forceNativePreview}
      sheetScale={sheetScale}
      runtimeContainerPackage={runtimeContainerPackage}
    />
  )
}
