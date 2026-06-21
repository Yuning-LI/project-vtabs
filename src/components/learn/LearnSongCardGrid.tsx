'use client'

import Link from 'next/link'
import { useState, type MouseEvent, type PointerEvent } from 'react'
import type { LearnSongCard } from '@/lib/learn/content'
import { sendGaEvent } from '@/lib/analytics/ga'
import { getBrowserWindow } from '@/lib/runtime-core/client/browserEnvironment'
import { useSongRoutePrefetch } from '@/components/song/useSongRoutePrefetch'

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
  const { prefetchSongRoute } = useSongRoutePrefetch()
  const [pendingSongSlug, setPendingSongSlug] = useState<string | null>(null)

  function handleSongClick(song: LearnSongCard, position: number) {
    const runtimeWindow = getBrowserWindow()
    if (!analyticsContext || !runtimeWindow) {
      return
    }

    const href = new URL(song.href, runtimeWindow.location.origin)
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
          isPending={pendingSongSlug === song.slug}
          onClick={handleSongClick}
          onPrefetch={prefetchSongRoute}
          onPending={setPendingSongSlug}
        />
      ))}
    </div>
  )
}

function LearnSongCardLink({
  song,
  position,
  isPending,
  onClick,
  onPrefetch,
  onPending
}: {
  song: LearnSongCard
  position: number
  isPending: boolean
  onClick: (song: LearnSongCard, position: number) => void
  onPrefetch: (href: string) => void
  onPending: (songSlug: string) => void
}) {
  function markPendingNavigation(
    event: MouseEvent<HTMLAnchorElement> | PointerEvent<HTMLAnchorElement>
  ) {
    if (!isCurrentTabNavigation(event)) {
      return
    }

    if ('pointerType' in event && event.pointerType === 'touch') {
      return
    }

    onPending(song.slug)
  }

  return (
    <Link
      href={song.href}
      prefetch={false}
      aria-busy={isPending}
      className={
        isPending
          ? 'page-warm-card-link relative flex h-full flex-col p-5 pr-28 opacity-80 ring-2 ring-stone-900/15'
          : 'page-warm-card-link relative flex h-full flex-col p-5'
      }
      onFocus={() => onPrefetch(song.href)}
      onPointerEnter={() => onPrefetch(song.href)}
      onPointerDown={markPendingNavigation}
      onClick={event => {
        markPendingNavigation(event)
        onClick(song, position)
      }}
    >
      {isPending ? (
        <span className="page-warm-pill absolute right-4 top-4 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold">
          <span className="page-warm-opening-spinner" aria-hidden="true" />
          <span>Opening</span>
        </span>
      ) : null}
      <h3 className="text-xl font-bold leading-tight text-stone-900">{song.title}</h3>
      <p className="mt-3 text-sm leading-7 text-stone-700">
        {song.difficultyLabel} · {song.keyLabel} · {song.meterLabel}
      </p>
      <div className="mt-5 text-sm font-semibold text-stone-900">Open song page →</div>
    </Link>
  )
}

function isCurrentTabNavigation(
  event: MouseEvent<HTMLAnchorElement> | PointerEvent<HTMLAnchorElement>
) {
  if (event.button !== 0) {
    return false
  }

  return !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}
