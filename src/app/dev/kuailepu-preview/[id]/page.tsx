import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import KuailepuLegacyRuntimePage from '@/components/song/KuailepuLegacyRuntimePage'
import {
  hasPublicKuailepuLyricToggle,
  loadKuailepuSongPayload
} from '@/lib/kuailepu/runtime'
import { loadImportedOrCandidateSongDoc } from '@/lib/songbook/importedCatalog'
import { getSongPresentation } from '@/lib/songbook/presentation'
import {
  adaptPresentationForInstrument,
  getSupportedPublicSongInstruments,
  normalizePublicSongInstrument,
  type PublicSongPageQueryState
} from '@/lib/songbook/publicInstruments'
import {
  getPublicRuntimeFingeringOptions,
  normalizePublicRuntimeFingeringIndex
} from '@/lib/songbook/publicRuntimeControls'
import {
  normalizeExplicitNoteLabelMode,
  normalizeMeasureLayout,
  normalizePracticeTool,
  normalizeSheetScale,
  normalizeToggleParam
} from '@/lib/songbook/songPageQueryState'

export const dynamic = 'force-dynamic'

type PreviewSearchParams = {
  instrument?: string
  fingering_index?: string
  note_label_mode?: string
  show_graph?: string
  show_lyric?: string
  show_note_range?: string
  show_measure_num?: string
  measure_layout?: string
  sheet_scale?: string
  practice_tool?: string
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const songDoc = loadImportedOrCandidateSongDoc(params.id)

  return {
    title: `${songDoc?.title ?? params.id} Runtime Preview`,
    description: 'Internal runtime preview for candidate song imports.',
    robots: {
      index: false,
      follow: false
    }
  }
}

export default function KuailepuPreviewPage({
  params,
  searchParams
}: {
  params: { id: string }
  searchParams?: PreviewSearchParams
}) {
  const songDoc = loadImportedOrCandidateSongDoc(params.id)
  const runtimePayload = loadKuailepuSongPayload(params.id)

  if (!songDoc || !runtimePayload) {
    notFound()
  }

  const supportedInstruments = getSupportedPublicSongInstruments(runtimePayload)
  const activeInstrument = normalizePublicSongInstrument(
    searchParams?.instrument,
    supportedInstruments
  )
  const fingeringOptions = getPublicRuntimeFingeringOptions(runtimePayload, activeInstrument.id)
  const activeFingeringIndex = normalizePublicRuntimeFingeringIndex(
    searchParams?.fingering_index,
    fingeringOptions
  )
  const hasPublicLyricToggle = hasPublicKuailepuLyricToggle(runtimePayload)
  const queryState: PublicSongPageQueryState = {
    instrumentId: searchParams?.instrument === activeInstrument.id ? activeInstrument.id : null,
    fingeringIndex: activeFingeringIndex,
    noteLabelMode: normalizeExplicitNoteLabelMode(searchParams?.note_label_mode),
    showGraph: searchParams?.show_graph ?? null,
    showLyric: hasPublicLyricToggle ? normalizeToggleParam(searchParams?.show_lyric) : null,
    showNoteRange: normalizeToggleParam(searchParams?.show_note_range),
    showMeasureNum: normalizeToggleParam(searchParams?.show_measure_num),
    measureLayout: normalizeMeasureLayout(searchParams?.measure_layout),
    sheetScale: normalizeSheetScale(searchParams?.sheet_scale, runtimePayload.sheetScaleList),
    practiceTool: normalizePracticeTool(searchParams?.practice_tool)
  }
  const basePresentation = getSongPresentation(songDoc, {
    publicLyricsAvailable: hasPublicLyricToggle
  })
  const presentationByInstrument = Object.fromEntries(
    supportedInstruments.map(instrument => [
      instrument.id,
      adaptPresentationForInstrument(basePresentation, instrument)
    ])
  )

  return (
    <KuailepuLegacyRuntimePage
      songId={songDoc.slug}
      supportedInstruments={supportedInstruments}
      queryState={queryState}
      presentationByInstrument={presentationByInstrument}
      runtimeControlPayload={{
        instrumentFingerings: runtimePayload.instrumentFingerings,
        sheetScaleList: runtimePayload.sheetScaleList
      }}
      runtimeDefaultInstrumentId={runtimePayload.instrument ?? null}
      runtimeDefaultFingeringIndex={runtimePayload.fingering_index ?? null}
      runtimeDefaultShowGraph={runtimePayload.show_graph ?? null}
      hasLyricToggle={hasPublicLyricToggle}
      relatedSongs={[]}
      relatedGuides={[]}
      pageBasePath="/dev/kuailepu-preview"
      backHref="/"
      backLabel="Back to Song Library"
    />
  )
}
