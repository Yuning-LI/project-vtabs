import fs from 'node:fs'
import path from 'node:path'

type GenerateEntry = {
  file: string
  slug: string
  title: string
  status: 'ok' | 'error'
  warnings: string[]
  sourceSanity?: {
    status: 'pass' | 'review'
    highestSeverity: 'error' | 'warning' | 'info' | 'none'
    issueCount: number
  }
  error?: string
}

type GenerateReport = {
  entries: GenerateEntry[]
}

type AuditIssue = {
  code: string
  severity: 'error' | 'warning' | 'info'
  message: string
}

type AuditEntry = {
  file: string
  slug: string
  title: string
  warningCategories: string[]
  issues: AuditIssue[]
}

type AuditReport = {
  entries: AuditEntry[]
}

type ClassifiedEntry = {
  slug: string
  title: string
  file: string
  classification: 'publish' | 'review' | 'reject'
  reasons: string[]
  generateStatus: GenerateEntry['status']
  sourceSanityStatus: GenerateEntry['sourceSanity']['status'] | 'missing'
  sourceSanitySeverity: GenerateEntry['sourceSanity']['highestSeverity'] | 'missing'
  auditErrorCount: number
  auditWarningCount: number
}

type CliOptions = {
  generateReport: string
  auditReport: string
  out?: string
}

const usage =
  'Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/classify-song-ingest-batch.ts --generate-report=tmp/batch-generate.json --audit-report=exports/song-ingest/batch-audit-all.json [--out=tmp/classified.json]'

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const generateReport = readJson<GenerateReport>(options.generateReport)
const auditReport = readJson<AuditReport>(options.auditReport)
const auditBySlug = new Map(auditReport.entries.map(entry => [entry.slug, entry]))

const entries: ClassifiedEntry[] = generateReport.entries.map(entry => {
  const audit = resolveAuditEntry(entry.slug, auditBySlug)
  const reasons: string[] = []

  if (entry.status === 'error') {
    reasons.push(`generate-error: ${entry.error ?? 'unknown error'}`)
  }

  if (!audit) {
    reasons.push('missing-audit-entry')
  }

  const auditErrors = audit?.issues.filter(issue => issue.severity === 'error') ?? []
  const auditWarnings = audit?.issues.filter(issue => issue.severity === 'warning') ?? []

  if (auditErrors.length > 0) {
    reasons.push(...auditErrors.map(issue => `audit-error:${issue.code}`))
  }

  if (entry.sourceSanity?.status === 'review') {
    reasons.push(`source-sanity:${entry.sourceSanity.highestSeverity}`)
  }

  if (auditWarnings.length > 0) {
    reasons.push(...auditWarnings.map(issue => `audit-warning:${issue.code}`))
  }

  if (entry.warnings.length > 0) {
    reasons.push('draft-warnings')
  }

  let classification: ClassifiedEntry['classification'] = 'publish'
  if (entry.status === 'error' || !audit || auditErrors.length > 0) {
    classification = 'reject'
  } else if (
    entry.sourceSanity?.status === 'review' ||
    auditWarnings.length > 0 ||
    entry.warnings.length > 0
  ) {
    classification = 'review'
  }

  return {
    slug: entry.slug,
    title: entry.title,
    file: entry.file,
    classification,
    reasons,
    generateStatus: entry.status,
    sourceSanityStatus: entry.sourceSanity?.status ?? 'missing',
    sourceSanitySeverity: entry.sourceSanity?.highestSeverity ?? 'missing',
    auditErrorCount: auditErrors.length,
    auditWarningCount: auditWarnings.length
  }
})

const output = {
  generatedAt: new Date().toISOString(),
  inputs: {
    generateReport: path.relative(process.cwd(), path.resolve(process.cwd(), options.generateReport)),
    auditReport: path.relative(process.cwd(), path.resolve(process.cwd(), options.auditReport))
  },
  summary: {
    total: entries.length,
    publishCount: entries.filter(entry => entry.classification === 'publish').length,
    reviewCount: entries.filter(entry => entry.classification === 'review').length,
    rejectCount: entries.filter(entry => entry.classification === 'reject').length
  },
  buckets: {
    publish: entries.filter(entry => entry.classification === 'publish'),
    review: entries.filter(entry => entry.classification === 'review'),
    reject: entries.filter(entry => entry.classification === 'reject')
  },
  entries
}

if (options.out) {
  const resolvedOut = path.resolve(process.cwd(), options.out)
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true })
  fs.writeFileSync(resolvedOut, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.log(`Wrote classification report to ${path.relative(process.cwd(), resolvedOut)}`)
}

console.log(JSON.stringify(output.summary, null, 2))

function parseArgs(args: string[]): CliOptions | null {
  const values = new Map<string, string>()

  args.forEach(arg => {
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (!match) return
    values.set(match[1], match[2])
  })

  const generateReport = values.get('generate-report')
  const auditReport = values.get('audit-report')
  if (!generateReport || !auditReport) return null

  return {
    generateReport,
    auditReport,
    out: values.get('out')
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8')) as T
}

function resolveAuditEntry(slug: string, auditBySlug: Map<string, AuditEntry>) {
  if (auditBySlug.has(slug)) {
    return auditBySlug.get(slug)
  }

  const normalized = slug.replace(/^openewld-/, '')
  if (auditBySlug.has(normalized)) {
    return auditBySlug.get(normalized)
  }

  return undefined
}
