'use client'

import Link from 'next/link'
import { useRef } from 'react'
import type { LearnSongCard } from '@/lib/learn/content'
import { sendGaEvent } from '@/lib/analytics/ga'
import {
  useSongRoutePrefetch,
  useVisibleSongRoutePrefetch
} from '@/components/song/useSongRoutePrefetch'

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
  const { prefetchSongRoute, prefetchVisibleSongRoute } = useSongRoutePrefetch()

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
        <LearnSongCardLink
          key={song.slug}
          song={song}
          position={index + 1}
          onClick={handleSongClick}
          onPrefetch={prefetchSongRoute}
          onVisiblePrefetch={prefetchVisibleSongRoute}
        />
      ))}
    </div>
  )
}

function LearnSongCardLink({
  song,
  position,
  onClick,
  onPrefetch,
  onVisiblePrefetch
}: {
  song: LearnSongCard
  position: number
  onClick: (song: LearnSongCard, position: number) => void
  onPrefetch: (href: string) => void
  onVisiblePrefetch: (href: string) => void
}) {
  const cardRef = useRef<HTMLAnchorElement | null>(null)

  useVisibleSongRoutePrefetch(cardRef, song.href, onVisiblePrefetch)

  return (
    <Link
      ref={cardRef}
      href={song.href}
      className="page-warm-card-link flex h-full flex-col p-5"
      onFocus={() => onPrefetch(song.href)}
      onPointerEnter={() => onPrefetch(song.href)}
      onClick={() => onClick(song, position)}
    >
      <h3 className="text-xl font-bold leading-tight text-stone-900">{song.title}</h3>
      <p className="mt-3 text-sm leading-7 text-stone-700">
        {song.difficultyLabel} · {song.keyLabel} · {song.meterLabel}
      </p>
      <div className="mt-5 text-sm font-semibold text-stone-900">Open song page →</div>
    </Link>
  )
}
