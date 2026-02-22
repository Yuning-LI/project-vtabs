'use client'

import { useEffect, useRef } from 'react'
import * as abcjs from 'abcjs'
import { useFontReady } from '@/lib/hooks/useFontReady'
import Skeleton from '@/components/ui/Skeleton'
import { DICT, MIDI_TO_NAME } from '@/components/InstrumentDicts/ocarina12'

type AbcRendererProps = {
  abcString: string
  instrumentId: string
  onRenderStart?: () => void
  onRenderComplete?: () => void
}

/**
 * 指法图 SVG 模板，用于在五线谱下方绘制陶笛按孔示意
 */
const SVG_TEMPLATE = `
<svg viewBox="0 0 600 511" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(0, 511) scale(0.1, -0.1)">
    <path d="m4845,4460c-214,-23 -457,-59 -647,-95c-134,-26 -220,-43 -303,-58c-92,-18 -155,-31 -240,-52c-33,-7 -123,-28 -200,-45c-77,-18 -185,-43 -240,-57c-123,-30 -258,-63 -305,-72c-19,-4 -51,-13 -70,-19c-19,-6 -75,-21 -125,-32c-187,-43 -724,-207 -820,-250c-19,-9 -84,-33 -135,-49c-14,-5 -72,-30 -130,-56c-58,-26 -127,-56 -155,-67c-231,-92 -568,-308 -712,-457c-408,-421 -250,-826 442,-1134c98,-43 292,-111 410,-143c130,-35 163,-48 231,-90c61,-37 78,-54 112,-112l40,-68l6,-274c11,-496 30,-585 135,-622c51,-18 348,-14 394,6c64,26 88,74 147,296c13,47 29,104 37,128c7,23 13,51 13,62c0,10 4,21 9,24c5,3 12,23 16,43c3,21 20,83 36,138c147,488 175,556 274,664c45,49 196,173 265,217c25,16 47,31 50,35c3,3 41,30 85,60c44,30 105,73 135,95c30,22 100,72 155,109c114,78 166,116 331,235c64,47 146,106 183,133c36,26 73,53 81,60c8,7 74,57 145,112c432,331 707,576 920,820c35,40 95,131 95,143c0,6 6,17 13,24c18,18 47,110 47,150c-1,81 -76,150 -202,183c-73,20 -391,29 -523,15z" fill="none" stroke="#3E2723" stroke-width="45" />
    <circle id="LB" cx="1465" cy="1463" r="220" fill="white" stroke="#3E2723" stroke-width="35" />
    <circle id="RB" cx="3194" cy="1448" r="220" fill="white" stroke="#3E2723" stroke-width="35" />
    <circle id="L1" cx="926"  cy="2912" r="170" fill="white" stroke="#3E2723" stroke-width="35" />
    <circle id="L2" cx="1505" cy="3101" r="170" fill="white" stroke="#3E2723" stroke-width="35" />
    <circle id="L3" cx="2035" cy="3320" r="170" fill="white" stroke="#3E2723" stroke-width="35" />
    <circle id="L4" cx="2495" cy="3693" r="170" fill="white" stroke="#3E2723" stroke-width="35" />
    <circle id="LS" cx="1630" cy="2700" r="110" fill="white" stroke="#3E2723" stroke-width="35" />
    <circle id="R1" cx="3433" cy="2850" r="170" fill="white" stroke="#3E2723" stroke-width="35" />
    <circle id="R2" cx="3940" cy="3200" r="170" fill="white" stroke="#3E2723" stroke-width="35" />
    <circle id="R3" cx="4370" cy="3500" r="170" fill="white" stroke="#3E2723" stroke-width="35" />
    <circle id="R4" cx="4816" cy="3900" r="170" fill="white" stroke="#3E2723" stroke-width="35" />
    <circle id="RS" cx="3693" cy="3600" r="110" fill="white" stroke="#3E2723" stroke-width="35" />
  </g>
</svg>`

const PLACEHOLDER_SVG = `
<svg viewBox="0 0 600 511" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(0, 511) scale(0.1, -0.1)">
    <circle cx="3000" cy="2500" r="800" fill="#f0f0f0" stroke="#aaa" stroke-width="50" />
    <text x="3000" y="2800" font-size="1200" text-anchor="middle" fill="#666" font-family="Arial, sans-serif">?</text>
  </g>
</svg>`

/**
 * 指法图孔位 ID 顺序，需与 SVG 模板中的 circle id 一致
 */
const HOLE_IDS = [
  'LB',
  'RB',
  'L1',
  'L2',
  'L3',
  'L4',
  'R1',
  'R2',
  'R3',
  'R4',
  'LS',
  'RS'
]

/**
 * 渲染 ABC 乐谱并叠加指法图与字母谱
 *
 * @param abcString - ABC 源码
 * @param instrumentId - 当前乐器标识（用于保持接口一致）
 * @param onRenderStart - 渲染开始回调
 * @param onRenderComplete - 渲染完成回调
 */
