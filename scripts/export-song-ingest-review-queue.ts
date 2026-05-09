import fs from 'node:fs'
import path from 'node:path'

type ClassifiedEntry = {
  slug: string
  title: string
  file: string
  classification: 'publish' | 'review' | 'reject'
  reasons: string[]
  generateStatus: 'ok' | 'error'
  sourceSanityStatus: 'pass' | 'review' | 'missing'
  sourceSanitySeverity: 'error' | 'warning' | 'info' | 'none' | 'missing'
  auditErrorCount: number
  auditWarningCount: number
}

type ClassifiedReport = {
  entries: ClassifiedEntry[]
}

type SourceSanityReport = {
  source: {
    title: string
    slug: string
    composer: string | null
    sourceFile: string | null
  }
  preview: {
    openingLyricsLines: string[]
    openingLetterNotes: string[]
  }
  suggestedSearchQueries: string[]
  summary: {
    status: 'pass' | 'review'
    highestSeverity: 'error' | 'warning' | 'info' | 'none'
    issueCount: number
  }
}

type CliOptions = {
  classifiedReport: string
  sanityDir: string
  bucket: 'publish' | 'review' | 'reject' | 'all'
  limit?: number
  out?: string
}

type QueueEntry = {
  slug: string
  title: string
  classification: ClassifiedEntry['classification']
  sourceFile: string
  composer: string | null
  reasons: string[]
  openingLyrics: string
  openingLetterNotes: string[]
  suggestedSearchQueries: string[]
  nextAction: string
}

const usage =
  'Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/export-song-ingest-review-queue.ts --classified-report=tmp/classified.json --sanity-dir=tmp/sanity [--bucket=publish|review|reject|all] [--limit=50] [--out=tmp/review-queue.md]'

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const report = readJson<ClassifiedReport>(options.classifiedReport)
const filtered = report.entries.filter(entry =>
  options.bucket === 'all' ? true : entry.classification === options.bucket
)
const selected = typeof options.limit === 'number' ? filtered.slice(0, options.limit) : filtered

const queueEntries: QueueEntry[] = selected.map(entry => {
  const sanity = readSanityReport(options.sanityDir, entry.slug)

  return {
    slug: entry.slug,
    title: entry.title,
    classification: entry.classification,
    sourceFile: sanity?.source.sourceFile || entry.file,
    composer: sanity?.source.composer || null,
    reasons: entry.reasons,
    openingLyrics: sanity?.preview.openingLyricsLines.join(' / ') || '',
    openingLetterNotes: sanity?.preview.openingLetterNotes || [],
    suggestedSearchQueries: sanity?.suggestedSearchQueries || [],
    nextAction:
      entry.classification === 'publish'
        ? 'Run lightweight web verification before public import.'
        : entry.classification === 'review'
          ? 'Run mandatory web verification and compare melody/version before any publish decision.'
          : 'Do not publish until the source problem is resolved.'
  }
})

const markdown = renderMarkdown({
  generatedAt: new Date().toISOString(),
  bucket: options.bucket,
  count: queueEntries.length,
  entries: queueEntries
})

if (options.out) {
  const resolvedOut = path.resolve(process.cwd(), options.out)
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true })
  fs.writeFileSync(resolvedOut, markdown, 'utf8')
  console.log(`Wrote review queue to ${path.relative(process.cwd(), resolvedOut)}`)
}

console.log(
  JSON.stringify(
    {
      bucket: options.bucket,
      count: queueEntries.length
    },
    null,
    2
  )
)

function parseArgs(args: string[]): CliOptions | null {
  const values = new Map<string, string>()

  args.forEach(arg => {
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (!match) return
    values.set(match[1], match[2])
  })

  const classifiedReport = values.get('classified-report')
  const sanityDir = values.get('sanity-dir')
  if (!classifiedReport || !sanityDir) return null

  const bucketValue = values.get('bucket')
  const bucket =
    bucketValue === 'publish' || bucketValue === 'review' || bucketValue === 'reject'
      ? bucketValue
      : 'all'

  return {
    classifiedReport,
    sanityDir,
    bucket,
    limit: values.has('limit') ? Number(values.get('limit')) : undefined,
    out: values.get('out')
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8')) as T
}

function readSanityReport(sanityDir: string, slug: string) {
  const candidates = [slug, slug.replace(/^openewld-/, '')]

  for (const candidate of candidates) {
    const filePath = path.resolve(process.cwd(), sanityDir, `${candidate}.json`)
    if (fs.existsSync(filePath)) {
      return readJson<SourceSanityReport>(filePath)
    }
  }

  return null
}

function renderMarkdown(input: {
  generatedAt: string
  bucket: string
  count: number
  entries: QueueEntry[]
}) {
  const lines: string[] = []

  lines.push('# Song Ingest Review Queue')
  lines.push('')
  lines.push(`- Generated: ${input.generatedAt}`)
  lines.push(`- Bucket: ${input.bucket}`)
  lines.push(`- Count: ${input.count}`)
  lines.push('')

  input.entries.forEach((entry, index) => {
    lines.push(`## ${index + 1}. ${entry.title}`)
    lines.push('')
    lines.push(`- Slug: \`${entry.slug}\``)
    lines.push(`- Classification: \`${entry.classification}\``)
    lines.push(`- Composer: ${entry.composer || 'Unknown'}`)
    lines.push(`- Source file: \`${entry.sourceFile}\``)
    lines.push(`- Next action: ${entry.nextAction}`)
    if (entry.reasons.length > 0) {
      lines.push(`- Reasons: ${entry.reasons.join('; ')}`)
    }
    if (entry.openingLyrics) {
      lines.push(`- Opening lyrics: ${entry.openingLyrics}`)
    }
    if (entry.openingLetterNotes.length > 0) {
      lines.push(`- Opening notes: ${entry.openingLetterNotes.join(' ')}`)
    }
    if (entry.suggestedSearchQueries.length > 0) {
      lines.push(`- Suggested search queries:`)
      entry.suggestedSearchQueries.forEach(query => {
        lines.push(`  - ${query}`)
      })
    }
    lines.push('')
  })

  return `${lines.join('\n')}\n`
}
