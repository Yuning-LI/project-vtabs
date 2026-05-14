import fs from 'node:fs'
import path from 'node:path'
import { songCatalog } from '../src/lib/songbook/catalog.ts'
import { songSeoProfiles } from '../src/lib/songbook/seoProfiles.ts'

type CliOptions = {
  sourceDir: string | null
  titlesFile: string | null
  days: number
  concurrency: number
  limit: number | null
  top: number
  out: string | null
}

const REQUEST_GAP_MS = 1200
const REQUEST_TIMEOUT_MS = 15000
let nextRequestAllowedAt = 0

type CorpusSong = {
  title: string
  sourcePath: string
  composerRoot: string
}

type TrafficLookup =
  | {
      ok: true
      articleTitle: string
      lookupMode: 'exact' | 'search'
      totalViews: number
      avgDailyViews: number
      peakDailyViews: number
      nonZeroDays: number
    }
  | {
      ok: false
      articleTitle: null
      lookupMode: 'none'
      totalViews: number
      avgDailyViews: number
      peakDailyViews: number
      nonZeroDays: number
    }

type TrafficRow = {
  title: string
  composerRoot: string
  sourcePath: string
  articleTitle: string | null
  articleUrl: string | null
  totalViews: number
  avgDailyViews: number
  peakDailyViews: number
  nonZeroDays: number
  lookupMode: 'exact' | 'search' | 'none'
  alreadyPublic: boolean
  publicSlug: string | null
  publicTitle: string | null
}

const usage =
  'Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/rank-public-domain-candidates.ts [--source-dir=private/openewld/dataset | --titles-file=tmp/public-domain-candidate-titles.json] [--days=90] [--concurrency=2] [--limit=200] [--top=30] [--out=reference/song-publish-candidates/public-domain-traffic-ranking.json]'

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const corpusSongs = options.titlesFile
  ? collectTitlesFromFile(options.titlesFile)
  : collectCorpusSongs(options.sourceDir ?? 'private/openewld/dataset')
const selectedSongs = options.limit ? corpusSongs.slice(0, options.limit) : corpusSongs
const publicIndex = buildPublicIndex()
const endDate = formatDate(addDays(utcToday(), -1))
const startDate = formatDate(addDays(addDays(utcToday(), -1), -(options.days - 1)))

const rows = await mapLimit(selectedSongs, options.concurrency, async song =>
  buildTrafficRow(song, startDate, endDate, publicIndex)
)

rows.sort((a, b) => {
  if (b.totalViews !== a.totalViews) return b.totalViews - a.totalViews
  return a.title.localeCompare(b.title)
})

const candidateRows = rows.filter(row => !row.alreadyPublic)
const report = {
  generatedOn: new Date().toISOString(),
  sourceDir: options.sourceDir,
  days: options.days,
  totalSongs: corpusSongs.length,
  analyzedSongs: selectedSongs.length,
  publicMatches: rows.filter(row => row.alreadyPublic).length,
  candidateSongs: candidateRows.length,
  topRankedRows: rows.slice(0, options.top),
  topCandidateRows: candidateRows.slice(0, options.top)
}

if (options.out) {
  const outPath = path.resolve(process.cwd(), options.out)
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true })
  await fs.promises.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Wrote report to ${path.relative(process.cwd(), outPath)}`)
}

console.log(JSON.stringify(report, null, 2))

function parseArgs(args: string[]): CliOptions | null {
  const options: Partial<CliOptions> = {
    sourceDir: 'private/openewld/dataset',
    titlesFile: null,
    days: 90,
    concurrency: 2,
    limit: null,
    top: 30,
    out: null
  }

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      return null
    }
    if (arg.startsWith('--source-dir=')) {
      options.sourceDir = arg.slice('--source-dir='.length)
      continue
    }
    if (arg.startsWith('--titles-file=')) {
      options.titlesFile = arg.slice('--titles-file='.length)
      continue
    }
    if (arg.startsWith('--days=')) {
      options.days = Number.parseInt(arg.slice('--days='.length), 10)
      continue
    }
    if (arg.startsWith('--concurrency=')) {
      options.concurrency = Number.parseInt(arg.slice('--concurrency='.length), 10)
      continue
    }
    if (arg.startsWith('--limit=')) {
      options.limit = Number.parseInt(arg.slice('--limit='.length), 10)
      continue
    }
    if (arg.startsWith('--top=')) {
      options.top = Number.parseInt(arg.slice('--top='.length), 10)
      continue
    }
    if (arg.startsWith('--out=')) {
      options.out = arg.slice('--out='.length)
      continue
    }
    return null
  }

  if (!options.sourceDir && !options.titlesFile) return null
  if (!Number.isFinite(options.days) || options.days < 1) return null
  if (!Number.isFinite(options.concurrency) || options.concurrency < 1) return null
  if (options.limit !== null && (!Number.isFinite(options.limit) || options.limit < 1)) return null
  if (!Number.isFinite(options.top) || options.top < 1) return null

  return {
    sourceDir: options.sourceDir ?? null,
    titlesFile: options.titlesFile ?? null,
    days: options.days,
    concurrency: options.concurrency,
    limit: options.limit,
    top: options.top,
    out: options.out
  }
}

function collectCorpusSongs(sourceDir: string): CorpusSong[] {
  const root = path.resolve(process.cwd(), sourceDir)
  const rootLabel = path.basename(root)
  const songFolders = new Set<string>()

  walk(root, filePath => {
    if (!/\.(mxl|xml|musicxml)$/i.test(filePath)) {
      return
    }
    songFolders.add(path.dirname(filePath))
  })

  return [...songFolders]
    .sort((a, b) => a.localeCompare(b))
    .map(folder => {
      const relative = path.relative(root, folder)
      const parts = relative.split(path.sep)
      return {
        title: (parts[1] ?? path.basename(folder)).replace(/_/g, ' '),
        sourcePath: folder,
        composerRoot: parts.length > 1 ? parts[0] : rootLabel
      }
    })
}

function collectTitlesFromFile(titlesFile: string): CorpusSong[] {
  const filePath = path.resolve(process.cwd(), titlesFile)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Titles file not found: ${path.relative(process.cwd(), filePath)}`)
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error(`Titles file must be a JSON array: ${titlesFile}`)
  }

  return parsed
    .map((item, index) => (typeof item === 'string' ? item.trim() : ''))
    .filter((title): title is string => title.length > 0)
    .map((title, index) => ({
      title,
      sourcePath: `seed/${index + 1}`,
      composerRoot: 'web'
    }))
}

