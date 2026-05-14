import fs from 'node:fs'
import path from 'node:path'

type CliOptions = {
  outputPath: string
  minDelayMs: number
  maxDelayMs: number
  letters: string[]
}

type CatalogEntry = {
  songUuid: string
  detailUrl: string
  title: string
  normalizedTitle: string
  letter: string
  page: number
  rankInPage: number
}

type LetterSummary = {
  letter: string
  pageCount: number
  entryCount: number
}

type CatalogSnapshot = {
  generatedAt: string
  source: {
    site: string
    subsite: string
    listMode: string
    endpoint: string
  }
  requestPolicy: {
    usesLogin: boolean
    minDelayMs: number
    maxDelayMs: number
  }
  letters: LetterSummary[]
  entryCount: number
  uniqueSongUuidCount: number
  duplicateSongUuidCount: number
  entries: CatalogEntry[]
}

const DEFAULT_OUTPUT_PATH = path.resolve(
  process.cwd(),
  'reference',
  'kuailepu-catalog',
  'wind-song-index.json'
)
const DEFAULT_MIN_DELAY_MS = 400
const DEFAULT_MAX_DELAY_MS = 900
const DEFAULT_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('')
const ENDPOINT = 'https://www.kuaiyuepu.com/web/song.php?action=index_more'
const DETAIL_BASE_URL = 'https://www.kuaiyuepu.com'

const options = parseArgs(process.argv.slice(2))

const entries: CatalogEntry[] = []
const letters: LetterSummary[] = []

for (const letter of options.letters) {
  const pageEntries: CatalogEntry[] = []
  const seenSortPoints = new Set<string>()
  let sortPoint = ''
  let page = 1

  while (true) {
    const payload = await fetchLetterPage(letter, sortPoint)
    const pageEntriesRaw = extractEntriesFromHtml(payload.result.data_list, letter, page)
    const nextSortPoint =
      typeof payload.result.sort_point === 'string' ? payload.result.sort_point.trim() : ''
    const count = typeof payload.result.count === 'number' ? payload.result.count : pageEntriesRaw.length
    const limit = typeof payload.result.limit === 'number' ? payload.result.limit : pageEntriesRaw.length

    pageEntries.push(...pageEntriesRaw)

    if (count < limit || nextSortPoint.length === 0 || seenSortPoints.has(nextSortPoint)) {
      break
    }

    seenSortPoints.add(nextSortPoint)
    sortPoint = nextSortPoint
    page += 1
    await sleep(randomInt(options.minDelayMs, options.maxDelayMs))
  }

  entries.push(...pageEntries)
  letters.push({
    letter,
    pageCount: page,
    entryCount: pageEntries.length
  })

  await sleep(randomInt(options.minDelayMs, options.maxDelayMs))
}

const dedupedEntries = dedupeEntries(entries)
const snapshot: CatalogSnapshot = {
  generatedAt: new Date().toISOString(),
  source: {
    site: 'https://www.kuaiyuepu.com/',
    subsite: 'wind',
    listMode: 'letter',
    endpoint: ENDPOINT
  },
  requestPolicy: {
    usesLogin: false,
    minDelayMs: options.minDelayMs,
    maxDelayMs: options.maxDelayMs
  },
  letters,
  entryCount: dedupedEntries.length,
  uniqueSongUuidCount: new Set(dedupedEntries.map(entry => entry.songUuid)).size,
  duplicateSongUuidCount: entries.length - dedupedEntries.length,
  entries: dedupedEntries
}

await fs.promises.mkdir(path.dirname(options.outputPath), { recursive: true })
await fs.promises.writeFile(options.outputPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf8')

console.log(
  JSON.stringify(
    {
      outputPath: path.relative(process.cwd(), options.outputPath),
      letters: snapshot.letters,
      entryCount: snapshot.entryCount,
      uniqueSongUuidCount: snapshot.uniqueSongUuidCount,
      duplicateSongUuidCount: snapshot.duplicateSongUuidCount
    },
    null,
    2
  )
)

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    outputPath: DEFAULT_OUTPUT_PATH,
    minDelayMs: DEFAULT_MIN_DELAY_MS,
    maxDelayMs: DEFAULT_MAX_DELAY_MS,
    letters: DEFAULT_LETTERS
  }

  for (const arg of args) {
    if (arg.startsWith('--out=')) {
      options.outputPath = path.resolve(process.cwd(), arg.slice('--out='.length))
      continue
    }

    if (arg.startsWith('--min-delay-ms=')) {
      options.minDelayMs = Number(arg.slice('--min-delay-ms='.length)) || DEFAULT_MIN_DELAY_MS
      continue
    }

    if (arg.startsWith('--max-delay-ms=')) {
      options.maxDelayMs = Number(arg.slice('--max-delay-ms='.length)) || DEFAULT_MAX_DELAY_MS
      continue
    }

    if (arg.startsWith('--letters=')) {
      options.letters = arg
        .slice('--letters='.length)
        .split(',')
        .map(value => value.trim().toLowerCase())
        .filter(value => /^[a-z]$/.test(value))
      continue
    }
  }

  if (options.letters.length === 0) {
    options.letters = DEFAULT_LETTERS
  }

  if (options.maxDelayMs < options.minDelayMs) {
    const swap = options.minDelayMs
    options.minDelayMs = options.maxDelayMs
    options.maxDelayMs = swap
  }

  return options
}

async function fetchLetterPage(letter: string, sortPoint: string) {
  const body = new URLSearchParams({
    sort_by: 'letter',
    sort_point: sortPoint,
    subsite: 'wind',
    letter
  })

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'x-requested-with': 'XMLHttpRequest'
    },
    body
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Kuailepu catalog page for "${letter}": ${response.status}`)
  }

  const payload = (await response.json()) as {
    errCode?: number
    errMsg?: string
    result?: {
      data_list?: string
      count?: number
      limit?: number
      sort_point?: string
    }
  }

  if (payload.errCode !== 0 || !payload.result) {
    throw new Error(
      `Kuailepu catalog response failed for "${letter}": ${payload.errMsg || 'unknown error'}`
    )
  }

  return payload as {
    errCode: number
    errMsg: string
    result: {
      data_list: string
      count: number
      limit: number
      sort_point: string
    }
  }
}

function extractEntriesFromHtml(html: string, letter: string, page: number) {
  const entries: CatalogEntry[] = []
  const regex =
    /<a href="\/jianpu\/([^".?#/]+)\.html">[\s\S]*?<div class="item-content">([\s\S]*?)<\/div>/g
  let match: RegExpExecArray | null = null
  let rankInPage = 0

  while ((match = regex.exec(html))) {
    const songUuid = match[1]?.trim()
    const rawTitle = match[2] ?? ''
    const title = normalizeHtmlText(rawTitle)

    if (!songUuid || !title) {
      continue
    }

    rankInPage += 1
    entries.push({
      songUuid,
      detailUrl: `${DETAIL_BASE_URL}/jianpu/${songUuid}.html`,
      title,
      normalizedTitle: normalizeSearchText(title),
      letter,
      page,
      rankInPage
    })
  }

  return entries
}

function normalizeHtmlText(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s\p{P}\p{S}]+/gu, '')
}

function dedupeEntries(entries: CatalogEntry[]) {
  const seen = new Set<string>()
  return entries.filter(entry => {
    if (seen.has(entry.songUuid)) {
      return false
    }

    seen.add(entry.songUuid)
    return true
  })
}

function randomInt(min: number, max: number) {
  const lower = Math.ceil(min)
  const upper = Math.floor(max)
  return Math.floor(Math.random() * (upper - lower + 1)) + lower
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
