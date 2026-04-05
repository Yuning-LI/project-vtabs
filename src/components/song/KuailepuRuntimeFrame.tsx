'use client'

import { useEffect, useRef, useState } from 'react'

type KuailepuRuntimeFrameProps = {
  songId: string
  title: string
  frameSrc: string
  loadingId: string
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
  loadingId
}: KuailepuRuntimeFrameProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) {
      return
    }

    setIsLoading(true)

    let destroyed = false
    let resizeObserver: ResizeObserver | null = null
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

        return (measuredBottom > 0 ? measuredBottom : fallbackHeight) + 2
      } catch {
        return null
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
      currentFrame.style.height = `${Math.ceil(height)}px`
      if (height > 300) {
        hideLoading()
      }
    }

    function syncFrameHeight() {
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

        if (doc.body) {
          resizeObserver.observe(doc.body)
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
      if (sheetPollTimer !== null) {
        window.clearInterval(sheetPollTimer)
      }
      timeoutIds.forEach(timeoutId => window.clearTimeout(timeoutId))
    }
  }, [frameSrc, songId])

  return (
    <section className="page-warm-panel relative overflow-hidden">
      {isLoading ? (
        <div
          id={loadingId}
          data-runtime-loading="true"
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[rgba(255,251,245,0.94)] px-6 text-center transition-opacity duration-300"
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
        src={frameSrc}
        scrolling="no"
        className="block w-full border-0"
        style={{ height: '900px' }}
      />
    </section>
  )
}
