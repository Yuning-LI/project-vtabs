'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

type PublicRuntimeFrameProps = {
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
  onFrameElementChange?: (frame: HTMLIFrameElement | null) => void
  onFrameLoad?: () => void
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
 * - 等 iframe runtime 里出现第一个谱面内容元素后移除 loading
 * - 监听 runtime bridge 发回的高度
 * - 在首刷和站内跳转两条路径下都正确移除 loading
 *
 * 之所以从页面壳里拆出来，是因为 server component 内联脚本在
 * Next App Router 的客户端跳转场景下不够稳定，容易出现“谱面已渲染，
 * loading 还停留在页面上”的假死体验。
 */
export default function PublicRuntimeFrame({
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
  runtimeMaskRects,
  onFrameElementChange,
  onFrameLoad
}: PublicRuntimeFrameProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const previousFrameSrcRef = useRef(frameSrc)
  const previousSongIdRef = useRef(songId)
  const [isLoading, setIsLoading] = useState(true)
  const [frameHeight, setFrameHeight] = useState(initialHeight)
  const [frameElementSrc, setFrameElementSrc] = useState(frameSrc)
  const assignFrameRef = useCallback(
    (node: HTMLIFrameElement | null) => {
      frameRef.current = node
      onFrameElementChange?.(node)
    },
    [onFrameElementChange]
  )

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
    let observedDocument: Document | null = null
    let sheetPollTimer: number | null = null
    let sheetPollFrame: number | null = null
    const timeoutIds: number[] = []

    function hideLoading() {
      if (destroyed) {
        return
      }
      const loadingElement = loadingId ? document.getElementById(loadingId) : null
      if (loadingElement) {
        loadingElement.hidden = true
        loadingElement.style.display = 'none'
      }
      setIsLoading(false)
      if (sheetPollTimer !== null) {
        window.clearInterval(sheetPollTimer)
        sheetPollTimer = null
      }
      if (sheetPollFrame !== null) {
        window.cancelAnimationFrame(sheetPollFrame)
        sheetPollFrame = null
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

    function hasRuntimeContentElementStarted() {
      try {
        const currentFrame = frameRef.current
        const doc = currentFrame?.contentDocument
        if (!doc) {
          return false
        }

        const sheet = doc.querySelector('#sheet')
        if (!sheet) {
          return false
        }

        return Boolean(
          sheet.querySelector('canvas, img, text, tspan, use, path, line, rect, circle, ellipse')
        )
      } catch {
        return false
      }
    }

    function hideLoadingIfRuntimeContentReady() {
      if (hasRuntimeContentElementStarted()) {
        hideLoading()
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
          candidate =>
            candidate.tagName.toLowerCase() === 'text' || candidate.childElementCount === 0
        )
        runtimeTextHideRules.forEach(rule => {
          const expected = normalizeRuntimeText(rule.match)
          candidates.forEach(candidate => {
            const text = normalizeRuntimeText(candidate.textContent)
            const matched =
              rule.mode === 'exact' ? text === expected : text.includes(expected)
            if (!matched) {
              return
            }

            hideRuntimeTextElement(candidate)
            if (!rule.hideNextNumericSibling) {
              return
            }

            const parent = candidate.parentElement
            if (!parent) {
              return
            }

            const siblings = Array.from(parent.children)
            const index = siblings.indexOf(candidate)
            if (index < 0) {
              return
            }

            const nextSibling = siblings[index + 1] ?? null
            const nextText = normalizeRuntimeText(nextSibling?.textContent)
            if (/^\d+$/.test(nextText)) {
              hideRuntimeTextElement(nextSibling)
            }
          })
        })
      } catch {
        // Ignore runtime DOM quirks from the integrated sheet renderer.
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
        if (!(svg instanceof SVGSVGElement)) {
          return
        }

        const existingLayer = svg.querySelector('[data-vtabs-runtime-mask-layer="true"]')
        existingLayer?.parentNode?.removeChild(existingLayer)

        const maskLayer = doc.createElementNS('http://www.w3.org/2000/svg', 'g')
        maskLayer.setAttribute('data-vtabs-runtime-mask-layer', 'true')
        maskLayer.setAttribute('pointer-events', 'none')

        runtimeMaskRects.forEach(rectConfig => {
          const rect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
          rect.setAttribute('x', String(rectConfig.x))
          rect.setAttribute('y', String(rectConfig.y))
          rect.setAttribute('width', String(rectConfig.width))
          rect.setAttribute('height', String(rectConfig.height))
          rect.setAttribute('fill', rectConfig.fill ?? '#ffffff')
          if (typeof rectConfig.opacity === 'number') {
            rect.setAttribute('opacity', String(rectConfig.opacity))
          }
          maskLayer.appendChild(rect)
        })

        svg.appendChild(maskLayer)
      } catch {
        // Ignore runtime DOM quirks from the integrated sheet renderer.
      }
    }

    function applyFitHeightCrop() {
      if (!fitHeight || fitHeight <= 0) {
        return false
      }

      try {
        const currentFrame = frameRef.current
        const doc = currentFrame?.contentDocument
        const html = doc?.documentElement
        const body = doc?.body
        if (!doc || !html || !body) {
          return false
        }

        const svg = doc.querySelector('#sheet svg, #sheet .sheet-svg')
        if (!(svg instanceof SVGSVGElement)) {
          return false
        }

        const viewBox = svg.viewBox?.baseVal
        const viewBoxX =
          viewBox && Number.isFinite(viewBox.x) ? viewBox.x : Number(svg.getAttribute('x') || 0)
        const viewBoxY =
          viewBox && Number.isFinite(viewBox.y) ? viewBox.y : Number(svg.getAttribute('y') || 0)
        const fallbackWidth =
          Number(svg.getAttribute('width') || 0) || svg.getBoundingClientRect().width || 0
        const fallbackHeight =
          Number(svg.getAttribute('height') || 0) || svg.getBoundingClientRect().height || 0
        const viewBoxWidth =
          viewBox && Number.isFinite(viewBox.width) && viewBox.width > 0
            ? viewBox.width
            : fallbackWidth
        const sourceHeight =
          viewBox && Number.isFinite(viewBox.height) && viewBox.height > 0
            ? viewBox.height
            : fallbackHeight
        if (!viewBoxWidth || !sourceHeight) {
          return false
        }

        const nextHeight = Math.max(
          1,
          sourceHeight - Math.max(0, fitCropTop) - Math.max(0, fitCropBottom)
        )
        svg.setAttribute(
          'viewBox',
          `${viewBoxX} ${viewBoxY + fitCropTop} ${viewBoxWidth} ${nextHeight}`
        )

        const ratio = nextHeight / viewBoxWidth
        const targetWidth = fitHeight / ratio
        const horizontalInset = Math.max(0, (targetWidth - viewBoxWidth) / 2)
        const paddedWidth = viewBoxWidth + horizontalInset * 2
        const paddedX = viewBoxX - horizontalInset

        svg.style.display = 'block'
        svg.style.width = '100%'
        svg.style.height = `${fitHeight}px`
        svg.style.maxHeight = `${fitHeight}px`
        svg.style.margin = '0 auto'
        svg.style.background = 'transparent'
        svg.setAttribute(
          'preserveAspectRatio',
          fitTopPadding > 0 ? 'xMidYMin meet' : 'xMidYMid meet'
        )
        svg.setAttribute('viewBox', `${paddedX} ${viewBoxY + fitCropTop} ${paddedWidth} ${nextHeight}`)

        const extraTop = Math.max(0, fitTopPadding)
        if (extraTop > 0) {
          body.style.paddingTop = `${extraTop}px`
        }

        body.style.margin = '0'
        body.style.overflow = 'hidden'
        body.style.background = 'transparent'
        html.style.margin = '0'
        html.style.overflow = 'hidden'
        html.style.background = 'transparent'

        setFrameHeight(fitHeight + extraTop)
        return true
      } catch {
        return false
      }
    }

    function updateMeasuredHeight() {
      if (applyFitHeightCrop()) {
        return
      }

      const measured = measureFrameContentHeight()
      if (measured) {
        setFrameHeight(current => (Math.abs(current - measured) > 1 ? measured : current))
      }
    }

    function observeDocument(doc: Document) {
      observedDocument = doc

      mutationObserver?.disconnect()
      mutationObserver = new MutationObserver(() => {
        hideLoadingIfRuntimeContentReady()
        applyRuntimeTextHides()
        applyRuntimeMaskRects()
        updateMeasuredHeight()
      })

      mutationObserver.observe(doc.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      })

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver?.disconnect()
        resizeObserver = new ResizeObserver(() => {
          updateMeasuredHeight()
        })
        resizeObserver.observe(doc.documentElement)
        if (doc.body) {
          resizeObserver.observe(doc.body)
        }
      }

      hideLoadingIfRuntimeContentReady()
      applyRuntimeTextHides()
      applyRuntimeMaskRects()
      updateMeasuredHeight()
    }

    function bindFrameDocument() {
      if (!frame) {
        return
      }

      try {
        const doc = frame.contentDocument
        if (!doc?.documentElement) {
          return
        }

        observeDocument(doc)
      } catch {
        // Ignore cross-document timing issues while iframe is still booting.
      }
    }

    const onLoad = () => {
      onFrameLoad?.()
      bindFrameDocument()
      timeoutIds.push(window.setTimeout(bindFrameDocument, 0))
      timeoutIds.push(window.setTimeout(bindFrameDocument, 120))
      timeoutIds.push(window.setTimeout(bindFrameDocument, 350))
    }

    frame.addEventListener('load', onLoad)

    sheetPollTimer = window.setInterval(() => {
      bindFrameDocument()
      if (hasRenderedSheet()) {
        hideLoading()
        updateMeasuredHeight()
      }
    }, 180)

    const pollAnimationFrame = () => {
      if (destroyed) {
        return
      }

      bindFrameDocument()
      if (hasRenderedSheet()) {
        hideLoading()
        updateMeasuredHeight()
      }
      sheetPollFrame = window.requestAnimationFrame(pollAnimationFrame)
    }

    sheetPollFrame = window.requestAnimationFrame(pollAnimationFrame)
    bindFrameDocument()

    return () => {
      destroyed = true
      frame.removeEventListener('load', onLoad)
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
      if (sheetPollTimer !== null) {
        window.clearInterval(sheetPollTimer)
      }
      if (sheetPollFrame !== null) {
        window.cancelAnimationFrame(sheetPollFrame)
      }
      timeoutIds.forEach(timeoutId => window.clearTimeout(timeoutId))
      observedDocument = null
    }
  }, [
    fitCropBottom,
    fitCropTop,
    fitHeight,
    fitTopPadding,
    frameSrc,
    initialHeight,
    loadingId,
    onFrameLoad,
    onFrameElementChange,
    runtimeMaskRects,
    runtimeTextHideRules
  ])

  useEffect(() => {
    const frameSrcChanged = previousFrameSrcRef.current !== frameSrc
    const songChanged = previousSongIdRef.current !== songId

    if (frameSrcChanged || songChanged) {
      previousFrameSrcRef.current = frameSrc
      previousSongIdRef.current = songId
      setFrameElementSrc(frameSrc)
      setIsLoading(true)
      setFrameHeight(initialHeight)
    }
  }, [frameSrc, initialHeight, songId])

  return (
    <section
      className={
        panelClassName ??
        'page-warm-panel relative overflow-hidden'
      }
      style={panelStyle}
    >
      <iframe
        ref={assignFrameRef}
        key={songId}
        src={frameElementSrc}
        title={title}
        className={iframeClassName ?? 'block w-full border-0 bg-white'}
        style={{
          height: `${frameHeight}px`,
          ...iframeStyle
        }}
      />
      {isLoading ? (
        <div
          id={loadingId}
          data-runtime-loading="true"
          className={
            overlayClassName
              ? `pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center ${overlayClassName}`
              : 'pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center'
          }
        >
          <div className="runtime-loading-card" role="status" aria-live="polite">
            <div className="runtime-loading-notes" aria-hidden="true">
              <span>🎶</span>
              <span>♪</span>
              <span>♫</span>
            </div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-stone-800">
              Loading sheet...
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              The fingering chart is opening.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  )
}
