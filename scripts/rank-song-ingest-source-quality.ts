import fs from 'node:fs'
import path from 'node:path'

type BatchEntry = {
  slug: string
  title: string
  file: string
  status: 'ok' | 'error'
  warnings: string[]
  hcConsistency?: {
    status: 'ok' | 'review' | 'warning'
    warningCount: number
    noteDelta: number
    eventDelta: number
    measureDelta: number | null
  }
  stats?: {
    measures: number
    noteCount: number
    restCount: number
    lyricNoteCount: number
    chordCount: number
    graceNoteCount: number
    durationUnit: number
  }
  sourceSanity?: {
    status: 'pass' | 'review'
    highestSeverity: 'error' | 'warning' | 'info' | 'none'
    issueCount: number
  }
  generation?: {
    sourceKeynote: string
    targetKeynote: string
    transpose: number
  }
}

type BatchReport = {
  entries: BatchEntry[]
}

type AuditIssue = {
  code: string
  severity: 'error' | 'warning' | 'info'
  message: string
}

type AuditEntry = {
  slug: string
  issues: AuditIssue[]
  warningCategories: string[]
  roundTrip: {
    exact: boolean
    mismatchCount: number
    sourceEventCount: number
    generatedEventCount: number
    totalSourceSlots: number
    totalGeneratedSlots: number
  }
  featureUsage: {
    usesRepeats: boolean
    usesGraceLike: boolean
    usesTupletLike: boolean
    usesSlurLike: boolean
  }
}

type AuditReport = {
  entries: AuditEntry[]
}

type SourceSanityReport = {
  summary: {
    status: 'pass' | 'review'
    highestSeverity: 'error' | 'warning' | 'info' | 'none'
    issueCount: number
  }
  heuristics: {
    leadingRestCount: number
    startsWithRest: boolean
    noteCount: number
    measureCount: number
    lyricLineCount: number
    lyricWordCount: number
    titleAppearsInOpeningLyrics: boolean
    crossMeasureTieCount: number
    hasShortOpeningMeasure: boolean
    hasShortClosingMeasure: boolean
  }
  issues: Array<{
    code: string
    severity: 'error' | 'warning' | 'info'
  }>
}

type RankedEntry = {
  slug: string
  title: string
  file: string
  score: number
  tier: 'high' | 'medium' | 'low'
  reasons: string[]
  diagnostics: {
    generateStatus: 'ok' | 'error'
    sanityStatus: 'pass' | 'review' | 'missing'
    sanitySeverity: 'error' | 'warning' | 'info' | 'none' | 'missing'
    hcConsistencyStatus: 'ok' | 'review' | 'warning' | 'missing'
    hcWarningCount: number | null
    auditErrorCount: number
    auditWarningCount: number
    roundTripMismatchCount: number | null
    usesAdvancedSurface: boolean
    usesRepeats: boolean
    graceNoteCount: number
    measureCount: number
    noteCount: number
    lyricNoteCount: number
    chordCount: number
    leadingRestCount: number | null
    crossMeasureTieCount: number | null
    hasShortOpeningMeasure: boolean | null
    hasShortClosingMeasure: boolean | null
    transpose: number | null
  }
}

type CliOptions = {
  generateReports: string[]
  auditReport?: string
  sanityDir: string
  out: string
}

const DEFAULT_GENERATE_REPORTS = [
  'reference/song-publish-candidates/reports/openewld-top10-batch-generate.json',
  'reference/song-publish-candidates/reports/openewld-next10-batch-generate.json',
  'reference/song-publish-candidates/reports/openewld-third10-batch-generate.json',
  'reference/song-publish-candidates/reports/openewld-last6-batch-generate.json'
]
const DEFAULT_AUDIT_REPORT = 'exports/song-ingest/batch-audit-all.json'
const DEFAULT_SANITY_DIR = 'reference/song-publish-candidates/source-sanity'
const DEFAULT_OUT = 'reference/song-publish-candidates/openewld-source-quality-ranking.json'

const usage =
  'Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/rank-song-ingest-source-quality.ts [--generate-report=path ...] [--audit-report=path] [--sanity-dir=dir] [--out=path]'

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const generateEntries = options.generateReports
  .flatMap(reportPath => readJson<BatchReport>(reportPath).entries)
  .filter(entry => entry.status === 'ok')

const latestBySlug = new Map<string, BatchEntry>()
for (const entry of generateEntries) {
  latestBySlug.set(entry.slug, entry)
}

const auditBySlug = options.auditReport && fs.existsSync(path.resolve(process.cwd(), options.auditReport))
  ? new Map(
      readJson<AuditReport>(options.auditReport).entries.map(entry => [entry.slug, entry])
    )
  : new Map<string, AuditEntry>()

