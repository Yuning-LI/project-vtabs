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
      console.log('===== injectFingering 开始 =====')

      if (!svg) {
        console.error('❌ svg 参数为空')
        return
      }
      console.log('✅ svg 存在')

      const allElements = svg.querySelectorAll('*')
      const classNames = new Set<string>()
      allElements.forEach(el => {
        const svgEl = el as SVGElement
        const classNameValue = (svgEl as SVGElement).className
        if (
          classNameValue &&
          typeof classNameValue === 'object' &&
          'baseVal' in classNameValue
        ) {
          if (classNameValue.baseVal) classNames.add(classNameValue.baseVal)
        } else if (typeof (el as HTMLElement).className === 'string') {
          if ((el as HTMLElement).className) {
            classNames.add((el as HTMLElement).className)
          }
        }
      })
      console.log('SVG 中出现的所有类名:', Array.from(classNames))

      const systems = svg.querySelectorAll('.abcjs-system')
      console.log(`找到 ${systems.length} 个 .abcjs-system`)

      if (!systems.length) {
        console.warn('⚠️ 没有找到 .abcjs-system，无法继续')
        return
      }

      const positions: NotePosition[] = []

      console.log('开始测量音符坐标...')
      systems.forEach((sys, sysIdx) => {
        const sysEl = sys as SVGGraphicsElement
        const sysBBox = sysEl.getBBox()
        console.log(
          `系统行 ${sysIdx}: BBox y=${sysBBox.y}, height=${sysBBox.height}, bottom=${sysBBox.y + sysBBox.height}`
        )

        const notes = sys.querySelectorAll('.abcjs-note')
        console.log(`系统行 ${sysIdx} 内有 ${notes.length} 个音符`)

        notes.forEach((note, noteIdx) => {
          const noteEl = note as SVGGraphicsElement
          const noteBBox = noteEl.getBBox()
          const centerX = noteBBox.x + noteBBox.width / 2
          positions.push({
            systemIndex: sysIdx,
            x: centerX,
            systemBottomY: sysBBox.y + sysBBox.height
          })
          console.log(`  音符 ${noteIdx}: x=${centerX.toFixed(2)}`)
        })
      })

      console.log(`测量完成，共得到 ${positions.length} 个坐标`)
      console.log(`payload 长度: ${payload.length}`)
      console.log(`positions 长度: ${positions.length}`)

      if (payload.length !== positions.length) {
        console.warn(
          `⚠️ 长度不匹配！payload=${payload.length}, positions=${positions.length}`
        )
        const minLen = Math.min(payload.length, positions.length)
        console.log(`将使用前 ${minLen} 项进行注入`)
      }

      console.log('开始注入指法图...')
      const len = Math.min(payload.length, positions.length)
      for (let idx = 0; idx < len; idx++) {
        const item = payload[idx]
        const pos = positions[idx]

        if (item.skip) {
          console.log(`索引 ${idx}: skip 跳过`)
          continue
        }

        console.log(
          `处理索引 ${idx}: midi=${item.midi}, x=${pos.x.toFixed(
            2
          )}, bottomY=${pos.systemBottomY.toFixed(2)}`
        )

        const state = DICT[item.midi]
        if (!state) {
          console.warn(`  字典缺失 MIDI ${item.midi}，跳过`)
          continue
        }

        const { element: fingerG } = drawOcarina12(state)
        const tx = pos.x - 3000
        const ty = pos.systemBottomY - 500
        console.log(`  平移: translate(${tx.toFixed(2)}, ${ty.toFixed(2)})`)
        fingerG.setAttribute('transform', `translate(${tx}, ${ty})`)

        const targetSys = systems[pos.systemIndex]
        targetSys.appendChild(fingerG)
        console.log(`  指法图已添加到系统行 ${pos.systemIndex}`)

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
        console.log('  字母谱已添加')
      }

      console.log('===== injectFingering 完成 =====')
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
        container.innerHTML = ''
        abcjs.renderAbc(container, abcString, {
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

        setTimeout(() => {
          injectFingering(svg, payload)
        }, 200)
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
