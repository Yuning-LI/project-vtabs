'use client'

import Link from 'next/link'
import type { LearnSongCard } from '@/lib/learn/content'
import { sendGaEvent } from '@/lib/analytics/ga'

type LearnSongCardGridProps = {
  songs: LearnSongCard[]
  analyticsContext?: {
    source: 'learn_featured_songs' | 'learn_section_songs'
    guideSlug: string
    sectionTitle?: string
  }
}

export default function LearnSongCardGrid({
  songs,
  analyticsContext
}: LearnSongCardGridProps) {
  function handleSongClick(song: LearnSongCard, position: number) {
    if (!analyticsContext || typeof window === 'undefined') {
      return
    }

    const href = new URL(song.href, window.location.origin)
    sendGaEvent('learn_to_song_click', {
      guide_slug: analyticsContext.guideSlug,
      source: analyticsContext.source,
      section_title: analyticsContext.sectionTitle ?? null,
      song_slug: song.slug,
      instrument_id: href.searchParams.get('instrument') ?? 'o12',
      position
    })
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {songs.map((song, index) => (
        <Link
          key={song.slug}
          href={song.href}
          className="page-warm-card-link flex h-full flex-col p-5"
          onClick={() => handleSongClick(song, index + 1)}
        >
          <div className="flex flex-wrap gap-2">
            <span className="page-warm-pill-muted px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]">
              {song.familyLabel}
            </span>
            {song.hasPublicLyrics ? (
              <span className="page-warm-pill px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]">
                Lyrics Available
              </span>
            ) : null}
          </div>
          <h3 className="mt-4 text-xl font-bold leading-tight text-stone-900">{song.title}</h3>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            {song.difficultyLabel} · {song.keyLabel} · {song.meterLabel}
          </p>
          <div className="mt-5 text-sm font-semibold text-stone-900">Open song page →</div>
        </Link>
      ))}
    </div>
  )
}