const ranked = [...latestBySlug.values()]
  .map<RankedEntry>(entry => {
    const audit = auditBySlug.get(entry.slug)
    const sanity = readSanityReport(options.sanityDir, entry.slug)
    return buildRankedEntry(entry, audit, sanity)
  })
  .sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score
    }
    return left.slug.localeCompare(right.slug)
  })

const output = {
  generatedOn: new Date().toISOString(),
  inputs: {
    generateReports: options.generateReports,
    auditReport: options.auditReport ?? null,
    sanityDir: options.sanityDir
  },
  summary: {
    total: ranked.length,
    highCount: ranked.filter(entry => entry.tier === 'high').length,
    mediumCount: ranked.filter(entry => entry.tier === 'medium').length,
    lowCount: ranked.filter(entry => entry.tier === 'low').length
  },
  entries: ranked
}

const outPath = path.resolve(process.cwd(), options.out)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(`Wrote source quality ranking to ${path.relative(process.cwd(), outPath)}`)
console.log(JSON.stringify(output.summary, null, 2))

function parseArgs(args: string[]): CliOptions | null {
  const values = new Map<string, string[]>()

  args.forEach(arg => {
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (!match) return
    values.set(match[1], [...(values.get(match[1]) ?? []), match[2]])
  })

  return {
    generateReports:
      values.get('generate-report')?.length
        ? values.get('generate-report')!
        : DEFAULT_GENERATE_REPORTS,
    auditReport: values.get('audit-report')?.[0] || DEFAULT_AUDIT_REPORT,
    sanityDir: values.get('sanity-dir')?.[0] || DEFAULT_SANITY_DIR,
    out: values.get('out')?.[0] || DEFAULT_OUT
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8')
  ) as T
}

