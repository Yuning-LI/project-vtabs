'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function SiteFooter() {
  const pathname = usePathname()

  if (pathname?.startsWith('/dev')) {
    return null
  }

  return (
    <footer className="border-t border-line/70 bg-paper/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-secondary sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/" className="font-serif text-base text-primary">
            V-Tabs
          </Link>
          <span>Recorder, ocarina, and tin whistle learning library.</span>
        </div>
        <p className="max-w-4xl leading-6">
          All fingering charts and melody pages on this site are provided for personal study,
          education, and instrument exchange only. Copyright remains with the original rights
          holders. For removal requests, please contact us by email.
        </p>
      </div>
    </footer>
  )
}
