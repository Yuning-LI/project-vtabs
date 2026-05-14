import fs from 'node:fs'
import path from 'node:path'

type PriorityQueueEntry = {
  slug: string
  title: string
  score: number
  lane: 'fast-track' | 'careful-track' | 'defer-track'
  reasons: string[]
}

type PriorityQueue = {
  lanes: Record<'fast-track' | 'careful-track' | 'defer-track', PriorityQueueEntry[]>
  entries: PriorityQueueEntry[]
}

type TrafficEntry = {
  rank: number
  title: string
  source: string
  status: string
  outputs?: {
    draft?: string
    runtime?: string
    songDoc?: string
    sanity?: string
  } | null
}

type CliOptions = {
  priorityQueue: string
  releaseNote: string
  trafficFile: string
  out: string
}

const DEFAULT_PRIORITY_QUEUE =
  'reference/song-publish-candidates/openewld-priority-queue.json'
const DEFAULT_RELEASE_NOTE =
  'reference/song-publish-candidates/review-notes/openewld-top36-release-pool-2026-05-12.md'
const DEFAULT_TRAFFIC_FILE =
  'reference/song-publish-candidates/public-domain-global-processing-status.json'
const DEFAULT_OUT =
  'reference/song-publish-candidates/openewld-release-priority.json'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/export-song-ingest-release-priority.ts [--priority-queue=${DEFAULT_PRIORITY_QUEUE}] [--release-note=${DEFAULT_RELEASE_NOTE}] [--traffic-file=${DEFAULT_TRAFFIC_FILE}] [--out=${DEFAULT_OUT}]`

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const priorityQueue = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), options.priorityQueue), 'utf8')
) as PriorityQueue
const releaseNote = fs.readFileSync(path.resolve(process.cwd(), options.releaseNote), 'utf8')
const traffic = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), options.trafficFile), 'utf8')
) as TrafficEntry[]

const readyPool = extractSectionSlugs(releaseNote, '## Ready Pool', '## Skip For Now')
const skipPool = extractSectionSlugs(releaseNote, '## Skip For Now', '## Lyrics Deferred')
const lyricsDeferred = extractSectionSlugs(releaseNote, '## Lyrics Deferred', null)
const trafficBySlug = new Map(
  traffic
    .filter(entry => entry.outputs?.runtime || entry.outputs?.draft || entry.outputs?.songDoc)
    .map(entry => [slugifyTitle(entry.title), entry.rank])
)

const releaseEntries = priorityQueue.entries
  .filter(entry => readyPool.includes(entry.slug))
  .map(entry => ({
    ...entry,
    trafficRank: trafficBySlug.get(entry.slug) ?? null,
    lyricStatus: lyricsDeferred.includes(entry.slug) ? 'lyrics-deferred' : 'lyrics-ok'
  }))
  .sort((left, right) => {
    const laneOrder = compareLane(left.lane) - compareLane(right.lane)
    if (laneOrder !== 0) return laneOrder

    if ((left.trafficRank ?? Number.POSITIVE_INFINITY) !== (right.trafficRank ?? Number.POSITIVE_INFINITY)) {
      return (left.trafficRank ?? Number.POSITIVE_INFINITY) - (right.trafficRank ?? Number.POSITIVE_INFINITY)
    }

    if (left.score !== right.score) return right.score - left.score
    return left.slug.localeCompare(right.slug)
  })

const output = {
  generatedOn: new Date().toISOString(),
  inputs: {
    priorityQueue: options.priorityQueue,
    releaseNote: options.releaseNote,
    trafficFile: options.trafficFile
  },
  summary: {
    readyCount: releaseEntries.length,
    fastTrackReadyCount: releaseEntries.filter(entry => entry.lane === 'fast-track').length,
    carefulTrackReadyCount: releaseEntries.filter(entry => entry.lane === 'careful-track').length,
    lyricsDeferredReadyCount: releaseEntries.filter(entry => entry.lyricStatus === 'lyrics-deferred').length,
    skippedCount: skipPool.length
  },
  ready: releaseEntries,
  skipped: skipPool
}

const outPath = path.resolve(process.cwd(), options.out)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(`Wrote release priority to ${path.relative(process.cwd(), outPath)}`)
console.log(JSON.stringify(output.summary, null, 2))

function parseArgs(args: string[]): CliOptions | null {
  const values = new Map<string, string>()
  args.forEach(arg => {
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (!match) return
    values.set(match[1], match[2])
  })

  return {
    priorityQueue: values.get('priority-queue') || DEFAULT_PRIORITY_QUEUE,
    releaseNote: values.get('release-note') || DEFAULT_RELEASE_NOTE,
    trafficFile: values.get('traffic-file') || DEFAULT_TRAFFIC_FILE,
    out: values.get('out') || DEFAULT_OUT
  }
}

function extractSectionSlugs(markdown: string, startHeader: string, endHeader: string | null) {
  const startIndex = markdown.indexOf(startHeader)
  if (startIndex < 0) return []
  const sliceStart = startIndex + startHeader.length
  const endIndex = endHeader ? markdown.indexOf(endHeader, sliceStart) : markdown.length
  const section = markdown.slice(sliceStart, endIndex >= 0 ? endIndex : markdown.length)

  return section
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- `') && line.endsWith('`'))
    .map(line => line.replace(/^- `/, '').replace(/`$/, ''))
}

function compareLane(lane: PriorityQueueEntry['lane']) {
  switch (lane) {
    case 'fast-track':
      return 0
    case 'careful-track':
      return 1
    case 'defer-track':
      return 2
    default:
      return 3
  }
}

function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
