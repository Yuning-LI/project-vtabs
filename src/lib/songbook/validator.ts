import type { SongDoc } from './types.ts'
import { countSingableSlots, parseNotation, tokenizeLyricLine } from './jianpu.ts'
import { parseAbcTune } from './abcImport.ts'
import { instrumentProfiles } from './instruments.ts'
import { chooseBestRangeShift } from './rangeFit.ts'

/**
 * 这个文件的角色不是“渲染前校验一下语法”这么简单，
 * 而是当前项目里最重要的导入安全网之一。
 *
 * 我们的长期目标仍然是：
 * - 后端主存 ABC
 * - 前端按乐器渲染五线谱 / 字母谱 / 指法图
 *
 * 但在真正全量迁过去之前，必须回答两个问题：
 * 1. 这份 ABC 能不能正确解析？
 * 2. 解析出来的旋律，和我们现在已经人工验证过的简谱是不是同一首歌？
 *
 * 所以 validateSong 现在同时做三类事：
 * - 基础解析校验
 * - 歌词 / 音域 / 和弦等业务校验
 * - ABC 与现有手写简谱的自动比对
 *
 * 这能避免“ABC 解析成功，但其实音高顺序错了”这种最危险的问题。
 */
export type ValidationIssue = {
  severity: 'error' | 'warning' | 'info'
  code: string
  message: string
}

export type InstrumentFitResult = {
  instrumentId: string
  recommendedShift: number
  outOfRangeCount: number
}

export type SongValidationReport = {
  songId: string
  title: string
  grade: 'A' | 'B' | 'C' | 'D'
  score: number
  issues: ValidationIssue[]
  chordSymbols: string[]
  instrumentFits: InstrumentFitResult[]
  abcComparison?: {
    manualNoteCount: number
    abcNoteCount: number
    recommendedShift: number
    mismatchCount: number
    exactMatch: boolean
  }
}

/**
 * 生成单首歌曲的校验报告。
 *
 * 注意这里的策略：
 * - 没有 ABC 不是错误，只记为 info，因为当前前台仍允许走手写简谱真相源
 * - 有 ABC 时，必须尽量证明它和现有手写简谱是一致的
 * - 校验报告最后会给出 grade/score，便于后续做导入队列管理
 */
export function validateSong(song: SongDoc): SongValidationReport {
  const issues: ValidationIssue[] = []
  const chordSymbols: string[] = []
  let noteMidis: number[] = []
  let abcComparison: SongValidationReport['abcComparison']
  const lyricLines = song.alignedLyrics ?? song.lyrics
  const manualNoteMidis = parseNotation(song.notation, song.tonicMidi)
    .flat()
    .filter(token => token.kind === 'note')
    .map(token => token.midi)
  const parsedNotationLines = parseNotation(song.notation, song.tonicMidi)

  if (song.abc) {
    try {
      const parsed = parseAbcTune(song.abc)
      chordSymbols.push(...parsed.chordSymbols)
      noteMidis = parsed.noteEvents.filter(event => event.midi !== null).map(event => event.midi as number)

      /**
       * 这里是当前迁移路线里最关键的保护措施：
       * - manualNoteMidis 来自当前稳定线上数据
       * - noteMidis 来自 ABC 解析
       *
       * 如果两者在合理移调后仍然对不上，就说明：
       * - 这份 ABC 不适合作为真相源，或者
       * - 我们的 ABC 转换/导入逻辑还不够稳
       *
       * 结论：不能贸然切换前台依赖。
       */
      abcComparison = compareManualNotationToAbc(manualNoteMidis, noteMidis)

      if (parsed.noteEvents.length === 0) {
        issues.push({
          severity: 'error',
          code: 'abc-empty',
          message: 'ABC parsed successfully but produced no note events.'
        })
      }

      if (lyricLines) {
        const lyricCount = countLyricSlots(lyricLines)
        const singableEvents = parsed.noteEvents.filter(event => !event.isRest).length
        if (Math.abs(lyricCount - singableEvents) > 2) {
          issues.push({
            severity: 'warning',
            code: 'lyrics-mismatch',
            message: `Lyric syllable count (${lyricCount}) differs from singable events (${singableEvents}).`
          })
        }
      }

      if (abcComparison.manualNoteCount !== abcComparison.abcNoteCount) {
        issues.push({
          severity: 'warning',
          code: 'abc-manual-length-mismatch',
          message: `Manual notation has ${abcComparison.manualNoteCount} notes but ABC has ${abcComparison.abcNoteCount}.`
        })
      } else if (!abcComparison.exactMatch) {
        issues.push({
          severity: 'warning',
          code: 'abc-manual-pitch-mismatch',
          message: `ABC and manual notation differ at ${abcComparison.mismatchCount} note positions after best shift ${abcComparison.recommendedShift}.`
        })
      }
    } catch (error) {
      issues.push({
        severity: 'error',
        code: 'abc-parse-failed',
        message: error instanceof Error ? error.message : 'ABC parse failed.'
      })
    }
  } else {
    noteMidis = manualNoteMidis
    issues.push({
      severity: 'info',
      code: 'no-abc',
      message: 'Song currently falls back to manual numbered notation.'
    })
  }

  if (lyricLines) {
    if (lyricLines.length !== parsedNotationLines.length) {
      issues.push({
        severity: 'warning',
        code: 'lyrics-line-count-mismatch',
        message: `Lyrics have ${lyricLines.length} lines but notation has ${parsedNotationLines.length} lines.`
      })
    }

    lyricLines.forEach((line, index) => {
      const noteSlots = countSingableSlots(parsedNotationLines[index] ?? [])
      const lyricSlots = countLyricSlots([line])
      if (noteSlots !== lyricSlots) {
        issues.push({
          severity: 'warning',
          code: 'lyrics-line-slot-mismatch',
          message: `Line ${index + 1} lyric slots (${lyricSlots}) differ from singable note slots (${noteSlots}).`
        })
      }
    })
  }

  const instrumentFits = Object.values(instrumentProfiles).map(profile => {
    const shift = chooseBestRangeShift(noteMidis, profile.range, {
      preferredOctaveShiftsFirst: profile.preferredOctaveShiftsFirst
    })
    const outOfRangeCount = noteMidis.filter(midi => {
      const shifted = midi + shift
      return shifted < profile.range[0] || shifted > profile.range[1]
    }).length

    if (outOfRangeCount > 0) {
      issues.push({
        severity: profile.id === 'ocarina-12' ? 'warning' : 'info',
        code: `range-${profile.id}`,
        message: `${profile.name} still has ${outOfRangeCount} notes out of range after recommended shift ${shift}.`
      })
    }

    return {
      instrumentId: profile.id,
      recommendedShift: shift,
      outOfRangeCount
    }
  })

  const { grade, score } = scoreReport(song, issues, chordSymbols, instrumentFits)

  return {
    songId: song.id,
    title: song.title,
    grade,
    score,
    issues,
    chordSymbols,
    instrumentFits,
    abcComparison
  }
}

