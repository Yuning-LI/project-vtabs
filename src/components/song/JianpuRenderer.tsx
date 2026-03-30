'use client'

import FingeringDiagram from '@/components/song/FingeringDiagram'
import {
  countSingableSlots,
  getTokenVisual,
  parseNotation,
  tokenizeLyricLine,
  tokenHasFingering,
  tokenToLabel
} from '@/lib/songbook/jianpu'

/**
 * 当前详情页的主渲染器。
 *
 * 历史上它最早承担的是“专业简谱 + 指法图”页面，
 * 但现在对外默认展示已经切成“字母谱 + 指法图 + 歌词”。
 *
 * 之所以没有直接改名，是因为这个组件内部沉淀了当前最稳定的三件事：
 * - 基于 token 的小节拆分
 * - 基于 MIDI 的指法映射
 * - 基于可唱音符槽位的歌词对齐
 *
 * 所以当前可以把它理解成：
 * “用手写简谱作为数据真相源，渲染成字母谱或简谱页面”的统一 renderer。
 */
type JianpuRendererProps = {
  notation: string[]
  tonicMidi: number
  lyrics?: string[]
  displayMode?: 'numbered' | 'letter'
}

export default function JianpuRenderer({
  notation,
  tonicMidi,
  lyrics,
  displayMode = 'letter'
}: JianpuRendererProps) {
  const hasLyrics = Boolean(lyrics?.length)

  /**
   * 页面渲染的第一步永远是：
   * notation -> ParsedToken -> MIDI
   *
   * 这样做的业务意义是：
   * - 指法图永远跟着真实音高走
   * - 字母谱永远跟着真实音高走
   * - 歌词对位永远跟着音符槽位走
   *
   * 不让 JSX 直接操作原始字符串，是为了避免再次回到“看起来能显示，但语义会错位”的状态。
   */
  const parsedLines = parseNotation(notation, tonicMidi)
  const visibleTokenLines = parsedLines.map(line => line.filter(token => token.kind !== 'bar'))
  const lyricTokenLines = lyrics?.map((line, index) => {
    const lyricTokens = tokenizeLyricLine(line)
    let lyricCursor = 0

    return visibleTokenLines[index]?.map(token => {
      if (token.kind !== 'note') return '\u00A0'

      const lyric = lyricTokens[lyricCursor]
      lyricCursor += 1
      return lyric || '\u00A0'
    }) ?? []
  })
  const lyricMismatchByLine = lyrics?.map((line, index) => {
    const parsedLine = visibleTokenLines[index] ?? []
    const noteSlots = countSingableSlots(parsedLine)
    const lyricSlots = (line.match(/[^|\s]+/g) ?? []).length
    return lyricSlots !== noteSlots
  })
  const flattenedEntries = visibleTokenLines.flatMap((lineTokens, lineIndex) =>
    lineTokens.map((token, tokenIndex) => ({
      token,
      key: `token-${lineIndex}-${tokenIndex}`,
      lyric: lyricTokenLines?.[lineIndex]?.[tokenIndex] || '\u00A0'
    }))
  )
  const renderEntries = flattenedEntries.reduce<
    Array<{
      token: (typeof flattenedEntries)[number]['token']
      key: string
      lyric: string
      repeatCount: number
    }>
  >((entries, entry) => {
    const previous = entries[entries.length - 1]
    const canMergeTimingRun =
      previous &&
      previous.token.kind !== 'note' &&
      entry.token.kind !== 'note' &&
      previous.token.kind === entry.token.kind

    /**
     * 连续 hold/rest 是时值信息，不是需要逐个阅读的内容。
     *
     * 如果把它们全部按原始 token 宽度平铺，Wedding March 这类长音多的曲子
     * 会被大量“几乎空白”的占位撑开，视觉上像算法凭空加了很多空格。
     *
     * 这里把连续 timing token 合并成一个更紧凑的视觉块：
     * - 保留长短关系
     * - 明显减少无意义留白
     */
    if (canMergeTimingRun) {
      previous.repeatCount += 1
      previous.key += `-${entry.key}`
      return entries
    }

    entries.push({
      ...entry,
      repeatCount: 1
    })
    return entries
  }, [])

  return (
    <section className="rounded-[22px] border border-stone-200/80 bg-white px-3 py-4 shadow-[0_16px_44px_rgba(84,58,32,0.08)] md:px-5 md:py-5">
      {lyricMismatchByLine?.some(Boolean) ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Lyric alignment data for this song is incomplete. Notes still render, but lyric-to-note placement may be off.
        </div>
      ) : null}
      <div className="pb-1">
        <div className="flex w-full flex-wrap items-start justify-start gap-y-3">
          {renderEntries.map(({ token, key, lyric, repeatCount }) => {
                      const visual = getTokenVisual(token)
                      const hasFingering = tokenHasFingering(token)
                      const noteMidi = token.kind === 'note' ? token.midi : null
                      const letterLabel = tokenToLabel(token)
                      const letterParts = splitLetterLabel(letterLabel)
                      const cellWidthClass =
                        token.kind === 'note'
                          ? 'w-[clamp(2rem,8vw,3.1rem)]'
                          : ''
                      const timingWidthRem =
                        token.kind === 'note'
                          ? null
                          : Math.min(1.45, 0.38 + (repeatCount - 1) * 0.14)

                      return (
                        <div
                          key={key}
                          className={`flex shrink-0 flex-col items-center text-center ${cellWidthClass}`}
                          style={timingWidthRem ? { width: `${timingWidthRem}rem` } : undefined}
                        >
                          <div className="flex h-[clamp(3rem,13vw,4.75rem)] items-end justify-center">
                            {noteMidi !== null && hasFingering ? (
                              <FingeringDiagram
                                midi={noteMidi}
                                className="h-[clamp(1.8rem,7vw,3.15rem)] w-[clamp(2.35rem,9vw,4rem)]"
                              />
                            ) : noteMidi !== null ? (
                              <FingeringDiagram
                                midi={noteMidi}
                                muted
                                className="h-[clamp(1.8rem,7vw,3.15rem)] w-[clamp(2.35rem,9vw,4rem)] opacity-45"
                              />
                            ) : (
                              <div className="h-9" />
                            )}
                          </div>

                          <div className="relative mt-[1px] flex min-h-[3.25rem] w-full flex-col items-center justify-center">
                            {displayMode === 'letter' ? (
                              /**
                               * 当前线上默认模式。
                               *
                               * 设计原则：
                               * - 欧美用户优先识别字母音名
                               * - 八度数字弱化显示，不与主字母抢主视觉
                                   * - hold/pause 直接显示成功能性标签，不伪装成音名
                               */
                              <div className="flex min-h-[34px] items-center justify-center">
                                {letterParts.kind === 'note' ? (
                                  <div className="rounded-full border border-stone-200 bg-stone-50 px-2 py-1 font-mono text-stone-900 shadow-[0_2px_6px_rgba(84,58,32,0.05)]">
                                    <span className="text-[clamp(0.72rem,3.4vw,0.95rem)] font-semibold tracking-[-0.04em]">
                                      {letterParts.letter}
                                    </span>
                                    {letterParts.accidental ? (
                                      <span className="ml-[1px] align-top text-[clamp(0.45rem,2vw,0.625rem)] font-semibold">
                                        {letterParts.accidental}
                                      </span>
                                    ) : null}
                                    <span className="ml-[1px] align-baseline text-[clamp(0.45rem,2vw,0.625rem)] text-stone-500">
                                      {letterParts.octave}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[clamp(0.7rem,3vw,0.875rem)] font-medium leading-none text-stone-500">
                                    {letterParts.kind === 'hold' ? '—' : 'Pause'}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <>
                                <div className="min-h-[10px] text-[10px] leading-none text-stone-600">
                                  {visual.upperDots > 0 ? '•'.repeat(visual.upperDots) : '\u00A0'}
                                </div>

                                <div className="relative flex items-start justify-center leading-none text-stone-900">
                                  {visual.accidental ? (
                                    <span className="mr-[1px] pt-[1px] text-[10px] font-semibold">
                                      {visual.accidental}
                                    </span>
                                  ) : null}
                                  <span className="text-[18px] font-semibold tracking-[-0.04em]">
                                    {visual.main}
                                  </span>
                                </div>

                                <div className="min-h-[12px] text-[10px] leading-none text-stone-600">
                                  {visual.lowerDots > 0 ? '•'.repeat(visual.lowerDots) : '\u00A0'}
                                </div>
                              </>
                            )}

                            {hasLyrics ? (
                              /**
                               * 歌词必须跟 token 槽位走，而不是跟原字符串宽度或 DOM 位置走。
                               *
                               * 如果当前歌曲没有歌词，这一行就完全不渲染：
                               * - 避免纯音乐曲目底下出现一排空白歌词占位
                               * - 让纯旋律页面更紧凑，也更符合用户预期
                               */
                              <div className="mt-[1px] min-h-[18px] px-1 text-[clamp(0.68rem,2.8vw,0.875rem)] leading-none text-stone-700">
                                {lyric}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
          })}
        </div>
      </div>
    </section>
  )
}

/**
 * 将 `Bb4` / `C5` 拆成适合 UI 分层展示的结构。
 *
 * 为什么要单独拆：
 * - 主字母是用户扫读旋律时最重要的信息
 * - 升降号和八度是次一级信息，视觉上不应该和主字母等权
 * - 这能让“字母谱”更接近真实可读的 tabs，而不是一串平铺文本
 */
function splitLetterLabel(label: string) {
  if (label === 'Hold') return { kind: 'hold' as const }
  if (label === 'Pause') return { kind: 'rest' as const }
  if (label === 'Out' || !label) return { kind: 'rest' as const }

  const match = label.match(/^([A-G])([b#]?)(\d)$/)
  if (!match) {
    return { kind: 'rest' as const }
  }

  return {
    kind: 'note' as const,
    letter: match[1],
    accidental: match[2],
    octave: match[3]
  }
}
