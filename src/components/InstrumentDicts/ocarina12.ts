import type { FingeringState, RenderResult } from '@/lib/types'

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
 * 12 孔陶笛的孔位顺序，用于将指法数组映射到具体孔位
 *
 * 注意：此顺序必须与 SVG 模板中的孔位 ID 一致
 */
export const HOLE_ORDER = [
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
 * 12 孔位在 SVG 用户坐标系中的位置与半径
 *
 * 注意：坐标与孔位顺序共同决定最终渲染位置
 */
const HOLE_COORDS = {
  LB: { cx: 1465, cy: 1463, r: 220 },
  RB: { cx: 3194, cy: 1448, r: 220 },
  L1: { cx: 926, cy: 2912, r: 170 },
  L2: { cx: 1505, cy: 3101, r: 170 },
  L3: { cx: 2035, cy: 3320, r: 170 },
  L4: { cx: 2495, cy: 3693, r: 170 },
  R1: { cx: 3433, cy: 2850, r: 170 },
  R2: { cx: 3940, cy: 3200, r: 170 },
  R3: { cx: 4370, cy: 3500, r: 170 },
  R4: { cx: 4816, cy: 3900, r: 170 },
  LS: { cx: 1630, cy: 2700, r: 110 },
  RS: { cx: 3693, cy: 3600, r: 110 }
}

/**
 * 陶笛身体轮廓的 SVG Path 数据
 */
const BODY_PATH =
  'm4845,4460c-214,-23 -457,-59 -647,-95c-134,-26 -220,-43 -303,-58c-92,-18 -155,-31 -240,-52c-33,-7 -123,-28 -200,-45c-77,-18 -185,-43 -240,-57c-123,-30 -258,-63 -305,-72c-19,-4 -51,-13 -70,-19c-19,-6 -75,-21 -125,-32c-187,-43 -724,-207 -820,-250c-19,-9 -84,-33 -135,-49c-14,-5 -72,-30 -130,-56c-58,-26 -127,-56 -155,-67c-231,-92 -568,-308 -712,-457c-408,-421 -250,-826 442,-1134c98,-43 292,-111 410,-143c130,-35 163,-48 231,-90c61,-37 78,-54 112,-112l40,-68l6,-274c11,-496 30,-585 135,-622c51,-18 348,-14 394,6c64,26 88,74 147,296c13,47 29,104 37,128c7,23 13,51 13,62c0,10 4,21 9,24c5,3 12,23 16,43c3,21 20,83 36,138c147,488 175,556 274,664c45,49 196,173 265,217c25,16 47,31 50,35c3,3 41,30 85,60c44,30 105,73 135,95c30,22 100,72 155,109c114,78 166,116 331,235c64,47 146,106 183,133c36,26 73,53 81,60c8,7 74,57 145,112c432,331 707,576 920,820c35,40 95,131 95,143c0,6 6,17 13,24c18,18 47,110 47,150c-1,81 -76,150 -202,183c-73,20 -391,29 -523,15z'

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
  Object.entries(HOLE_COORDS).forEach(([id, { cx, cy, r }]) => {
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
