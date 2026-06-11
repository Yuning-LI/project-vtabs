import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import RuntimeHostReviewClient from '@/components/song/runtime-host/RuntimeHostReviewClient'
import {
  buildPublicRuntimeLetterTrackData,
  buildPublicRuntimePackageData,
  loadPublicRuntimeSongPayload
} from '@/lib/runtime-core/publicRuntime'
import { buildPublicRuntimeUrl } from '@/lib/runtime-core/publicRuntimePaths'
import type { PublicRuntimePublicFeature, PublicRuntimeState } from '@/lib/runtime-core/runtimeTypes'
import { getSupportedPublicSongInstruments } from '@/lib/songbook/publicInstruments'
import { songCatalogBySlug } from '@/lib/songbook/catalog'
import { loadImportedOrCandidateSongDoc } from '@/lib/songbook/importedCatalog'
import { parseSongPageQueryStateFromSearchParams } from '@/lib/songbook/songPageQueryState'

export const dynamic = 'force-dynamic'

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const song = songCatalogBySlug[params.id]

  return {
    title: `${song?.title ?? params.id} Runtime Host Review`,
    description: 'Internal iframe-to-container runtime host loader review.',
    robots: {
      index: false,
      follow: false
    }
  }
}

export default function RuntimeHostReviewPage({
  params,
  searchParams
}: {
  params: { id: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const song = songCatalogBySlug[params.id]
  if (!song) {
    notFound()
  }

  const runtimePayload = loadPublicRuntimeSongPayload(song.slug)
  if (!runtimePayload) {
    notFound()
  }
  const queryState = parseSongPageQueryStateFromSearchParams(searchParams)
  const runtimeState: PublicRuntimeState = {
    instrument: queryState.instrumentId,
    fingering_index: queryState.fingeringIndex,
    note_label_mode: queryState.noteLabelMode ?? 'letter',
    show_graph: queryState.showGraph,
    show_lyric: queryState.showLyric,
    show_note_range: queryState.showNoteRange,
    show_measure_num: queryState.showMeasureNum,
    measure_layout: queryState.measureLayout ?? 'compact',
    sheet_scale: queryState.sheetScale ?? '10'
  }
  const publicFeatures: PublicRuntimePublicFeature[] = [
    'playback',
    ...(queryState.practiceTool === 'metronome' ? (['metronome'] as const) : [])
  ]
  const visualThemeName = queryState.runtimeVisualTheme === 'off' ? 'off' : 'classic'
  const runtimeNotationSong = songCatalogBySlug[params.id] ?? loadImportedOrCandidateSongDoc(params.id)
  const letterTrack = buildPublicRuntimeLetterTrackData({
    notation: runtimeNotationSong?.notation,
    rawNotation: typeof runtimePayload.notation === 'string' ? runtimePayload.notation : null,
    key: runtimeNotationSong?.meta?.key,
    mode: runtimeState.note_label_mode,
    payload: runtimePayload,
    state: runtimeState
  })
  const runtimePackage = buildPublicRuntimePackageData({
    songId: song.slug,
    payload: runtimePayload,
    state: runtimeState,
    letterTrack,
    textMode: 'english',
    assetProfile: 'full-template',
    publicFeatures,
    preferredEnglishTitle: song.title,
    preferredEnglishSubtitle: null,
    visualThemeName
  })

  const runtimeUrlParams = new URLSearchParams()
  runtimeUrlParams.set('runtime_text_mode', 'english')
  runtimeUrlParams.set('runtime_visual_theme', visualThemeName)
  runtimeUrlParams.set('note_label_mode', runtimeState.note_label_mode ?? 'letter')
  runtimeUrlParams.set('measure_layout', runtimeState.measure_layout ?? 'compact')
  runtimeUrlParams.set('sheet_scale', String(runtimeState.sheet_scale ?? '10'))
  if (runtimeState.instrument) {
    runtimeUrlParams.set('instrument', runtimeState.instrument)
  }
  if (runtimeState.fingering_index !== null && runtimeState.fingering_index !== undefined) {
    runtimeUrlParams.set('fingering_index', String(runtimeState.fingering_index))
  }
  if (runtimeState.show_graph) {
    runtimeUrlParams.set('show_graph', runtimeState.show_graph)
  }
  if (runtimeState.show_lyric) {
    runtimeUrlParams.set('show_lyric', runtimeState.show_lyric)
  }
  if (runtimeState.show_note_range) {
    runtimeUrlParams.set('show_note_range', runtimeState.show_note_range)
  }
  if (runtimeState.show_measure_num) {
    runtimeUrlParams.set('show_measure_num', runtimeState.show_measure_num)
  }
  publicFeatures.forEach(feature => {
    runtimeUrlParams.append('public_feature', feature)
  })

  const frameSrc = buildPublicRuntimeUrl(song.slug, {
    params: runtimeUrlParams
  })

  return (
    <main className="min-h-screen bg-[#ece0cb] px-4 py-6 text-[#2d2118]">
      <RuntimeHostReviewClient
        songId={song.slug}
        title={song.title}
        frameSrc={frameSrc}
        bodyHtml={runtimePackage.bodyHtml}
        styles={runtimePackage.styles}
        scriptEntries={runtimePackage.scriptEntries}
        supportedInstruments={getSupportedPublicSongInstruments(runtimePayload)}
        queryState={queryState}
        runtimeControlPayload={{
          instrumentFingerings: runtimePayload.instrumentFingerings,
          sheetScaleList: runtimePayload.sheetScaleList
        }}
      />
    </main>
  )
}
