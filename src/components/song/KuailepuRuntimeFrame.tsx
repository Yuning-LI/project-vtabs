'use client'

import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'

type KuailepuRuntimeFrameProps = {
  songId: string
  title: string
  frameSrc: string
  loadingId: string
  panelClassName?: string
  panelStyle?: CSSProperties
  iframeClassName?: string
  iframeStyle?: CSSProperties
  overlayClassName?: string
  initialHeight?: number
  fitHeight?: number
  fitTopPadding?: number
  fitCropTop?: number
  fitCropBottom?: number
  runtimeTextHideRules?: RuntimeTextHideRule[]
  runtimeMaskRects?: RuntimeMaskRect[]
}

type RuntimeTextHideRule = {
  match: string
  mode?: 'contains' | 'exact'
  hideNextNumericSibling?: boolean
}

type RuntimeMaskRect = {
  x: number
  y: number
  width: number
  height: number
  fill?: string
  opacity?: number
}

/**
 * 这个 client 组件只负责 iframe 生命周期：
 * - 等待快乐谱 runtime 真正画出谱面
 * - 监听 runtime bridge 发回的高度
 * - 在首刷和站内跳转两条路径下都正确移除 loading
 *
 * 之所以从页面壳里拆出来，是因为 server component 内联脚本在
 * Next App Router 的客户端跳转场景下不够稳定，容易出现“谱面已渲染，
 * loading 还停留在页面上”的假死体验。
 */
