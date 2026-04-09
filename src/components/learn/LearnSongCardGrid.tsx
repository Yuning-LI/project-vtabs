'use client'

import Link from 'next/link'
import type { LearnSongCard } from '@/lib/learn/content'

type LearnSongCardGridProps = {
  songs: LearnSongCard[]
}

export default function LearnSongCardGrid({ songs }: LearnSongCardGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {songs.map(song => (
        <Link
          key={song.slug}
          href={song.href}
          className="page-warm-card-link flex h-full flex-col p-5"
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
