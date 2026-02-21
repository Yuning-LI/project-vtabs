'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as abcjs from 'abcjs'
import { useFontReady } from '@/lib/hooks/useFontReady'
import { useRenderLock } from '@/lib/hooks/useRenderLock'
import Skeleton from '@/components/ui/Skeleton'

type AbcRendererProps = {
  abcString: string
  instrumentId: string
  onRenderStart?: () => void
  onRenderComplete?: () => void
}

export default function AbcRenderer({
  abcString,
  instrumentId,
  onRenderStart,
  onRenderComplete
}: AbcRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasError, setHasError] = useState(false)
  const [isTimeout, setIsTimeout] = useState(false)
  const fontReady = useFontReady(3000)
  const { startRender, finishRender } = useRenderLock(5000)

  const handleFallback = useCallback(() => {
    setIsTimeout(true)
    setHasError(false)
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }
    onRenderComplete?.()
  }, [onRenderComplete])

  useEffect(() => {
    if (!fontReady) return
    const container = containerRef.current

    setHasError(false)
    setIsTimeout(false)
    onRenderStart?.()
    startRender(handleFallback)

    if (container && abcString) {
      try {
        container.innerHTML = ''
        abcjs.renderAbc(container, abcString, {
          responsive: 'resize',
          add_classes: true,
          staffwidth: 600,
          paddingtop: 20,
          paddingbottom: 30
        })
        finishRender()
        onRenderComplete?.()
      } catch (err) {
        console.error('abcjs 渲染错误:', err)
        setHasError(true)
        finishRender()
        onRenderComplete?.()
      }
    }

    return () => {
      finishRender()
      if (container) {
        container.innerHTML = ''
      }
    }
  }, [
    abcString,
    fontReady,
    startRender,
    finishRender,
    handleFallback,
    onRenderStart,
    onRenderComplete
  ])

  if (!fontReady) {
    return <Skeleton />
  }

  if (hasError) {
    return (
      <div className="p-8 text-center text-wood-dark bg-red-50 rounded-lg">
        ❌ 乐谱加载失败，请稍后重试。
      </div>
    )
  }

  return (
    <div className="relative">
      {isTimeout && (
        <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
          加载超时，已显示基础谱面
        </div>
      )}
      <div ref={containerRef} className="abc-paper"></div>
      <span className="hidden">{instrumentId}</span>
    </div>
  )
}
