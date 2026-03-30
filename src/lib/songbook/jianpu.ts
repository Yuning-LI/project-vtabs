import { DICT, MIDI_TO_NAME } from '../../components/InstrumentDicts/ocarina12.ts'
import type { ParsedToken } from './types.ts'

/**
 * 当前项目的“稳定前台真相源”仍然是手写简谱 notation。
 *
 * 业务背景：
 * - 面向欧美用户时，我们最终会回到五线谱 / ABC 主源。
 * - 但在现阶段，为了保证线上渲染稳定，详情页实际使用的是手写简谱数据。
 * - 无论前台显示成简谱、字母谱还是后续重新切回五线谱，核心都要先落到统一音高。
 *
 * 这里承担的职责就是：
 * 1. 把站点内部的简谱 token 解析成结构化 token。
 * 2. 把每个可发声音符换算成标准 MIDI。
 * 3. 让后续的指法映射、字母谱显示、音域适配都建立在同一层音高语义之上。
 *
 * 当前链路：
 * notation -> ParsedToken(note/rest/hold/bar) -> MIDI -> 指法字典 / 字母谱标签
 *
 * 这套逻辑以后不会被浪费。
 * 即使未来后端切到 ABC 主源，最终仍然会落到“音高 -> MIDI -> 指法图”这层。
 */
const MAJOR_SCALE_OFFSETS = [0, 2, 4, 5, 7, 9, 11]

const TOKEN_PATTERN = /#?[1-7][',]*|b[1-7][',]*|0|-|\|/g

/**
 * 将每一行简谱字符串解析成结构化 token 列表。
 *
 * 约定：
 * - `1-7` 表示级数
 * - `#` / `b` 表示升降
 * - `'` / `,` 表示八度
 * - `-` 表示延音占位，不单独产生新音高
 * - `0` 表示休止
 * - `|` 表示小节线
 */
export function parseNotation(notation: string[], tonicMidi: number): ParsedToken[][] {
  return notation.map(line => {
    const tokens = line.match(TOKEN_PATTERN) ?? []
    return tokens.map(token => parseToken(token, tonicMidi))
  })
}

export function tokenizeLyricLine(line: string): string[] {
  /**
   * 歌词 token 允许自带标点。
   *
   * 例如：
   * - `night,`
   * - `mind?`
   * - `syne.`
   *
   * 这些标点会跟随前一个歌词 token 一起显示，
   * 不会额外多占一个歌词槽位，因此不会破坏“歌词 token 数 = 可唱音符数”的对位关系。
   *
   * 真正会影响槽位的仍然只有：
   * - 空格分词
   * - `|` 这种人工分隔符
   * - `_` 这种显式空歌词占位
   */
  return (line.match(/[^|\s]+/g) ?? []).map(token => (token === '_' ? '\u00A0' : token))
}

export function countSingableSlots(tokens: ParsedToken[]): number {
  return tokens.filter(token => token.kind === 'note').length
}

/**
 * 单个 token 到 ParsedToken 的最小语义转换。
 *
 * 这里故意保持简单：
 * - 不尝试表达 slur / tie / ornaments 这类高级记谱语义
 * - 只保留当前前台稳定显示和指法映射所需的最小集合
 *
 * 这样做的原因是：当前站点首要目标是“稳定上线可用内容”，
 * 而不是在没有完整 ABC 主源之前就把前端做成一个完整制谱引擎。
 */
