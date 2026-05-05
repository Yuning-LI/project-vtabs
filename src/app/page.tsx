import type { Metadata } from 'next'
import Link from 'next/link'
import LearnGuideCardGrid from '@/components/learn/LearnGuideCardGrid'
import LibraryBrowser from '@/components/library/LibraryBrowser'
import { getFeaturedLearnGuideCards, getLearnGuideUrl } from '@/lib/learn/content'
import { siteUrl } from '@/lib/site'
import { songCatalog } from '@/lib/songbook/catalog'
import { getSongPresentation } from '@/lib/songbook/presentation'

const homepageTitle = 'Ocarina Tabs, Recorder Notes & Tin Whistle Letter Notes'
const homepageDescription =
  'Explore ocarina tabs, recorder notes, and tin whistle letter notes with fingering charts, optional numbered notes, Baroque/German recorder fingering, and switchable song views.'

export const metadata: Metadata = {
  title: homepageTitle,
  description: homepageDescription,
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: homepageTitle,
    description: homepageDescription,
    siteName: 'Play By Fingering'
  },
  twitter: {
    card: 'summary',
    title: homepageTitle,
    description: homepageDescription
  },
  robots: {
    index: true,
    follow: true
  }
}

/**
 * 首页当前承担两个角色：
 * 1. 给搜索引擎和用户一个“这站是干什么的”的总入口
 * 2. 给首批外链和收录流量一个尽量高转化的曲库落地页
 *
 * 因此这里刻意不展示过多曲目元信息，而是只露歌名：
 * - 降低列表视觉噪音
 * - 更像可扫读的 song catalog
 * - 避免首页变成信息过载的半详情页
 */
export default function Home() {
  const featuredGuides = getFeaturedLearnGuideCards()
  const librarySongs = songCatalog.map((song, index) => {
    const presentation = getSongPresentation(song)

    return {
      id: song.id,
      slug: song.slug,
      title: presentation.title,
      aliases: buildLibrarySearchAliases(song.title, presentation.aliases),
      familyLabel: presentation.familyLabel,
      featuredRank: index + 1
    }
  })
  const familyFilters = [
    'Nursery Rhyme',
    'Folk Song',
    'Classical Melody',
    'Film, TV & Game Theme',
    'Pop & Standard Melody',
    'Holiday Song',
    'Hymn or Spiritual',
    'March or Parade Tune',
    'Dance Melody'
  ].filter(label => librarySongs.some(song => song.familyLabel === label))
  const featuredSongItems = librarySongs.slice(0, 12)
  const homepageFaqs = [
    {
      question: 'What can I find on PlayByFingering?',
      answer:
        'PlayByFingering is a public melody library with letter notes, optional numbered notes, tabs-style melody pages, and finger charts for supported ocarina, recorder, and tin whistle songs. Some recorder pages also surface Baroque or German fingering, and supported whistle pages can open with the matching key already selected.'
    },
    {
      question: 'Are these pages suitable for beginners?',
      answer:
        'Many songs are beginner-friendly, especially the nursery rhyme, folk song, and holiday sections. The Learn pages group songs by instrument, lyrics, and beginner intent so visitors can start from the easiest path.'
    },
    {
      question: 'Do I need to read staff notation to use this site?',
      answer:
        'No. The main song pages are built around readable letter notes first, with optional numbered notes and fingering support for supported instruments.'
    }
  ]
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PlayByFingering',
    url: `${siteUrl}/`,
    description: homepageDescription
  }
  const guideItemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Featured Learn Guides',
    itemListElement: featuredGuides.map((guide, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: guide.title,
      url: getLearnGuideUrl(guide.slug)
    }))
  }
  const songItemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Featured Song Library',
    itemListElement: featuredSongItems.map((song, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: song.title,
      url: `https://www.playbyfingering.com/song/${song.slug}`
    }))
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: homepageFaqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }

  return (
    <main className="page-warm-shell">
      <section className="page-warm-container">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(guideItemListJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(songItemListJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />

        <div className="page-warm-hero px-5 py-3 md:px-7 md:py-4">
          <h1 className="text-[2rem] font-black tracking-tight text-stone-900 md:text-[3rem]">
            PlayByFingering
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-stone-700 md:text-[0.95rem]">
            Song pages with fingering charts for ocarina, recorder, and tin whistle.
          </p>

          <LibraryBrowser songs={librarySongs} familyFilters={familyFilters} embedded />
        </div>

        <section className="page-warm-panel mt-10 p-6 md:p-7">
          <h2 className="text-2xl font-bold text-stone-900">About This Library</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
            This site focuses on the search terms real players use most often: ocarina tabs,
            recorder notes, recorder finger chart searches, tin whistle letter notes, easy melody
            pages, and optional numbered notes. Instead of staff notation, each page is optimized
            around readable note labels, practical fingering support, and a mobile-friendly
            layout, while supported songs can switch between ocarina, recorder, and tin whistle
            views without leaving the same page. Recorder pages can also expose Baroque or German
            fingering, and whistle pages can surface the matching key where the song supports it.
          </p>
        </section>

        <section className="page-warm-panel mt-8 p-6 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-stone-900">Learn by Topic</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">
                Explore beginner hubs, instrument-specific entry pages, and practical learning
                guides that lead directly into the same public song pages.
              </p>
            </div>
            <Link
              href="/learn"
              className="page-warm-pill-muted inline-flex items-center px-4 py-2 text-sm font-semibold"
            >
              Browse all guides
            </Link>
          </div>
          <div className="mt-6">
            <LearnGuideCardGrid guides={featuredGuides} />
          </div>
        </section>

        <section className="page-warm-panel mt-8 p-6 md:p-7">
          <h2 className="text-2xl font-bold text-stone-900">How to Use This Site</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">
            Search visitors usually arrive with a practical need: they want easy ocarina tabs,
            recorder letter notes, a quick recorder finger chart, tin whistle fingering support,
            or songs with lyrics they can follow right away. The quickest path is to pick a Learn
            page above, then open a song detail page that matches your instrument and difficulty
            level. If you play recorder or whistle, the matching setup or key is now available on
            the same song page when the arrangement supports it.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {homepageFaqs.map(faq => (
              <article key={faq.question} className="rounded-3xl border border-stone-200/80 bg-white/85 p-5">
                <h3 className="text-base font-semibold text-stone-900">{faq.question}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-700">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}

function buildLibrarySearchAliases(sourceTitle: string, aliases: string[]) {
  const seen = new Set<string>()
  const merged: string[] = []

  for (const value of [sourceTitle, ...aliases]) {
    const trimmed = value.trim()
    if (!trimmed) {
      continue
    }

    const key = trimmed
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\u3400-\u9fff\u0400-\u04ff\u3040-\u30ff]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')

    if (!key || seen.has(key)) {
      continue
    }

    seen.add(key)
    merged.push(trimmed)
  }

  return merged
}
