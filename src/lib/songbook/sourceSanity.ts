import { parseNotation, tokenToLabel } from './jianpu.ts'
import type { ExtractedMusicXmlScore, SongIngestDraft } from './songIngestDraft.ts'

export type SourceSanitySeverity = 'error' | 'warning' | 'info'

export type SourceSanityIssue = {
  code: string
  severity: SourceSanitySeverity
  message: string
}

export type SourceSanityReport = {
  version: 1
  generatedAt: string
  source: {
    kind: SongIngestDraft['source']['kind']
    title: string
    slug: string
    composer: string | null
    partId: string
    voice: string
    sourceFile: string | null
  }
  preview: {
    meter: string | null
    keynote: string
    openingNotationLines: string[]
    openingLyricsLines: string[]
    openingPitchTokens: string[]
    openingLetterNotes: string[]
  }
  heuristics: {
    leadingRestCount: number
    startsWithRest: boolean
    noteCount: number
    measureCount: number
    lyricLineCount: number
    lyricWordCount: number
    titleAppearsInOpeningLyrics: boolean
  }
  issues: SourceSanityIssue[]
  suggestedSearchQueries: string[]
  reviewChecklist: string[]
  summary: {
    status: 'pass' | 'review'
    highestSeverity: SourceSanitySeverity | 'none'
    issueCount: number
  }
}

type BuildSourceSanityReportOptions = {
  draft: SongIngestDraft
  extract?: Pick<ExtractedMusicXmlScore, 'parts' | 'warnings'> | null
  sourceFile?: string | null
}

export function buildSourceSanityReport({
  draft,
  extract = null,
  sourceFile = null
}: BuildSourceSanityReportOptions): SourceSanityReport {
  const parsedTokens = parseNotation(draft.notation.lines, draft.metadata.recommendedTonicMidi).flat()
  const noteTokens = parsedTokens.filter(token => token.kind === 'note')
  const restTokens = parsedTokens.filter(token => token.kind === 'rest')
  const openingPitchTokens = noteTokens.slice(0, 16).map(token => token.token)
  const openingLetterNotes = noteTokens
    .slice(0, 16)
    .map(token => tokenToLabel(token))
    .filter(Boolean)
  const openingNotationLines = draft.notation.lines.slice(0, 2)
  const openingLyricsLines = draft.lyrics.alignedLines.slice(0, 2)
  const openingLyricsText = openingLyricsLines.join(' ').replace(/\s+/g, ' ').trim()
  const titleTokenOverlap = countTitleTokenOverlap(draft.metadata.title, openingLyricsText)
  const leadingRestCount = countLeadingRestCount(parsedTokens)
  const issues = dedupeIssues([
    ...buildDraftIssues(draft, openingLyricsLines, leadingRestCount, titleTokenOverlap),
    ...buildExtractIssues(extract),
    ...classifyWarnings(draft.warnings)
  ])

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: {
      kind: draft.source.kind,
      title: draft.metadata.title,
      slug: draft.metadata.slug,
      composer: draft.metadata.composer,
      partId: draft.source.partId,
      voice: draft.source.voice,
      sourceFile
    },
    preview: {
      meter: draft.metadata.meter,
      keynote: draft.metadata.recommendedKeynote,
      openingNotationLines,
      openingLyricsLines,
      openingPitchTokens,
      openingLetterNotes
    },
    heuristics: {
      leadingRestCount,
      startsWithRest: leadingRestCount > 0,
      noteCount: noteTokens.length,
      measureCount: draft.stats.measures,
      lyricLineCount: draft.lyrics.alignedLines.length,
      lyricWordCount: openingLyricsText ? openingLyricsText.split(/\s+/).length : 0,
      titleAppearsInOpeningLyrics: titleTokenOverlap > 0
    },
    issues,
    suggestedSearchQueries: buildSuggestedQueries(draft.metadata.title, draft.metadata.composer, openingLyricsText),
    reviewChecklist: [
      'Compare the opening phrase against a common public-domain sheet, hymn, or lead-sheet reference.',
      'Verify that the lyric opening and the melody opening belong to the same version of the song.',
      'Confirm that the source starts at the main tune, not a bridge, refrain-only extract, or coda.',
      'Listen to the first phrase and check that it matches the common tune a search user would expect.'
    ],
    summary: {
      status: issues.some(issue => issue.severity === 'warning' || issue.severity === 'error')
        ? 'review'
        : 'pass',
      highestSeverity: getHighestSeverity(issues),
      issueCount: issues.length
    }
  }

  function buildDraftIssues(
    localDraft: SongIngestDraft,
    localOpeningLyricsLines: string[],
    localLeadingRestCount: number,
    localTitleTokenOverlap: number
  ) {
    const localIssues: SourceSanityIssue[] = []

    if (!localDraft.metadata.composer) {
      localIssues.push({
        code: 'missing-composer',
        severity: 'info',
        message: 'Composer metadata is missing.'
      })
    }

    if (localDraft.stats.measures < 4) {
      localIssues.push({
        code: 'short-fragment-measures',
        severity: 'warning',
        message: `Only ${localDraft.stats.measures} measures were extracted; verify that this is not a fragment.`
      })
    }

    if (localDraft.stats.noteCount < 12) {
      localIssues.push({
        code: 'short-fragment-notes',
        severity: 'warning',
        message: `Only ${localDraft.stats.noteCount} melody notes were extracted; verify that this is not a fragment.`
      })
    }

    if (localDraft.stats.graceNoteCount > 0) {
      localIssues.push({
        code: 'grace-notes-present',
        severity: 'warning',
        message: `Source contains ${localDraft.stats.graceNoteCount} grace notes; confirm the simplified public version is still musically acceptable.`
      })
    }

    if (localDraft.metadata.lyricPolicy !== 'no-lyrics' && localDraft.lyrics.alignedLines.length === 0) {
      localIssues.push({
        code: 'missing-lyrics',
        severity: 'warning',
        message: 'No aligned lyric lines were extracted even though lyrics may matter for source verification.'
      })
    }

    if (localOpeningLyricsLines[0] && /^[a-z]/.test(localOpeningLyricsLines[0])) {
      localIssues.push({
        code: 'opening-lyrics-lowercase',
        severity: 'info',
        message: 'Opening lyrics start with lowercase text; verify that the source does not begin mid-phrase.'
      })
    }

    if (localLeadingRestCount >= 2) {
      localIssues.push({
        code: 'leading-rests',
        severity: 'info',
        message: `Opening includes ${localLeadingRestCount} leading rest slots before the first note.`
      })
    }

    if (localLeadingRestCount >= 2 && localTitleTokenOverlap === 0) {
      localIssues.push({
        code: 'mid-section-opening-risk',
        severity: 'warning',
        message:
          'Opening starts after multiple rest slots and the first lyric lines do not overlap with the title; verify that the source does not begin mid-section or from a less common verse.'
      })
    }

    if (restTokens.length > noteTokens.length) {
      localIssues.push({
        code: 'rest-heavy-opening',
        severity: 'info',
        message: 'Source contains more rests than notes; verify that the selected voice is the main melody.'
      })
    }

    return localIssues
  }
}

