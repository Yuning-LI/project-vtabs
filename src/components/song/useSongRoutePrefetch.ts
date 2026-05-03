'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, type RefObject } from 'react'

export const DEFAULT_VISIBLE_SONG_ROUTE_PREFETCH_ROOT_MARGIN = '180px 0px'

type SongRoutePrefetchOptions = {
  maxVisibleRoutePrefetches?: number
  maxSearchVisibleRoutePrefetches?: number
}

type VisibleSongRoutePrefetchOptions = {
  enabled?: boolean
  rootMargin?: string
}

type VisibleSongRoutePrefetchContext =
  | {
      kind?: 'general'
      searchKey?: never
    }
  | {
      kind: 'search'
      searchKey: string
    }

export function useSongRoutePrefetch({
  maxVisibleRoutePrefetches = 18,
  maxSearchVisibleRoutePrefetches = 8
}: SongRoutePrefetchOptions = {}) {
  const router = useRouter()
  const prefetchedSongHrefsRef = useRef(new Set<string>())
  const visibleRoutePrefetchCountRef = useRef(0)
  const searchVisibleRoutePrefetchCountsRef = useRef(new Map<string, number>())

  const prefetchSongRoute = useCallback(
    (href: string) => {
      const normalizedHref = normalizeSongRouteHref(href)
      if (!normalizedHref || prefetchedSongHrefsRef.current.has(normalizedHref)) {
        return
      }

      prefetchedSongHrefsRef.current.add(normalizedHref)
      router.prefetch(normalizedHref)
    },
    [router]
  )

  const prefetchVisibleSongRoute = useCallback(
    (href: string, context: VisibleSongRoutePrefetchContext = { kind: 'general' }) => {
      const normalizedHref = normalizeSongRouteHref(href)
      if (
        !normalizedHref ||
        prefetchedSongHrefsRef.current.has(normalizedHref) ||
        shouldSkipVisibleRoutePrefetch()
      ) {
        return
      }

      if (context.kind === 'search') {
        const searchKey = context.searchKey.trim()
        if (!searchKey) {
          return
        }

        const currentCount = searchVisibleRoutePrefetchCountsRef.current.get(searchKey) ?? 0
        if (currentCount >= maxSearchVisibleRoutePrefetches) {
          return
        }

        searchVisibleRoutePrefetchCountsRef.current.set(searchKey, currentCount + 1)
      } else {
        if (visibleRoutePrefetchCountRef.current >= maxVisibleRoutePrefetches) {
          return
        }

        visibleRoutePrefetchCountRef.current += 1
      }

      prefetchSongRoute(normalizedHref)
    },
    [maxSearchVisibleRoutePrefetches, maxVisibleRoutePrefetches, prefetchSongRoute]
  )

  return {
    prefetchSongRoute,
    prefetchVisibleSongRoute
  }
}

export function useVisibleSongRoutePrefetch<T extends Element>(
  targetRef: RefObject<T>,
  href: string,
  onVisiblePrefetch: (href: string) => void,
  {
    enabled = true,
    rootMargin = DEFAULT_VISIBLE_SONG_ROUTE_PREFETCH_ROOT_MARGIN
  }: VisibleSongRoutePrefetchOptions = {}
) {
  const onVisiblePrefetchRef = useRef(onVisiblePrefetch)

  useEffect(() => {
    onVisiblePrefetchRef.current = onVisiblePrefetch
  }, [onVisiblePrefetch])

  useEffect(() => {
    const target = targetRef.current
    if (!enabled || !target || typeof IntersectionObserver === 'undefined') {
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) {
          return
        }

        onVisiblePrefetchRef.current(href)
        observer.disconnect()
      },
      {
        root: null,
        rootMargin,
        threshold: 0.01
      }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [enabled, href, rootMargin, targetRef])
}

function normalizeSongRouteHref(href: string) {
  if (!href || !href.startsWith('/song/')) {
    return null
  }

  return href
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
