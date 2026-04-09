import type { Metadata } from 'next'
import Link from 'next/link'
import LearnGuideCardGrid from '@/components/learn/LearnGuideCardGrid'
import { getFeaturedLearnGuideCards, getLearnGuideCards, getLearnGuideUrl } from '@/lib/learn/content'
import { siteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Learn | Beginner Hubs, Instrument Guides and Song Pathways',
  description:
    'Browse beginner hubs and practical learning guides for ocarina, recorder, and tin whistle players, with direct paths into the public song library.',
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
            Beginner Hubs and Practical Music Guides
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700 md:text-[0.98rem]">
            This section gives search visitors a clearer way into the site than a mixed song list
            alone. It combines instrument hubs, beginner entry pages, and blog-style learning
            guides that still lead directly into the same public song detail pages.
          </p>
        </section>

        <section className="page-warm-panel mt-8 p-6 md:p-7">
          <h2 className="text-2xl font-bold text-stone-900">Featured Entry Pages</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">
            Start with the narrowest page that matches your search intent: instrument-specific
            hubs for ocarina, recorder, or tin whistle, a lyric-focused route, or a broader guide
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
      </section>
    </main>
  )
}
