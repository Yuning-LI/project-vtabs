'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as abcjs from 'abcjs'
import { useFontReady } from '@/lib/hooks/useFontReady'
import { useRenderLock } from '@/lib/hooks/useRenderLock'
import Skeleton from '@/components/ui/Skeleton'
import { extractPayload } from '@/lib/abc/parser'
import { injectSpacing } from '@/lib/abc/injectSpacing'
import {
  DICT,
  drawOcarina12,
  MIDI_TO_NAME
} from '@/components/InstrumentDicts/ocarina12'
import { NotePayload, NotePosition } from '@/lib/types'

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

  const injectFingering = useCallback(
    (svg: SVGSVGElement, payload: NotePayload[]) => {
      const systems = svg.querySelectorAll('.abcjs-system')
      if (!systems.length) return

      const positions: NotePosition[] = []

      systems.forEach((sys, sysIdx) => {
        const sysEl = sys as SVGGraphicsElement
        const sysBBox = sysEl.getBBox()
        const systemBottomY = sysBBox.y + sysBBox.height
        const notes = sys.querySelectorAll('.abcjs-note')
        notes.forEach(note => {
          const noteEl = note as SVGGraphicsElement
          const noteBBox = noteEl.getBBox()
          const centerX = noteBBox.x + noteBBox.width / 2
          positions.push({
            systemIndex: sysIdx,
            x: centerX,
            systemBottomY
          })
        })
      })

      payload.forEach((item, idx) => {
        if (item.skip) return
        const pos = positions[idx]
        if (!pos) {
          console.warn(`位置缺失，索引 ${idx}`)
          return
        }

        const state = DICT[item.midi]
        if (!state) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`字典缺失 MIDI: ${item.midi}`)
          }
          return
        }

        const { element: fingerG } = drawOcarina12(state)
        const tx = pos.x - 3000
        const ty = pos.systemBottomY - 500
        fingerG.setAttribute('transform', `translate(${tx}, ${ty})`)

        const targetSys = systems[pos.systemIndex]
        targetSys.appendChild(fingerG)

        const text = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'text'
        )
        const name = MIDI_TO_NAME[item.midi]
        text.textContent = name ? `${name.letter}${name.octave}` : '?'
        text.setAttribute('x', pos.x.toString())
        text.setAttribute('y', (pos.systemBottomY + 30).toString())
        text.setAttribute('font-size', '20')
        text.setAttribute('fill', '#3E2723')
        text.setAttribute('text-anchor', 'middle')
        text.setAttribute('font-weight', 'bold')
        targetSys.appendChild(text)
      })
    },
    []
  )

  const handleFallback = useCallback(() => {
    setIsTimeout(true)
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
        const modifiedAbc = injectSpacing(abcString, instrumentId)
        container.innerHTML = ''
        abcjs.renderAbc(container, modifiedAbc, {
          responsive: 'resize',
          add_classes: true,
          staffwidth: 600,
          paddingtop: 20,
          paddingbottom: 30
        })

        const payload = extractPayload(abcString)
        const svg = container.querySelector('svg')
        if (!svg) {
          throw new Error('SVG not found')
        }

        injectFingering(svg, payload)
        finishRender()
        onRenderComplete?.()
      } catch (err) {
        console.error('渲染错误:', err)
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
    instrumentId,
    startRender,
    finishRender,
    injectFingering,
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
    </div>
  )
}
