import { notFound } from 'next/navigation'
import KuailepuLegacyRuntimePage from '@/components/song/KuailepuLegacyRuntimePage'
import {
  hasPublicKuailepuLyricToggle,
  loadKuailepuSongPayload
} from '@/lib/kuailepu/runtime'
import { siteUrl } from '@/lib/site'
import { songCatalog, songCatalogBySlug } from '@/lib/songbook/catalog'
import { getSongPresentation } from '@/lib/songbook/presentation'
import {
  adaptPresentationForInstrument,
  getSupportedPublicSongInstruments,
  normalizePublicSongInstrument,
  type PublicSongPageQueryState
} from '@/lib/songbook/publicInstruments'

export const dynamicParams = false

export async function generateStaticParams() {
  return songCatalog.map(song => ({ id: song.slug }))
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { id } = params
  const song = songCatalogBySlug[id]
  const runtimePayload = song ? loadKuailepuSongPayload(song.slug) : null
  const publicLyricsAvailable = runtimePayload ? hasPublicKuailepuLyricToggle(runtimePayload) : null
  const presentation = song
    ? getSongPresentation(song, { publicLyricsAvailable })
    : null
  const songName = presentation?.title || song?.title || 'Song'
  const description =
    presentation?.metaDescription ||
    `Play ${songName} with letter notes, fingering charts, optional numbered notes, and switchable instrument views.`
  return {
    title: `${songName} | Ocarina Tabs, Recorder & Tin Whistle Notes`,
    description,
    alternates: {
      canonical: `${siteUrl}/song/${song?.slug || id}`
    },
    robots: {
      index: true,
      follow: true
    }
  }
}

export default function SongPage({
  params,
  searchParams
}: {
  params: { id: string }
  searchParams?: {
    instrument?: string
    note_label_mode?: string
    show_graph?: string
    show_lyric?: string
    show_measure_num?: string
    measure_layout?: string
    sheet_scale?: string
    practice_tool?: string
  }
}) {
  const song = songCatalogBySlug[params.id]
  if (!song) {
    notFound()
  }
  /**
   * 当前公开曲库已经全部补齐了快乐谱 raw JSON。
   *
   * 这意味着公开详情页主链现在不再需要回退到旧的 SongClient 原生详情页。
   * 如果这里读不到 raw JSON，应该把它当成数据缺失而不是静默切回旧链，
   * 否则后续维护时很容易产生“页面还能打开，但其实已经偏离主架构”的假象。
   *
   * 站点原生 Jianpu / SongClient 仍然保留：
   * - 供 dev 预览页使用
   * - 供未来去 iframe 化迁移时复用
   * 但它不再是当前公开详情页的默认产品路线。
   */
  const runtimePayload = loadKuailepuSongPayload(song.slug)
  if (!runtimePayload) {
    notFound()
  }
  const supportedInstruments = getSupportedPublicSongInstruments(runtimePayload)
  const activeInstrument = normalizePublicSongInstrument(
    searchParams?.instrument,
    supportedInstruments
  )
  const hasPublicLyricToggle = hasPublicKuailepuLyricToggle(runtimePayload)
  const shellSeo = adaptPresentationForInstrument(
    getSongPresentation(song, { publicLyricsAvailable: hasPublicLyricToggle }),
    activeInstrument
  )
  const queryState: PublicSongPageQueryState = {
    instrumentId: searchParams?.instrument === activeInstrument.id ? activeInstrument.id : null,
    noteLabelMode: normalizeExplicitNoteLabelMode(searchParams?.note_label_mode),
    showGraph: searchParams?.show_graph ?? null,
    showLyric: hasPublicLyricToggle ? normalizeToggleParam(searchParams?.show_lyric) : null,
    showMeasureNum: normalizeToggleParam(searchParams?.show_measure_num),
    measureLayout: normalizeMeasureLayout(searchParams?.measure_layout),
    sheetScale: normalizeSheetScale(searchParams?.sheet_scale, runtimePayload.sheetScaleList),
    practiceTool: normalizePracticeTool(searchParams?.practice_tool)
  }
  const basePresentation = getSongPresentation(song, {
    publicLyricsAvailable: hasPublicLyricToggle
  })
  const presentationByInstrument = Object.fromEntries(
    supportedInstruments.map(instrument => [
      instrument.id,
      adaptPresentationForInstrument(basePresentation, instrument)
    ])
  )

  /**
   * 详情页当前只有两个公开阅读模式：
   * - `letter`：默认模式
   * - `number`：备选模式
   *
   * `both` 已经被产品移除；`graph` 只保留内部兼容，不再在 UI 暴露。
   * 这里继续保留 mode 归一化，是为了：
   * - URL 分享时参数稳定
   * - 新对话接手时能立刻看懂目前公开模式边界
   */
  return (
    <KuailepuLegacyRuntimePage
      songId={song.slug}
      supportedInstruments={supportedInstruments}
      queryState={queryState}
      presentationByInstrument={presentationByInstrument}
      runtimeControlPayload={{
        instrumentFingerings: runtimePayload.instrumentFingerings,
        sheetScaleList: runtimePayload.sheetScaleList
      }}
      hasLyricToggle={hasPublicLyricToggle}
    />
  )
}

function normalizeExplicitNoteLabelMode(value: string | undefined) {
  if (value === 'number' || value === 'graph') {
    return value
  }

  return null
}

function normalizeToggleParam(value: string | undefined) {
  if (value === 'on' || value === 'off') {
    return value
  }

  return null
}

function normalizeMeasureLayout(value: string | undefined) {
  if (value === 'compact' || value === 'mono') {
    return value
  }

  return null
}


function normalizeSheetScale(value: string | undefined, sheetScaleList: number[] | undefined) {
  if (!value) {
    return null
  }

  const available = new Set((sheetScaleList ?? []).map(item => String(item)))
  if (available.size > 0) {
    return available.has(value) ? value : null
  }

  return /^\d+$/.test(value) ? value : null
}

function normalizePracticeTool(value: string | undefined) {
  if (value === 'metronome') {
    return value
  }

  return null
}
