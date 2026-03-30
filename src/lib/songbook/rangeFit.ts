type RangeFitCandidate = {
  shift: number
  outCount: number
  overflowPenalty: number
  centerPenalty: number
  octaveAligned: boolean
}

/**
 * 为当前乐器选择“最合适的整体移调”。
 *
 * 这是当前项目里一个很重要但容易被误解的业务规则：
 * - 这里不是做音乐理论上的最佳转调建议
 * - 而是在“尽量少失真”的前提下，把一首歌尽量压进目标乐器音域
 *
 * 当前之所以必须有这层，是因为：
 * - 我们的曲库里有很多大众旋律，原调并不都适合 12 孔陶笛
 * - 如果不做整体移调，页面会出现大量 N/A 指法
 * - 用户会认为是网站坏了，而不是“这首歌原调不适合这支陶笛”
 *
 * 选择规则按优先级大致是：
 * 1. 超音域音符数尽量少
 * 2. 超出的总距离尽量小
 * 3. 如果允许，优先整八度移动（用户明确要求过）
 * 4. 再选绝对位移更小的方案
 * 5. 最后再看整体是否更靠近乐器舒适区中心
 *
 * 这套逻辑既服务当前字母谱前台，也服务未来 ABC / 五线谱路线。
 */
export function chooseBestRangeShift(
  notes: number[],
  range: [number, number],
  options?: { preferredOctaveShiftsFirst?: boolean }
) {
  const [rangeMin, rangeMax] = range
  const rangeMid = (rangeMin + rangeMax) / 2
  const candidates: RangeFitCandidate[] = []

  if (notes.length === 0) return 0

  for (let shift = -24; shift <= 24; shift += 1) {
    let outCount = 0
    let overflowPenalty = 0
    let centerPenalty = 0

    notes.forEach(note => {
      const shifted = note + shift
      if (shifted < rangeMin) {
        outCount += 1
        overflowPenalty += rangeMin - shifted
      } else if (shifted > rangeMax) {
        outCount += 1
        overflowPenalty += shifted - rangeMax
      }

      centerPenalty += Math.abs(shifted - rangeMid)
    })

    candidates.push({
      shift,
      outCount,
      overflowPenalty,
      centerPenalty,
      octaveAligned: shift % 12 === 0
    })
  }

  const minOutCount = Math.min(...candidates.map(candidate => candidate.outCount))
  const byOutCount = candidates.filter(candidate => candidate.outCount === minOutCount)
  const minOverflow = Math.min(...byOutCount.map(candidate => candidate.overflowPenalty))
  const rangeCandidates = byOutCount.filter(candidate => candidate.overflowPenalty === minOverflow)
  const octaveCandidates = rangeCandidates.filter(candidate => candidate.octaveAligned)

  const preferredPool =
    options?.preferredOctaveShiftsFirst !== false && octaveCandidates.length > 0
      ? octaveCandidates
      : rangeCandidates

  preferredPool.sort((left, right) => {
    const absShiftDiff = Math.abs(left.shift) - Math.abs(right.shift)
    if (absShiftDiff !== 0) return absShiftDiff

    const centerDiff = left.centerPenalty - right.centerPenalty
    if (centerDiff !== 0) return centerDiff

    return Math.abs(left.shift % 12) - Math.abs(right.shift % 12)
  })

  return preferredPool[0]?.shift ?? 0
}
