import type { Metadata } from 'next'
import Link from 'next/link'
import { siteUrl } from '@/lib/site'

const resourcesTitle = 'Music Resources for Scores, Fingering Charts, and Practice'
const resourcesDescription =
  'A curated set of authoritative music resources for public-domain scores, recorder fingering references, tin whistle basics, traditional music archives, and music theory practice.'

type ResourceLink = {
  title: string
  url: string
  publisher: string
  description: string
  bestFor: string
  rel?: string
}

type ResourceGroup = {
  title: string
  intro: string
  resources: ResourceLink[]
}

const resourceGroups: ResourceGroup[] = [
  {
    title: 'Public-Domain Scores and Music Archives',
    intro:
      'Use these when you want large, established collections for classical scores, historical sheet music, public-domain materials, or source research before simplifying a melody for practice.',
    resources: [
      {
        title: 'IMSLP / Petrucci Music Library',
        url: 'https://imslp.org/wiki/Main_Page',
        publisher: 'IMSLP',
        description:
          'A very large public-domain score library, especially useful for classical repertoire and composer-based score research.',
        bestFor: 'Finding original or public-domain classical scores before making a simpler practice plan.'
      },
      {
        title: 'Library of Congress Notated Music Collections',
        url: 'https://www.loc.gov/notated-music/collections/',
        publisher: 'Library of Congress',
        description:
          'A primary-source collection hub for digitized notated music, American sheet music, historical music collections, and research material.',
        bestFor: 'Checking historical sheet music, American song material, and archival context.'
      },
      {
        title: 'Mutopia Project',
        url: 'https://www.mutopiaproject.org/',
        publisher: 'Mutopia Project',
        description:
          'A volunteer-run collection of free sheet music editions based on public-domain or openly licensed sources, often with editable source files.',
        bestFor: 'Downloading clean printable editions and studying how older works can be typeset.'
      },
      {
        title: 'Musopen Sheet Music',
        url: 'https://musopen.org/sheetmusic/',
        publisher: 'Musopen',
        description:
          'A nonprofit music library with public-domain sheet music, recordings, and music education materials.',
        bestFor: 'Looking up classical pieces with public-domain score and audio context.'
      }
    ]
  },
  {
    title: 'Recorder and Fingering References',
    intro:
      'These references help players understand why recorder pages sometimes separate Baroque and German fingering systems, and when a chart should match the physical instrument.',
    resources: [
      {
        title: 'Yamaha Recorder Guide: Baroque and German Style',
        url: 'https://www.yamaha.com/en/musical_instrument_guide/recorder/selection/selection002.html',
        publisher: 'Yamaha',
        description:
          'A manufacturer-level explanation of Baroque and German recorder fingering systems and why the distinction matters for beginners.',
        bestFor: 'Choosing a recorder type or understanding why fingering systems are not interchangeable.'
      },
      {
        title: 'American Recorder Society Fingering Charts',
        url: 'https://americanrecorder.org/recorder_fingering_charts.php',
        publisher: 'American Recorder Society',
        description:
          'A recorder association page that points players toward soprano, alto, Baroque, German, and extended fingering chart resources.',
        bestFor: 'Finding deeper recorder-specific fingering references beyond a simple beginner chart.'
      },
      {
        title: 'Mollenhauer Recorder Fingerings',
        url: 'https://www.mollenhauer.com/en/catalog/recorders/recorder-fingerings',
        publisher: 'Mollenhauer',
        description:
          'A recorder maker reference covering Baroque, German, and pentatonic fingering differences with practical notes for learners.',
        bestFor: 'Comparing fingering systems from an instrument-maker perspective.'
      }
    ]
  },
  {
    title: 'Tin Whistle and Traditional Tune Context',
    intro:
      'These resources are useful when a player wants broader folk-music context around tunes that also work on tin whistle, recorder, or ocarina.',
    resources: [
      {
        title: 'Irish Traditional Music Archive',
        url: 'https://www.itma.ie/',
        publisher: 'ITMA',
        description:
          'A national archive for Irish traditional music, song, and dance, with collections, learning material, and cultural context.',
        bestFor: 'Researching Irish traditional music before practicing a tune on tin whistle or another melody instrument.'
      },
      {
        title: 'FolkFluteWorld Free Sheet Music',
        url: 'https://folkfluteworld.com/free_sheet_music/free_sheet_music.html',
        publisher: 'FolkFluteWorld',
        description:
          'A long-running curated free sheet music directory for folk flute players, with sections that include ocarina, recorder, tin whistle, Irish flute, and other simple wind instruments.',
        bestFor:
          'Finding instrument-specific sheet music and related learning links for folk flute, ocarina, recorder, and tin whistle practice.'
      },
      {
        title: 'Wikimedia Commons Tin Whistle Fingering Chart',
        url: 'https://commons.wikimedia.org/wiki/File:Tin_whistle_fingering_chart.svg',
        publisher: 'Wikimedia Commons',
        description:
          'An open diagram for basic diatonic tin whistle fingerings, useful as a quick visual reference alongside a melody page.',
        bestFor: 'Checking the basic whistle fingering pattern when moving between note labels and finger holes.'
      }
    ]
  },
  {
    title: 'Music Theory and Reading Practice',
    intro:
      'These tools are not song libraries. They help players understand intervals, scales, notation, and ear-training ideas that make letter-note pages easier to connect to broader music reading.',
    resources: [
      {
        title: 'musictheory.net Lessons',
        url: 'https://www.musictheory.net/lessons',
        publisher: 'musictheory.net',
        description:
          'A widely used collection of short music theory lessons and exercises for notes, scales, intervals, chords, and ear training.',
        bestFor: 'Learning the theory vocabulary behind the notes shown on song pages.'
      },
      {
        title: 'Teoria Music Theory',
        url: 'https://www.teoria.com/',
        publisher: 'Teoria',
        description:
          'A long-running music theory site with tutorials, exercises, and ear-training tools for students and teachers.',
        bestFor: 'Practicing reading and listening skills outside a specific instrument page.',
        rel: 'nofollow noopener noreferrer'
      }
    ]
  }
]

