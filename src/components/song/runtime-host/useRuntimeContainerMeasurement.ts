'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PUBLIC_RUNTIME_SIZE_MESSAGE
} from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'
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
    setSnapshot(initialSnapshot)
    onMeasurementChangeRef.current?.(initialSnapshot)
    updateLoading(true)
  }, [enabled, initialHeight, rootElement, runtimeRoot, songId, updateLoading])

  useEffect(() => {
    if (!enabled || !rootElement || !runtimeRoot) {
      return
    }

    const measuredRoot = runtimeRoot
    let destroyed = false
    let resizeObserver: ResizeObserver | null = null
    let mutationObserver: MutationObserver | null = null
    let sheetPollTimer: number | null = null
    let sheetPollFrame: number | null = null
    let pendingMeasureFrame: number | null = null
    const observedResizeNodes = new Set<Element>()
    const timeoutIds: number[] = []

    function hideLoading() {
      if (destroyed) {
        return
      }
      updateLoading(false)
      if (sheetPollTimer !== null) {
        window.clearInterval(sheetPollTimer)
        sheetPollTimer = null
      }
      if (sheetPollFrame !== null) {
        window.cancelAnimationFrame(sheetPollFrame)
        sheetPollFrame = null
      }
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
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: PUBLIC_RUNTIME_SIZE_MESSAGE,
            songId,
            height: nextHeight
          },
          origin: window.location.origin,
          source: window
        })
      )
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
        measuredAt: performance.now()
      }
      setSnapshot(nextSnapshot)
      onMeasurementChangeRef.current?.(nextSnapshot)
      publishMeasuredHeight(measured)
      setHeight(current => (Math.abs(current - measured) > 1 ? measured : current))
    }

    function scheduleMeasuredHeightUpdate() {
      if (destroyed || pendingMeasureFrame !== null) {
        return
      }

      pendingMeasureFrame = window.requestAnimationFrame(() => {
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
      characterData: true
    })

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        scheduleMeasuredHeightUpdate()
      })
      observeCurrentRuntimeNodes()
    }

    sheetPollTimer = window.setInterval(() => {
      if (
        isRuntimeReady &&
        (hasRenderedRuntimeSheet(measuredRoot) || hasRuntimeContentElementStarted(measuredRoot))
      ) {
        hideLoading()
      }
      scheduleMeasuredHeightUpdate()
    }, 180)

    const pollAnimationFrame = () => {
      if (destroyed) {
        return
      }

      if (
        isRuntimeReady &&
        (hasRenderedRuntimeSheet(measuredRoot) || hasRuntimeContentElementStarted(measuredRoot))
      ) {
        hideLoading()
        scheduleMeasuredHeightUpdate()
        return
      }
      scheduleMeasuredHeightUpdate()
      sheetPollFrame = window.requestAnimationFrame(pollAnimationFrame)
    }

    sheetPollFrame = window.requestAnimationFrame(pollAnimationFrame)
    timeoutIds.push(window.setTimeout(scheduleMeasuredHeightUpdate, 0))
    timeoutIds.push(window.setTimeout(scheduleMeasuredHeightUpdate, 120))
    timeoutIds.push(window.setTimeout(scheduleMeasuredHeightUpdate, 350))

    return () => {
      destroyed = true
      mutationObserver?.disconnect()
      resizeObserver?.disconnect()
      if (sheetPollTimer !== null) {
        window.clearInterval(sheetPollTimer)
      }
      if (sheetPollFrame !== null) {
        window.cancelAnimationFrame(sheetPollFrame)
      }
      if (pendingMeasureFrame !== null) {
        window.cancelAnimationFrame(pendingMeasureFrame)
      }
      timeoutIds.forEach(timeoutId => window.clearTimeout(timeoutId))
      observedResizeNodes.clear()
    }
  }, [enabled, isRuntimeReady, rootElement, runtimeRoot, songId, updateLoading])

  return {
    height,
    isLoading,
    snapshot
  }
}
