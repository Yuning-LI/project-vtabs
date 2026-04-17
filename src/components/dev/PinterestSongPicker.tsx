'use client'

import Link from 'next/link'
import { useDeferredValue, useMemo, useState } from 'react'

type PinterestPickerSong = {
  slug: string
  title: string
  aliases: string[]
}

type PinterestSongPickerProps = {
  songs: PinterestPickerSong[]
}

export default function PinterestSongPicker({ songs }: PinterestSongPickerProps) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const normalizedQuery = normalizePickerSearchText(deferredQuery)

  const filteredSongs = useMemo(() => {
    if (!normalizedQuery) {
      return songs
    }

    return songs.filter(song => {
      return [song.title, song.slug, ...song.aliases].some(value =>
        normalizePickerSearchText(value).includes(normalizedQuery)
      )
    })
  }, [normalizedQuery, songs])

  return (
    <section className="space-y-5">
      <div className="rounded-[28px] border border-stone-200 bg-white/92 p-5 shadow-[0_18px_36px_rgba(84,58,32,0.08)] md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
              Internal Song Picker
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-900">
              Choose a Song for Manual Pin Screenshots
            </h2>
          </div>
          <div className="rounded-full border border-[rgba(154,126,91,0.24)] bg-[rgba(255,251,244,0.92)] px-4 py-2 text-sm font-semibold text-stone-700">
            {filteredSongs.length} songs
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search by song title, slug, or alias"
            className="w-full rounded-[18px] border border-stone-200 bg-[rgba(255,251,246,0.96)] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-400"
            aria-label="Search Pinterest song picker"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {filteredSongs.length === 0 ? (
        <div className="rounded-[24px] border border-stone-200 bg-white/92 p-6 text-sm leading-7 text-stone-700 shadow-[0_14px_28px_rgba(84,58,32,0.06)]">
          No public songs match that search yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSongs.map(song => (
            <Link
              key={song.slug}
              href={`/dev/pinterest/song/${song.slug}`}
              className="rounded-[24px] border border-stone-200 bg-white/92 p-5 shadow-[0_14px_28px_rgba(84,58,32,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(84,58,32,0.1)]"
            >
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Screenshot Workbench
              </div>
              <div className="mt-2 text-lg font-semibold text-stone-900">{song.title}</div>
              <div className="mt-2 text-sm text-stone-600">{song.slug}</div>
              {song.aliases.length > 0 ? (
                <div className="mt-3 text-xs leading-6 text-stone-500">
                  Also searched as {song.aliases.slice(0, 3).join(', ')}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function normalizePickerSearchText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
