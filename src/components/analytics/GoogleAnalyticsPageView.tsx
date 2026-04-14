'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

type GoogleAnalyticsPageViewProps = {
  measurementId: string
}

export function GoogleAnalyticsPageView({
  measurementId
}: GoogleAnalyticsPageViewProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!measurementId || typeof window === 'undefined' || typeof window.gtag !== 'function') {
      return
    }

    const search = searchParams?.toString()
    const pagePath = search ? `${pathname}?${search}` : pathname

    window.gtag('config', measurementId, {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title
    })
  }, [measurementId, pathname, searchParams])

  return null
}
