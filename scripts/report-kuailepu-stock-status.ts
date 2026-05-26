import fs from 'node:fs'
import path from 'node:path'

type PoolEntry = {
  slug: string
  title: string
  file: string
}

type Report = {
  generatedAt: string
  totalPool: number
  publishedInPool: number
  unpublishedInPool: number
  liveTrackerInPool: number
  liveButNotPublished: number
  published: PoolEntry[]
  unpublished: PoolEntry[]
}

const args = new Set(process.argv.slice(2))
const outArg = process.argv.find(arg => arg.startsWith('--out='))
const outPath = outArg?.slice('--out='.length)
const jsonOnly = args.has('--json')

const pool = readStockPool()
const publishedSet = new Set(readPublishedSlugs())
const liveSet = new Set(readLiveSlugs())

const published = pool.filter(entry => publishedSet.has(entry.slug))
const unpublished = pool.filter(entry => !publishedSet.has(entry.slug))
const liveTrackerInPool = pool.filter(entry => liveSet.has(entry.slug)).length
const liveButNotPublished = [...liveSet].filter(slug => !publishedSet.has(slug)).length

const report: Report = {
  generatedAt: new Date().toISOString(),
  totalPool: pool.length,
  publishedInPool: published.length,
  unpublishedInPool: unpublished.length,
  liveTrackerInPool,
  liveButNotPublished,
  published,
  unpublished,
}

const output = jsonOnly ? JSON.stringify(report, null, 2) : renderMarkdown(report)
process.stdout.write(`${output}\n`)

if (outPath) {
  const resolved = path.resolve(process.cwd(), outPath)
  fs.mkdirSync(path.dirname(resolved), { recursive: true })
  fs.writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Wrote stock status report to ${path.relative(process.cwd(), resolved)}`)
}

function readStockPool(): PoolEntry[] {
  const dir = path.resolve(process.cwd(), 'reference/kuailepu-candidates/publish-drafts')
  const files = fs.readdirSync(dir).filter(file => file.endsWith('.json')).sort()
  const entries: PoolEntry[] = []
  const seen = new Set<string>()

  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as
      | PoolEntry[]
      | { entries?: Array<{ slug: string; title: string }> }
    const list = Array.isArray(raw) ? raw : raw.entries ?? []

    for (const item of list) {
      if (seen.has(item.slug)) continue
      seen.add(item.slug)
      entries.push({
        slug: item.slug,
        title: item.title,
        file,
      })
    }
  }

  return entries
}

function readPublishedSlugs(): string[] {
  const manifestPath = path.resolve(process.cwd(), 'data/songbook/public-song-manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Array<{
    slug: string
    published: boolean
  }>

  return manifest.filter(entry => entry.published).map(entry => entry.slug)
}

function readLiveSlugs(): string[] {
  const rolloutPath = path.resolve(process.cwd(), 'data/songbook/grey-song-rollout.json')
  const rollout = JSON.parse(fs.readFileSync(rolloutPath, 'utf8')) as {
    entries?: Array<{ slug: string; status: string }>
  }

  return (rollout.entries ?? [])
    .filter(entry => entry.status === 'live')
    .map(entry => entry.slug)
}

function renderMarkdown(report: Report): string {
  const lines: string[] = []
  lines.push(`# Kuailepu Stock Status`)
  lines.push(`- Generated at: \`${report.generatedAt}\``)
  lines.push(`- Total stock pool: ${report.totalPool}`)
  lines.push(`- Already published from pool: ${report.publishedInPool}`)
  lines.push(`- Still unpublished in pool: ${report.unpublishedInPool}`)
  lines.push(`- Live tracker matches inside pool: ${report.liveTrackerInPool}`)
  lines.push(`- Live tracker entries not yet in public manifest: ${report.liveButNotPublished}`)
  lines.push('')
  lines.push('## Published In Pool')
  lines.push(...formatEntries(report.published))
  lines.push('')
  lines.push('## Still Unpublished In Pool')
  lines.push(...formatEntries(report.unpublished))
  return lines.join('\n')
}

function formatEntries(entries: PoolEntry[]): string[] {
  if (entries.length === 0) return ['- none']
  return entries.map(entry => `- ${entry.slug} - ${entry.title} (${entry.file})`)
}