export default function KuailepuRuntimeFrame({
  songId,
  title,
  frameSrc,
  loadingId,
  panelClassName,
  panelStyle,
  iframeClassName,
  iframeStyle,
  overlayClassName,
  initialHeight = 900,
  fitHeight,
  fitTopPadding = 0,
  fitCropTop = 0,
  fitCropBottom = 0,
  runtimeTextHideRules,
  runtimeMaskRects
}: KuailepuRuntimeFrameProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const previousFrameSrcRef = useRef(frameSrc)
  const previousSongIdRef = useRef(songId)
  const [isLoading, setIsLoading] = useState(true)
  const [frameHeight, setFrameHeight] = useState(initialHeight)
  const [frameElementSrc, setFrameElementSrc] = useState(frameSrc)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) {
      return
    }

    setIsLoading(true)
    setFrameHeight(initialHeight)

    let destroyed = false
    let resizeObserver: ResizeObserver | null = null
    let mutationObserver: MutationObserver | null = null
    let sheetPollTimer: number | null = null
    const timeoutIds: number[] = []

    function hideLoading() {
      if (destroyed) {
        return
      }
      setIsLoading(false)
      if (sheetPollTimer !== null) {
        window.clearInterval(sheetPollTimer)
        sheetPollTimer = null
      }
    }

    function hasRenderedSheet() {
      try {
        const currentFrame = frameRef.current
        const doc = currentFrame?.contentDocument
        if (!doc) {
          return false
        }
        return Boolean(doc.querySelector('#sheet svg, #sheet .sheet-svg'))
      } catch {
        return false
      }
    }

    function measureFrameContentHeight() {
      try {
        const currentFrame = frameRef.current
        const doc = currentFrame?.contentDocument
        const body = doc?.body
        const html = doc?.documentElement
        if (!body || !html) {
          return null
        }

        const bodyTop = body.getBoundingClientRect().top
        let measuredBottom = 0
        ;['#sheet', '#sheet .sheet-svg'].forEach(selector => {
          const nodes = doc.querySelectorAll(selector)
          nodes.forEach(node => {
            if (!('getBoundingClientRect' in node)) {
              return
            }
            const rect = node.getBoundingClientRect()
            if (rect.height <= 0) {
              return
            }
            measuredBottom = Math.max(measuredBottom, rect.bottom - bodyTop, rect.height)
          })
        })

        const fallbackHeight = Math.max(
          body.scrollHeight || 0,
          html.scrollHeight || 0,
          body.offsetHeight || 0,
          html.offsetHeight || 0
        )

        /**
         * 这里刻意与 iframe 内 runtime bridge 的测高补偿保持一致。
         *
         * 之前宿主侧用 `+2`，而 runtime bridge 用 `+1`。
         * 当两边都持续参与测高同步时，这 1px 差异会把 iframe 高度推到
         * `N+1 <-> N` 的来回切换，进而带着下方 SEO 文案一起轻微抖动。
         */
        return (measuredBottom > 0 ? measuredBottom : fallbackHeight) + 1
      } catch {
        return null
      }
    }

    function normalizeRuntimeText(value: string | null | undefined) {
      return (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
    }

    function hideRuntimeTextElement(element: Element | null) {
      if (!element) {
        return
      }

      const svgGroup = typeof element.closest === 'function' ? element.closest('g') : null
      element.setAttribute('display', 'none')
      element.setAttribute('visibility', 'hidden')
      element.setAttribute('opacity', '0')
      element.setAttribute('fill-opacity', '0')
      if ('style' in element) {
        const styleTarget = element as HTMLElement | SVGElement
        styleTarget.style.display = 'none'
        styleTarget.style.visibility = 'hidden'
        styleTarget.style.opacity = '0'
      }
      if (svgGroup) {
        svgGroup.setAttribute('display', 'none')
        svgGroup.setAttribute('visibility', 'hidden')
        svgGroup.setAttribute('opacity', '0')
        if ('style' in svgGroup) {
          const groupStyleTarget = svgGroup as SVGElement
          groupStyleTarget.style.display = 'none'
          groupStyleTarget.style.visibility = 'hidden'
          groupStyleTarget.style.opacity = '0'
        }
      }
    }

    function applyRuntimeTextHides() {
      if (!runtimeTextHideRules?.length) {
        return
      }

      try {
        const currentFrame = frameRef.current
        const doc = currentFrame?.contentDocument
        if (!doc) {
          return
        }

        const candidates = Array.from(doc.querySelectorAll('text, tspan, div, span, p')).filter(
          candidate => candidate.tagName.toLowerCase() === 'text' || candidate.childElementCount === 0
        )
        runtimeTextHideRules.forEach(rule => {
          const expected = normalizeRuntimeText(rule.match)
          candidates.forEach(candidate => {
            const text = normalizeRuntimeText(candidate.textContent)
            if (!text) {
              return
            }

            const isMatch =
              rule.mode === 'exact' ? text === expected : text.includes(expected)
            if (!isMatch) {
              return
            }

            hideRuntimeTextElement(candidate)
            if (!rule.hideNextNumericSibling) {
              return
            }

            const nextTextElement = candidate.nextElementSibling
            const nextText = normalizeRuntimeText(nextTextElement?.textContent)
            if (/^\d+$/.test(nextText)) {
              hideRuntimeTextElement(nextTextElement)
            }
          })
        })
      } catch {
        return
      }
    }

    function applyRuntimeMaskRects() {
      if (!runtimeMaskRects?.length) {
        return
      }

      try {
        const currentFrame = frameRef.current
        const doc = currentFrame?.contentDocument
        if (!doc) {
          return
        }

        const svg = doc.querySelector('#sheet svg, #sheet .sheet-svg')
        if (!svg || !('querySelectorAll' in svg)) {
          return
        }

        svg.querySelectorAll('[data-vtabs-runtime-mask]').forEach(node => node.remove())

        runtimeMaskRects.forEach(rect => {
          const mask = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
          mask.setAttribute('data-vtabs-runtime-mask', '1')
          mask.setAttribute('x', String(rect.x))
          mask.setAttribute('y', String(rect.y))
          mask.setAttribute('width', String(rect.width))
          mask.setAttribute('height', String(rect.height))
          mask.setAttribute('fill', rect.fill ?? '#ffffff')
          mask.setAttribute('fill-opacity', String(rect.opacity ?? 0.99))
          svg.appendChild(mask)
        })
      } catch {
        return
      }
    }

    function applyFrameHeight(height: number | null) {
      const currentFrame = frameRef.current
      if (!Number.isFinite(height) || !height || height <= 200) {
        return
      }
      if (!currentFrame) {
        return
      }
      const nextHeight = Math.ceil(height)
      const currentHeight = Number.parseInt(currentFrame.style.height || '', 10)

      /**
       * runtime 首次稳定出谱后，忽略 1px 级高度回摆。
       *
       * 原因：
       * - 宿主与 iframe 内 bridge 都会参与测高
       * - 浏览器对子像素 / 字体 / SVG 边界的取整可能偶发出现 `N` 与 `N+1`
       * - 如果每次都把这 1px 写回给 iframe，会触发 resize -> redraw -> remeasure 的回路
       *
       * 这里仅在“谱面已渲染”后收敛微小波动，不拦截真正的高度变化。
       */
      if (
        Number.isFinite(currentHeight) &&
        currentHeight > 0 &&
        Math.abs(currentHeight - nextHeight) <= 1 &&
        hasRenderedSheet()
      ) {
        if (height > 300) {
          hideLoading()
        }
        return
      }

      if (currentHeight === nextHeight) {
        if (height > 300) {
          hideLoading()
        }
        return
      }

      currentFrame.style.height = `${nextHeight}px`
      setFrameHeight(previousHeight => (previousHeight === nextHeight ? previousHeight : nextHeight))
      if (height > 300) {
        hideLoading()
      }
    }

    function syncFrameHeight() {
      applyRuntimeTextHides()
      applyRuntimeMaskRects()
      if (hasRenderedSheet()) {
        hideLoading()
      }
      applyFrameHeight(measureFrameContentHeight())
    }

    function scheduleSyncBursts() {
      syncFrameHeight()
      // runtime 内部可能在多个异步节点后才把 SVG 与歌词补齐，分段重测
      // 比只等一次 load 事件更稳，尤其是慢网和站内跳转场景。
      ;[120, 360, 900, 1800].forEach(delay => {
        timeoutIds.push(window.setTimeout(syncFrameHeight, delay))
      })
    }

    function startSheetReadyPolling() {
      if (sheetPollTimer !== null) {
        window.clearInterval(sheetPollTimer)
      }
      sheetPollTimer = window.setInterval(() => {
        if (hasRenderedSheet()) {
          hideLoading()
        }
      }, 120)
    }

    function installFrameObservers() {
      try {
        const currentFrame = frameRef.current
        const doc = currentFrame?.contentDocument
        if (!doc || !window.ResizeObserver) {
          return
        }

        resizeObserver?.disconnect()
        resizeObserver = new ResizeObserver(() => {
          timeoutIds.push(window.setTimeout(syncFrameHeight, 30))
        })

        mutationObserver?.disconnect()
        mutationObserver = new MutationObserver(() => {
          timeoutIds.push(window.setTimeout(syncFrameHeight, 30))
        })

        if (doc.body) {
          resizeObserver.observe(doc.body)
          mutationObserver.observe(doc.body, {
            childList: true,
            subtree: true,
            characterData: true
          })
        }
        if (doc.documentElement) {
          resizeObserver.observe(doc.documentElement)
        }
      } catch {
        return
      }
    }

    function onLoad() {
      installFrameObservers()
      startSheetReadyPolling()
      scheduleSyncBursts()
      timeoutIds.push(window.setTimeout(hideLoading, 4000))
    }

    function onMessage(event: MessageEvent) {
      const data = event.data
      if (!data || typeof data !== 'object') {
        return
      }
      if (data.type !== 'kuailepu-runtime-size' || data.songId !== songId) {
        return
      }
      applyFrameHeight(Number(data.height))
    }

    frame.addEventListener('load', onLoad)
    window.addEventListener('message', onMessage)
    window.addEventListener('resize', scheduleSyncBursts)
    startSheetReadyPolling()
    scheduleSyncBursts()

    return () => {
      destroyed = true
      frame.removeEventListener('load', onLoad)
      window.removeEventListener('message', onMessage)
      window.removeEventListener('resize', scheduleSyncBursts)
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
      if (sheetPollTimer !== null) {
        window.clearInterval(sheetPollTimer)
      }
      timeoutIds.forEach(timeoutId => window.clearTimeout(timeoutId))
    }
  }, [frameSrc, initialHeight, runtimeMaskRects, runtimeTextHideRules, songId])

  useEffect(() => {
    const previousSongId = previousSongIdRef.current
    if (previousSongId !== songId) {
      previousSongIdRef.current = songId
      previousFrameSrcRef.current = frameSrc
      setFrameElementSrc(frameSrc)
      setIsLoading(true)
      setFrameHeight(initialHeight)
      return
    }

    const previousFrameSrc = previousFrameSrcRef.current
    if (previousFrameSrc === frameSrc) {
      return
    }

    previousFrameSrcRef.current = frameSrc
    setIsLoading(true)
    setFrameHeight(initialHeight)

    if (typeof window === 'undefined') {
      setFrameElementSrc(frameSrc)
      return
    }

    const frame = frameRef.current
    if (!frame) {
      setFrameElementSrc(frameSrc)
      return
    }

    const nextSrc = new URL(frameSrc, window.location.origin).toString()
    const currentLocation = frame.contentWindow?.location?.href
    if (!currentLocation || currentLocation === 'about:blank') {
      setFrameElementSrc(frameSrc)
      return
    }

    try {
      frame.contentWindow.location.replace(nextSrc)
    } catch {
      setFrameElementSrc(frameSrc)
    }
  }, [frameSrc, initialHeight, songId])

  const effectiveSourceHeight = Math.max(1, frameHeight - fitCropTop - fitCropBottom)
  const availableFitHeight = fitHeight ? Math.max(0, fitHeight - fitTopPadding) : null
  const fittedScale =
    availableFitHeight && effectiveSourceHeight > 0
      ? Math.min(1, Number((availableFitHeight / effectiveSourceHeight).toFixed(4)))
      : 1
  const fittedWidth = fittedScale < 1 ? `${100 / fittedScale}%` : '100%'
  const cropOffset = fitCropTop > 0 ? Number((fitCropTop * fittedScale).toFixed(2)) : 0
  const bottomCropOffset =
    fitCropBottom > 0 ? Number((fitCropBottom * fittedScale).toFixed(2)) : 0

  return (
    <section
      className={panelClassName ?? 'page-warm-panel relative overflow-hidden'}
      style={panelStyle}
    >
      {isLoading ? (
        <div
          id={loadingId}
          data-runtime-loading="true"
          className={
            overlayClassName
              ? `pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center transition-opacity duration-300 ${overlayClassName}`
              : 'pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[rgba(255,251,245,0.94)] px-6 text-center transition-opacity duration-300'
          }
        >
          <div className="max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
              Loading Sheet
            </p>
            <p className="mt-3 text-sm leading-7 text-stone-700">
              The fingering chart and sheet music are loading. This can take a little longer on slower networks.
            </p>
          </div>
        </div>
      ) : null}
      <iframe
        ref={frameRef}
        title={`${title} Kuailepu runtime`}
        src={frameElementSrc}
        scrolling="no"
        className={iframeClassName ?? 'block w-full border-0'}
        style={{
          marginTop:
            fitTopPadding > 0 || cropOffset > 0
              ? `${Number((fitTopPadding - cropOffset).toFixed(2))}px`
              : undefined,
          marginBottom: bottomCropOffset > 0 ? `${-bottomCropOffset}px` : undefined,
          height: `${frameHeight}px`,
          width: fittedWidth,
          transform: fittedScale < 1 ? `scale(${fittedScale})` : undefined,
          transformOrigin: fittedScale < 1 ? 'top left' : undefined,
          ...iframeStyle
        }}
      />
    </section>
  )
}
