import fs from 'node:fs'
import path from 'node:path'

type StockEntry = {
  slug: string
  title: string
  file: string
}

type QueueEntry = {
  priority: number
  title: string
  songUuid: string
  detailUrl: string
  letter: string
  page: number
  rank: number
  demand: number
  risk: number
  guessedSlug: string
}

type ManagedQueueEntry = {
  priority: number
  status: 'stock-unpublished' | 'queued' | 'live'
  sourceKind: 'stock' | 'queue'
  slug: string
  title: string
  sourcePath: string
  note: string | null
  sourcePriority: number | null
  published: boolean
  detailUrl?: string
  songUuid?: string
  demand?: number
  risk?: number
  sourceFile?: string
}

type ManagedQueueFile = {
  schemaVersion: number
  generatedAt: string
  source: {
    stockPool: string
    filteredQueue: string
    publicManifest: string
    greyRollout: string
  }
  statusLegend: Record<string, string>
  summary: Record<string, number>
  entries: ManagedQueueEntry[]
}

const outArg = process.argv.find(arg => arg.startsWith('--out='))
const outPath = outArg?.slice('--out='.length) ?? 'data/songbook/kuailepu-grey-import-queue.json'

const publishedSet = new Set(readPublishedSlugs())
const stockEntries = readStockPool()
const stockSlugSet = new Set(stockEntries.map(entry => entry.slug))
const filteredQueueEntries = readFilteredQueue()
const rolloutLiveSet = new Set(readRolloutLiveSlugs())

const managedEntries: ManagedQueueEntry[] = []

for (const [index, entry] of stockEntries.entries()) {
  const published = publishedSet.has(entry.slug) || rolloutLiveSet.has(entry.slug)
  managedEntries.push({
    priority: index + 1,
    status: published ? 'live' : 'stock-unpublished',
    sourceKind: 'stock',
    slug: entry.slug,
    title: entry.title,
    sourcePath: `reference/kuailepu-candidates/publish-drafts/${entry.file}`,
    note: published
      ? 'Already live in the public catalog.'
      : 'Imported into the local stock pool and waiting for public promotion.',
    sourcePriority: null,
    published,
    sourceFile: entry.file
  })
}

const queueOffset = managedEntries.length
for (const entry of filteredQueueEntries) {
  if (stockSlugSet.has(entry.guessedSlug)) {
    continue
  }

  const published = publishedSet.has(entry.guessedSlug) || rolloutLiveSet.has(entry.guessedSlug)
  managedEntries.push({
    priority: queueOffset + entry.priority,
    status: published ? 'live' : 'queued',
    sourceKind: 'queue',
    slug: entry.guessedSlug,
    title: entry.title,
    sourcePath: entry.detailUrl,
    note: published
      ? 'Already live in the public catalog.'
      : `Queued from the 2026-05-23 filtered grey priority list; demand=${entry.demand}; risk=${entry.risk}.`,
    sourcePriority: entry.priority,
    published,
    detailUrl: entry.detailUrl,
    songUuid: entry.songUuid,
    demand: entry.demand,
    risk: entry.risk
  })
}

managedEntries.sort((left, right) => {
  const statusOrder: Array<ManagedQueueEntry['status']> = ['stock-unpublished', 'queued', 'live']
  const leftStatus = statusOrder.indexOf(left.status)
  const rightStatus = statusOrder.indexOf(right.status)
  if (leftStatus !== rightStatus) {
    return leftStatus - rightStatus
  }
  return left.priority - right.priority
})

const normalizedEntries = managedEntries.map((entry, index) => ({
  ...entry,
  priority: index + 1
}))

const managedQueue: ManagedQueueFile = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    stockPool: 'reference/kuailepu-candidates/publish-drafts/**',
    filteredQueue: 'reference/kuailepu-candidates/queues/grey-priority-queue-2026-05-23-filtered.json',
    publicManifest: 'data/songbook/public-song-manifest.json',
    greyRollout: 'data/songbook/grey-song-rollout.json'
  },
  statusLegend: {
    'stock-unpublished': 'Imported into the local stock pool but not yet public.',
    queued: 'Next-wave Kuailepu grey candidate.',
    live: 'Already public on the site.'
  },
  summary: {
    total: normalizedEntries.length,
    stockUnpublished: normalizedEntries.filter(entry => entry.status === 'stock-unpublished').length,
    queued: normalizedEntries.filter(entry => entry.status === 'queued').length,
    live: normalizedEntries.filter(entry => entry.status === 'live').length
  },
  entries: normalizedEntries
}

const resolvedOut = path.resolve(process.cwd(), outPath)
fs.mkdirSync(path.dirname(resolvedOut), { recursive: true })
fs.writeFileSync(resolvedOut, `${JSON.stringify(managedQueue, null, 2)}\n`, 'utf8')
process.stdout.write(
  `Wrote grey import queue to ${path.relative(process.cwd(), resolvedOut)}\n`
)

function readStockPool(): StockEntry[] {
  const dir = path.resolve(process.cwd(), 'reference', 'kuailepu-candidates', 'publish-drafts')
  const files = fs.readdirSync(dir).filter(file => file.endsWith('.json')).sort()
  const entries: StockEntry[] = []
  const seen = new Set<string>()

  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as
      | Array<{ slug: string; title: string }>
      | { entries?: Array<{ slug: string; title: string }> }
    const list = Array.isArray(raw) ? raw : raw.entries ?? []

    for (const item of list) {
      if (seen.has(item.slug)) continue
      seen.add(item.slug)
      entries.push({
        slug: item.slug,
        title: item.title,
        file
      })
    }
  }

  return entries
}

function readPublishedSlugs(): string[] {
  const manifestPath = path.resolve(process.cwd(), 'data', 'songbook', 'public-song-manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Array<{
    slug: string
    published: boolean
  }>

  return manifest.filter(entry => entry.published).map(entry => entry.slug)
}

function readRolloutLiveSlugs(): string[] {
  const rolloutPath = path.resolve(process.cwd(), 'data', 'songbook', 'grey-song-rollout.json')
  const rollout = JSON.parse(fs.readFileSync(rolloutPath, 'utf8')) as {
    entries?: Array<{ slug: string; status: string }>
  }

  return (rollout.entries ?? [])
    .filter(entry => entry.status === 'live')
    .map(entry => entry.slug)
}

function readFilteredQueue(): QueueEntry[] {
  const queuePath = path.resolve(
    process.cwd(),
    'reference',
    'kuailepu-candidates',
    'queues',
    'grey-priority-queue-2026-05-23-filtered.json'
  )
  const parsed = JSON.parse(fs.readFileSync(queuePath, 'utf8')) as {
    entries?: Array<{
      priority: number
      title: string
      songUuid: string
      detailUrl: string
      letter: string
      page: number
      rank: number
      demand: number
      risk: number
      guessedSlug?: string
    }>
  }

  return (parsed.entries ?? []).map(entry => ({
    priority: entry.priority,
    title: entry.title,
    songUuid: entry.songUuid,
    detailUrl: entry.detailUrl,
    letter: entry.letter,
    page: entry.page,
    rank: entry.rank,
    demand: entry.demand,
    risk: entry.risk,
    guessedSlug: entry.guessedSlug ?? ''
  }))
}
