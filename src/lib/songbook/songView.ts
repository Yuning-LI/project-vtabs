import type { SongDoc } from '@/lib/songbook/types'
import { parseNotation } from '@/lib/songbook/jianpu'
import { chooseBestRangeShift } from '@/lib/songbook/rangeFit'
import { instrumentProfiles } from '@/lib/songbook/instruments'

/**
 * SongViewData 是“页面真正拿来渲染的那份数据”。
 *
 * 要区分两个概念：
 * 1. SongDoc：曲库原始存档，既包含当前稳定的手写简谱，也可能附带 ABC 试点数据。
 * 2. SongViewData：页面实际展示用的数据，已经按当前乐器和当前上线策略整理过。
 *
 * 当前上线策略：
 * - 前台稳定真相源 = 手写简谱 notation
 * - 前台默认展示 = 字母谱 + 指法图 + 歌词
 * - ABC 暂时只用于校验、导入试点和未来迁移准备，不直接驱动当前详情页
 */
type SongViewData = {
  viewMode: 'numbered' | 'staff'
  notation: string[]
  lyrics?: string[]
  alignedLyrics?: string[]
  extraLyrics?: string[]
  tonicMidi: number
  keyLabel: string
  abc?: string
  visualTranspose: number
}

/**
 * 组装详情页所需的最终视图数据。
 *
 * 为什么这里要单独算 `tonicMidi`：
 * - 曲库里写的 `1 = C` 是录谱时的原始基准
 * - 但某些旋律原调并不完全落在 12 孔陶笛音域里
 * - 为了让当前字母谱 / 指法图页面稳定可用，我们会优先在前台做一次“最佳整体移调”
 *
 * 结果：
 * - notation 文本本身不改
 * - 但 token -> MIDI 时会使用移调后的 tonic
 * - 因而前台看到的字母谱与指法图会是“适合当前乐器”的版本
 */
export function getSongViewData(song: SongDoc): SongViewData {
  const alignedLyrics = mergeAlignedLyricsPunctuation(song.alignedLyrics, song.lyrics)
  const baseData = {
    notation: song.notation,
    lyrics: song.lyrics,
    alignedLyrics,
    extraLyrics: song.extraLyrics
  }

  const visualTranspose = chooseBestTransposeShift(baseData.notation, song.tonicMidi)
  const tonicMidi = song.tonicMidi + visualTranspose

  return {
    viewMode: 'numbered',
    notation: baseData.notation,
    lyrics: baseData.lyrics,
    alignedLyrics: baseData.alignedLyrics,
    extraLyrics: baseData.extraLyrics,
    tonicMidi,
    keyLabel: `1 = ${formatKeyName(tonicMidi)}`,
    abc: song.abc,
    visualTranspose
  }
}

/**
 * 将普通歌词里的标点安全地补回 alignedLyrics。
 *
 * 业务背景：
 * - 很多早期手工 `alignedLyrics` 只保留了对位需要的 syllable 切分，没有保留逗号句号问号
 * - 页面现在已经确认“标点跟在歌词 token 后面显示”不会新增槽位，也不会破坏对位
 * - 所以后续应优先把原歌词里的标点补回去，而不是继续展示“去标点版本”
 *
 * 安全边界：
 * - 只有在 `lyrics` 和 `alignedLyrics` 行数一致时才尝试补标点
 * - 逐词匹配失败时，直接回退原 `alignedLyrics`，不做猜测式改写
 */
function mergeAlignedLyricsPunctuation(
  alignedLyrics: SongDoc['alignedLyrics'],
  lyrics: SongDoc['lyrics']
) {
  if (!alignedLyrics?.length) return alignedLyrics
  if (!lyrics?.length || lyrics.length !== alignedLyrics.length) return alignedLyrics

  return alignedLyrics.map((alignedLine, index) =>
    mergeAlignedLinePunctuation(alignedLine, lyrics[index] ?? '')
  )
}

function mergeAlignedLinePunctuation(alignedLine: string, lyricLine: string) {
  const alignedTokens = alignedLine.split(/\s+/).filter(Boolean)
  const sourceWords = lyricLine.match(/[^\s]+/g) ?? []
  const mergedTokens = [...alignedTokens]
  let alignedCursor = 0

  for (const sourceWord of sourceWords) {
    const normalizedSource = normalizeLyricWord(sourceWord)
    if (!normalizedSource) continue

    const consumedIndices: number[] = []
    let built = ''

    while (alignedCursor < alignedTokens.length && built.length < normalizedSource.length) {
      const token = alignedTokens[alignedCursor]
      alignedCursor += 1

      if (token === '_') continue

      built += normalizeLyricWord(token)
      consumedIndices.push(alignedCursor - 1)

      if (!normalizedSource.startsWith(built)) {
        return alignedLine
      }
    }

    if (built !== normalizedSource || consumedIndices.length === 0) {
      return alignedLine
    }

    const suffixPunctuation = extractTrailingPunctuation(sourceWord)
    if (suffixPunctuation.length > 0) {
      const lastIndex = consumedIndices[consumedIndices.length - 1]
      if (!mergedTokens[lastIndex].endsWith(suffixPunctuation)) {
        mergedTokens[lastIndex] += suffixPunctuation
      }
    }
  }

  return mergedTokens.join(' ')
}

function normalizeLyricWord(word: string) {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function extractTrailingPunctuation(word: string) {
  const match = word.match(/[^a-z0-9'"]+$/i)
  return match?.[0] ?? ''
}

/**
 * 为当前乐器选择最合适的整体移调。
 *
 * 这里的目标不是“最忠于原调”，而是“尽量全部落进当前乐器音域，同时尽量少改歌曲感觉”。
 * 具体排序规则在 rangeFit.ts：
 * - 先尽量让超音域音符数最少
 * - 用户要求过：如果整八度能解决，优先整八度
 * - 做不到时，再选尽量小的半音移动
 */
function chooseBestTransposeShift(notation: string[], tonicMidi: number) {
  const parsed = parseNotation(notation, tonicMidi)
  const notes = parsed.flat().filter(token => token.kind === 'note').map(token => token.midi)
  const profile = instrumentProfiles['ocarina-12']
  return chooseBestRangeShift(notes, profile.range, {
    preferredOctaveShiftsFirst: profile.preferredOctaveShiftsFirst
  })
}

/**
 * 把当前 `1 = X` 的 tonic MIDI 转成人类可读的调名。
 *
 * 当前用于标题下的元信息，例如：
 * - `1 = C`
 * - `1 = Bb`
 */
function formatKeyName(tonicMidi: number) {
  const noteMap: Record<number, string> = {
    0: 'C',
    1: 'Db',
    2: 'D',
    3: 'Eb',
    4: 'E',
    5: 'F',
    6: 'Gb',
    7: 'G',
    8: 'Ab',
    9: 'A',
    10: 'Bb',
    11: 'B'
  }

  return noteMap[((tonicMidi % 12) + 12) % 12]
}