function buildExtractIssues(extract: Pick<ExtractedMusicXmlScore, 'parts' | 'warnings'> | null) {
  if (!extract) return []

  const issues: SourceSanityIssue[] = []

  if (extract.parts.length > 1) {
    issues.push({
      code: 'multi-part-source',
      severity: 'info',
      message: `Source has ${extract.parts.length} parts; verify that the selected part is the main melody.`
    })
  }

  return [...issues, ...classifyWarnings(extract.warnings)]
}

function classifyWarnings(warnings: string[]) {
  return warnings.map<SourceSanityIssue>(warning => {
    if (/grace/i.test(warning)) {
      return {
        code: 'draft-warning-grace',
        severity: 'warning',
        message: warning
      }
    }

    if (/No usable lyric/i.test(warning)) {
      return {
        code: 'draft-warning-lyrics',
        severity: 'warning',
        message: warning
      }
    }

    if (/No events remained/i.test(warning)) {
      return {
        code: 'draft-warning-empty-voice',
        severity: 'error',
        message: warning
      }
    }

    if (/multiple voices|backup\/forward/i.test(warning)) {
      return {
        code: 'draft-warning-multi-voice',
        severity: 'warning',
        message: warning
      }
    }

    return {
      code: 'draft-warning-other',
      severity: 'info',
      message: warning
    }
  })
}

function dedupeIssues(issues: SourceSanityIssue[]) {
  const seen = new Set<string>()
  return issues.filter(issue => {
    const key = `${issue.code}:${issue.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function countLeadingRestCount(tokens: ReturnType<typeof parseNotation>[number]) {
  let count = 0

  for (const token of tokens) {
    if (token.kind === 'bar' || token.kind === 'hold') {
      continue
    }
    if (token.kind === 'rest') {
      count += 1
      continue
    }
    if (token.kind === 'note') {
      break
    }
  }

  return count
}

function buildSuggestedQueries(title: string, composer: string | null, openingLyricsText: string) {
  const lyricSnippet = openingLyricsText
    .split(/\s+/)
    .filter(token => token !== '_')
    .slice(0, 8)
    .join(' ')
    .trim()
  return Array.from(
    new Set(
      [
        `${title} sheet music`,
        composer ? `"${title}" "${composer}" sheet music` : null,
        lyricSnippet ? `"${lyricSnippet}" "${title}"` : `${title} melody`
      ].filter(Boolean) as string[]
    )
  )
}

function getHighestSeverity(issues: SourceSanityIssue[]): SourceSanitySeverity | 'none' {
  if (issues.some(issue => issue.severity === 'error')) return 'error'
  if (issues.some(issue => issue.severity === 'warning')) return 'warning'
  if (issues.some(issue => issue.severity === 'info')) return 'info'
  return 'none'
}

function countTitleTokenOverlap(title: string, openingLyricsText: string) {
  const titleTokens = normalizeSearchTokens(title)
  const lyricTokens = new Set(normalizeSearchTokens(openingLyricsText))
  let overlap = 0

  titleTokens.forEach(token => {
    if (lyricTokens.has(token)) {
      overlap += 1
    }
  })

  return overlap
}

function normalizeSearchTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length >= 3)
}
