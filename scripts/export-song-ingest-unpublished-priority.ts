import fs from 'node:fs'
import path from 'node:path'

type PriorityQueueEntry = {
  slug: string
  title: string
  score: number
  tier: 'high' | 'medium' | 'low'
  lane: 'fast-track' | 'careful-track' | 'defer-track'
  reasons: string[]
  diagnostics: {
    hcConsistencyStatus: 'ok' | 'review' | 'warning' | 'missing'
    sanityStatus?: 'pass' | 'review'
    measureCount: number
    noteCount: number
    lyricNoteCount: number
    chordCount: number
  }
}

type PriorityQueue = {
  entries: PriorityQueueEntry[]
}

type CliOptions = {
  priorityQueue: string
  publishedDir: string
  limit: number | null
  out: string
}

const DEFAULT_PRIORITY_QUEUE =
  'reference/song-publish-candidates/openewld-priority-queue.json'
const DEFAULT_PUBLISHED_DIR = 'data/kuailepu'
const DEFAULT_OUT =
  'reference/song-publish-candidates/openewld-unpublished-priority.json'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/export-song-ingest-unpublished-priority.ts [--priority-queue=${DEFAULT_PRIORITY_QUEUE}] [--published-dir=${DEFAULT_PUBLISHED_DIR}] [--limit=60] [--out=${DEFAULT_OUT}]`

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const queuePath = path.resolve(process.cwd(), options.priorityQueue)
if (!fs.existsSync(queuePath)) {
  console.error(`Priority queue not found: ${options.priorityQueue}`)
  process.exit(1)
}

const publishedDir = path.resolve(process.cwd(), options.publishedDir)
if (!fs.existsSync(publishedDir)) {
  console.error(`Published song dir not found: ${options.publishedDir}`)
  process.exit(1)
}

const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8')) as PriorityQueue
const publishedSlugs = new Set(
  fs
    .readdirSync(publishedDir)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace(/\.json$/i, ''))
)

const unpublishedEntries = queue.entries.filter(entry => !publishedSlugs.has(entry.slug))
const limitedEntries =
  typeof options.limit === 'number'
    ? unpublishedEntries.slice(0, Math.max(0, options.limit))
    : unpublishedEntries

const output = {
  generatedOn: new Date().toISOString(),
  inputs: {
    priorityQueue: options.priorityQueue,
    publishedDir: options.publishedDir
  },
  summary: {
    totalQueueCount: queue.entries.length,
    publishedCount: publishedSlugs.size,
    unpublishedCount: unpublishedEntries.length,
    exportedCount: limitedEntries.length,
    fastTrackCount: unpublishedEntries.filter(entry => entry.lane === 'fast-track').length,
    carefulTrackCount: unpublishedEntries.filter(entry => entry.lane === 'careful-track').length,
    deferTrackCount: unpublishedEntries.filter(entry => entry.lane === 'defer-track').length
  },
  entries: limitedEntries
}

const outPath = path.resolve(process.cwd(), options.out)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(`Wrote unpublished priority to ${path.relative(process.cwd(), outPath)}`)
console.log(JSON.stringify(output.summary, null, 2))

function parseArgs(args: string[]): CliOptions | null {
  const values = new Map<string, string>()
  args.forEach(arg => {
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (!match) return
    values.set(match[1], match[2])
  })

  const limitValue = values.get('limit')
  const parsedLimit =
    typeof limitValue === 'string' && limitValue.length > 0 ? Number(limitValue) : null

  return {
    priorityQueue: values.get('priority-queue') || DEFAULT_PRIORITY_QUEUE,
    publishedDir: values.get('published-dir') || DEFAULT_PUBLISHED_DIR,
    limit:
      typeof parsedLimit === 'number' && Number.isFinite(parsedLimit)
        ? parsedLimit
        : null,
    out: values.get('out') || DEFAULT_OUT
  }
}
