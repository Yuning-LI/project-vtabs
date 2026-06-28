import Script from 'next/script'
import { notFound } from 'next/navigation'
import PublicRuntimePage from '@/components/song/PublicRuntimePage'
import {
  hasPublicRuntimeLyricToggle,
  loadPublicRuntimeSongPayload
} from '@/lib/runtime-core/publicRuntime'
import { resolvePublicRuntimeHostRollout } from '@/lib/runtime-core/publicRuntimeHostRollout'
import {
  getRelatedSongCards,
  getSuggestedGuideCardsForSong,
  getLearnGuideUrl
} from '@/lib/learn/content'
import { siteUrl } from '@/lib/site'
import { songCatalog, songCatalogBySlug } from '@/lib/songbook/catalog'
import { getSongPresentation } from '@/lib/songbook/presentation'
import {
  adaptPresentationForInstrument,
  getSupportedPublicSongInstruments,
  resolveDefaultPublicSongInstrumentId,
  type PublicSongPageQueryState
} from '@/lib/songbook/publicInstruments'
import {
  getSongPreviewImagePath,
  getSongPreviewImageUrl,
  getSongSeoDescription,
  getSongSeoSummary,
  SONG_PREVIEW_IMAGE_HEIGHT,
  SONG_PREVIEW_IMAGE_WIDTH
} from '@/lib/songbook/songPreviewImages'

export const dynamic = 'force-static'
export const dynamicParams = false
const DEFAULT_SHARE_IMAGE = '/static/share/default-song-share.png'
const DEFAULT_QUERY_STATE: PublicSongPageQueryState = {}

export async function generateStaticParams() {
  return songCatalog.map(song => ({ id: song.slug }))
}

export async function generateMetadata({
  params
}: {
  params: { id: string }
}) {
  const { id } = params
  const song = songCatalogBySlug[id]
  const runtimePayload = song ? loadPublicRuntimeSongPayload(song.slug) : null
  const publicLyricsAvailable = runtimePayload ? hasPublicRuntimeLyricToggle(runtimePayload) : null
  const presentation = song
    ? getSongPresentation(song, { publicLyricsAvailable })
    : null
  const songName = presentation?.title || song?.title || 'Song'
  const primaryAlias = presentation?.aliases?.[0] ?? null
  const description = song
    ? getSongSeoDescription(
        songName,
        presentation?.metaDescription ||
          [
            `Play ${songName} with letter notes, fingering charts, optional numbered notes, and switchable instrument setups.`,
            primaryAlias ? `Also known as ${primaryAlias}.` : ''
          ]
            .filter(Boolean)
            .join(' ')
      )
    : [
        `Play ${songName} with letter notes, fingering charts, optional numbered notes, and switchable instrument setups.`,
        primaryAlias ? `Also known as ${primaryAlias}.` : ''
      ]
        .filter(Boolean)
        .join(' ')
  const canonicalUrl = `${siteUrl}/song/${song?.slug || id}`
  const previewImagePath = song ? getSongPreviewImagePath(song.slug) : DEFAULT_SHARE_IMAGE
  const shareTitle =
    presentation?.metaTitle && presentation.metaTitle.trim().length > 0
      ? presentation.metaTitle
      : primaryAlias
        ? `${songName} (${primaryAlias}) | Ocarina Tabs, Recorder & Tin Whistle Notes`
        : `${songName} | Ocarina Tabs, Recorder & Tin Whistle Notes`
  return {
    title: shareTitle,
    description,
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      type: 'article',
      url: canonicalUrl,
      title: shareTitle,
      description,
      siteName: 'Play By Fingering',
      images: [
        {
          url: previewImagePath,
          width: SONG_PREVIEW_IMAGE_WIDTH,
          height: SONG_PREVIEW_IMAGE_HEIGHT,
          alt: shareTitle
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description,
      images: [previewImagePath]
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large'
      }
    }
  }
}

