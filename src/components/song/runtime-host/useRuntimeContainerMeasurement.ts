'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PUBLIC_RUNTIME_SIZE_MESSAGE
} from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'
import {
  canUseBrowserDOM,
  getBrowserPerformanceNow,
  getBrowserWindow
} from '@/lib/runtime-core/client/browserEnvironment'
import { useBrowserLayoutEffect } from '@/lib/runtime-core/client/useBrowserLayoutEffect'
import { dispatchContainerRuntimeHostMessage } from './containerRuntimeTransport'
import {
  hasRenderedRuntimeSheet,
  hasRuntimeContentElementStarted,
  measureRuntimeContainerContentHeight
} from './measurement/runtimeMeasurementHelpers'

export type RuntimeContainerMeasurementSnapshot = {
  height: number
  hasRenderedSheet: boolean
  hasRuntimeContent: boolean
  measuredAt: number | null
}

type UseRuntimeContainerMeasurementOptions = {
  songId: string
  rootElement: HTMLElement | null
  runtimeRoot: HTMLElement | null
  enabled: boolean
  isRuntimeReady?: boolean
  initialHeight?: number
  onLoadingChange?: (isLoading: boolean) => void
  onMeasurementChange?: (snapshot: RuntimeContainerMeasurementSnapshot) => void
}

