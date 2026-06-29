'use client'

import { useCallback, useEffect } from 'react'
import { SONG_PAGE_LINK_STATE_EVENT } from '@/lib/songbook/practicePairTypes'
import { getBrowserWindow } from '@/lib/runtime-core/client/browserEnvironment'

type UseRuntimeSettingNavigationInput = {
  songId: string
  pageBasePath: string
  activeInstrumentId: string
  noteLabelMode: string
  runtimeQueryString: string
  applyRuntimeQueryStateFromUrl: (url: URL) => void
}

export function useRuntimeSettingNavigation({
  songId,
  pageBasePath,
  activeInstrumentId,
  noteLabelMode,
  runtimeQueryString,
  applyRuntimeQueryStateFromUrl
}: UseRuntimeSettingNavigationInput) {
  useEffect(() => {
    const runtimeWindow = getBrowserWindow()
    if (!runtimeWindow) {
      return
    }

    runtimeWindow.dispatchEvent(
      new CustomEvent(SONG_PAGE_LINK_STATE_EVENT, {
        detail: {
          instrumentId: activeInstrumentId,
          noteLabelMode
        }
      })
    )
  }, [activeInstrumentId, noteLabelMode, runtimeQueryString])

  const navigateWithinSongPage = useCallback(
    (href: string) => {
      const runtimeWindow = getBrowserWindow()
      if (!href || !runtimeWindow) {
        return
      }

      const nextUrl = new URL(href, runtimeWindow.location.origin)
      if (nextUrl.pathname !== `${pageBasePath}/${songId}`) {
        runtimeWindow.location.replace(nextUrl.toString())
        return
      }

      runtimeWindow.history.replaceState(runtimeWindow.history.state, '', nextUrl.toString())
      applyRuntimeQueryStateFromUrl(nextUrl)
    },
    [applyRuntimeQueryStateFromUrl, pageBasePath, songId]
  )

  return { navigateWithinSongPage }
}
