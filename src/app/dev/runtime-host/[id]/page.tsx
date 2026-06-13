import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import RuntimeHostReviewClient from '@/components/song/runtime-host/RuntimeHostReviewClient'
import {
  buildPublicRuntimeLetterTrackData,
  buildPublicRuntimePackageData,
  loadPublicRuntimeSongPayload
} from '@/lib/runtime-core/publicRuntime'
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
    description: 'Internal container runtime host loader review.',
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

  return (
    <main className="min-h-screen bg-[#ece0cb] px-4 py-6 text-[#2d2118]">
      <RuntimeHostReviewClient
        songId={song.slug}
        title={song.title}
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
