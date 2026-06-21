import { useCallback, useEffect, useState } from 'react'
import type { PublicSongPageQueryState } from '@/lib/songbook/publicInstruments'
import { parseSongPageQueryState } from '@/lib/songbook/songPageQueryState'
import { getBrowserWindow } from '@/lib/runtime-core/client/browserEnvironment'

export function usePublicRuntimeQueryState(queryState: PublicSongPageQueryState) {
  const [currentQueryState, setCurrentQueryState] = useState(queryState)
  const applyRuntimeQueryStateFromUrl = useCallback((url: string | URL) => {
    const runtimeWindow = getBrowserWindow()
    const nextUrl = typeof url === 'string'
      ? new URL(url, runtimeWindow?.location.origin ?? 'https://www.playbyfingering.com')
      : url

    setCurrentQueryState(parseSongPageQueryState(nextUrl))
  }, [])

  useEffect(() => {
    setCurrentQueryState(queryState)
  }, [queryState])

  useEffect(() => {
    const runtimeWindow = getBrowserWindow()
    if (!runtimeWindow) {
      return
    }
    const browserWindow = runtimeWindow

    applyRuntimeQueryStateFromUrl(browserWindow.location.href)

    function handlePopState() {
      applyRuntimeQueryStateFromUrl(browserWindow.location.href)
    }

    browserWindow.addEventListener('popstate', handlePopState)
    return () => {
      browserWindow.removeEventListener('popstate', handlePopState)
    }
  }, [applyRuntimeQueryStateFromUrl])

  return {
    currentQueryState,
    applyRuntimeQueryStateFromUrl
  }
}
