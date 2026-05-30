import type { FingeringState, RenderResult } from '@/lib/types'
import {
  OCARINA12_BODY_PATH as BODY_PATH,
  OCARINA12_HOLE_COORDS as HOLE_COORDS,
  OCARINA12_HOLE_ORDER as HOLE_ORDER
} from '../../lib/svg-editor/ocarina12-template.ts'

/**
 * 12 孔 AC 陶笛指法字典。
 *
 * 这是当前项目里最关键的业务资产之一，因为它决定了：
 * - 页面上每个音最终画成什么指法图
 * - 字母谱 / 简谱 / 五线谱最终是否能和“可吹奏动作”闭环
 *
 * 当前产品范围：
 * - 首发默认乐器只有 12 孔 AC 陶笛
 * - 所以前台很多逻辑会直接依赖这里的 MIDI 范围和指法字典
 *
 * 后续扩展其他乐器时要注意：
 * - 不要继续把更多乐器硬塞进这个文件
 * - 应该新增对应乐器字典与图形模板
 * - 上层再按 instrumentId 选择不同字典
 *
 * 当前稳定业务链路是：
 * notation / ABC -> MIDI -> DICT[midi] -> 指法图 SVG
 */

/**
 * MIDI 到指法状态的映射字典
 *
 * 指法数组为 12 位 0/1，1 表示按下（闭孔），0 表示抬起（开孔）
 *
 * 这里的键空间同时定义了“当前乐器可稳定支持的音域”。
 * 也就是说：
 * - 如果某个 MIDI 不在这个 DICT 里，前台就会显示为不可用 / 越界
 * - 所以前面才需要 range fitting（自动移调）去尽量把整首歌压进这个范围
 *
 * 当前范围大致覆盖 A3 到 F5（57-77）。
 * 如果未来校正指法或加入替代指法，优先在这里维护，而不是在渲染层打补丁。
 */
export const DICT: Record<number, FingeringState> = {
  57: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  58: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  59: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  60: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  61: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1],
  62: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  63: [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0],
  64: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  65: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  66: [1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0],
  67: [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  68: [1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0],
  69: [1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0],
  70: [1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
  71: [1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  72: [1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  73: [0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0],
  74: [0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  75: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  76: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  77: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
}

/**
 * MIDI 到字母谱名称与八度的映射
 *
 * 当前线上默认详情页走“字母谱 + 指法图 + 歌词”，
 * 所以这个映射不只是附属信息，而是实际用户会直接看到的主标签来源。
 *
 * 注意：
 * - 这里用的是站点当前约定的拼写方式（例如 Bb / Db）
 * - 若以后要支持更细的调性偏好（例如同音异名、按 key signature 决定升降写法），
 *   不应直接在组件里临时替换字符串，而应升级这一层映射逻辑
 */
export const MIDI_TO_NAME: Record<number, { letter: string; octave: number }> =
  {
    57: { letter: 'A', octave: 3 },
    58: { letter: 'Bb', octave: 3 },
    59: { letter: 'B', octave: 3 },
    60: { letter: 'C', octave: 4 },
    61: { letter: 'Db', octave: 4 },
    62: { letter: 'D', octave: 4 },
    63: { letter: 'Eb', octave: 4 },
    64: { letter: 'E', octave: 4 },
    65: { letter: 'F', octave: 4 },
    66: { letter: 'Gb', octave: 4 },
    67: { letter: 'G', octave: 4 },
    68: { letter: 'Ab', octave: 4 },
    69: { letter: 'A', octave: 4 },
    70: { letter: 'Bb', octave: 4 },
    71: { letter: 'B', octave: 4 },
    72: { letter: 'C', octave: 5 },
    73: { letter: 'Db', octave: 5 },
    74: { letter: 'D', octave: 5 },
    75: { letter: 'Eb', octave: 5 },
    76: { letter: 'E', octave: 5 },
    77: { letter: 'F', octave: 5 }
  }

/**
 * 根据指法状态生成 12 孔陶笛的 SVG 结构
 *
 * 这是“纯绘图层”能力，不关心曲子、歌词、调号。
 * 它只做一件事：把已经确定好的 12 位孔状态画成 SVG。
 *
 * 业务上应该始终保持这个分层：
 * - 音乐语义和音高判断在上层
 * - 这个函数只负责图形结果
 *
 * @param state - 12 位指法数组
 * @returns 渲染结果，包含 SVG 元素与尺寸信息
 */
export function drawOcarina12(state: FingeringState): RenderResult {
  const ns = 'http://www.w3.org/2000/svg'
  const g = document.createElementNS(ns, 'g')

  // 1. 身体轮廓
  const path = document.createElementNS(ns, 'path')
  path.setAttribute('d', BODY_PATH)
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', '#3E2723')
  path.setAttribute('stroke-width', '45')
  g.appendChild(path)

  // 2. 画 12 个孔位
  HOLE_ORDER.forEach(id => {
    const { cx, cy, r } = HOLE_COORDS[id]
    const circle = document.createElementNS(ns, 'circle')
    circle.setAttribute('cx', cx.toString())
    circle.setAttribute('cy', cy.toString())
    circle.setAttribute('r', r.toString())
    const idx = HOLE_ORDER.indexOf(id) // 将孔位 ID 映射到指法数组索引
    const isClosed = state[idx] === 1 // 1 表示闭孔，0 表示开孔
    circle.setAttribute('fill', isClosed ? '#3E2723' : '#FFFFFF')
    circle.setAttribute('stroke', '#3E2723')
    circle.setAttribute('stroke-width', '35')
    g.appendChild(circle)
  })

  return {
    element: g,
    width: 28,
    height: 24
  }
}
