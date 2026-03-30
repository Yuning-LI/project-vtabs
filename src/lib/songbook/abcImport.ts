import abcjsModule from 'abcjs'
import { visualPitchToMidi } from '../abc/pitchToMidi.ts'

/**
 * ABC 导入层。
 *
 * 这层不是前台当前默认渲染链路，而是“未来迁移真相源”的桥。
 *
 * 当前项目状态：
 * - 前台稳定真相源仍是手写简谱 notation
 * - ABC 已经在少量歌曲上录入，用来做试点和校验
 * - 校验器会把 ABC 解析结果和当前手写简谱做自动比对
 *
 * 这意味着本文件的业务意义是：
 * - 把 ABC 提炼成足够稳定的结构化 note events
 * - 提供后续核对、导入验收、乐器适配的基础数据
 * - 暂时不承诺“完整等价于专业制谱软件的全部语义”
 *
 * 这里目前保留的信息包括：
 * - 行 / 小节 / 声部位置
 * - 时值
 * - MIDI
 * - 歌词音节
 * - 和弦
 *
 * 这已经足够支撑当前的导入验证与未来前台迁移。
 */
export type AbcNoteEvent = {
  lineIndex: number
  measureIndex: number
  voiceIndex: number
  eventIndex: number
  duration: number
  midi: number | null
  isRest: boolean
  lyric: string | null
  lyricDivider: string | null
  chords: string[]
}

export type ParsedAbcTune = {
  headers: Record<string, string>
  noteEvents: AbcNoteEvent[]
  chordSymbols: string[]
  meter: string | null
}

/**
 * 使用 abcjs 的 AST 能力做“轻结构化导入”。
 *
 * 这里故意不直接面向 DOM 或最终 SVG，而是面向 AST：
 * - 便于服务校验器
 * - 便于服务后续的格式转换
 * - 避免把前台渲染细节耦合进导入层
 *
 * 注意边界：
 * - 这不是完整的 ABC 语义引擎
 * - 但对当前项目最关键的音高、歌词、和弦、时值信息已经足够
 */
export function parseAbcTune(abc: string): ParsedAbcTune {
  const parseOnly =
    (abcjsModule as any).parseOnly ??
    (abcjsModule as any).default?.parseOnly

  if (typeof parseOnly !== 'function') {
    throw new Error('abcjs parseOnly is unavailable in the current runtime')
  }

  const tunes = parseOnly(abc) as any[]
  const ast = tunes[0]
  if (!ast) {
    throw new Error('Unable to parse ABC tune')
  }

  const headers = extractHeaders(abc)
  const noteEvents: AbcNoteEvent[] = []
  const chordSymbols = new Set<string>()

  ast.lines?.forEach((line: any, lineIndex: number) => {
    line.staff?.forEach((staff: any) => {
      staff.voices?.forEach((voice: any, voiceIndex: number) => {
        let measureIndex = 0
        let eventIndex = 0

        voice.forEach((elem: any) => {
          if (elem.el_type === 'bar') {
            measureIndex += 1
            return
          }

          if (elem.el_type !== 'note') return

          const isRest = Boolean(elem.rest)
          const pitch = !isRest && elem.pitches?.length ? elem.pitches[0].pitch : null
          const midi = pitch === null ? null : visualPitchToMidi(pitch)
          const lyricEntry = elem.lyric?.[0]
          const chords = (elem.chord ?? []).map((ch: any) => ch.name).filter(Boolean)
          chords.forEach((ch: string) => chordSymbols.add(ch))

          noteEvents.push({
            lineIndex,
            measureIndex,
            voiceIndex,
            eventIndex,
            duration: elem.duration ?? 0,
            midi,
            isRest,
            lyric: lyricEntry?.syllable ?? null,
            lyricDivider: lyricEntry?.divider ?? null,
            chords
          })

          eventIndex += 1
        })
      })
    })
  })

  return {
    headers,
    noteEvents,
    chordSymbols: Array.from(chordSymbols),
    meter: headers.M ?? null
  }
}

/**
 * 取出头部字段，主要供校验和后续元数据使用。
 *
 * 这里保持宽松：
 * - 只解析简单 `X: / T: / M: / K:` 这种 header 结构
 * - 不在这里做更复杂的规范判断
 *
 * 更严格的验证应交给 validateSong 这种“业务校验层”来处理。
 */
function extractHeaders(abc: string) {
  const headers: Record<string, string> = {}

  abc.split('\n').forEach(line => {
    const match = line.match(/^([A-Z]):\s*(.*)$/)
    if (!match) return
    headers[match[1]] = match[2]
  })

  return headers
}
