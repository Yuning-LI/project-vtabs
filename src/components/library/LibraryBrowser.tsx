'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'

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

const MAX_VISIBLE_ROUTE_PREFETCHES = 18
const VISIBLE_PREFETCH_ROOT_MARGIN = '180px 0px'

export default function LibraryBrowser({
  songs,
  familyFilters,
  embedded = false
}: LibraryBrowserProps) {
  const router = useRouter()
  const azJumpNavRef = useRef<HTMLElement | null>(null)
  const prefetchedSongSlugsRef = useRef(new Set<string>())
  const visibleRoutePrefetchCountRef = useRef(0)
  const [query, setQuery] = useState('')
  const [activeFamily, setActiveFamily] = useState('All')
  const [sortMode, setSortMode] = useState<SortMode>('featured')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [pendingSongSlug, setPendingSongSlug] = useState<string | null>(null)

  useEffect(() => {
    if (sortMode !== 'az') {
      setShowBackToTop(false)
      return
    }

    function onScroll() {
      setShowBackToTop(window.scrollY > 720)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [sortMode])

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

  function scrollBackToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.setTimeout(() => {
      azJumpNavRef.current?.focus()
    }, 360)
  }

  function prefetchSong(songSlug: string) {
    if (prefetchedSongSlugsRef.current.has(songSlug)) {
      return
    }

    prefetchedSongSlugsRef.current.add(songSlug)
    router.prefetch(`/song/${songSlug}`)
  }

  function prefetchVisibleSong(songSlug: string) {
    if (
      prefetchedSongSlugsRef.current.has(songSlug) ||
      visibleRoutePrefetchCountRef.current >= MAX_VISIBLE_ROUTE_PREFETCHES ||
      shouldSkipVisibleRoutePrefetch()
    ) {
      return
    }

    visibleRoutePrefetchCountRef.current += 1
    prefetchSong(songSlug)
  }

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
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-start">
            <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-2">
              <div className="relative min-w-0 flex-1 xl:w-[40rem] xl:flex-none">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
                />
                <input
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search songs"
                  className="page-warm-input w-full py-3 pr-11 md:py-[0.9rem]"
                  aria-label="Search song titles"
                />
              </div>
              <div className="grid w-full grid-cols-3 gap-2 rounded-full border border-[rgba(154,126,91,0.18)] bg-white/72 px-2 py-1 shadow-[0_10px_24px_rgba(120,93,61,0.08)] md:flex md:w-auto md:flex-wrap md:items-center">
                <button
                  type="button"
                  onClick={() => setSortMode('featured')}
                  className={
                    sortMode === 'featured'
                      ? 'page-warm-pill-active px-2.5 py-2 text-center text-sm font-semibold md:px-4'
                      : 'page-warm-pill-muted px-2.5 py-2 text-center text-sm font-semibold md:px-4'
                  }
                >
                  Featured
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode('az')}
                  className={
                    sortMode === 'az'
                      ? 'page-warm-pill-active px-2.5 py-2 text-center text-sm font-semibold md:px-4'
                      : 'page-warm-pill-muted px-2.5 py-2 text-center text-sm font-semibold md:px-4'
                  }
                >
                  A–Z
                </button>
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(current => !current)}
                  className="page-warm-pill-muted px-2.5 py-2 text-center text-sm font-semibold md:hidden"
                  aria-expanded={showMobileFilters}
                >
                  {showMobileFilters ? 'Hide' : 'Filter'}
                </button>
              </div>
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
              ref={azJumpNavRef}
              aria-label="Jump to song title letter"
              tabIndex={-1}
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
                  <LibrarySongCard
                    key={song.id}
                    song={song}
                    isPending={pendingSongSlug === song.slug}
                    onPrefetch={prefetchSong}
                    onVisiblePrefetch={prefetchVisibleSong}
                    onPending={setPendingSongSlug}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSongs.map(song => (
            <LibrarySongCard
              key={song.id}
              song={song}
              isPending={pendingSongSlug === song.slug}
              onPrefetch={prefetchSong}
              onVisiblePrefetch={prefetchVisibleSong}
              onPending={setPendingSongSlug}
            />
          ))}
        </div>
      )}

      {sortMode === 'az' && showBackToTop ? (
        <button
          type="button"
          onClick={scrollBackToTop}
          className="fixed bottom-5 right-4 z-20 inline-flex items-center gap-2 rounded-full border border-stone-900 bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-50 shadow-[0_18px_36px_rgba(61,47,34,0.24)] transition hover:-translate-y-0.5 hover:bg-stone-800 md:bottom-8 md:right-8"
          aria-label="Back to top"
        >
          <span aria-hidden="true" className="text-base leading-none">↑</span>
          <span>Back to top</span>
        </button>
      ) : null}
    </>
  )
}

function LibrarySongCard({
  song,
  isPending,
  onPrefetch,
  onVisiblePrefetch,
  onPending
}: {
  song: LibrarySongSearchResult
  isPending: boolean
  onPrefetch: (songSlug: string) => void
  onVisiblePrefetch: (songSlug: string) => void
  onPending: (songSlug: string) => void
}) {
  const cardRef = useRef<HTMLAnchorElement | null>(null)
  const onVisiblePrefetchRef = useRef(onVisiblePrefetch)

  useEffect(() => {
    onVisiblePrefetchRef.current = onVisiblePrefetch
  }, [onVisiblePrefetch])

  useEffect(() => {
    const card = cardRef.current
    if (!card || typeof IntersectionObserver === 'undefined') {
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) {
          return
        }

        onVisiblePrefetchRef.current(song.slug)
        observer.disconnect()
      },
      {
        root: null,
        rootMargin: VISIBLE_PREFETCH_ROOT_MARGIN,
        threshold: 0.01
      }
    )

    observer.observe(card)
    return () => observer.disconnect()
  }, [song.slug])

  function markPendingNavigation(
    event: MouseEvent<HTMLAnchorElement> | PointerEvent<HTMLAnchorElement>
  ) {
    if (!isCurrentTabNavigation(event)) {
      return
    }

    onPending(song.slug)
  }

  return (
    <Link
      ref={cardRef}
      href={`/song/${song.slug}`}
      aria-busy={isPending}
      onFocus={() => onPrefetch(song.slug)}
      onPointerEnter={() => onPrefetch(song.slug)}
      onPointerDown={markPendingNavigation}
      onClick={markPendingNavigation}
      className={
        isPending
          ? 'page-warm-card-link group relative block overflow-hidden p-4 pr-28 opacity-80 ring-2 ring-stone-900/15 md:p-6 md:pr-32'
          : 'page-warm-card-link group relative block overflow-hidden p-4 pr-4 md:p-6'
      }
    >
      {isPending ? (
        <span className="page-warm-pill absolute right-3 top-3 px-3 py-1 text-xs font-semibold md:right-4 md:top-4">
          Opening...
        </span>
      ) : null}
      <h3 className="text-lg font-semibold leading-6 text-stone-900 transition group-hover:text-stone-700 md:text-xl">
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

function isCurrentTabNavigation(
  event: MouseEvent<HTMLAnchorElement> | PointerEvent<HTMLAnchorElement>
) {
  if (event.button !== 0) {
    return false
  }

  return !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

function shouldSkipVisibleRoutePrefetch() {
  if (typeof navigator === 'undefined') {
    return false
  }

  const connection = (
    navigator as Navigator & {
      connection?: {
        effectiveType?: string
        saveData?: boolean
      }
    }
  ).connection

  if (!connection) {
    return false
  }

  return (
    connection.saveData === true ||
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g'
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
