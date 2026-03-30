/**
 * 快乐谱原始 JSON 的本地导入辅助层。
 *
 * 这层的定位不是“把快乐谱整套渲染逻辑搬进项目”，而是：
 * 1. 读取 reference/songs 下的原始 JSON。
 * 2. 提取对当前项目真正有价值的字段。
 * 3. 把快乐谱记谱/歌词先降维成我们可审查、可继续转换的候选数据。
 *
 * 为什么先做“预览导入”而不是直接写入 catalog：
 * - 快乐谱的 notation 语法比我们当前 notation 更复杂，带时值/装饰/重复信息。
 * - 当前项目上线链路仍然是手写 notation -> MIDI -> 指法图/字母谱。
 * - 所以最稳的 MVP 路线是：先把外部数据转成可核对的候选格式，再决定如何落库。
 *
 * 当前已确认的快乐谱语义（来自 reference/快乐谱代码.txt）：
 * - 歌词里的 `;；@＠_/` 表示空歌词槽位。
 * - 记谱里的 `g` / `'` 表示高八度，`d` / `,` 表示低八度。
 * - notation 中还混有时值/布局/装饰相关符号，例如 `x . ( ) :`。
 *
 * 这里故意只做“安全可解释”的最小提取：
 * - 保留音级 / 八度 / 小节线
 * - 尽量保留会直接影响小节观感的时值信息
 * - 给后续人工确认和正式导入提供可渲染的候选结果
 */

import { countSingableSlots, parseNotation } from './jianpu.ts'
import { instrumentProfiles } from './instruments.ts'
import { chooseBestRangeShift } from './rangeFit.ts'
import type { SongDoc } from './types.ts'

export type KuailepuSongPayload = {
  song_uuid?: string
  song_name?: string
  alias_name?: string
  song_pinyin?: string
  keynote?: string
  rhythm?: string
  music_composer?: string
  lyric?: string
  lyric_text?: string
  notation?: string
}

export type BuildKuailepuSongDocOptions = {
  id?: string
  slug?: string
  title?: string
  description?: string
  published?: boolean
  sourceUrl?: string
  importedOn?: string
}

export type KuailepuImportPreview = {
  songUuid: string
  title: string
  aliasTitle: string | null
  keynote: string | null
  meter: string | null
  lyricBlocks: string[]
  alignedLyricBlocks: string[]
  simplifiedNotationLines: string[]
}

export type KuailepuRenderablePreview = KuailepuImportPreview & {
  guessedTonicMidi: number
  recommendedShift: number
  renderTonicMidi: number
  renderNotationLines: string[]
  renderAlignedLyrics: string[]
  extraLyricBlocks: string[]
  renderNoteSlotCounts: number[]
  renderLyricSlotCounts: number[]
}

/**
 * 读取快乐谱的 lyric JSON 字符串。
 *
 * 快乐谱这里不是直接给数组，而是把数组再序列化成字符串保存。
 * 当前我们只关心“按段落拆开的原始歌词块”，因此这里优先返回 string[]。
 */
