'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as abcjs from 'abcjs'
import type { Selectable } from 'abcjs'
import { useFontReady } from '@/lib/hooks/useFontReady'
import { useRenderLock } from '@/lib/hooks/useRenderLock'
import Skeleton from '@/components/ui/Skeleton'
import { DICT, MIDI_TO_NAME } from '@/components/InstrumentDicts/ocarina12'

/**
 * 五线谱试点渲染器。
 *
 * 当前项目里它的定位必须读清楚：
 * - 不是当前默认线上详情页主渲染器
 * - 是“未来重新做五线谱 + 指法图”时的参考基线
 *
 * 保留它的原因：
 * - 已经验证过 abcjs 可以承担五线谱底座
 * - 已经验证过 visualTranspose 能接入 staff 渲染
 * - 已经验证过可以在音符上叠加我们自己的指法图与字母标签
 *
 * 当前没有把它接回主链路的原因：
 * - 歌词、音符、指法三层叠加在复杂页面上仍然不够稳
 * - 历史上这里出现过明显的错位 bug
 * - 所以当前前台默认仍回退到更稳定的“字母谱 + 指法图”渲染链
 *
 * 接手者如果要恢复五线谱路线，建议把这个文件当研究起点，
 * 而不是直接重新接回 SongClient 就上线。
 */
