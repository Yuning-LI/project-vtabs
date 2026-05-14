import fs from 'node:fs'
import path from 'node:path'

type CatalogEntry = {
  songUuid: string
  detailUrl: string
  title: string
  normalizedTitle: string
  letter: string
  page: number
  rankInPage: number
}

type CatalogSnapshot = {
  generatedAt: string
  entries: CatalogEntry[]
}

type CliOptions = {
  inputPath: string
  limit: number
  json: boolean
  queries: string[]
}

type LocalOverlay = {
  publicSlug: string | null
  publicTitle: string | null
  isPublic: boolean
  isImportedLocally: boolean
}

const DEFAULT_INPUT_PATH = path.resolve(
  process.cwd(),
  'reference',
  'kuailepu-catalog',
  'wind-song-index.json'
)

const options = parseArgs(process.argv.slice(2))

if (options.queries.length === 0) {
  console.error(
    'Usage: npm run search:kuailepu-catalog -- <query> [query...] [--limit=20] [--json] [--in=reference/kuailepu-catalog/wind-song-index.json]'
  )
  process.exit(1)
}

if (!fs.existsSync(options.inputPath)) {
  console.error(`Catalog index not found: ${path.relative(process.cwd(), options.inputPath)}`)
  process.exit(1)
}

const snapshot = JSON.parse(fs.readFileSync(options.inputPath, 'utf8')) as CatalogSnapshot
const overlays = buildLocalOverlay()

const results = options.queries.map(query => {
  const normalizedQuery = normalizeSearchText(query)
  const matches = snapshot.entries
    .map(entry => ({
      entry,
      score: scoreEntry(entry, query, normalizedQuery),
      overlay: overlays.get(normalizeDetailUrl(entry.detailUrl)) ?? {
        publicSlug: null,
        publicTitle: null,
        isPublic: false,
        isImportedLocally: false
      }
    }))
    .filter(item => item.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score
      }

      if (left.entry.title.length !== right.entry.title.length) {
        return left.entry.title.length - right.entry.title.length
      }

      return left.entry.title.localeCompare(right.entry.title)
    })
    .slice(0, options.limit)
    .map(item => ({
      title: item.entry.title,
      songUuid: item.entry.songUuid,
      detailUrl: item.entry.detailUrl,
      letter: item.entry.letter,
      page: item.entry.page,
      publicSlug: item.overlay.publicSlug,
      publicTitle: item.overlay.publicTitle,
      isPublic: item.overlay.isPublic,
      isImportedLocally: item.overlay.isImportedLocally
    }))

  return {
    query,
    matchCount: matches.length,
    matches
  }
})

if (options.json) {
  console.log(JSON.stringify(results, null, 2))
} else {
  for (const result of results) {
    console.log(`\n[${result.query}] ${result.matchCount} matches`)
    if (result.matches.length === 0) {
      console.log('- No local catalog matches.')
      continue
    }

    for (const match of result.matches) {
      const status = match.isPublic
        ? `public:${match.publicSlug}`
        : match.isImportedLocally
          ? `imported-local:${match.publicSlug ?? 'unknown-slug'}`
          : 'not-imported'
      console.log(`- ${match.title}  [${match.songUuid}]  ${status}`)
      console.log(`  ${match.detailUrl}`)
    }
  }
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    inputPath: DEFAULT_INPUT_PATH,
    limit: 20,
    json: false,
    queries: []
  }

  for (const arg of args) {
    if (arg === '--json') {
      options.json = true
      continue
    }

    if (arg.startsWith('--limit=')) {
      options.limit = Number(arg.slice('--limit='.length)) || 20
      continue
    }

    if (arg.startsWith('--in=')) {
      options.inputPath = path.resolve(process.cwd(), arg.slice('--in='.length))
      continue
    }

    options.queries.push(arg)
  }

  return options
}

function scoreEntry(entry: CatalogEntry, rawQuery: string, normalizedQuery: string) {
  const lowerQuery = rawQuery.trim().toLowerCase()
  const titleLower = entry.title.toLowerCase()

  if (entry.songUuid.toLowerCase() === lowerQuery) {
    return 100
  }

  if (entry.detailUrl.toLowerCase() === lowerQuery) {
    return 95
  }

  if (titleLower === lowerQuery) {
    return 90
  }

  if (entry.normalizedTitle === normalizedQuery) {
    return 85
  }

  if (titleLower.includes(lowerQuery)) {
    return 70
  }

  if (entry.normalizedTitle.includes(normalizedQuery) && normalizedQuery.length > 0) {
    return 60
  }

  return 0
}

function buildLocalOverlay() {
  const overlays = new Map<string, LocalOverlay>()
  const publicSlugs = new Set<string>()
  const manifestPath = path.resolve(process.cwd(), 'data', 'songbook', 'public-song-manifest.json')
  const compactDir = path.resolve(process.cwd(), 'data', 'kuailepu')

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Array<{
      slug?: string
      published?: boolean
    }>

    for (const row of manifest) {
      if (row.published && typeof row.slug === 'string' && row.slug.trim()) {
        publicSlugs.add(row.slug.trim())
      }
    }
  }

  if (!fs.existsSync(compactDir)) {
    return overlays
  }

  const fileNames = fs.readdirSync(compactDir).filter(name => name.endsWith('.json'))
  for (const fileName of fileNames) {
    const filePath = path.join(compactDir, fileName)
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
      slug?: string
      title?: string
      source?: {
        url?: string
      }
    }

    const sourceUrl = normalizeDetailUrl(parsed.source?.url ?? '')
    const slug = typeof parsed.slug === 'string' ? parsed.slug.trim() : ''

    if (!sourceUrl || !slug) {
      continue
    }

    overlays.set(sourceUrl, {
      publicSlug: slug,
      publicTitle: typeof parsed.title === 'string' ? parsed.title.trim() : slug,
      isPublic: publicSlugs.has(slug),
      isImportedLocally: true
    })
  }

  return overlays
}

function normalizeDetailUrl(value: string) {
  return value.trim().replace(/^http:\/\//i, 'https://').replace(/\/+$/, '')
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s\p{P}\p{S}]+/gu, '')
}