function readSanityReport(sanityDir: string, slug: string) {
  const filePath = path.resolve(process.cwd(), sanityDir, `${slug}.json`)
  if (!fs.existsSync(filePath)) {
    return null
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as SourceSanityReport
}

function buildRankedEntry(
  entry: BatchEntry,
  audit: AuditEntry | undefined,
  sanity: SourceSanityReport | null
): RankedEntry {
  let score = 75
  const reasons: string[] = []
  const measureCount = entry.stats?.measures ?? 0
  const noteCount = entry.stats?.noteCount ?? 0
  const lyricNoteCount = entry.stats?.lyricNoteCount ?? 0
  const chordCount = entry.stats?.chordCount ?? 0

  if (entry.status !== 'ok') {
    score -= 100
    reasons.push('generate-error')
  }

  if (entry.warnings.length === 0) {
    score += 6
    reasons.push('clean-draft')
  }
  if (entry.warnings.length > 0) {
    score -= Math.min(18, entry.warnings.length * 3)
    reasons.push('draft-warnings')
  }

  if (entry.stats?.graceNoteCount && entry.stats.graceNoteCount > 0) {
    score -= 10
    reasons.push('grace-notes')
  }

  if (sanity?.summary.status === 'review') {
    score -= sanity.summary.highestSeverity === 'warning' ? 14 : 8
    reasons.push(`source-sanity:${sanity.summary.highestSeverity}`)
  }
  if (sanity?.summary.status === 'pass') {
    score += sanity.summary.highestSeverity === 'none' ? 5 : 2
    reasons.push(
      sanity.summary.highestSeverity === 'none' ? 'clean-source-sanity' : 'light-source-sanity'
    )
  }

  if (entry.hcConsistency?.status === 'warning') {
    score -= 16
    reasons.push('hc-consistency-warning')
  } else if (entry.hcConsistency?.status === 'review') {
    score -= 7
    reasons.push('hc-consistency-review')
  } else if (entry.hcConsistency?.status === 'ok') {
    score += 4
    reasons.push('hc-consistency-ok')
  }

  if (sanity && sanity.heuristics.leadingRestCount >= 2) {
    score -= 5
    reasons.push('leading-rest-opening')
  } else if (sanity && sanity.heuristics.leadingRestCount === 0) {
    score += 2
    reasons.push('no-leading-rest')
  }

  if (sanity && !sanity.heuristics.titleAppearsInOpeningLyrics && sanity.heuristics.lyricLineCount > 0) {
    score -= 1
    reasons.push('title-not-in-opening-lyrics')
  }

  if (sanity && sanity.heuristics.crossMeasureTieCount >= 4) {
    score -= 12
    reasons.push('cross-measure-tie-heavy')
  } else if (sanity && sanity.heuristics.crossMeasureTieCount > 0) {
    score -= 3
    reasons.push('cross-measure-tie-present')
  }

  if (sanity?.heuristics.hasShortOpeningMeasure && sanity?.heuristics.hasShortClosingMeasure) {
    score -= 3
    reasons.push('pickup-complement-structure')
  }

  if (measureCount >= 12 && measureCount <= 40) {
    score += 5
    reasons.push('manageable-measure-count')
  } else if (measureCount > 56) {
    score -= 7
    reasons.push('long-form-score')
  } else if (measureCount < 10) {
    score -= 4
    reasons.push('short-form-score')
  }

  if (noteCount >= 40 && noteCount <= 140) {
    score += 5
    reasons.push('good-note-density')
  } else if (noteCount > 220) {
    score -= 7
    reasons.push('dense-note-load')
  } else if (noteCount < 32) {
    score -= 4
    reasons.push('thin-note-load')
  }

  if (lyricNoteCount > 0 && noteCount > 0) {
    const lyricCoverage = lyricNoteCount / noteCount
    if (lyricCoverage >= 0.65) {
      score += 3
      reasons.push('lyric-backed')
    } else if (lyricCoverage < 0.25) {
      score -= 3
      reasons.push('weak-lyric-coverage')
    }
  }

  if (chordCount >= 60) {
    score -= 4
    reasons.push('harmony-dense')
  }

  const auditErrors = audit?.issues.filter(issue => issue.severity === 'error').length ?? 0
  const auditWarnings = audit?.issues.filter(issue => issue.severity === 'warning').length ?? 0
  if (auditErrors > 0) {
    score -= 25 + auditErrors * 8
    reasons.push('audit-errors')
  }
  if (auditWarnings > 0) {
    score -= Math.min(18, auditWarnings * 4)
    reasons.push('audit-warnings')
  }

  const usesAdvancedSurface = Boolean(
    audit?.featureUsage.usesGraceLike ||
      audit?.featureUsage.usesSlurLike
  )
  if (usesAdvancedSurface) {
    score -= 6
    reasons.push('advanced-notation-surface')
  }

  if (audit?.featureUsage.usesRepeats) {
    score -= 4
    reasons.push('repeat-structure')
  }

  if (typeof audit?.roundTrip.mismatchCount === 'number') {
    if (audit.roundTrip.mismatchCount === 0) {
      score += 5
      reasons.push('clean-roundtrip')
    } else if (audit.roundTrip.mismatchCount <= 3) {
      score += 2
      reasons.push('near-clean-roundtrip')
    } else if (audit.roundTrip.mismatchCount <= 8) {
      score -= 1
      reasons.push('usable-roundtrip')
    } else if (audit.roundTrip.mismatchCount >= 12) {
      score -= 12
      reasons.push('heavy-roundtrip-mismatch')
    }
  }

  const transpose = entry.generation?.transpose ?? null
  if (transpose !== null && Math.abs(transpose) >= 12) {
    score -= 5
    reasons.push('large-transpose')
  } else if (transpose !== null && Math.abs(transpose) >= 4) {
    score -= 2
    reasons.push('moderate-transpose')
  } else if (transpose !== null && transpose === 0) {
    score += 4
    reasons.push('no-transpose')
  }

  score = Math.max(0, Math.min(100, score))
  const tier: RankedEntry['tier'] =
    score >= 88 ? 'high' : score >= 76 ? 'medium' : 'low'

  return {
    slug: entry.slug,
    title: entry.title,
    file: entry.file,
    score,
    tier,
    reasons: unique(reasons),
    diagnostics: {
      generateStatus: entry.status,
      sanityStatus: sanity?.summary.status ?? 'missing',
      sanitySeverity: sanity?.summary.highestSeverity ?? 'missing',
      hcConsistencyStatus: entry.hcConsistency?.status ?? 'missing',
      hcWarningCount: entry.hcConsistency?.warningCount ?? null,
      auditErrorCount: auditErrors,
      auditWarningCount: auditWarnings,
      roundTripMismatchCount: audit?.roundTrip.mismatchCount ?? null,
      usesAdvancedSurface,
      usesRepeats: audit?.featureUsage.usesRepeats ?? false,
      graceNoteCount: entry.stats?.graceNoteCount ?? 0,
      measureCount,
      noteCount,
      lyricNoteCount,
      chordCount,
      leadingRestCount: sanity?.heuristics.leadingRestCount ?? null,
      crossMeasureTieCount: sanity?.heuristics.crossMeasureTieCount ?? null,
      hasShortOpeningMeasure: sanity?.heuristics.hasShortOpeningMeasure ?? null,
      hasShortClosingMeasure: sanity?.heuristics.hasShortClosingMeasure ?? null,
      transpose
    }
  }
}

function unique(values: string[]) {
  return [...new Set(values)]
}