type AbcRendererProps = {
  abcString: string
  instrumentId: string
  visualTranspose?: number
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

const SVG_ASPECT_RATIO = 600 / 511

/**
 * 根据当前视口估算 overlay 中指法图的目标尺寸。
 *
 * 这里是表现层参数，不应该承载音乐业务语义。
 * 真正的音高、歌词、移调判断都必须在上层完成。
 */
const getFingeringMetrics = (screenWidth: number) => {
  const safeWidth = screenWidth || 390
  const diagramHeight = Math.max(22, Math.min(36, Math.round(safeWidth * 0.05)))
  const labelSize = Math.max(10, Math.min(13, Math.round(diagramHeight * 0.38)))
  const subscriptSize = Math.max(7, labelSize - 3)

  return {
    diagramHeight,
    labelSize,
    subscriptSize,
    stackHeight: diagramHeight + labelSize + 12,
    minGap: safeWidth < 540 ? 14 : 18
  }
}

/**
 * 渲染 ABC 乐谱并叠加指法图与字母谱。
 *
 * 关键思想：
 * - 底层 staff 由 abcjs 负责
 * - 指法图与字母标签由我们自己做 overlay
 * - overlay 必须和 abcjs 的真实音符元素逐个对齐
 *
 * 这也是这个文件最脆弱、最值得继续打磨的地方。
 *
 * @param abcString - ABC 源码
 * @param instrumentId - 当前乐器标识（用于保持接口一致）
 * @param onRenderStart - 渲染开始回调
 * @param onRenderComplete - 渲染完成回调
 */
export default function AbcRenderer({
  abcString,
  instrumentId: _instrumentId,
  visualTranspose = 0,
  onRenderStart,
  onRenderComplete
}: AbcRendererProps) {
  const renderPassRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const fontReady = useFontReady(3000) // 等待字体加载完成，避免测量偏移
  const { startRender, finishRender } = useRenderLock(5000)
  const [isTimeout, setIsTimeout] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(0)

  useEffect(() => {
    const updateViewportWidth = () => {
      setViewportWidth(prev => (prev === window.innerWidth ? prev : window.innerWidth))
    }

    updateViewportWidth()
    window.addEventListener('resize', updateViewportWidth)
    return () => window.removeEventListener('resize', updateViewportWidth)
  }, [])

  const handleTimeout = useCallback(() => {
    setIsTimeout(true)
    finishRender()
    onRenderComplete?.()
  }, [finishRender, onRenderComplete])

  useEffect(() => {
    if (!fontReady || !containerRef.current || !abcString) return

    const renderPass = ++renderPassRef.current
    let cancelled = false
    const overlayNode = overlayRef.current

    const containerWidth = containerRef.current.getBoundingClientRect().width || viewportWidth || 500
    const isCompact = containerWidth <= 540
    const metrics = getFingeringMetrics(viewportWidth || containerWidth)
    const renderScale = isCompact ? 0.86 : 1
    const renderStaffWidth = isCompact
      ? Math.max(250, Math.floor(containerWidth * 0.76))
      : Math.max(420, Math.floor(containerWidth - 28))

    onRenderStart?.()
    setIsTimeout(false)
    startRender(handleTimeout)

    containerRef.current.innerHTML = ''
    if (overlayNode) overlayNode.innerHTML = ''

    try {
      const visualObj = abcjs.renderAbc(containerRef.current, abcString, {
        responsive: 'resize',
        add_classes: true,
        visualTranspose,
        staffwidth: renderStaffWidth,
        scale: renderScale,
        wrap: { minSpacing: isCompact ? 2.7 : 1.8 },
        paddingtop: 20,
        paddingbottom: isCompact ? 96 : 48,
        staffsep: isCompact ? 52 : 40,
        systemsep: isCompact ? 68 : 55
      } as any)

      const selectableNotes = (visualObj[0]?.getSelectableArray?.() ?? []).filter(
        (selectable: Selectable) => {
          const abcelem = selectable.absEl?.abcelem
          return (
            selectable.absEl?.type === 'note' &&
            !abcelem?.rest &&
            Array.isArray(abcelem?.midiPitches) &&
            abcelem.midiPitches.length > 0
          )
        }
      ) as Selectable[]

      /**
       * 等待所有音符坐标有效。
       *
       * 这里是之前踩过的坑：
       * - 如果在 abcjs 布局尚未稳定时就读取 DOM 坐标
       * - 后面的 overlay 会整体偏掉，尤其是行尾和最后几个音
       *
       * 所以当前逻辑宁可多等几轮，也不直接抢跑注入。
       */
      const waitForAllNotesStable = async (notes: Selectable[], maxAttempts = 30, interval = 150) => {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          if (cancelled || renderPass !== renderPassRef.current) return false
          let allValid = true
          let lastNoteValid = false

          notes.forEach((note, index) => {
            const rect = note.svgEl.getBoundingClientRect()
            if (rect.width <= 5 || rect.height <= 5) {
              allValid = false
            }
            if (index === notes.length - 1) {
              lastNoteValid = rect.width > 5 && rect.height > 5
            }
          })

          if (allValid) {
            return true
          }

          const firstNote = notes[0];
          const firstValid = firstNote ? firstNote.svgEl.getBoundingClientRect().width > 5 : false
          if (firstValid && lastNoteValid) {
            return true
          }

          await new Promise(resolve => setTimeout(resolve, interval))
        }
        return false
      }

      const injectFingering = async () => {
        const containerBox = containerRef.current?.getBoundingClientRect();
        const overlay = overlayRef.current;
        if (cancelled || renderPass !== renderPassRef.current || !containerBox || !overlay) {
          finishRender();
          onRenderComplete?.();
          return;
        }

        const staffs = containerRef.current?.querySelectorAll('.abcjs-staff');
        const lyrics = containerRef.current?.querySelectorAll('.abcjs-lyric');
        if (!staffs || selectableNotes.length === 0) {
          finishRender();
          onRenderComplete?.();
          return;
        }

        await waitForAllNotesStable(selectableNotes)
        if (cancelled || renderPass !== renderPassRef.current) return

        overlay.innerHTML = ''

        const staffsWithRects = Array.from(staffs).map(staff => staff.getBoundingClientRect())
        const rowGroups = new Map<number, Array<{ widget: HTMLDivElement; x: number }>>()

        /**
         * 这里必须做“同源配对”：
         * - 坐标来自 selectable.svgEl
         * - MIDI 来自 selectable.absEl.abcelem.midiPitches
         *
         * 不再允许回到“单独取一份 MIDI 数组，再按 DOM 顺序猜着对”的旧做法，
         * 因为那种做法已经在真实页面里证明会错位。
         */
        selectableNotes.forEach(selectable => {
          if (cancelled || renderPass !== renderPassRef.current) return
          const midiPitches = selectable.absEl.abcelem.midiPitches ?? []
          const midi = Math.max(...midiPitches.map(pitch => pitch.pitch))
          const dictData = DICT[midi]

          const noteRect = selectable.svgEl.getBoundingClientRect()
          const noteHead = selectable.svgEl.querySelector('.abcjs-notehead')
          const anchorRect = noteHead?.getBoundingClientRect() ?? noteRect
          const absoluteX = anchorRect.left - containerBox.left + anchorRect.width / 2
          let currentStaffBottom = 0

          staffsWithRects.forEach(staffRect => {
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

          const baseLineY = activeLyricBottom > 0 ? activeLyricBottom : currentStaffBottom
          const absoluteY = baseLineY - containerBox.top + metrics.minGap
          const rowKey = Math.round(currentStaffBottom - containerBox.top)

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
            letter.className = 'ocarina-note-label font-bold text-primary'
            letter.textContent = '?'
            widget.appendChild(letter)

            overlay.appendChild(widget)
            const row = rowGroups.get(rowKey) ?? []
            row.push({ widget, x: absoluteX })
            rowGroups.set(rowKey, row)
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
          letter.className = 'ocarina-note-label font-bold text-primary'
          const name = MIDI_TO_NAME[midi]
          letter.innerHTML = name
            ? `${name.letter}<sub class="ocarina-note-subscript text-wood-dark ml-0.5">${name.octave}</sub>`
            : '?'

          widget.appendChild(svgDom)
          widget.appendChild(letter)
          overlay.appendChild(widget)

          const row = rowGroups.get(rowKey) ?? []
          row.push({ widget, x: absoluteX })
          rowGroups.set(rowKey, row)
        })

        rowGroups.forEach(row => {
          if (row.length === 0) return

          const sorted = [...row].sort((a, b) => a.x - b.x)
          let minGap = Number.POSITIVE_INFINITY
          for (let i = 1; i < sorted.length; i++) {
            minGap = Math.min(minGap, sorted[i].x - sorted[i - 1].x)
          }

          const preferredDiagramHeight = metrics.diagramHeight
          const preferredWidgetWidth = preferredDiagramHeight * SVG_ASPECT_RATIO
          const maxWidgetWidth = Number.isFinite(minGap)
            ? Math.max(18, Math.min(preferredWidgetWidth, minGap - 6))
            : preferredWidgetWidth
          const fittedDiagramHeight = Math.max(15, Math.min(preferredDiagramHeight, maxWidgetWidth / SVG_ASPECT_RATIO))
          const fittedDiagramWidth = fittedDiagramHeight * SVG_ASPECT_RATIO
          const fittedLabelSize = Math.max(8, Math.min(metrics.labelSize, Math.round(fittedDiagramHeight * 0.42)))
          const fittedSubscriptSize = Math.max(6, fittedLabelSize - 3)

          sorted.forEach(({ widget }) => {
            widget.style.setProperty('--ocarina-diagram-height', `${Math.round(fittedDiagramHeight)}px`)
            widget.style.setProperty('--ocarina-diagram-width', `${Math.round(fittedDiagramWidth)}px`)
            widget.style.setProperty('--ocarina-label-size', `${fittedLabelSize}px`)
            widget.style.setProperty('--ocarina-subscript-size', `${fittedSubscriptSize}px`)
          })
        })

        finishRender();
        onRenderComplete?.();
      };

      // 启动注入（异步，不阻塞）
      injectFingering().catch(err => {
        if (cancelled || renderPass !== renderPassRef.current) return
        console.error('注入失败', err);
        finishRender();
        onRenderComplete?.();
      });
    } catch (err) {
      console.error('渲染错误:', err)
      finishRender()
      onRenderComplete?.()
    }

    return () => {
      cancelled = true
      if (overlayNode) overlayNode.innerHTML = ''
      finishRender()
    }
  }, [
    abcString,
    fontReady,
    startRender,
    finishRender,
    handleTimeout,
    onRenderStart,
    onRenderComplete,
    visualTranspose,
    viewportWidth
  ])

  if (!fontReady) {
    return <Skeleton />
  }

  const metrics = getFingeringMetrics(viewportWidth)

  return (
    <div
      className="relative"
      style={
        {
          '--ocarina-diagram-height': `${metrics.diagramHeight}px`,
          '--ocarina-label-size': `${metrics.labelSize}px`,
          '--ocarina-subscript-size': `${metrics.subscriptSize}px`
        } as CSSProperties
      }
    >
      {isTimeout && (
        <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded shadow">
          ⏳ 渲染超时，已显示基础谱面
        </div>
      )}
      <div ref={containerRef} className="abc-paper"></div>
      <div
        ref={overlayRef}
        id="ocarina-overlay"
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      ></div>
    </div>
  )
}