export default function SongPage({
  params
}: {
  params: { id: string }
}) {
  const song = songCatalogBySlug[params.id]
  if (!song) {
    notFound()
  }
  /**
   * 当前公开曲库已经全部补齐了 deployable runtime raw JSON。
   *
   * 这意味着公开详情页主链现在不再需要回退到旧的 SongClient 原生详情页。
   * 如果这里读不到 raw JSON，应该把它当成数据缺失而不是静默切回旧链，
   * 否则后续维护时很容易产生“页面还能打开，但其实已经偏离主架构”的假象。
   *
   * 站点原生 Jianpu / SongClient 仍然保留：
   * - 供 dev 预览页使用
   * - 供未来运行时宿主解耦迁移时参考
   * 但它不再是当前公开详情页的默认产品路线。
   */
  const runtimePayload = loadPublicRuntimeSongPayload(song.slug)
  if (!runtimePayload) {
    notFound()
  }
  const hasPublicLyricToggle = hasPublicRuntimeLyricToggle(runtimePayload)
  const supportedInstruments = getSupportedPublicSongInstruments(runtimePayload)
  const defaultRuntimeInstrumentId = resolveDefaultPublicSongInstrumentId(supportedInstruments)
  const queryState = DEFAULT_QUERY_STATE
  const runtimeHostQueryFlag = false
  const runtimeHostResolution = resolvePublicRuntimeHostRollout({
    hasQueryFlag: runtimeHostQueryFlag
  })
  const shellSeo = adaptPresentationForInstrument(
    getSongPresentation(song, { publicLyricsAvailable: hasPublicLyricToggle }),
    supportedInstruments[0]!
  )
  const basePresentation = getSongPresentation(song, {
    publicLyricsAvailable: hasPublicLyricToggle
  })
  const presentationByInstrument = Object.fromEntries(
    supportedInstruments.map(instrument => [
      instrument.id,
      adaptPresentationForInstrument(basePresentation, instrument)
    ])
  )
  const relatedSongs = getRelatedSongCards(song.slug)
  const relatedGuides = getSuggestedGuideCardsForSong(song.slug)
  const seoSummary = getSongSeoSummary(shellSeo.title)
  const seoDescription = getSongSeoDescription(shellSeo.title, shellSeo.metaDescription)
  const previewImageUrl = getSongPreviewImageUrl(song.slug)
  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: shellSeo.metaTitle || shellSeo.title,
    headline: shellSeo.metaTitle || shellSeo.title,
    description: seoDescription,
    url: `${siteUrl}/song/${song.slug}`,
    image: previewImageUrl,
    thumbnailUrl: previewImageUrl,
    inLanguage: 'en',
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: previewImageUrl,
      width: SONG_PREVIEW_IMAGE_WIDTH,
      height: SONG_PREVIEW_IMAGE_HEIGHT
    },
    isPartOf: {
      '@type': 'WebSite',
      name: 'Play By Fingering',
      url: siteUrl
    },
    about: {
      '@type': 'MusicComposition',
      name: shellSeo.title
    }
  }
  const musicCompositionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicComposition',
    name: shellSeo.title,
    alternateName: shellSeo.aliases,
    description: seoDescription,
    url: `${siteUrl}/song/${song.slug}`,
    image: previewImageUrl,
    inLanguage: 'en',
    isAccessibleForFree: true,
    instrument: ['Ocarina', 'Recorder', 'Tin Whistle'],
    genre: shellSeo.familyLabel,
    keywords: [
      `${shellSeo.title} ocarina tabs`,
      `${shellSeo.title} recorder notes`,
      `${shellSeo.title} tin whistle notes`,
      `${shellSeo.title} letter notes`,
      `${shellSeo.title} finger chart`
    ].join(', ')
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: shellSeo.title,
        item: `${siteUrl}/song/${song.slug}`
      }
    ]
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: shellSeo.faqs.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  }
  const relatedSongsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${shellSeo.title} related songs`,
    itemListElement: relatedSongs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.title,
      url: `${siteUrl}${item.href}`
    }))
  }
  const relatedGuidesJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${shellSeo.title} related guides`,
    itemListElement: relatedGuides.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.title,
      url: getLearnGuideUrl(item.slug)
    }))
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
    <>
      <Script
        id={`song-webpage-${song.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <Script
        id={`song-music-${song.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(musicCompositionJsonLd) }}
      />
      <Script
        id={`song-breadcrumb-${song.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Script
        id={`song-faq-${song.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Script
        id={`song-related-${song.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(relatedSongsJsonLd) }}
      />
      <Script
        id={`song-guides-${song.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(relatedGuidesJsonLd) }}
      />
      <PublicRuntimePage
        songId={song.slug}
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
        runtimeHostMode={runtimeHostResolution.mode}
        runtimeHostModeSource={runtimeHostResolution.source}
        runtimeHostQueryFlag={runtimeHostQueryFlag}
        runtimeHostDiagnostics={{
          rolloutEnabled: runtimeHostResolution.rolloutEnabled,
          rolloutPercent: runtimeHostResolution.rolloutPercent,
          rolloutBucket: runtimeHostResolution.rolloutBucket,
          isBot: runtimeHostResolution.isBot,
          reason: runtimeHostResolution.reason
        }}
        containerRuntimePackage={null}
        seoSummary={seoSummary}
        relatedSongs={relatedSongs}
        relatedGuides={relatedGuides}
      />
    </>
  )
}
