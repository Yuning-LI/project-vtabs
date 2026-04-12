'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type LibrarySong = {
  id: string
  slug: string
  title: string
  aliases?: string[]
  familyLabel: string
  featuredRank: number
}

type LibraryBrowserProps = {
  songs: LibrarySong[]
  familyFilters: string[]
  embedded?: boolean
}

type SortMode = 'featured' | 'az'
type LibrarySongSearchResult = LibrarySong & {
  matchedAlias?: string
}

export default function LibraryBrowser({
  songs,
  familyFilters,
  embedded = false
}: LibraryBrowserProps) {
  const [query, setQuery] = useState('')
  const [activeFamily, setActiveFamily] = useState('All')
  const [sortMode, setSortMode] = useState<SortMode>('featured')
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const normalizedQuery = normalizeLibrarySearchText(query)
  const compactQuery = compactLibrarySearchText(normalizedQuery)

  const filteredSongs = useMemo(() => {
    return songs
      .flatMap(song => {
        if (activeFamily !== 'All' && song.familyLabel !== activeFamily) {
          return []
        }

        if (!normalizedQuery) {
          return [song]
        }

        const titleMatches = matchesLibrarySearch(song.title, normalizedQuery, compactQuery)
        const slugMatches = matchesLibrarySearch(song.slug, normalizedQuery, compactQuery)
        const idMatches = matchesLibrarySearch(song.id, normalizedQuery, compactQuery)
        const familyMatches = matchesLibrarySearch(song.familyLabel, normalizedQuery, compactQuery)
        const matchedAlias = findMatchedAlias(song.aliases, normalizedQuery, compactQuery)

        if (!titleMatches && !slugMatches && !idMatches && !familyMatches && !matchedAlias) {
          return []
        }

        return [
          {
            ...song,
            matchedAlias: matchedAlias && !titleMatches ? matchedAlias : undefined
          }
        ]
      })
      .sort((left, right) => {
        if (sortMode === 'az') {
          return left.title.localeCompare(right.title)
        }

        return left.featuredRank - right.featuredRank
      })
  }, [activeFamily, compactQuery, normalizedQuery, songs, sortMode])

  const groupedSongs = useMemo(() => {
    if (sortMode !== 'az') {
      return []
    }

    const groups = new Map<string, LibrarySongSearchResult[]>()

    filteredSongs.forEach(song => {
      const letter = getGroupLetter(song.title)
      const current = groups.get(letter) ?? []
      current.push(song)
      groups.set(letter, current)
    })

    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))
  }, [filteredSongs, sortMode])

  const activeFilters = familyFilters.map(label => (label === activeFamily ? label : null)).filter(Boolean)

  return (
    <>
      <section
        className={
          embedded
            ? 'mt-2 border-t border-[rgba(154,126,91,0.18)] pt-2 md:mt-3 md:pt-3'
            : 'page-warm-panel-soft mb-4 p-4 md:p-4'
        }
      >
        <div className="flex flex-col gap-2 md:gap-3">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2 xl:flex-1 xl:pr-4">
              <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search titles like fur elise, to alice, twinkle, scarborough, or jingle bells"
                className="page-warm-input w-full py-3 md:py-[0.9rem] xl:max-w-[40rem]"
                aria-label="Search song titles"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="page-warm-pill-muted px-4 py-2.5 text-sm font-semibold"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 xl:shrink-0">
              <button
                type="button"
                onClick={() => setSortMode('featured')}
                className={
                  sortMode === 'featured'
                    ? 'page-warm-pill-active px-3 py-2 text-sm font-semibold md:px-4'
                    : 'page-warm-pill-muted px-3 py-2 text-sm font-semibold md:px-4'
                }
              >
                Featured
              </button>
              <button
                type="button"
                onClick={() => setSortMode('az')}
                className={
                  sortMode === 'az'
                    ? 'page-warm-pill-active px-3 py-2 text-sm font-semibold md:px-4'
                    : 'page-warm-pill-muted px-3 py-2 text-sm font-semibold md:px-4'
                }
              >
                A–Z
              </button>
              <button
                type="button"
                onClick={() => setShowMobileFilters(current => !current)}
                className="page-warm-pill-muted px-3 py-2 text-sm font-semibold md:hidden"
                aria-expanded={showMobileFilters}
              >
                {showMobileFilters ? 'Hide Filters' : 'Filter Songs'}
              </button>
            </div>
          </div>

          <div className={`${showMobileFilters ? 'flex' : 'hidden'} flex-wrap gap-2 md:flex`}>
            {['All', ...familyFilters].map(label => {
              const isActive = label === activeFamily

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveFamily(label)}
                  className={
                    isActive
                      ? 'page-warm-pill-active px-3 py-2 text-sm font-semibold md:px-4'
                      : 'page-warm-pill-muted px-3 py-2 text-sm font-semibold md:px-4'
                  }
                >
                  {label}
                </button>
              )
            })}
          </div>

          {activeFilters.length > 0 || normalizedQuery ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-stone-700">
              {activeFilters.map(label => (
                <span key={label} className="page-warm-pill px-3 py-1 text-xs font-semibold">
                  {label}
                </span>
              ))}
              {normalizedQuery ? (
                <span className="page-warm-pill px-3 py-1 text-xs font-semibold">
                  Search: {query.trim()}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {filteredSongs.length === 0 ? (
        <section className="page-warm-panel p-6 md:p-7">
          <h3 className="text-xl font-bold text-stone-900">No songs match that search yet</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-700">
            Try a shorter title, switch back to All categories, or browse the featured list for a nearby match.
          </p>
        </section>
      ) : sortMode === 'az' ? (
        <div className="space-y-8">
          {groupedSongs.length > 1 ? (
            <nav
              aria-label="Jump to song title letter"
              className="page-warm-panel-soft p-4 md:p-5"
            >
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Jump to Letter
              </div>
              <div className="flex flex-wrap gap-2">
                {groupedSongs.map(([letter]) => (
                  <a
                    key={letter}
                    href={`#library-group-${encodeURIComponent(letter)}`}
                    className="page-warm-pill-muted px-3 py-2 text-sm font-semibold"
                  >
                    {letter}
                  </a>
                ))}
              </div>
            </nav>
          ) : null}

          {groupedSongs.map(([letter, group]) => (
            <section key={letter} id={`library-group-${encodeURIComponent(letter)}`}>
              <div className="mb-3 flex items-center gap-3">
                <div className="page-warm-pill px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
                  {letter}
                </div>
                <div className="h-px flex-1 bg-[rgba(154,126,91,0.22)]" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.map(song => (
                  <LibrarySongCard key={song.id} song={song} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSongs.map(song => (
            <LibrarySongCard key={song.id} song={song} />
          ))}
        </div>
      )}
    </>
  )
}

function LibrarySongCard({ song }: { song: LibrarySongSearchResult }) {
  return (
    <Link
      href={`/song/${song.slug}`}
      className="page-warm-card-link group block p-5 md:p-6"
    >
      <h3 className="text-xl font-semibold text-stone-900 transition group-hover:text-stone-700">
        {song.title}
      </h3>
      {song.matchedAlias ? (
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {song.matchedAlias}
        </p>
      ) : null}
    </Link>
  )
}

function findMatchedAlias(aliases: string[] | undefined, normalizedQuery: string, compactQuery: string) {
  return aliases?.find(alias => matchesLibrarySearch(alias, normalizedQuery, compactQuery))
}

function matchesLibrarySearch(value: string, normalizedQuery: string, compactQuery: string) {
  const normalizedValue = normalizeLibrarySearchText(value)

  if (normalizedValue.includes(normalizedQuery)) {
    return true
  }

  return compactLibrarySearchText(normalizedValue).includes(compactQuery)
}

function getGroupLetter(title: string) {
  const firstCharacter = title.trim().charAt(0).toUpperCase()

  if (!firstCharacter) {
    return '#'
  }

  return /[A-Z]/.test(firstCharacter) ? firstCharacter : '#'
}

function normalizeLibrarySearchText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function compactLibrarySearchText(value: string) {
  return value.replace(/\s+/g, '')
}
