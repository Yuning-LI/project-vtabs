'use client'

import { getBrowserWindow } from './browserEnvironment'

type RuntimeSoundfontIdlePreloadOptions = {
  enabled: boolean
  idleDelayMs?: number
  concurrency?: number
}

type IdleCallbackHandle = number

type RuntimeWindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => IdleCallbackHandle
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void
}

const preloadedSoundfontUrls = new Set<string>()

export function scheduleRuntimeSoundfontIdlePreload({
  enabled,
  idleDelayMs = 1200,
  concurrency = 2
}: RuntimeSoundfontIdlePreloadOptions) {
  const runtimeWindow = getBrowserWindow() as RuntimeWindowWithIdleCallback | null
  if (!enabled || !runtimeWindow) {
    return { cancel() {} }
  }

  const abortController = new AbortController()
  const timeoutIds = new Set<number>()
  let idleHandle: IdleCallbackHandle | null = null
  let cancelled = false

  const runPreload = () => {
    if (cancelled) {
      return
    }

    const urls = getRuntimeSoundfontPreloadUrls(runtimeWindow).filter(url => {
      if (preloadedSoundfontUrls.has(url)) {
        return false
      }
      preloadedSoundfontUrls.add(url)
      return true
    })
    if (urls.length === 0) {
      return
    }

    let nextIndex = 0
    let activeCount = 0
    const pump = () => {
      if (cancelled || abortController.signal.aborted) {
        return
      }

      while (activeCount < concurrency && nextIndex < urls.length) {
        const url = urls[nextIndex]
        nextIndex += 1
        activeCount += 1
        fetch(url, {
          cache: 'force-cache',
          signal: abortController.signal
        })
          .catch(() => {
            preloadedSoundfontUrls.delete(url)
          })
          .finally(() => {
            activeCount -= 1
            pump()
          })
      }
    }

    pump()
  }

  const scheduleIdleWork = () => {
    if (cancelled) {
      return
    }
    if (runtimeWindow.requestIdleCallback) {
      idleHandle = runtimeWindow.requestIdleCallback(runPreload, { timeout: 4500 })
      return
    }

    const fallbackId = runtimeWindow.setTimeout(runPreload, idleDelayMs)
    timeoutIds.add(fallbackId)
  }

  const delayId = runtimeWindow.setTimeout(scheduleIdleWork, idleDelayMs)
  timeoutIds.add(delayId)

  return {
    cancel() {
      cancelled = true
      abortController.abort()
      timeoutIds.forEach(id => runtimeWindow.clearTimeout(id))
      timeoutIds.clear()
      if (idleHandle !== null) {
        runtimeWindow.cancelIdleCallback?.(idleHandle)
        idleHandle = null
      }
    }
  }
}

function getRuntimeSoundfontPreloadUrls(runtimeWindow: Window) {
  const format = shouldUseOggSoundfont(runtimeWindow) ? 'ogg' : 'mp3'
  return [
    `/static/soundfont/acoustic_grand_piano-${format}.js`,
    '/static/soundfont/acoustic_bass-mp3/C2.mp3',
    '/static/soundfont/acoustic_bass-mp3/G2.mp3',
    '/static/soundfont/drums-mp3/C2.mp3',
    '/static/soundfont/drums-mp3/D2.mp3'
  ]
}

function shouldUseOggSoundfont(runtimeWindow: Window) {
  return /chrome|android|ie|edge|firefox|opera/i.test(runtimeWindow.navigator.userAgent)
}
