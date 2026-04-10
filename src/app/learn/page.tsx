import type { Metadata } from 'next'
import Link from 'next/link'
import LearnGuideCardGrid from '@/components/learn/LearnGuideCardGrid'
import { getFeaturedLearnGuideCards, getLearnGuideCards, getLearnGuideUrl } from '@/lib/learn/content'
import { siteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Learn Song Guides and Visual Charts',
  description:
    'Browse beginner song guides, easy tabs, and visual chart pathways for ocarina, recorder, and tin whistle players.',
  alternates: {
    canonical: `${siteUrl}/learn`
  },
  robots: {
    index: true,
    follow: true
  }
}

export default function LearnIndexPage() {
  const featuredGuides = getFeaturedLearnGuideCards()
  const allGuides = getLearnGuideCards()
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Play By Fingering Learn Guides',
    itemListElement: allGuides.map((guide, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: guide.title,
      url: getLearnGuideUrl(guide.slug)
    }))
  }

  return (
    <main className="page-warm-shell">
      <section className="page-warm-container">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />

        <section className="page-warm-hero px-5 py-5 md:px-7 md:py-7">
          <Link
            href="/"
            className="page-warm-pill-muted inline-flex items-center px-4 py-2 text-sm font-semibold"
          >
            Back to Song Library
          </Link>
          <div className="mt-5 page-warm-pill w-fit px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em]">
            Learn Section
          </div>
          <h1 className="mt-3 text-[2rem] font-black tracking-tight text-stone-900 md:text-[3rem]">
            Beginner Song Guides and Practical Music Guides
          </h1>
          <div className="mt-5 max-w-3xl space-y-4">
            <p className="text-sm leading-7 text-stone-700 md:text-[0.98rem]">
              The learn section is the public map above the song library. It groups the same
              melody pages by instrument, beginner intent, seasonal use, classroom needs, and
              familiar repertoire so visitors can land on a page that matches what they actually
              searched for instead of guessing from a mixed catalog.
            </p>
            <p className="text-sm leading-7 text-stone-700 md:text-[0.98rem]">
              That means you can start with easy tabs, lyric-backed songs, whistle folk tunes,
              recorder classroom pieces, or visual chart entry pages for first-time ocarina
              players, then move into the same public song pages without switching systems. Use
              these guides to narrow the library by context first, then by song title.
            </p>
          </div>
        </section>

        <section className="page-warm-panel mt-8 p-6 md:p-7">
          <h2 className="text-2xl font-bold text-stone-900">Featured Entry Pages</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">
            Start with the narrowest page that matches your search intent: instrument-specific
            guides for ocarina, recorder, or tin whistle, a lyric-focused route, or a broader guide
            for beginners and music education.
          </p>
          <div className="mt-6">
            <LearnGuideCardGrid guides={featuredGuides} />
          </div>
        </section>

        <section className="page-warm-panel mt-8 p-6 md:p-7">
          <h2 className="text-2xl font-bold text-stone-900">All Guides</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">
            Every guide below is a public landing page. None of them replace the song library or
            change the runtime system. They exist to answer broader searches and then route people
            into the right melody pages.
          </p>
          <div className="mt-6">
            <LearnGuideCardGrid guides={allGuides} />
          </div>
        </section>

        <section className="page-warm-panel mt-8 p-6 md:p-7">
          <nav aria-label="Breadcrumb" className="text-sm font-semibold text-stone-700">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="underline-offset-4 hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-stone-900">Learn</li>
            </ol>
          </nav>
          <div className="mt-5">
            <h2 className="text-xl font-bold text-stone-900">Browse Popular Categories</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">
              These frequently used routes help visitors move between instrument hubs, seasonal
              collections, and beginner guides without falling into isolated doorway pages.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {featuredGuides.slice(0, 10).map(guide => (
                <Link
                  key={guide.slug}
                  href={`/learn/${guide.slug}`}
                  className="page-warm-pill-muted inline-flex px-4 py-2 text-sm font-semibold"
                >
                  {guide.title}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}