async function buildTrafficRow(
  song: CorpusSong,
  startDate: string,
  endDate: string,
  publicIndex: Map<string, { slug: string; title: string }>
): Promise<TrafficRow> {
  const exactLookup = await fetchPageviews(song.title, startDate, endDate, 'exact')
  const lookup = exactLookup.ok ? exactLookup : await lookupWithWikipediaSearch(song.title, startDate, endDate)
  const publicMatch = publicIndex.get(normalizeKey(song.title)) ?? null

  return {
    title: song.title,
    composerRoot: song.composerRoot,
    sourcePath: path.relative(process.cwd(), song.sourcePath),
    articleTitle: lookup.articleTitle,
    articleUrl: lookup.articleTitle
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(lookup.articleTitle.replace(/ /g, '_'))}`
      : null,
    totalViews: lookup.totalViews,
    avgDailyViews: lookup.avgDailyViews,
    peakDailyViews: lookup.peakDailyViews,
    nonZeroDays: lookup.nonZeroDays,
    lookupMode: lookup.lookupMode,
    alreadyPublic: Boolean(publicMatch),
    publicSlug: publicMatch?.slug ?? null,
    publicTitle: publicMatch?.title ?? null
  }
}

async function fetchPageviews(
  articleTitle: string,
  startDate: string,
  endDate: string,
  lookupMode: 'exact' | 'search'
): Promise<TrafficLookup> {
  const url =
    `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/` +
    `${encodeURIComponent(articleTitle.replace(/ /g, '_'))}/daily/${startDate}/${endDate}`

  const response = await fetch(url, {
    headers: buildRequestHeaders()
  })

  if (response.status === 404) {
    return {
      ok: false,
      articleTitle: null,
      lookupMode: 'none',
      totalViews: 0,
      avgDailyViews: 0,
      peakDailyViews: 0,
      nonZeroDays: 0
    }
  }

  if (!response.ok) {
    const retried = await retryableFetch(url)
    if (retried.status === 404) {
      return {
        ok: false,
        articleTitle: null,
        lookupMode: 'none',
        totalViews: 0,
        avgDailyViews: 0,
        peakDailyViews: 0,
        nonZeroDays: 0
      }
    }
    if (!retried.ok) {
      return {
        ok: false,
        articleTitle: null,
        lookupMode: 'none',
        totalViews: 0,
        avgDailyViews: 0,
        peakDailyViews: 0,
        nonZeroDays: 0
      }
    }
    const retriedData = (await retried.json()) as {
      items?: Array<{ views?: number }>
    }
    return summarizePageviews(articleTitle, lookupMode, retriedData.items)
  }

  const data = (await response.json()) as {
    items?: Array<{ views?: number }>
  }
  return summarizePageviews(articleTitle, lookupMode, data.items)
}

async function lookupWithWikipediaSearch(
  title: string,
  startDate: string,
  endDate: string
): Promise<TrafficLookup> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(title)}` +
    '&srlimit=5&format=json&origin=*'

  const response = await retryableFetch(url)

  if (!response.ok) {
    return {
      ok: false,
      articleTitle: null,
      lookupMode: 'none',
      totalViews: 0,
      avgDailyViews: 0,
      peakDailyViews: 0,
      nonZeroDays: 0
    }
  }

  const data = (await response.json()) as {
    query?: { search?: Array<{ title?: string }> }
  }
  const matchedTitle = pickSearchFallbackTitle(
    title,
    (data.query?.search ?? []).map(item => item.title?.trim() ?? '').filter(Boolean)
  )
  if (!matchedTitle) {
    return {
      ok: false,
      articleTitle: null,
      lookupMode: 'none',
      totalViews: 0,
      avgDailyViews: 0,
      peakDailyViews: 0,
      nonZeroDays: 0
    }
  }

  return fetchPageviews(matchedTitle, startDate, endDate, 'search')
}

