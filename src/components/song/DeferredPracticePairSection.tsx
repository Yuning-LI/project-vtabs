'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import {
  SONG_PAGE_LINK_STATE_EVENT,
  type PracticePairLinkState,
  type PracticePairSuggestions
} from '@/lib/songbook/practicePairTypes'
import { buildSongPageHref } from '@/lib/songbook/publicInstruments'
import {
  useSongRoutePrefetch,
  useVisibleSongRoutePrefetch
} from '@/components/song/useSongRoutePrefetch'

type DeferredPracticePairSectionProps = {
  suggestions: PracticePairSuggestions | null
  prefetchEnabled?: boolean
  backHref?: string
  backLabel?: string
}

export default function DeferredPracticePairSection({
  suggestions,
  prefetchEnabled = false,
  backHref = '/',
  backLabel = 'Back to Song Library'
}: DeferredPracticePairSectionProps) {
  const { prefetchSongRoute, prefetchVisibleSongRoute } = useSongRoutePrefetch({
    maxVisibleRoutePrefetches: 3
  })
  const [isVisible, setIsVisible] = useState(false)
  const [linkState, setLinkState] = useState<PracticePairLinkState>({
    instrumentId: null,
    noteLabelMode: null
  })
  const [pendingSongSlug, setPendingSongSlug] = useState<string | null>(null)

  useEffect(() => {
    if (!suggestions) {
      return
    }

    let cancelled = false

    const reveal = () => {
      if (!cancelled) {
        setIsVisible(true)
      }
    }

    const scheduleReveal = () => {
      if (typeof window.requestIdleCallback === 'function') {
        const handle = window.requestIdleCallback(reveal, { timeout: 2000 })
        return () => window.cancelIdleCallback?.(handle)
      }

      const timeoutId = window.setTimeout(reveal, 1200)
      return () => window.clearTimeout(timeoutId)
    }

    let cleanupScheduler: (() => void) | null = null

    const onWindowLoaded = () => {
      cleanupScheduler = scheduleReveal()
    }

    if (document.readyState === 'complete') {
      onWindowLoaded()
    } else {
      window.addEventListener('load', onWindowLoaded, { once: true })
    }

    return () => {
      cancelled = true
      window.removeEventListener('load', onWindowLoaded)
      cleanupScheduler?.()
    }
  }, [suggestions])

  useEffect(() => {
    function handleLinkStateChange(event: Event) {
      const customEvent = event as CustomEvent<PracticePairLinkState>
      if (!customEvent.detail) {
        return
      }

      setLinkState(customEvent.detail)
    }

    window.addEventListener(SONG_PAGE_LINK_STATE_EVENT, handleLinkStateChange as EventListener)
    return () => {
      window.removeEventListener(
        SONG_PAGE_LINK_STATE_EVENT,
        handleLinkStateChange as EventListener
      )
    }
  }, [])

  const resolvedItems = useMemo(
    () =>
      (suggestions?.items ?? []).map(item => {
        const nextInstrumentId =
          linkState.instrumentId && item.supportedInstrumentIds.includes(linkState.instrumentId)
            ? linkState.instrumentId
            : null

        return {
          ...item,
          href: buildSongPageHref({
            songId: item.slug,
            instrumentId: nextInstrumentId,
            noteLabelMode: linkState.noteLabelMode ?? null
          })
        }
      }),
    [linkState.instrumentId, linkState.noteLabelMode, suggestions]
  )

  if (!suggestions || !isVisible) {
    return null
  }

  return (
    <section className="page-warm-practice-panel mt-8">
      <div className="page-warm-practice-feature p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">More Songs to Explore</h2>
            <p className="mt-2 text-sm leading-7 text-stone-700">
              Keep moving through songs with a similar feel or learning pattern instead of bouncing
              back to the full library after every tune.
            </p>
          </div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(61,47,34,0.16)] bg-[rgba(255,251,245,0.88)] px-3 py-1.5 text-[0.8rem] font-semibold text-stone-700 shadow-[0_10px_22px_rgba(61,47,34,0.08)] transition hover:-translate-y-0.5 hover:bg-white md:gap-2 md:border-stone-900 md:bg-stone-900 md:px-4 md:py-2.5 md:text-sm md:text-stone-50 md:shadow-[0_14px_30px_rgba(61,47,34,0.18)] md:hover:bg-stone-800 md:hover:shadow-[0_18px_36px_rgba(61,47,34,0.24)]"
          >
            <span aria-hidden="true" className="text-[0.95rem] leading-none md:text-base">←</span>
            <span>{backLabel}</span>
          </Link>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resolvedItems.map(item => (
            <PracticePairLinkCard
              key={item.slug}
              item={item}
              isPending={pendingSongSlug === item.slug}
              prefetchEnabled={prefetchEnabled}
              onPrefetch={prefetchSongRoute}
              onVisiblePrefetch={prefetchVisibleSongRoute}
              onPending={setPendingSongSlug}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function PracticePairLinkCard({
  item,
  isPending,
  prefetchEnabled,
  onPrefetch,
  onVisiblePrefetch,
  onPending
}: {
  item: (PracticePairSuggestions['items'][number] & { href: string })
  isPending: boolean
  prefetchEnabled: boolean
  onPrefetch: (href: string) => void
  onVisiblePrefetch: (href: string) => void
  onPending: (songSlug: string) => void
}) {
  const cardRef = useRef<HTMLAnchorElement | null>(null)

  useVisibleSongRoutePrefetch(cardRef, item.href, onVisiblePrefetch, {
    enabled: prefetchEnabled
  })

  function markPendingNavigation(
    event: MouseEvent<HTMLAnchorElement> | PointerEvent<HTMLAnchorElement>
  ) {
    if (!isCurrentTabNavigation(event)) {
      return
    }

    if ('pointerType' in event && event.pointerType === 'touch') {
      return
    }

    onPending(item.slug)
  }

  return (
    <Link
      ref={cardRef}
      href={item.href}
      aria-label={`Open ${item.title}`}
      aria-busy={isPending}
      className={
        isPending
          ? 'page-warm-card-link group relative flex h-full flex-col p-5 opacity-90 ring-2 ring-stone-900/15'
          : 'page-warm-card-link group relative flex h-full flex-col p-5'
      }
      onFocus={() => {
        if (prefetchEnabled) {
          onPrefetch(item.href)
        }
      }}
      onPointerEnter={() => {
        if (prefetchEnabled) {
          onPrefetch(item.href)
        }
      }}
      onPointerDown={markPendingNavigation}
      onClick={markPendingNavigation}
    >
      <div className="page-warm-pill-muted w-fit px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]">
        {item.familyLabel}
      </div>
      <h3 className="mt-3 text-xl font-bold leading-tight text-stone-900">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-700">{item.reason}</p>
      <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-50 shadow-[0_14px_30px_rgba(61,47,34,0.18)] transition hover:bg-stone-800 hover:shadow-[0_18px_36px_rgba(61,47,34,0.24)]">
        {isPending ? (
          <>
            <span className="page-warm-opening-spinner" aria-hidden="true" />
            <span>Opening</span>
          </>
        ) : (
          <>
            <span>Open song page</span>
            <span aria-hidden="true">→</span>
          </>
        )}
      </div>
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
