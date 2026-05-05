import type { Metadata } from 'next'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import LearnGuideCardGrid from '@/components/learn/LearnGuideCardGrid'
import LearnSongCardGrid from '@/components/learn/LearnSongCardGrid'
import {
  getLearnGuideMetadata,
  getLearnGuideSlugs,
  getLearnGuideUrl,
  getResolvedLearnGuide,
  type ResolvedLearnGuide
} from '@/lib/learn/content'
import { siteUrl } from '@/lib/site'
import { songCatalog } from '@/lib/songbook/catalog'

export const dynamicParams = false

export function generateStaticParams() {
  return getLearnGuideSlugs().map(slug => ({ slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const metadata = getLearnGuideMetadata(params.slug)
  if (!metadata) {
    return {}
  }
  const canonicalUrl = getLearnGuideUrl(params.slug)

  return {
    title: metadata.title,
    description: metadata.description,
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      type: 'article',
      url: canonicalUrl,
      title: metadata.title,
      description: metadata.description,
      siteName: 'Play By Fingering'
    },
    twitter: {
      card: 'summary',
      title: metadata.title,
      description: metadata.description
    },
    robots: {
      index: true,
      follow: true
    }
  }
}

export default function LearnGuidePage({ params }: { params: { slug: string } }) {
  const guide = getResolvedLearnGuide(params.slug)
  if (!guide) {
    notFound()
  }
  const isHubGuide = guide.kind === 'hub'
  const uniqueSongCount = getUniqueLearnGuideSongCount(guide)
  const heroParagraphs =
    guide.heroSummary?.length && isHubGuide
      ? guide.heroSummary
      : [guide.description, ...guide.intro]
  const heroLeadParagraphs = isHubGuide ? heroParagraphs.slice(0, 1) : heroParagraphs
  const deferredHeroParagraphs = isHubGuide ? heroParagraphs.slice(1) : []

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
        name: 'Learn',
        item: `${siteUrl}/learn`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: guide.title,
        item: getLearnGuideUrl(guide.slug)
      }
    ]
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faq.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  }
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${guide.title} featured songs`,
    itemListElement: guide.featuredSongs.map((song, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: song.title,
      url: `${siteUrl}${song.href}`
    }))
  }
  const sections = guide.sections as ResolvedLearnGuide['sections']

  return (
    <main className="page-warm-shell">
      <section className="page-warm-container">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />

        <section className="page-warm-hero px-5 py-5 md:px-7 md:py-7">
          <div
            className={
              isHubGuide
                ? 'grid gap-6 lg:grid-cols-[minmax(0,1.05fr),minmax(18rem,0.95fr)]'
                : 'block'
            }
          >
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/"
                  className="page-warm-pill-muted inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Back to Song Library
                </Link>
                <Link
                  href="/learn"
                  className="page-warm-pill-muted inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Back to Learn
                </Link>
              </div>
              {isHubGuide ? (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <div className="page-warm-pill-muted w-fit px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em]">
                    {uniqueSongCount} song links
                  </div>
                </div>
              ) : null}
              <h1 className="mt-3 text-[2rem] font-black tracking-tight text-stone-900 md:text-[3rem]">
                {guide.title}
              </h1>
              <div className={`mt-5 space-y-4 ${isHubGuide ? 'max-w-3xl' : 'max-w-none'}`}>
                {heroLeadParagraphs.map(paragraph => (
                  <p key={paragraph} className="text-sm leading-7 text-stone-700">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
            {isHubGuide ? (
              <aside className="page-warm-panel-soft hidden p-5 md:p-6 lg:block">
                <h2 className="text-xl font-bold text-stone-900">Resource Snapshot</h2>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  A compact summary for visitors who want to see how much usable material this
                  page opens up before they decide to bookmark it.
                </p>
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  <SnapshotStat label="Song links" value={`${uniqueSongCount}`} />
                  <SnapshotStat label="Public library" value={`${songCatalog.length}`} />
                  <SnapshotStat label="Page type" value={guide.heroLabel} />
                  <SnapshotStat label="Reading mode" value="Letter / number" />
                </dl>
                <ul className="mt-5 grid gap-2 text-sm leading-6 text-stone-700">
                  <li className="rounded-2xl bg-[rgba(255,247,237,0.86)] px-4 py-3">
                    Direct links into the same public song route
                  </li>
                  <li className="rounded-2xl bg-[rgba(255,247,237,0.86)] px-4 py-3">
                    Fingering charts stay available on supported songs
                  </li>
                  <li className="rounded-2xl bg-[rgba(255,247,237,0.86)] px-4 py-3">
                    Letter notes stay first, with numbered notes as a backup view
                  </li>
                  <li className="rounded-2xl bg-[rgba(255,247,237,0.86)] px-4 py-3">
                    Supported recorder and whistle setup choices stay on the same song page
                  </li>
                </ul>
              </aside>
            ) : null}
          </div>
        </section>

        <section className={`page-warm-panel p-6 md:p-7 ${isHubGuide ? 'mt-5' : 'mt-8'}`}>
          <h2 className="text-2xl font-bold text-stone-900">Featured Songs</h2>
          <p className="mt-3 max-w-none text-sm leading-7 text-stone-700">
            These song pages are the fastest way to move from a topic page into actual practice.
            They keep the public runtime intact while giving search visitors a more intentional
            path into the library, including the right recorder setup or whistle key when a song
            supports it.
          </p>
          <div className="mt-6">
            <LearnSongCardGrid
              songs={guide.featuredSongs}
              analyticsContext={{
                source: 'learn_featured_songs',
                guideSlug: guide.slug
              }}
            />
          </div>
        </section>

        {deferredHeroParagraphs.length ? (
          <section className="page-warm-panel-soft mt-6 p-6 md:p-7">
            <h2 className="text-xl font-bold text-stone-900">Why This Resource Helps</h2>
            <div className="mt-4 max-w-4xl space-y-4">
              {deferredHeroParagraphs.map(paragraph => (
                <p key={paragraph} className="text-sm leading-7 text-stone-700">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="grid gap-6">
            {sections.map(section => (
              <section key={section.title} className="page-warm-panel p-6 md:p-7">
                <h2 className="text-2xl font-bold text-stone-900">{section.title}</h2>
                <div className="mt-4 space-y-4">
                  {section.paragraphs.map(paragraph => (
                    <p key={paragraph} className="text-sm leading-7 text-stone-700">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {section.bullets?.length ? (
                  <ul className="mt-5 grid gap-3 text-sm leading-6 text-stone-700">
                    {section.bullets.map(item => (
                      <li
                        key={item}
                        className="rounded-2xl bg-[rgba(255,247,237,0.86)] px-4 py-3"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {section.songs.length ? (
                  <div className="mt-6">
                    <LearnSongCardGrid
                      songs={section.songs}
                      analyticsContext={{
                        source: 'learn_section_songs',
                        guideSlug: guide.slug,
                        sectionTitle: section.title
                      }}
                    />
                  </div>
                ) : null}
              </section>
            ))}
          </div>

          <div className="grid gap-6">
            <section className="page-warm-panel-soft p-6">
              <h2 className="text-xl font-bold text-stone-900">FAQ</h2>
              <div className="mt-4 grid gap-4">
                {guide.faq.map(item => (
                  <div
                    key={item.question}
                    className="rounded-2xl bg-[rgba(255,247,237,0.82)] px-4 py-4"
                  >
                    <h3 className="text-sm font-semibold text-stone-900">{item.question}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-700">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="page-warm-panel-soft p-6">
              <h2 className="text-xl font-bold text-stone-900">Related Guides</h2>
              <p className="mt-3 text-sm leading-6 text-stone-700">
                These pages cover adjacent search intents, so visitors can move between beginner,
                lyric, and instrument-specific routes without dropping back to the home library.
              </p>
              <div className="mt-5">
                <LearnGuideCardGrid guides={guide.relatedGuides} />
              </div>
            </section>
          </div>
        </div>

        <section className="page-warm-panel mt-8 p-6 md:p-7">
          <nav aria-label="Breadcrumb" className="text-sm font-semibold text-stone-700">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="underline-offset-4 hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/learn" className="underline-offset-4 hover:underline">
                  Learn
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-stone-900">{guide.title}</li>
            </ol>
          </nav>
          <div className="mt-5">
            <h2 className="text-xl font-bold text-stone-900">Browse Related Categories</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">
              Move sideways through the same library by instrument, practice goal, season, or
              performance setting without dropping back to a generic search page.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {guide.relatedGuides.map(relatedGuide => (
                <Link
                  key={relatedGuide.slug}
                  href={`/learn/${relatedGuide.slug}`}
                  className="page-warm-pill-muted inline-flex px-4 py-2 text-sm font-semibold"
                >
                  {relatedGuide.title}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

function getUniqueLearnGuideSongCount(guide: ResolvedLearnGuide) {
  const slugs = new Set<string>()
  guide.featuredSongs.forEach(song => slugs.add(song.slug))
  guide.sections.forEach(section => section.songs.forEach(song => slugs.add(song.slug)))
  return slugs.size
}

function SnapshotStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[rgba(168,142,108,0.18)] bg-white/75 px-4 py-3">
      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-bold text-stone-900">{value}</dd>
    </div>
  )
}
