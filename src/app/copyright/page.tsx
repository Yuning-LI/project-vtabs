import type { Metadata } from 'next'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { siteUrl } from '@/lib/site'

const copyrightTitle = 'Copyright & Removal Requests'
const copyrightDescription =
  'Read the Play By Fingering copyright, educational-use, and removal-request policy, including how rights holders can contact the site.'

const contactEmail = 'dabaitang2@163.com'

export const metadata: Metadata = {
  title: copyrightTitle,
  description: copyrightDescription,
  alternates: {
    canonical: `${siteUrl}/copyright`
  },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/copyright`,
    title: copyrightTitle,
    description: copyrightDescription,
    siteName: 'Play By Fingering'
  },
  twitter: {
    card: 'summary',
    title: copyrightTitle,
    description: copyrightDescription
  },
  robots: {
    index: true,
    follow: true
  }
}

export default function CopyrightPage() {
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
        name: 'Copyright',
        item: `${siteUrl}/copyright`
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
              href="/about"
              className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(61,47,34,0.16)] bg-[rgba(255,251,245,0.88)] px-3 py-1.5 text-[0.8rem] font-semibold text-stone-700 shadow-[0_10px_22px_rgba(61,47,34,0.08)] transition hover:-translate-y-0.5 hover:bg-white md:gap-2 md:border-stone-900 md:bg-stone-900 md:px-4 md:py-2.5 md:text-sm md:text-stone-50 md:shadow-[0_14px_30px_rgba(61,47,34,0.18)] md:hover:bg-stone-800 md:hover:shadow-[0_18px_36px_rgba(61,47,34,0.24)]"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              About
            </Link>
          </div>
          <div className="mt-5 page-warm-pill w-fit px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em]">
            Policy
          </div>
          <h1 className="mt-3 text-[2rem] font-black tracking-tight text-stone-900 md:text-[3rem]">
            Copyright &amp; Removal Requests
          </h1>
          <div className="mt-5 max-w-3xl space-y-4">
            <p className="text-sm leading-7 text-stone-700 md:text-[0.98rem]">
              Play By Fingering publishes melody-oriented study pages for personal learning,
              practice, and instrument-use reference. Copyright remains with the original rights
              holders where applicable.
            </p>
            <p className="text-sm leading-7 text-stone-700 md:text-[0.98rem]">
              If you are a copyright owner or an authorized representative and believe a page
              should be removed or corrected, send a request by email and include enough detail for
              the page to be identified and reviewed promptly.
            </p>
          </div>
        </section>

        <section className="page-warm-panel mt-8 p-6 md:p-7">
          <h2 className="text-2xl font-bold text-stone-900">Educational Use Statement</h2>
          <div className="mt-4 max-w-3xl space-y-4">
            <p className="text-sm leading-7 text-stone-700">
              The site is intended for melody study, beginner-friendly reading support, fingering
              reference, and instrument practice. Public pages are designed as learning aids rather
              than substitutes for official sheet music editions or commercial distribution.
            </p>
            <p className="text-sm leading-7 text-stone-700">
              When a rights concern is raised, the goal is to review the request in good faith and
              remove or adjust material where appropriate.
            </p>
          </div>
        </section>

        <section className="page-warm-panel mt-8 p-6 md:p-7">
          <h2 className="text-2xl font-bold text-stone-900">How To Send A Removal Request</h2>
          <div className="mt-4 max-w-3xl space-y-4">
            <p className="text-sm leading-7 text-stone-700">
              Send requests to{' '}
              <a
                href={`mailto:${contactEmail}`}
                className="font-semibold text-stone-900 underline underline-offset-4"
              >
                {contactEmail}
              </a>
              .
            </p>
            <ul className="grid gap-3 text-sm leading-6 text-stone-700">
              <li className="rounded-2xl bg-[rgba(255,247,237,0.86)] px-4 py-3">
                Include the exact page URL or song title you want reviewed.
              </li>
              <li className="rounded-2xl bg-[rgba(255,247,237,0.86)] px-4 py-3">
                State whether you are the rights holder or an authorized representative.
              </li>
              <li className="rounded-2xl bg-[rgba(255,247,237,0.86)] px-4 py-3">
                Briefly explain the concern so the request can be evaluated efficiently.
              </li>
              <li className="rounded-2xl bg-[rgba(255,247,237,0.86)] px-4 py-3">
                Add contact details if a follow-up clarification is needed.
              </li>
            </ul>
          </div>
        </section>

        <section className="page-warm-panel mt-8 p-6 md:p-7">
          <h2 className="text-2xl font-bold text-stone-900">What Happens Next</h2>
          <div className="mt-4 max-w-3xl space-y-4">
            <p className="text-sm leading-7 text-stone-700">
              Once a sufficiently clear request is received, the page can be reviewed and, if
              needed, removed or updated. The aim is to handle legitimate rights concerns
              reasonably and without unnecessary delay.
            </p>
            <p className="text-sm leading-7 text-stone-700">
              If your message is about a general correction rather than copyright, the{' '}
              <Link href="/about" className="font-semibold text-stone-900 underline underline-offset-4">
                About page
              </Link>{' '}
              also lists the same contact email for ordinary site questions.
            </p>
          </div>
        </section>
      </section>
    </main>
  )
}
