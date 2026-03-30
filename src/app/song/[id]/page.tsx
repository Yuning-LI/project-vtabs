import fs from 'node:fs'
import path from 'node:path'
import { notFound } from 'next/navigation'
import KuailepuLegacyRuntimePage from '@/components/song/KuailepuLegacyRuntimePage'
import { songCatalog, songCatalogBySlug } from '@/lib/songbook/catalog'
import type { KuailepuSongPayload } from '@/lib/songbook/kuailepuImport'
import { getSongPresentation } from '@/lib/songbook/presentation'

export const dynamicParams = false

export async function generateStaticParams() {
  return songCatalog.map(song => ({ id: song.slug }))
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { id } = params
  const song = songCatalogBySlug[id]
  const presentation = song ? getSongPresentation(song) : null
  const songName = presentation?.title || song?.title || 'Song'
  const description =
    presentation?.metaDescription ||
    `Play ${songName} on 12-hole AC ocarina with letter notes, fingering chart, and optional numbered notation.`
  return {
    title: `${songName} Ocarina Tabs | Letter Notes & Fingering Chart`,
    description,
    alternates: {
      canonical: `https://playbyfingering.com/song/${song?.slug || id}`
    }
  }
}

export default function SongPage({
  params,
  searchParams
}: {
  params: { id: string }
  searchParams?: {
    note_label_mode?: string
  }
}) {
  const song = songCatalogBySlug[params.id]
  if (!song) {
    notFound()
  }
  const presentation = getSongPresentation(song)

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
  const runtimePayload = loadKuailepuRuntimePayload(song.slug, song.source?.url)
  if (!runtimePayload) {
    notFound()
  }

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
      title={presentation.title}
      subtitle={presentation.subtitle}
      seo={presentation}
      state={{
        note_label_mode: normalizeNoteLabelMode(searchParams?.note_label_mode)
      }}
    />
  )
}

function loadKuailepuRuntimePayload(slug: string, _sourceUrl?: string) {
  const filePath = path.resolve(process.cwd(), 'reference', 'songs', `${slug}.json`)
  if (!fs.existsSync(filePath)) {
    return null
  }

  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as KuailepuSongPayload & {
    instrumentFingerings?: Array<{
      instrument: string
      instrumentName: string
      fingeringSetList?: Array<
        Array<{
          fingering: string
          fingeringName: string
          tonalityName?: string
          match?: number
        }>
      >
      graphList?: Array<{
        name: string
        value: string
      }>
    }>
    sheetScaleList?: number[]
    show_graph?: string
    show_lyric?: string
    show_measure_num?: string
    measure_layout?: string
    comment?: string
    comment_list?: Array<{
      body?: Array<{
        type?: string
        value?: string
      }>
    }>
    nickname?: string
    pv?: string
    lyric_composer?: string
  }

  if (!payload.song_uuid && !payload.song_name && !payload.notation) {
    return null
  }

  /**
   * 这里只做“数据是否像一个快乐谱详情页上下文”的最低限度校验。
   *
   * 不在这里做更多 schema 收紧，原因有两个：
   * 1. 快乐谱 payload 字段本来就不稳定，过度收紧会让老歌在无意义字段差异上失效
   * 2. 真正的兼容性判断应该交给 runtime compare 脚本，而不是这个入口函数
   */
  return payload
}

function normalizeNoteLabelMode(value: string | undefined) {
  if (value === 'number' || value === 'graph' || value === 'letter') {
    return value
  }

  return 'letter'
}
