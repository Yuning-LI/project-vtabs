import { countSingableSlots, parseNotation, tokenizeLyricLine } from './jianpu.ts'

export type LyricAuditIssue = {
  severity: 'warning' | 'info'
  code: string
  message: string
}

type AuditLyricAlignmentInput = {
  notationLines: string[]
  tonicMidi: number
  lyricLines?: string[] | null
}

type FlattenedNotePosition = {
  noteIndex: number
  lineIndex: number
  lineNoteIndex: number
  midi: number
}

const PLACEHOLDER = '\u00A0'

export function auditLyricAlignment({
  notationLines,
  tonicMidi,
  lyricLines
}: AuditLyricAlignmentInput): LyricAuditIssue[] {
  if (!lyricLines?.length) {
    return []
  }

  const issues: LyricAuditIssue[] = []
  const parsedNotationLines = parseNotation(notationLines, tonicMidi)

  if (lyricLines.length !== parsedNotationLines.length) {
    issues.push({
      severity: 'warning',
      code: 'lyrics-line-count-mismatch',
      message: `Lyrics have ${lyricLines.length} lines but notation has ${parsedNotationLines.length} lines.`
    })
  }

  const lyricCount = countLyricSlots(lyricLines)
  const singableEvents = parsedNotationLines
    .flat()
    .filter(token => token.kind === 'note').length
  if (Math.abs(lyricCount - singableEvents) > 2) {
    issues.push({
      severity: 'warning',
      code: 'lyrics-mismatch',
      message: `Lyric syllable count (${lyricCount}) differs from singable events (${singableEvents}).`
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

  issues.push(...auditSuspiciousLyricTokens(lyricLines))
  issues.push(...auditRepeatedPhraseOffsetRisk(parsedNotationLines, lyricLines))

  return dedupeLyricAuditIssues(issues)
}

function countLyricSlots(lines: string[]) {
  return lines.flatMap(line => tokenizeLyricLine(line)).length
}

function auditSuspiciousLyricTokens(lines: string[]) {
  const issues: LyricAuditIssue[] = []

  lines.forEach((line, lineIndex) => {
    const tokens = tokenizeLyricLine(line)

    tokens.forEach(token => {
      const printable = token === PLACEHOLDER ? '_' : token

      if (/^\d+(?:[.)_-]{2,}|[.]{2,})(?=[A-Za-z])/.test(printable)) {
        issues.push({
          severity: 'warning',
          code: 'lyrics-ocr-prefix-noise',
          message: `Line ${lineIndex + 1} contains a lyric token that looks like fused verse-number/OCR residue: "${printable}".`
        })
      }

      if (/[.]{4,}/.test(printable) || /[_-]{4,}/.test(printable)) {
        issues.push({
          severity: 'warning',
          code: 'lyrics-ocr-punctuation-noise',
          message: `Line ${lineIndex + 1} contains an unusually noisy lyric token: "${printable}".`
        })
      }

      if (/[;:]/.test(printable)) {
        issues.push({
          severity: 'info',
          code: 'lyrics-runtime-risk-punctuation',
          message: `Line ${lineIndex + 1} contains ";" or ":" inside aligned lyrics; Happy123/Kuailepu runtime may miscount that slot.`
        })
      }
    })

    const quoteCount = (line.match(/["“”]/g) ?? []).length
    if (quoteCount % 2 === 1) {
      issues.push({
        severity: 'info',
        code: 'lyrics-unbalanced-quotes',
        message: `Line ${lineIndex + 1} has an unmatched quote mark; verify whether punctuation was merged into the lyric stream incorrectly.`
      })
    }
  })

  return issues
}

function auditRepeatedPhraseOffsetRisk(
  parsedNotationLines: ReturnType<typeof parseNotation>,
  lyricLines: string[]
) {
  const notePositions: FlattenedNotePosition[] = []
  const lyricTokens = lyricLines.flatMap(line => tokenizeLyricLine(line))
  let noteIndex = 0

  parsedNotationLines.forEach((line, lineIndex) => {
    let lineNoteIndex = 0
    line.forEach(token => {
      if (token.kind !== 'note') return
      notePositions.push({
        noteIndex,
        lineIndex,
        lineNoteIndex,
        midi: token.midi
      })
      noteIndex += 1
      lineNoteIndex += 1
    })
  })

  if (notePositions.length === 0 || notePositions.length !== lyricTokens.length) {
    return []
  }

  const issues: LyricAuditIssue[] = []
  const seen = new Set<string>()
  const normalizedLyrics = lyricTokens.map(normalizeLyricTokenForComparison)
  const maxWindowLength = Math.min(8, notePositions.length)

  for (let windowLength = 4; windowLength <= maxWindowLength; windowLength += 1) {
    for (let startA = 0; startA <= notePositions.length - windowLength; startA += 1) {
      const melodyA = notePositions.slice(startA, startA + windowLength).map(position => position.midi)

      for (
        let startB = startA + windowLength;
        startB <= notePositions.length - windowLength && startB - startA <= 48;
        startB += 1
      ) {
        const melodyB = notePositions.slice(startB, startB + windowLength).map(position => position.midi)
        if (!numberArraysEqual(melodyA, melodyB)) {
          continue
        }

        const lyricsA = normalizedLyrics.slice(startA, startA + windowLength)
        const lyricsB = normalizedLyrics.slice(startB, startB + windowLength)

        if (
          Math.min(
            lyricsA.filter(isMeaningfulLyricToken).length,
            lyricsB.filter(isMeaningfulLyricToken).length
          ) < 3
        ) {
          continue
        }

        if (stringArraysEqual(lyricsA, lyricsB)) {
          continue
        }

        if (!matchesSingleTokenOffset(lyricsA, lyricsB)) {
          continue
        }

        const key = `${startA}:${startB}`
        if (seen.has(key)) {
          continue
        }
        seen.add(key)

        const lineA = notePositions[startA]!.lineIndex + 1
        const lineB = notePositions[startB]!.lineIndex + 1
        issues.push({
          severity: 'warning',
          code: 'lyrics-repeated-phrase-offset-risk',
          message: `Repeated melody spans near lines ${lineA} and ${lineB} only align after a one-token lyric shift; review refrain/repeat lyric anchoring.`
        })
      }
    }
  }

  return issues
}

function normalizeLyricTokenForComparison(token: string) {
  if (token === PLACEHOLDER) {
    return '_'
  }

  const normalized = token
    .toLowerCase()
    .replace(/^[^a-z0-9]+/i, '')
    .replace(/[^a-z0-9]+$/i, '')

  return normalized || '<punct>'
}

function isMeaningfulLyricToken(token: string) {
  return Boolean(token && token !== '_' && token !== '<punct>')
}

function matchesSingleTokenOffset(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false
  }

  const leftEdge = left[0]!
  const rightEdge = right[0]!
  const leftTail = left[left.length - 1]!
  const rightTail = right[right.length - 1]!

  if (
    stringArraysEqual(left.slice(1), right.slice(0, -1)) &&
    isSuspiciousShiftToken(leftEdge)
  ) {
    return true
  }

  if (
    stringArraysEqual(left.slice(0, -1), right.slice(1)) &&
    isSuspiciousShiftToken(leftTail)
  ) {
    return true
  }

  if (
    stringArraysEqual(right.slice(1), left.slice(0, -1)) &&
    isSuspiciousShiftToken(rightEdge)
  ) {
    return true
  }

  if (
    stringArraysEqual(right.slice(0, -1), left.slice(1)) &&
    isSuspiciousShiftToken(rightTail)
  ) {
    return true
  }

  return false
}

function isSuspiciousShiftToken(token: string) {
  if (!token || token === '_') {
    return false
  }

  return token === '<punct>' || /^\d/.test(token) || /[._-]{2,}/.test(token)
}

function numberArraysEqual(left: number[], right: number[]) {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

function stringArraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

function dedupeLyricAuditIssues(issues: LyricAuditIssue[]) {
  const seen = new Set<string>()
  return issues.filter(issue => {
    const key = `${issue.code}:${issue.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