export function useRuntimeContainerMeasurement({
  songId,
  rootElement,
  runtimeRoot,
  enabled,
  isRuntimeReady = false,
  initialHeight = 900,
  onLoadingChange,
  onMeasurementChange
}: UseRuntimeContainerMeasurementOptions) {
  const [height, setHeight] = useState(initialHeight)
  const [isLoading, setIsLoading] = useState(true)
  const [snapshot, setSnapshot] = useState<RuntimeContainerMeasurementSnapshot>({
    height: initialHeight,
    hasRenderedSheet: false,
    hasRuntimeContent: false,
    measuredAt: null
  })
  const onLoadingChangeRef = useRef(onLoadingChange)
  const onMeasurementChangeRef = useRef(onMeasurementChange)
  const lastPublishedHeightRef = useRef(initialHeight)
  const lastSnapshotRef = useRef(snapshot)

  useEffect(() => {
    onLoadingChangeRef.current = onLoadingChange
  }, [onLoadingChange])

  useEffect(() => {
    onMeasurementChangeRef.current = onMeasurementChange
  }, [onMeasurementChange])

  const updateLoading = useCallback((nextLoading: boolean) => {
    setIsLoading(current => {
      if (current === nextLoading) {
        return current
      }
      return nextLoading
    })
    onLoadingChangeRef.current?.(nextLoading)
  }, [])

  useEffect(() => {
    setHeight(initialHeight)
    lastPublishedHeightRef.current = initialHeight
    const initialSnapshot = {
      height: initialHeight,
      hasRenderedSheet: false,
      hasRuntimeContent: false,
      measuredAt: null
    }
    lastSnapshotRef.current = initialSnapshot
    setSnapshot(initialSnapshot)
    onMeasurementChangeRef.current?.(initialSnapshot)
    updateLoading(true)
  }, [enabled, initialHeight, rootElement, runtimeRoot, songId, updateLoading])
  useBrowserLayoutEffect(() => {
    const runtimeWindow = getBrowserWindow()
    if (!enabled || !rootElement || !runtimeRoot || !runtimeWindow || !canUseBrowserDOM()) {
      return
    }
    const browserWindow = runtimeWindow

    const measuredRoot = runtimeRoot
    let destroyed = false
    let resizeObserver: ResizeObserver | null = null
    let mutationObserver: MutationObserver | null = null
    let pendingMeasureFrame: number | null = null
    const observedResizeNodes = new Set<Element>()
    const timeoutIds: number[] = []

    function hideLoading() {
      if (destroyed) {
        return
      }
      updateLoading(false)
    }

    function hideLoadingIfRuntimeReady() {
      if (isRuntimeReady && hasRuntimeContentElementStarted(measuredRoot)) {
        hideLoading()
      }
    }

    function publishMeasuredHeight(nextHeight: number) {
      if (Math.abs(lastPublishedHeightRef.current - nextHeight) <= 1) {
        return
      }

      lastPublishedHeightRef.current = nextHeight
      dispatchContainerRuntimeHostMessage({
        type: PUBLIC_RUNTIME_SIZE_MESSAGE,
        songId,
        height: nextHeight
      })
    }

    function updateMeasuredHeight() {
      if (destroyed) {
        return
      }

      hideLoadingIfRuntimeReady()
      const measured = measureRuntimeContainerContentHeight(measuredRoot)
      const hasRendered = hasRenderedRuntimeSheet(measuredRoot)
      const hasRuntimeContent = hasRuntimeContentElementStarted(measuredRoot)

      if (isRuntimeReady && hasRendered) {
        hideLoading()
      }

      if (!measured) {
        return
      }

      const nextSnapshot = {
        height: measured,
        hasRenderedSheet: hasRendered,
        hasRuntimeContent,
        measuredAt: getBrowserPerformanceNow()
      }
      const previousSnapshot = lastSnapshotRef.current
      const hasMeaningfulChange =
        Math.abs(previousSnapshot.height - nextSnapshot.height) > 1 ||
        previousSnapshot.hasRenderedSheet !== nextSnapshot.hasRenderedSheet ||
        previousSnapshot.hasRuntimeContent !== nextSnapshot.hasRuntimeContent
      if (hasMeaningfulChange) {
        lastSnapshotRef.current = nextSnapshot
        setSnapshot(nextSnapshot)
        onMeasurementChangeRef.current?.(nextSnapshot)
      }
      publishMeasuredHeight(measured)
      setHeight(current => (Math.abs(current - measured) > 1 ? measured : current))
    }

    function scheduleMeasuredHeightUpdate() {
      if (destroyed || pendingMeasureFrame !== null) {
        return
      }

      pendingMeasureFrame = browserWindow.requestAnimationFrame(() => {
        pendingMeasureFrame = null
        updateMeasuredHeight()
        observeCurrentRuntimeNodes()
      })
    }

    function observeCurrentRuntimeNodes() {
      if (!resizeObserver) {
        return
      }

      const candidates = [
        measuredRoot,
        measuredRoot.querySelector('[data-public-runtime-dom-mount="true"]'),
        measuredRoot.querySelector('#sheet'),
        measuredRoot.querySelector('#sheet svg, #sheet .sheet-svg'),
        measuredRoot.querySelector('#metronome-modal'),
        measuredRoot.querySelector('#play-modal')
      ].filter((node): node is Element => node instanceof Element)

      candidates.forEach(node => {
        if (observedResizeNodes.has(node)) {
          return
        }
        observedResizeNodes.add(node)
        resizeObserver?.observe(node)
      })
    }

    mutationObserver = new MutationObserver(() => {
      scheduleMeasuredHeightUpdate()
    })
    mutationObserver.observe(measuredRoot, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-public-runtime-container-panel'],
      characterData: false
    })

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        scheduleMeasuredHeightUpdate()
      })
      observeCurrentRuntimeNodes()
    }

    timeoutIds.push(browserWindow.setTimeout(scheduleMeasuredHeightUpdate, 0))
    timeoutIds.push(browserWindow.setTimeout(scheduleMeasuredHeightUpdate, 120))
    timeoutIds.push(browserWindow.setTimeout(scheduleMeasuredHeightUpdate, 350))
    timeoutIds.push(browserWindow.setTimeout(scheduleMeasuredHeightUpdate, 800))
    timeoutIds.push(browserWindow.setTimeout(scheduleMeasuredHeightUpdate, 1500))
    timeoutIds.push(browserWindow.setTimeout(scheduleMeasuredHeightUpdate, 2600))

    const loadingFallbackTimer = browserWindow.setInterval(() => {
      if (destroyed) {
        return
      }

      scheduleMeasuredHeightUpdate()
      if (
        isRuntimeReady &&
        (hasRenderedRuntimeSheet(measuredRoot) || hasRuntimeContentElementStarted(measuredRoot))
      ) {
        hideLoading()
        browserWindow.clearInterval(loadingFallbackTimer)
      }
    }, 500)

    return () => {
      destroyed = true
      mutationObserver?.disconnect()
      resizeObserver?.disconnect()
      browserWindow.clearInterval(loadingFallbackTimer)
      if (pendingMeasureFrame !== null) {
        browserWindow.cancelAnimationFrame(pendingMeasureFrame)
      }
      timeoutIds.forEach(timeoutId => browserWindow.clearTimeout(timeoutId))
      observedResizeNodes.clear()
    }
  }, [enabled, isRuntimeReady, rootElement, runtimeRoot, songId, updateLoading])

  return {
    height,
    isLoading,
    snapshot
  }
}