/**
 * 当前歌词计数是“面向上线实用”的轻量规则，不是完整歌词语义引擎。
 *
 * 这里主要用来做异常检测：
 * - 如果歌词 token 数和可唱音符事件差距很大，就说明这首歌值得人工复核
 *
 * 真正完整的 ABC lyrics 规则（melisma、连续下划线、更多 divider 语义）
 * 以后仍然可以继续补强，但这一步已经足够拦截大量脏数据。
 */
function countLyricSlots(lines: string[]) {
  return lines
    .flatMap(line => tokenizeLyricLine(line))
    .length
}

/**
 * 将复杂校验结果压成一个可排序的 score / grade。
 *
 * 这不是音乐上的“质量评分”，而是“导入和上线可信度评分”：
 * - A：可以优先作为 ABC 主源候选
 * - B：基本可用，但还在手写简谱兜底阶段
 * - C / D：应该先修数据，不宜直接进入主流程
 */
function scoreReport(
  song: SongDoc,
  issues: ValidationIssue[],
  chordSymbols: string[],
  instrumentFits: InstrumentFitResult[]
) {
  let score = 100

  issues.forEach(issue => {
    if (issue.severity === 'error') score -= 45
    if (issue.severity === 'warning') score -= 20
    if (issue.severity === 'info') score -= 5
  })

  if (!song.abc) {
    score -= 15
  }

  const ocarinaFit = instrumentFits.find(fit => fit.instrumentId === 'ocarina-12')
  if (ocarinaFit?.outOfRangeCount) {
    score -= 25
  }

  if (song.lyrics?.length) {
    score += 5
  }

  if (chordSymbols.length > 0) {
    score += 3
  }

  score = Math.max(0, Math.min(100, score))

  if (score >= 90) return { grade: 'A' as const, score }
  if (score >= 75) return { grade: 'B' as const, score }
  if (score >= 55) return { grade: 'C' as const, score }
  return { grade: 'D' as const, score }
}

/**
 * 用当前稳定的手写简谱去反校验 ABC。
 *
 * 逻辑：
 * - 两边都先落成 MIDI 序列
 * - 在 -24 到 +24 半音范围里找“整体最佳平移”
 * - 统计长度差和逐音不一致数
 *
 * 为什么允许整体平移：
 * - 同一首歌可能只是录在不同调上
 * - 我们真正关心的是旋律轮廓和音程序列是否一致
 * - 如果只是全曲整体移调，业务上通常是可接受的
 */
function compareManualNotationToAbc(manual: number[], abc: number[]) {
  let bestShift = 0
  let bestMismatch = Number.POSITIVE_INFINITY

  for (let shift = -24; shift <= 24; shift += 1) {
    const lengthPenalty = Math.abs(manual.length - abc.length)
    const overlap = Math.min(manual.length, abc.length)
    let mismatchCount = lengthPenalty

    for (let index = 0; index < overlap; index += 1) {
      if (manual[index] !== abc[index] + shift) {
        mismatchCount += 1
      }
    }

    if (
      mismatchCount < bestMismatch ||
      (mismatchCount === bestMismatch && Math.abs(shift) < Math.abs(bestShift))
    ) {
      bestMismatch = mismatchCount
      bestShift = shift
    }
  }

  return {
    manualNoteCount: manual.length,
    abcNoteCount: abc.length,
    recommendedShift: bestShift,
    mismatchCount: Number.isFinite(bestMismatch) ? bestMismatch : Math.max(manual.length, abc.length),
    exactMatch: bestMismatch === 0
  }
}