export const metadata: Metadata = {
  title: resourcesTitle,
  description: resourcesDescription,
  alternates: {
    canonical: `${siteUrl}/resources`
  },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/resources`,
    title: resourcesTitle,
    description: resourcesDescription,
    siteName: 'Play By Fingering'
  },
  twitter: {
    card: 'summary',
    title: resourcesTitle,
    description: resourcesDescription
  },
  robots: {
    index: true,
    follow: true
  }
}

export default function ResourcesPage() {
  const allResources = resourceGroups.flatMap(group => group.resources)
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Authoritative Music Resources',
    itemListElement: allResources.map((resource, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: resource.title,
      url: resource.url
    }))
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
        name: 'Resources',
        item: `${siteUrl}/resources`
      }
    ]
  }

  return (
    <main className="page-warm-shell">
      <section className="page-warm-container">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />

        <section className="page-warm-hero px-5 py-5 md:px-7 md:py-7">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="page-warm-pill-muted inline-flex items-center px-4 py-2 text-sm font-semibold"
            >
              Song Library
            </Link>
            <Link
              href="/learn"
              className="page-warm-pill-muted inline-flex items-center px-4 py-2 text-sm font-semibold"
            >
              Learn Guides
            </Link>
          </div>
          <div className="mt-5 page-warm-pill w-fit px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em]">
            Resource Directory
          </div>
          <h1 className="mt-3 text-[2rem] font-black tracking-tight text-stone-900 md:text-[3rem]">
            Music Resources for Scores, Fingering Charts, and Practice
          </h1>
          <div className="mt-5 max-w-3xl space-y-4">
            <p className="text-sm leading-7 text-stone-700 md:text-[0.98rem]">
              This directory points to established archives, music institutions, instrument
              makers, and theory tools that can support practice beyond the song pages on
              PlayByFingering.
            </p>
            <p className="text-sm leading-7 text-stone-700 md:text-[0.98rem]">
              Use these links for source research, public-domain score checks, recorder fingering
              background, tin whistle context, and music theory practice. For playable letter-note
              pages with fingering charts, return to the song library.
            </p>
          </div>
        </section>

        <div className="mt-8 grid gap-8">
          {resourceGroups.map(group => (
            <section key={group.title} className="page-warm-panel p-6 md:p-7">
              <h2 className="text-2xl font-bold text-stone-900">{group.title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">{group.intro}</p>
              <div className="mt-6 divide-y divide-stone-200/80">
                {group.resources.map(resource => (
                  <article key={resource.url} className="grid gap-4 py-5 first:pt-0 last:pb-0 lg:grid-cols-[1fr,12rem]">
                    <div>
                      <div className="page-warm-pill-muted w-fit px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]">
                        {resource.publisher}
                      </div>
                      <h3 className="mt-3 text-xl font-bold leading-tight text-stone-900">
                        <a
                          href={resource.url}
                          target="_blank"
                          rel={resource.rel ?? 'noopener noreferrer'}
                          className="underline-offset-4 hover:underline"
                        >
                          {resource.title}
                        </a>
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-stone-700">
                        {resource.description}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-stone-700">
                        <span className="font-semibold text-stone-900">Best for:</span>{' '}
                        {resource.bestFor}
                      </p>
                    </div>
                    <div className="flex items-start lg:justify-end">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel={resource.rel ?? 'noopener noreferrer'}
                        className="page-warm-pill-muted inline-flex px-4 py-2 text-sm font-semibold"
                      >
                        Visit resource
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="page-warm-panel mt-8 p-6 md:p-7">
          <h2 className="text-2xl font-bold text-stone-900">How These Links Are Chosen</h2>
          <div className="mt-4 max-w-3xl space-y-4 text-sm leading-7 text-stone-700">
            <p>
              The list favors institutions, nonprofits, large public collections, established
              instrument makers, and long-running educational references. It is intentionally
              small, because a short set of reliable resources is more useful than a broad list of
              mixed-quality song sites.
            </p>
            <p>
              External resources may have their own licensing terms, editions, and regional
              copyright rules. Always check the source page before downloading, printing, teaching,
              recording, or republishing music.
            </p>
          </div>
        </section>
      </section>
    </main>
  )
}
