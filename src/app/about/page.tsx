import type { Metadata } from 'next'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { siteUrl } from '@/lib/site'

const aboutTitle = 'About Play By Fingering'
const aboutDescription =
  'Learn what Play By Fingering offers for ocarina tabs, recorder notes, tin whistle letter notes, fingering charts, and melody-first practice pages.'

const contactEmail = 'dabaitang2@163.com'

export const metadata: Metadata = {
  title: aboutTitle,
  description: aboutDescription,
  alternates: {
    canonical: `${siteUrl}/about`
  },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/about`,
    title: aboutTitle,
    description: aboutDescription,
    siteName: 'Play By Fingering'
  },
  twitter: {
    card: 'summary',
    title: aboutTitle,
    description: aboutDescription
  },
  robots: {
    index: true,
    follow: true
  }
}

export default function AboutPage() {
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
        name: 'About',
        item: `${siteUrl}/about`
      }
    ]
  }

  return (
    <main className="page-warm-shell">
      <section className="page-warm-container">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />

        <section className="page-warm-hero px-5 py-5 md:px-7 md:py-7">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(61,47,34,0.16)] bg-[rgba(255,251,245,0.88)] px-3 py-1.5 text-[0.8rem] font-semibold text-stone-700 shadow-[0_10px_22px_rgba(61,47,34,0.08)] transition hover:-translate-y-0.5 hover:bg-white md:gap-2 md:border-stone-900 md:bg-stone-900 md:px-4 md:py-2.5 md:text-sm md:text-stone-50 md:shadow-[0_14px_30px_rgba(61,47,34,0.18)] md:hover:bg-stone-800 md:hover:shadow-[0_18px_36px_rgba(61,47,34,0.24)]"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              Back to Song Library
            </Link>
            <Link
              href="/learn"
              className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(61,47,34,0.16)] bg-[rgba(255,251,245,0.88)] px-3 py-1.5 text-[0.8rem] font-semibold text-stone-700 shadow-[0_10px_22px_rgba(61,47,34,0.08)] transition hover:-translate-y-0.5 hover:bg-white md:gap-2 md:border-stone-900 md:bg-stone-900 md:px-4 md:py-2.5 md:text-sm md:text-stone-50 md:shadow-[0_14px_30px_rgba(61,47,34,0.18)] md:hover:bg-stone-800 md:hover:shadow-[0_18px_36px_rgba(61,47,34,0.24)]"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              Learn Guides
            </Link>
          </div>
          <div className="mt-5 page-warm-pill w-fit px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em]">
            About
          </div>
          <h1 className="mt-3 text-[2rem] font-black tracking-tight text-stone-900 md:text-[3rem]">
            About Play By Fingering
          </h1>
          <div className="mt-5 max-w-3xl space-y-4">
            <p className="text-sm leading-7 text-stone-700 md:text-[0.98rem]">
              Play By Fingering is a melody-first practice library for players who search for
              ocarina tabs, recorder notes, tin whistle letter notes, and fingering-chart-ready
              song pages instead of full staff notation.
            </p>
            <p className="text-sm leading-7 text-stone-700 md:text-[0.98rem]">
              The goal is practical access: open a familiar song, read clear note labels, switch
              to a supported instrument view, and keep practice moving without needing a separate
              notation workflow.
            </p>
          </div>
        </section>

        <section className="page-warm-panel mt-8 p-6 md:p-7">
          <h2 className="text-2xl font-bold text-stone-900">What This Site Is For</h2>
          <div className="mt-4 max-w-3xl space-y-4">
            <p className="text-sm leading-7 text-stone-700">
              This site is built around real search intent from beginners, returning hobby players,
              teachers, and casual melody-instrument players. Many visitors are not looking for a
              full score first. They want a readable melody page with practical fingering support.
            </p>
            <p className="text-sm leading-7 text-stone-700">
              That is why the public pages stay focused on letter notes, optional numbered notes,
              supported fingering charts, and direct song access across ocarina, recorder, and tin
              whistle views where the song supports them.
            </p>
          </div>
        </section>

        <section className="page-warm-panel mt-8 p-6 md:p-7">
          <h2 className="text-2xl font-bold text-stone-900">How The Song Pages Work</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border border-stone-200/80 bg-white/85 p-5">
              <h3 className="text-lg font-bold text-stone-900">Melody-first reading</h3>
              <p className="mt-3 text-sm leading-7 text-stone-700">
                The public pages prioritize melody readability, clear note labels, and practical
                instrument switching instead of trying to duplicate a full engraving workflow.
              </p>
            </article>
            <article className="rounded-3xl border border-stone-200/80 bg-white/85 p-5">
              <h3 className="text-lg font-bold text-stone-900">Supported instrument views</h3>
              <p className="mt-3 text-sm leading-7 text-stone-700">
                Where the arrangement supports it, the same song page can expose 12-hole ocarina,
                6-hole ocarina, recorder, and tin whistle setups without forcing duplicate URLs.
              </p>
            </article>
            <article className="rounded-3xl border border-stone-200/80 bg-white/85 p-5">
              <h3 className="text-lg font-bold text-stone-900">Practice-oriented tools</h3>
              <p className="mt-3 text-sm leading-7 text-stone-700">
                Public pages may include fingering charts, note-view switching, metronome, and
                playback support to help users move from search to actual practice faster.
              </p>
            </article>
          </div>
        </section>

        <section className="page-warm-panel mt-8 p-6 md:p-7">
          <h2 className="text-2xl font-bold text-stone-900">Contact</h2>
          <div className="mt-4 max-w-3xl space-y-4">
            <p className="text-sm leading-7 text-stone-700">
              For general questions, corrections, or site-related contact, email{' '}
              <a
                href={`mailto:${contactEmail}`}
                className="font-semibold text-stone-900 underline underline-offset-4"
              >
                {contactEmail}
              </a>
              .
            </p>
            <p className="text-sm leading-7 text-stone-700">
              For copyright or removal requests, use the guidance on the{' '}
              <Link href="/copyright" className="font-semibold text-stone-900 underline underline-offset-4">
                Copyright &amp; Removal Requests
              </Link>{' '}
              page so the request includes the details needed to review it quickly.
            </p>
          </div>
        </section>
      </section>
    </main>
  )
}