function parseToken(token: string, tonicMidi: number): ParsedToken {
  if (token === '|') {
    return { kind: 'bar', token }
  }

  if (token === '-') {
    return { kind: 'hold', token }
  }

  if (token === '0') {
    return { kind: 'rest', token }
  }

  let accidental: -1 | 0 | 1 = 0
  let body = token

  if (token.startsWith('#')) {
    accidental = 1
    body = token.slice(1)
  } else if (token.startsWith('b')) {
    accidental = -1
    body = token.slice(1)
  }

  const degree = Number(body[0])
  const octaveMarkers = body.slice(1)
  const octaveShift =
    (octaveMarkers.match(/'/g)?.length ?? 0) - (octaveMarkers.match(/,/g)?.length ?? 0)

  /**
   * 简谱到 MIDI 的换算规则：
   * - `tonicMidi` 表示当前 `1 = X` 的主音
   * - 大调级数偏移由 MAJOR_SCALE_OFFSETS 提供
   * - accidental 追加半音
   * - octaveShift 以 12 半音为单位移动
   *
   * 例：
   * - 如果 `1 = C4`，则 `5` -> G4
   * - `1'` -> C5
   * - `b7` -> 降七级
   */
  const midi = tonicMidi + MAJOR_SCALE_OFFSETS[degree - 1] + accidental + octaveShift * 12

  return {
    kind: 'note',
    token,
    degree,
    accidental,
    octaveShift,
    midi
  }
}

/**
 * 将结构化 token 转成前台字母谱标签。
 *
 * 当前详情页默认显示的是“字母谱 + 指法图 + 歌词”，
 * 因此这里相当于把 MIDI 再映射成西方用户更熟悉的音名。
 *
 * 注意：
 * - `Out` 表示音高超出了当前陶笛字典范围
 * - 这不一定是数据错，也可能只是当前调对该乐器不友好
 * - 后续切换乐器或加自动移调时，这里的结果会跟着变化
 */
export function tokenToLabel(token: ParsedToken): string {
  /**
   * 前台文案这里刻意不用 `Rest`，而用更口语化的 `Pause`。
   *
   * 原因：
   * - `rest` 是标准乐理术语，但对普通入门用户不一定直观
   * - 当前站点默认面向初学者和搜索流量用户，优先让“这是停一下/不发声”一眼可懂
   *
   * 注意这里只改“显示标签”，不改底层语义：
   * - token.kind 仍然是 `rest`
   * - 歌词对位、音高解析、指法判断都不受影响
   */
  if (token.kind === 'rest') return 'Pause'
  if (token.kind === 'hold') return 'Hold'
  if (token.kind === 'bar') return ''
  if (token.kind !== 'note') return ''

  const noteName = MIDI_TO_NAME[token.midi]
  if (!noteName) return 'Out'
  return `${noteName.letter}${noteName.octave}`
}

/**
 * 判断一个音符在当前乐器字典里是否有可用指法。
 *
 * 这里直接查 ocarina DICT，是因为当前站点首发只支持 12 孔陶笛。
 * 后续扩到竖笛 / 吉他时，这里应该被更高层的“按乐器选择字典”的逻辑替代，
 * 而不是把更多乐器继续硬编码到这个文件。
 */
export function tokenHasFingering(token: ParsedToken): boolean {
  if (token.kind !== 'note') return false
  return Boolean(DICT[token.midi])
}

export function linePreview(line: string): string {
  return line.replace(/\|/g, ' | ').replace(/\s+/g, ' ').trim()
}

/**
 * 按小节拆分 token。
 *
 * 业务上小节是当前详情页布局的基础单元：
 * - 每个小节右侧有分隔线
 * - 歌词也按小节展开
 * - 以后不管是简谱、字母谱还是再次尝试五线谱，measure 仍然是重要布局边界
 */
export function splitLineIntoMeasures(tokens: ParsedToken[]): ParsedToken[][] {
  const measures: ParsedToken[][] = [[]]

  tokens.forEach(token => {
    if (token.kind === 'bar') {
      measures.push([])
      return
    }

    measures[measures.length - 1].push(token)
  })

  return measures.filter(measure => measure.length > 0)
}

export function splitLyricIntoMeasures(
  line: string,
  notationMeasures: ReturnType<typeof splitLineIntoMeasures>
) {
  const lyricTokens = tokenizeLyricLine(line)
  let cursor = 0

  return notationMeasures
    .map(measure =>
      measure.map(() => {
        return '\u00A0'
      })
    )
    .map((measureLyrics, measureIndex) => {
      return measureLyrics.map((_, tokenIndex) => {
        const token = notationMeasures[measureIndex][tokenIndex]
        if (token.kind !== 'note') return '\u00A0'

        const lyric = lyricTokens[cursor]
        cursor += 1
        return lyric || '\u00A0'
      })
    })
}

/**
 * 为简谱模式提供视觉数据。
 *
 * 当前前台默认走字母谱，不常用到这个函数；
 * 但它保留着两个用途：
 * - 简谱模式仍可作为内部核对工具
 * - 以后如果要重新提供“字母谱 / 简谱”切换，这里不用再重写
 */
export function getTokenVisual(token: ParsedToken): {
  main: string
  accidental: string
  upperDots: number
  lowerDots: number
} {
  if (token.kind === 'rest') {
    return { main: '0', accidental: '', upperDots: 0, lowerDots: 0 }
  }

  if (token.kind === 'hold') {
    return { main: '—', accidental: '', upperDots: 0, lowerDots: 0 }
  }

  if (token.kind === 'bar') {
    return { main: '', accidental: '', upperDots: 0, lowerDots: 0 }
  }

  if (token.kind !== 'note') {
    return { main: '', accidental: '', upperDots: 0, lowerDots: 0 }
  }

  return {
    main: String(token.degree),
    accidental: token.accidental === 1 ? '#' : token.accidental === -1 ? 'b' : '',
    upperDots: token.octaveShift > 0 ? token.octaveShift : 0,
    lowerDots: token.octaveShift < 0 ? Math.abs(token.octaveShift) : 0
  }
}