export default function AbcRenderer({
  abcString,
  instrumentId,
  onRenderStart,
  onRenderComplete
}: AbcRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const fontReady = useFontReady(3000) // 等待字体加载完成，避免测量偏移

  /**
   * 从 abcjs 的 visualObj 中提取 MIDI 序列
   *
   * @param visualObj - abcjs 渲染返回的结构
   * @returns 依照视觉顺序排列的 MIDI 数组
   */
  const extractMidiSequence = (visualObj: any): number[] => {
    const midiSequence: number[] = []
    visualObj[0]?.lines?.forEach((line: any) => {
      line.staff?.forEach((staff: any) => {
        staff.voices?.forEach((voice: any) => {
          voice.forEach((elem: any) => {
            if (elem.el_type === 'note' && elem.pitches?.length > 0) {
              let rawPitch: number
              if (elem.pitches.length > 1) {
                // 和弦：取最高音（pitch 值最大）
                rawPitch = Math.max(...elem.pitches.map((p: any) => p.pitch))
              } else {
                rawPitch = elem.pitches[0].pitch
              }
              const diatonic = [60, 62, 64, 65, 67, 69, 71] // C4 到 B4 的 MIDI 基准
              const octave = Math.floor(rawPitch / 7)
              const noteIndex = rawPitch % 7
              const midi = diatonic[noteIndex] + octave * 12
              midiSequence.push(midi)
            }
          })
        })
      })
    })
    return midiSequence
  }

  useEffect(() => {
    if (!fontReady || !containerRef.current || !abcString) return

    onRenderStart?.()

    containerRef.current.innerHTML = '' // 清空乐谱容器
    if (overlayRef.current) overlayRef.current.innerHTML = '' // 清空覆盖层

    // 渲染五线谱并获取可视对象
    const visualObj = abcjs.renderAbc(containerRef.current, abcString, {
      responsive: 'resize',
      add_classes: true,
      staffwidth: 500,
      wrap: { minSpacing: 1.8 },
      paddingtop: 20,
      paddingbottom: 30
    } as any)

    const midiSequence = extractMidiSequence(visualObj)

    setTimeout(() => {
      const containerBox = containerRef.current?.getBoundingClientRect()
      const overlay = overlayRef.current
      if (!containerBox || !overlay) return

      const notes = containerRef.current?.querySelectorAll('.abcjs-note')
      const staffs = containerRef.current?.querySelectorAll('.abcjs-staff')
      const lyrics = containerRef.current?.querySelectorAll('.abcjs-lyric')
      if (!notes || !staffs) return

      const EXTRA_GAP = 15 // 指法图与谱行/歌词的垂直间距

      notes.forEach((noteElem, index) => {
        if (index >= midiSequence.length) return

        const midi = midiSequence[index]
        const dictData = DICT[midi]

        const noteRect = noteElem.getBoundingClientRect()
        const absoluteX = noteRect.left - containerBox.left + noteRect.width / 2
        let currentStaffBottom = 0
        staffs.forEach(staff => {
          const staffRect = staff.getBoundingClientRect()
          if (noteRect.top < staffRect.bottom && noteRect.bottom > staffRect.top - 50) {
            currentStaffBottom = staffRect.bottom
          }
        })

        let activeLyricBottom = 0
        lyrics?.forEach(ly => {
          const lyRect = ly.getBoundingClientRect()
          if (lyRect.height > 0 && Math.abs(lyRect.top - currentStaffBottom) < 60) {
            activeLyricBottom = Math.max(activeLyricBottom, lyRect.bottom)
          }
        })

        // 优先使用歌词底部，否则使用谱行底部作为基线
        const baseLineY = activeLyricBottom > 0 ? activeLyricBottom : currentStaffBottom
        const absoluteY = baseLineY - containerBox.top + EXTRA_GAP

        if (!dictData) {
          const widget = document.createElement('div')
          widget.className = 'ocarina-widget'
          widget.style.left = absoluteX + 'px'
          widget.style.top = absoluteY + 'px'

          const svgContainer = document.createElement('div')
          svgContainer.innerHTML = PLACEHOLDER_SVG
          const svgDom = svgContainer.querySelector('svg')
          if (svgDom) {
            widget.appendChild(svgDom)
          }

          const letter = document.createElement('div')
          letter.className = 'text-[12px] font-bold text-primary'
          letter.textContent = '?'
          widget.appendChild(letter)

          overlay.appendChild(widget)
          return
        }

        const widget = document.createElement('div')
        widget.className = 'ocarina-widget'
        widget.style.left = absoluteX + 'px'
        widget.style.top = absoluteY + 'px'

        const svgContainer = document.createElement('div')
        svgContainer.innerHTML = SVG_TEMPLATE
        const svgDom = svgContainer.querySelector('svg')
        if (!svgDom) return

        for (let i = 0; i < 12; i++) {
          const circle = svgDom.querySelector('#' + HOLE_IDS[i])
          if (circle) {
            circle.setAttribute(
              'fill',
              dictData[i] === 1 ? '#3E2723' : '#FFFFFF'
            )
          }
        }

        const letter = document.createElement('div')
        letter.className = 'text-[12px] font-bold text-primary'
        const name = MIDI_TO_NAME[midi]
        letter.innerHTML = name
          ? `${name.letter}<sub class="text-[8px] text-wood-dark ml-0.5">${name.octave}</sub>`
          : '?'

        widget.appendChild(svgDom)
        widget.appendChild(letter)
        overlay.appendChild(widget)
      })

      onRenderComplete?.()
    }, 200)
  }, [abcString, fontReady, instrumentId, onRenderStart, onRenderComplete])

  if (!fontReady) {
    return <Skeleton />
  }

  return (
    <div className="relative">
      <div ref={containerRef} className="abc-paper"></div>
      <div
        ref={overlayRef}
        id="ocarina-overlay"
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      ></div>
    </div>
  )
}