export function parseKuailepuLyricBlocks(rawLyric: string | undefined): string[] {
  if (!rawLyric) return []

  try {
    const parsed = JSON.parse(rawLyric)
    if (!Array.isArray(parsed)) return []

    return parsed
      .flatMap(value => String(value).split(/\n{2,}/))
      .map(value => value.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

/**
 * 依据快乐谱前端的 parseLyric 规则，提取“歌词槽位”。
 *
 * 当前我们不试图 100% 复刻它的所有文本表现层，
 * 只保留对齐所需的核心规则：
 * - 空格 / 换行结束当前 token
 * - `;；@＠_/` 记成空歌词槽位
 * - 标点挂到前一个 token 上
 * - 中日韩字符按单字切分
 *
 * 返回结果里，空歌词槽位统一转成 `_`，便于和当前项目的 alignedLyrics 口径对齐。
 */
export function parseKuailepuLyricSlots(line: string): string[] {
  const normalized = line.replace(/　/g, ' ')
  const slots: string[] = []
  let current = ''

  const flush = () => {
    if (!current.length) return
    slots.push(current)
    current = ''
  }

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index]

    if (',.!?，、。！？'.includes(char)) {
      flush()
      if (slots.length > 0) {
        slots[slots.length - 1] += char
      }
      continue
    }

    if ('(（'.includes(char)) {
      flush()
      let groupText = ''
      index += 1

      while (index < normalized.length && !')）'.includes(normalized[index])) {
        groupText += normalized[index]
        index += 1
      }

      if (groupText.length > 0) {
        slots.push(groupText)
      }
      continue
    }

    if (';；@＠_/'.includes(char)) {
      flush()
      slots.push('_')
      continue
    }

    if (char.charCodeAt(0) > 255) {
      flush()
      slots.push(char)
      continue
    }

    if (char === '\n' || char === '\r' || char === ' ') {
      flush()
      continue
    }

    current += char
  }

  flush()
  return slots
}

/**
 * 将快乐谱的歌词块转换成当前项目更接近 alignedLyrics 的形式。
 *
 * 这一步的目标不是生成最终上线数据，而是让我们快速看见：
 * - 快乐谱是怎么切 syllable 的
 * - 哪些地方插了空歌词槽位
 * - 和当前项目 notation 槽位是否接近
 */
export function buildAlignedLyricPreview(blocks: string[]): string[] {
  return blocks.map(block => parseKuailepuLyricSlots(block).join(' '))
}

/**
 * 提取快乐谱 notation 的“可渲染旋律候选”。
 *
 * 做法：
 * - 保留音级 `0-7`
 * - 保留升降号前缀 `# b n`
 * - 保留八度后缀 `g/'`、`d/,`
 * - 保留小节线 `|`
 * - 不直接照搬快乐谱的所有记谱语义，但会尽量保留影响节拍观感的时值长度
 *
 * 注意：
 * - 这不是最终可直接上线的 notation
 * - 但它已经足够接近当前站点的 token 体系，可以做页面预览和正式导入候选
 */
export function simplifyKuailepuNotation(rawNotation: string | undefined): string[] {
  if (!rawNotation) return []

  const sourceLines = expandKuailepuSectionPlayback(rawNotation)
  const parsedLines = sourceLines.map(parseKuailepuNotationLine)
  const durationDenominator = parsedLines
    .flat()
    .filter(token => token.kind !== 'bar')
    .reduce((currentLcm, token) => lcm(currentLcm, token.duration.denominator), 1)

  return parsedLines
    .map(tokens =>
      tokens
        .flatMap(token => {
          if (token.kind === 'bar') return ['|']

          const slotCount = Math.max(
            1,
            (token.duration.numerator * durationDenominator) / token.duration.denominator
          )

          if (token.kind === 'hold') {
            return Array.from({ length: slotCount }, () => '-')
          }

          if (token.kind === 'rest') {
            return Array.from({ length: slotCount }, () => '0')
          }

          return [
            token.token,
            ...Array.from({ length: Math.max(0, slotCount - 1) }, () => '-')
          ]
        })
        .join(' ')
        .replace(/\s+\|/g, ' |')
        .replace(/\|\s+\|/g, '| |')
        .trim()
    )
    .filter(Boolean)
}

/**
 * 快乐谱部分曲目会用段落标签 + play 顺序，而不是把整首旋律顺序平铺写死。
 *
 * 例如：
 * - `{play:A A B A A B}`
 * - `A: ...`
 * - `B: ...`
 *
 * 但当前站点详情页的目标是接近“快乐谱详情页上的可见谱面”，
 * 而不是它的播放器回放顺序。
 *
 * 实际人工核对后发现：
 * - `{play:...}` 更接近播放逻辑
 * - 详情页视觉谱面通常只把各段定义展示一次
 *
 * 因此这里采用“按段落定义顺序平铺一次”的策略：
 * - 忽略 `play` 里的重复回放信息
 * - 保留 A / B / C 等段落本身
 * - 避免导入后页面长度比快乐谱详情页肉眼看到的谱面长很多
 */
function expandKuailepuSectionPlayback(rawNotation: string) {
  const sourceLines = rawNotation
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)

  const sections = new Map<string, string[]>()
  const plainLines: string[] = []
  let currentSection: string | null = null

  sourceLines.forEach(line => {
    if (/^\{play:/i.test(line)) {
      return
    }

    const sectionMatch = line.match(/^([A-Za-z0-9]+):(.*)$/)
    if (sectionMatch) {
      currentSection = sectionMatch[1]
      const content = sectionMatch[2]?.trim()
      if (!sections.has(currentSection)) {
        sections.set(currentSection, [])
      }
      if (content) {
        sections.get(currentSection)?.push(content)
      }
      return
    }

    if (currentSection && sections.has(currentSection)) {
      sections.get(currentSection)?.push(line)
      return
    }

    plainLines.push(line)
  })

  return [...plainLines, ...Array.from(sections.values()).flat()]
}

type KuailepuDuration = {
  numerator: number
  denominator: number
}

type ParsedKuailepuToken =
  | {
      kind: 'bar'
    }
  | {
      kind: 'note' | 'rest' | 'hold'
      token: string
      duration: KuailepuDuration
    }

/**
 * 解析快乐谱单行 notation，并保留当前详情页最需要的时值信息。
 *
 * 当前支持的最重要语义：
 * - `0-7` 音级
 * - `-` 延长位
 * - `, ' g d` 八度
 * - `# b n` 升降号
 * - `_ x / =` 下划线类时值缩短
 * - `.` 附点
 * - `(3:` 这类最常见 tuplet 比例
 *
 * 这里故意不尝试 100% 复刻快乐谱全部记谱系统，
 * 但要尽量把“会直接影响小节观感”的节拍长度保住。
 */
function parseKuailepuNotationLine(line: string): ParsedKuailepuToken[] {
  const tokens: ParsedKuailepuToken[] = []
  let cursor = 0
  let tuplet:
    | {
        remaining: number
        numerator: number
        denominator: number
      }
    | null = null

  while (cursor < line.length) {
    const rest = line.slice(cursor)

    if (rest.startsWith('{')) {
      const endIndex = rest.indexOf('}')
      cursor += endIndex >= 0 ? endIndex + 1 : rest.length
      continue
    }

    const tupletMatch = rest.match(/^\(\s*(\d+)\s*:/)
    if (tupletMatch) {
      const n = Number(tupletMatch[1])
      const ratioMap: Record<number, [number, number]> = {
        2: [3, 2],
        3: [2, 3],
        4: [3, 4],
        5: [4, 5],
        6: [4, 6],
        7: [4, 7],
        9: [8, 9],
        10: [8, 10],
        11: [8, 11]
      }

      const ratio = ratioMap[n]
      if (ratio) {
        tuplet = {
          remaining: n,
          numerator: ratio[0],
          denominator: ratio[1]
        }
      }

      cursor += tupletMatch[0].length
      continue
    }

    const char = line[cursor]

    if (char === '|') {
      tokens.push({ kind: 'bar' })
      cursor += 1
      continue
    }

    if (char === ':' || char === '(' || char === ')' || char === ' ' || char === '\t') {
      cursor += 1
      continue
    }

    let accidentalPrefix = ''
    if ('#bn'.includes(char) && /[0-7-]/.test(line[cursor + 1] ?? '')) {
      accidentalPrefix = char
      cursor += 1
    }

    const head = line[cursor]
    if (!/[0-7-]/.test(head)) {
      cursor += 1
      continue
    }

    cursor += 1

    let accidentalSuffix = ''
    let octave = ''
    let underBarCount = 0
    let dotCount = 0

    while (cursor < line.length) {
      const nextChar = line[cursor]

      if (nextChar === ',' || nextChar === "'" || nextChar === '"' || nextChar === 'g' || nextChar === 'd') {
        octave += nextChar
        cursor += 1
        continue
      }

      if (nextChar === '#' || nextChar === 'b' || nextChar === 'n') {
        accidentalSuffix = nextChar
        cursor += 1
        continue
      }

      if (nextChar === '_' || nextChar === '/' || nextChar === 'x') {
        underBarCount += 1
        cursor += 1
        continue
      }

      if (nextChar === '=') {
        underBarCount += 2
        cursor += 1
        continue
      }

      if (nextChar === '.') {
        dotCount += 1
        cursor += 1
        continue
      }

      break
    }

    const duration = buildDuration(underBarCount, dotCount, tuplet)
    if (tuplet) {
      tuplet.remaining -= 1
      if (tuplet.remaining <= 0) {
        tuplet = null
      }
    }

    if (head === '-') {
      tokens.push({
        kind: 'hold',
        token: '-',
        duration
      })
      continue
    }

    if (head === '0') {
      tokens.push({
        kind: 'rest',
        token: '0',
        duration
      })
      continue
    }

    const accidental = accidentalPrefix || accidentalSuffix
    const normalizedOctave = octave
      .replace(/g/g, "'")
      .replace(/d/g, ',')
      .replace(/"/g, "''")

    tokens.push({
      kind: 'note',
      token: `${accidental}${head}${normalizedOctave}`,
      duration
    })
  }

  return tokens
}

function buildDuration(
  underBarCount: number,
  dotCount: number,
  tuplet: { numerator: number; denominator: number } | null
): KuailepuDuration {
  let numerator = 1
  let denominator = 2 ** underBarCount

  for (let dotIndex = 0; dotIndex < dotCount; dotIndex += 1) {
    numerator = numerator * 2 + 1
    denominator *= 2
  }

  if (tuplet) {
    numerator *= tuplet.numerator
    denominator *= tuplet.denominator
  }

  const divisor = gcd(numerator, denominator)
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor
  }
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left)
  let b = Math.abs(right)

  while (b !== 0) {
    const temp = b
    b = a % b
    a = temp
  }

  return a || 1
}

function lcm(left: number, right: number): number {
  return Math.abs(left * right) / gcd(left, right)
}

export function buildKuailepuImportPreview(payload: KuailepuSongPayload): KuailepuImportPreview {
  const lyricBlocks = parseKuailepuLyricBlocks(payload.lyric)

  return {
    songUuid: payload.song_uuid ?? '',
    title: payload.song_name ?? '',
    aliasTitle: payload.alias_name ?? null,
    keynote: payload.keynote ?? null,
    meter: payload.rhythm ?? null,
    lyricBlocks,
    alignedLyricBlocks: buildAlignedLyricPreview(lyricBlocks),
    simplifiedNotationLines: simplifyKuailepuNotation(payload.notation)
  }
}

/**
 * 将快乐谱预览数据进一步整理成“可直接喂给当前站点渲染器”的候选结果。
 *
 * 这里的目标是尽量快地得到一个可人工验收的页面：
 * - 根据快乐谱 `keynote` 猜一个初始 tonic
 * - 再走当前项目已有的音域适配规则，避免出现大量 N/A 指法
 * - 保留快乐谱原始乐句/小节断行，避免节拍观感被“歌词对齐重排”破坏
 * - 再按每一行的可唱槽位切歌词，让当前页面既能看歌词，也不牺牲小节可读性
 * - 若歌词比旋律少少量槽位，就在对应行补 `_` 占位，避免最后一段被截断
 *
 * 注意：这仍然是“导入候选结果”，不是自动承诺可直接发布的最终 SongDoc。
 */
export function buildKuailepuRenderablePreview(
  payload: KuailepuSongPayload
): KuailepuRenderablePreview {
  const preview = buildKuailepuImportPreview(payload)
  const guessedTonicMidi = parseKeynoteToMidi(preview.keynote)
  const notes = parseNotation(preview.simplifiedNotationLines, guessedTonicMidi)
    .flat()
    .filter(token => token.kind === 'note')
    .map(token => token.midi)

  const recommendedShift = chooseBestRangeShift(notes, instrumentProfiles['ocarina-12'].range, {
    preferredOctaveShiftsFirst: instrumentProfiles['ocarina-12'].preferredOctaveShiftsFirst
  })
  const renderTonicMidi = guessedTonicMidi + recommendedShift
  const totalNoteSlots = countSingableSlots(
    parseNotation(preview.simplifiedNotationLines, renderTonicMidi).flat()
  )
  const primaryLyricBlockCount = choosePrimaryLyricBlockCount(
    preview.alignedLyricBlocks,
    totalNoteSlots
  )
  const primaryLyricBlocks = preview.alignedLyricBlocks.slice(0, primaryLyricBlockCount)
  const lyricLayout = sliceLyricsAcrossNotationLines(
    preview.simplifiedNotationLines,
    primaryLyricBlocks,
    renderTonicMidi
  )
  const extraLyricBlocks = lyricLayout.overflowLyricBlock
    ? [lyricLayout.overflowLyricBlock, ...preview.alignedLyricBlocks.slice(primaryLyricBlockCount)]
    : preview.alignedLyricBlocks.slice(primaryLyricBlockCount)

  return {
    ...preview,
    guessedTonicMidi,
    recommendedShift,
    renderTonicMidi,
    renderNotationLines: preview.simplifiedNotationLines,
    renderAlignedLyrics: lyricLayout.alignedLyrics,
    extraLyricBlocks,
    renderNoteSlotCounts: preview.simplifiedNotationLines.map(line =>
      countSingableSlots(parseNotation([line], renderTonicMidi)[0])
    ),
    renderLyricSlotCounts: lyricLayout.alignedLyrics.map(line => countSlots(line))
  }
}

/**
 * 按当前 notation 行的可唱槽位，把歌词连续切到每一行上。
 *
 * 为什么不再重排 notation 行：
 * - 用户已经发现像 Jingle Bells 这种歌，保留小节线但把整首歌拼成长行后，
 *   会在视觉上造成“一个小节里塞了很多音”的错觉
 * - 根因不是 barline 错，而是原始乐句断行被对齐逻辑破坏了
 * - 所以这里改成“保留快乐谱行结构，让歌词跟随 notation 行切片”
 *
 * 实现策略：
 * - 把主歌词块先摊平成连续 lyric slot 流
 * - 逐行读取 notation 的可唱槽位数
 * - 每一行从 lyric slot 流里切出等量歌词
 * - 如果歌词不足，就用 `_` 补齐
 * - 如果歌词有剩余，保留成 overflow block，避免悄悄丢失信息
 */
function sliceLyricsAcrossNotationLines(
  notationLines: string[],
  lyricBlocks: string[],
  tonicMidi: number
) {
  if (lyricBlocks.length === 0) {
    return {
      alignedLyrics: [] as string[],
      overflowLyricBlock: null as string | null
    }
  }

  const lyricSlots = lyricBlocks.flatMap(block => tokenizeAlignedLyricLine(block))
  const alignedLyrics: string[] = []
  let cursor = 0

  notationLines.forEach(line => {
    const noteCount = countSingableSlots(parseNotation([line], tonicMidi)[0] ?? [])
    if (noteCount <= 0) {
      alignedLyrics.push('')
      return
    }

    const consumed = lyricSlots.slice(cursor, cursor + noteCount)
    cursor += consumed.length

    if (consumed.length < noteCount) {
      consumed.push(...Array.from({ length: noteCount - consumed.length }, () => '_'))
    }

    alignedLyrics.push(consumed.join(' '))
  })

  return {
    alignedLyrics,
    overflowLyricBlock:
      cursor < lyricSlots.length ? lyricSlots.slice(cursor).join(' ') : null
  }
}

function countSlots(line: string) {
  return line.split(/\s+/).filter(Boolean).length
}

function tokenizeAlignedLyricLine(line: string) {
  return line.split(/\s+/).filter(Boolean)
}

/**
 * 从多段歌词里挑出“当前最像主渲染歌词”的那一组前缀块。
 *
 * 业务背景：
 * - 很多快乐谱歌曲会把多段 verse 一起塞进 lyric 数组
 * - 但当前项目详情页不是诗歌阅读器，而是“当前一版谱面对应一组正在演奏的歌词”
 * - 所以这里先选一个最贴近整首旋律槽位总数的前缀块数作为主渲染歌词
 *
 * 例如：
 * - Auld Lang Syne：前 2 块歌词加起来正好匹配整首 melody
 * - Jingle Bells：第 1 块歌词已经基本覆盖当前旋律，后面块更像额外 verse
 */
function choosePrimaryLyricBlockCount(lyricBlocks: string[], totalNoteSlots: number) {
  if (lyricBlocks.length === 0 || totalNoteSlots <= 0) return 0

  let bestCount = 1
  let bestDiff = Number.POSITIVE_INFINITY
  let runningSlots = 0

  lyricBlocks.forEach((block, index) => {
    runningSlots += countSlots(block)
    const diff = Math.abs(totalNoteSlots - runningSlots)

    if (diff < bestDiff) {
      bestDiff = diff
      bestCount = index + 1
    }
  })

  return bestCount
}

/**
 * 把快乐谱的 `1=G` 这类调号字符串先映射成当前预览可用的 tonic MIDI。
 *
 * 这里只做最小支持，默认把主音放在 C4-B4 这一带：
 * - C -> 60
 * - D -> 62
 * - E -> 64
 * - F -> 65
 * - G -> 67
 *
 * 这是“导入预览层”的猜测值，不等同于正式入库后的最终 tonicMidi。
 */
export function parseKeynoteToMidi(keynote: string | null) {
  const match = keynote?.match(/^1=([#b]?)([A-G])$/)
  if (!match) return 60

  const baseMap: Record<string, number> = {
    C: 60,
    D: 62,
    E: 64,
    F: 65,
    G: 67,
    A: 69,
    B: 71
  }

  const accidental = match[1] === '#' ? 1 : match[1] === 'b' ? -1 : 0
  return (baseMap[match[2]] ?? 60) + accidental
}

/**
 * 将快乐谱详情页上下文转换成当前项目可直接消费的轻量 SongDoc。
 *
 * 设计目标：
 * - 不把快乐谱原始大 JSON 直接塞进前台
 * - 只保留上线详情页真正需要的字段
 * - 默认以 `published: false` 进入项目，先走人工审阅，再决定是否对外公开
 */
export function buildKuailepuSongDoc(
  payload: KuailepuSongPayload,
  options: BuildKuailepuSongDocOptions = {}
): SongDoc {
  const preview = buildKuailepuRenderablePreview(payload)
  const importedOn = options.importedOn ?? new Date().toISOString().slice(0, 10)
  const title =
    options.title?.trim() ||
    payload.alias_name?.trim() ||
    payload.song_name?.trim() ||
    payload.song_uuid?.trim() ||
    'Untitled Song'
  const slug = sanitizeSongSlug(
    options.slug ||
      options.id ||
      payload.song_pinyin ||
      payload.song_uuid ||
      payload.song_name ||
      title
  )
  const id = sanitizeSongId(options.id || slug)
  const composer = payload.music_composer?.trim()
  const sourceUrl =
    options.sourceUrl?.trim() ||
    (payload.song_uuid ? `https://www.kuaiyuepu.com/jianpu/${payload.song_uuid}.html` : '')

  return {
    id,
    slug,
    title,
    description:
      options.description?.trim() ||
      buildImportedDescription(title, composer),
    published: options.published ?? false,
    alignedLyrics: preview.renderAlignedLyrics.length > 0 ? preview.renderAlignedLyrics : undefined,
    extraLyrics: preview.extraLyricBlocks.length > 0 ? preview.extraLyricBlocks : undefined,
    source: {
      title: 'Kuailepu detail-page snapshot',
      url: sourceUrl,
      rights:
        'Imported from a third-party detail page as notation reference only. Publish only after independent rights review.',
      note: `Raw context captured from Kuailepu song ${payload.song_uuid ?? 'unknown'} on ${importedOn}.`
    },
    meta: {
      key: formatKeynoteLabel(preview.keynote),
      tempo: extractTempoFromNotation(payload.notation),
      meter: preview.meter ?? '4/4'
    },
    review: {
      status: 'pending',
      checkedOn: importedOn,
      note: 'Imported from a Kuailepu detail page and normalized into the current lightweight renderer. Manual melody review is still required before publication.'
    },
    tonicMidi: preview.guessedTonicMidi,
    notation: preview.simplifiedNotationLines
  }
}

function sanitizeSongSlug(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'untitled-song'
}

function sanitizeSongId(value: string) {
  return sanitizeSongSlug(value)
}

function buildImportedDescription(title: string, composer?: string) {
  if (composer) {
    return `${title} melody reference imported from a Kuailepu detail page and normalized into the current lightweight ocarina-tab renderer. Source composer field: ${composer}.`
  }

  return `${title} melody reference imported from a Kuailepu detail page and normalized into the current lightweight ocarina-tab renderer.`
}

function formatKeynoteLabel(keynote: string | null) {
  if (!keynote) return '1 = C'
  const match = keynote.match(/^1=([#b]?)([A-G])$/)
  if (!match) return keynote
  return `1 = ${match[1]}${match[2]}`
}

function extractTempoFromNotation(rawNotation: string | undefined) {
  const match = rawNotation?.match(/\{bpm:(\d+)\}/i)
  return match ? Number(match[1]) : 100
}