function buildPublicIndex() {
  const index = new Map<string, { slug: string; title: string }>()

  for (const song of songCatalog) {
    addPublicKey(index, song.title, song.slug, song.title)
    addPublicKey(index, song.slug, song.slug, song.title)

    const seoProfile = songSeoProfiles[song.slug]
    if (seoProfile?.aliases) {
      for (const alias of seoProfile.aliases) {
        addPublicKey(index, alias, song.slug, song.title)
      }
    }
  }

  return index
}

function addPublicKey(
  index: Map<string, { slug: string; title: string }>,
  key: string,
  slug: string,
  title: string
) {
  const normalized = normalizeKey(key)
  if (normalized.length > 0 && !index.has(normalized)) {
    index.set(normalized, { slug, title })
  }
}

function normalizeKey(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function pickSearchFallbackTitle(queryTitle: string, candidates: string[]) {
  const queryTokens = tokenizeMeaningfulWords(queryTitle)
  let bestTitle: string | null = null
  let bestScore = 0

  for (const candidate of candidates) {
    const score = countSharedTokens(queryTokens, tokenizeMeaningfulWords(candidate))
    if (score > bestScore) {
      bestScore = score
      bestTitle = candidate
    }
  }

  if (!bestTitle) {
    return null
  }

  if (queryTokens.length <= 2) {
    return bestScore === queryTokens.length ? bestTitle : null
  }

  return bestScore >= 2 ? bestTitle : null
}

function tokenizeMeaningfulWords(value: string) {
  return normalizeKey(value)
    .split(' ')
    .filter(token => token.length >= 3)
}

function countSharedTokens(left: string[], right: string[]) {
  const rightSet = new Set(right)
  return left.reduce((count, token) => count + (rightSet.has(token) ? 1 : 0), 0)
}

function walk(root: string, onFile: (filePath: string) => void) {
  if (!fs.existsSync(root)) {
    throw new Error(`Source directory not found: ${path.relative(process.cwd(), root)}`)
  }

  const stack = [root]
  while (stack.length > 0) {
    const current = stack.pop() as string
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const nextPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(nextPath)
        continue
      }
      onFile(nextPath)
    }
  }
}

function summarizePageviews(
  articleTitle: string,
  lookupMode: 'exact' | 'search',
  items: Array<{ views?: number }> | undefined
): TrafficLookup {
  const safeItems = Array.isArray(items) ? items : []
  const totalViews = safeItems.reduce((sum, item) => sum + (item.views ?? 0), 0)
  const peakDailyViews = safeItems.reduce((peak, item) => Math.max(peak, item.views ?? 0), 0)
  const nonZeroDays = safeItems.filter(item => (item.views ?? 0) > 0).length

  return {
    ok: true,
    articleTitle,
    lookupMode,
    totalViews,
    avgDailyViews: safeItems.length > 0 ? totalViews / safeItems.length : 0,
    peakDailyViews,
    nonZeroDays
  }
}

function buildRequestHeaders() {
  return {
    accept: 'application/json',
    'user-agent': 'project-vtabs/1.0 (candidate-ranking)'
  }
}

async function retryableFetch(url: string, attempts = 4) {
  let lastResponse: Response | null = null

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await waitForRequestSlot()
    let response: Response
    try {
      response = await fetch(url, {
        headers: buildRequestHeaders(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
    } catch (error) {
      if (attempt === attempts - 1) {
        throw error
      }
      await sleep(1500 * (attempt + 1))
      continue
    }

    if (response.ok || response.status === 404) {
      return response
    }

    lastResponse = response
    if (response.status !== 429 && response.status < 500) {
      return response
    }

    const retryAfterMs = readRetryAfterMs(response) ?? 2000 * (attempt + 1)
    nextRequestAllowedAt = Math.max(nextRequestAllowedAt, Date.now() + retryAfterMs)
    await sleep(retryAfterMs)
  }

  if (lastResponse) {
    return lastResponse
  }

  throw new Error(`Fetch failed without a response: ${url}`)
}

async function mapLimit<T, U>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<U>
) {
  const results: U[] = new Array(items.length)
  let cursor = 0

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await mapper(items[index], index)
    }
  })

  await Promise.all(workers)
  return results
}

function utcToday() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function formatDate(date: Date) {
  const year = date.getUTCFullYear()
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0')
  const day = `${date.getUTCDate()}`.padStart(2, '0')
  return `${year}${month}${day}`
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForRequestSlot() {
  const waitMs = nextRequestAllowedAt - Date.now()
  if (waitMs > 0) {
    await sleep(waitMs)
  }
  nextRequestAllowedAt = Date.now() + REQUEST_GAP_MS
}

function readRetryAfterMs(response: Response) {
  const retryAfter = response.headers.get('retry-after')
  if (!retryAfter) {
    return null
  }

  const seconds = Number.parseInt(retryAfter, 10)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000
  }

  return null
}
