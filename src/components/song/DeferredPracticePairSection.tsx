'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  SONG_PAGE_LINK_STATE_EVENT,
  type PracticePairLinkState,
  type PracticePairSuggestions
} from '@/lib/songbook/practicePairTypes'
import { buildSongPageHref } from '@/lib/songbook/publicInstruments'

type DeferredPracticePairSectionProps = {
  title: string
  suggestions: PracticePairSuggestions | null
  backHref?: string
  backLabel?: string
}

export default function DeferredPracticePairSection({
  title,
  suggestions,
  backHref = '/',
  backLabel = 'Back to Song Library'
}: DeferredPracticePairSectionProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [linkState, setLinkState] = useState<PracticePairLinkState>({
    instrumentId: null,
    noteLabelMode: null
  })

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
            <h2 className="text-2xl font-bold text-stone-900">Play Next</h2>
            <p className="mt-2 text-sm leading-7 text-stone-700">
              Finished with {title}? Pick the next melody that looks worth playing.
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
            <Link
              key={item.slug}
              href={item.href}
              className="page-warm-card-link group relative overflow-hidden p-0"
              aria-label={`Open ${item.title}`}
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden">
                <Image
                  src={`/song/${item.slug}/opengraph-image`}
                  alt={item.title}
                  width={1000}
                  height={1500}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  sizes="(min-width: 1280px) 320px, (min-width: 768px) 45vw, 100vw"
                  loading="lazy"
                  fetchPriority="low"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(33,24,15,0.82)] via-[rgba(33,24,15,0.24)] to-transparent p-4">
                  <p className="text-xl font-bold leading-tight text-[#fffaf2]">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[rgba(255,250,242,0.9)]">
                    {item.reason}
                  </p>
                  <div className="mt-3 text-sm font-semibold text-[#fffaf2]">
                    Open song page →
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
