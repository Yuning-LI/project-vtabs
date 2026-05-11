import fs from 'node:fs'
import path from 'node:path'

type CliOptions = {
  csvPath: string
  minImpressions: number
  minSharedUrls: number
  top: number
  json: boolean
}

type RawRecord = {
  query: string
  page: string
  clicks: number
  impressions: number
  ctr: number | null
  position: number | null
}

type AggregatedMetrics = {
  clicks: number
  impressions: number
  rows: number
}

type QueryAuditRow = {
  query: string
  totalClicks: number
  totalImpressions: number
  sharedPages: Array<{
    slug: string
    title: string
    clicks: number
    impressions: number
  }>
}

type PairAuditRow = {
  leftSlug: string
  leftTitle: string
  rightSlug: string
  rightTitle: string
  sharedQueries: number
  sharedImpressions: number
  sharedClicks: number
}

type PageAuditRow = {
  slug: string
  title: string
  overlappingQueries: number
  sharedImpressions: number
  sharedClicks: number
  strongestPeers: Array<{
    slug: string
    title: string
    sharedQueries: number
  }>
}

const options = parseArgs(process.argv.slice(2))
const learnGuideMap = loadLearnGuideMap()
const learnSlugs = new Set(learnGuideMap.keys())
const learnTitles = new Map(Array.from(learnGuideMap.entries()))

const csvText = fs.readFileSync(options.csvPath, 'utf8')
const rows = parseCsv(csvText)

if (rows.length < 2) {
  console.error(`CSV has no data rows: ${options.csvPath}`)
  process.exit(1)
}

const header = rows[0]
const dataRows = rows.slice(1)
const columns = resolveColumnIndexes(header)
const rawRecords = dataRows
  .map(row => toRawRecord(row, columns))
  .filter((record): record is RawRecord => Boolean(record))

const learnRecords = rawRecords
  .map(record => {
    const slug = extractLearnSlug(record.page, learnSlugs)
    return slug ? { ...record, slug } : null
  })
  .filter((record): record is RawRecord & { slug: string } => Boolean(record))

const queryMap = new Map<string, Map<string, AggregatedMetrics>>()
const queryDisplay = new Map<string, string>()

for (const record of learnRecords) {
  const normalizedQuery = normalizeQuery(record.query)
  if (!normalizedQuery) {
    continue
  }

  queryDisplay.set(normalizedQuery, queryDisplay.get(normalizedQuery) ?? record.query.trim())

  const perSlug = queryMap.get(normalizedQuery) ?? new Map<string, AggregatedMetrics>()
  const metrics = perSlug.get(record.slug) ?? { clicks: 0, impressions: 0, rows: 0 }
  metrics.clicks += record.clicks
  metrics.impressions += record.impressions
  metrics.rows += 1
  perSlug.set(record.slug, metrics)
  queryMap.set(normalizedQuery, perSlug)
}

const overlappingQueries: QueryAuditRow[] = []
const pairMap = new Map<string, PairAuditRow>()
const pageMap = new Map<string, PageAuditRow>()

for (const [normalizedQuery, perSlug] of queryMap.entries()) {
  if (perSlug.size < options.minSharedUrls) {
    continue
  }

  const sharedPages = Array.from(perSlug.entries())
    .map(([slug, metrics]) => ({
      slug,
      title: learnTitles.get(slug) ?? slug,
      clicks: metrics.clicks,
      impressions: metrics.impressions
    }))
    .sort((left, right) => right.impressions - left.impressions || right.clicks - left.clicks)

  const totalImpressions = sharedPages.reduce((sum, row) => sum + row.impressions, 0)
  if (totalImpressions < options.minImpressions) {
    continue
  }

  const totalClicks = sharedPages.reduce((sum, row) => sum + row.clicks, 0)
  overlappingQueries.push({
    query: queryDisplay.get(normalizedQuery) ?? normalizedQuery,
    totalClicks,
    totalImpressions,
    sharedPages
  })

  for (const page of sharedPages) {
    const pageRow = pageMap.get(page.slug) ?? {
      slug: page.slug,
      title: page.title,
      overlappingQueries: 0,
      sharedImpressions: 0,
      sharedClicks: 0,
      strongestPeers: []
    }
    pageRow.overlappingQueries += 1
    pageRow.sharedImpressions += page.impressions
    pageRow.sharedClicks += page.clicks
    pageMap.set(page.slug, pageRow)
  }

  for (let index = 0; index < sharedPages.length; index += 1) {
    for (let cursor = index + 1; cursor < sharedPages.length; cursor += 1) {
      const left = sharedPages[index]
      const right = sharedPages[cursor]
      const pairKey = [left.slug, right.slug].sort().join('::')
      const pairRow = pairMap.get(pairKey) ?? {
        leftSlug: left.slug,
        leftTitle: left.title,
        rightSlug: right.slug,
        rightTitle: right.title,
        sharedQueries: 0,
        sharedImpressions: 0,
        sharedClicks: 0
      }
      pairRow.sharedQueries += 1
      pairRow.sharedImpressions += left.impressions + right.impressions
      pairRow.sharedClicks += left.clicks + right.clicks
      pairMap.set(pairKey, pairRow)
    }
  }
}

const strongestPairs = Array.from(pairMap.values()).sort(
  (left, right) =>
    right.sharedImpressions - left.sharedImpressions ||
    right.sharedQueries - left.sharedQueries ||
    right.sharedClicks - left.sharedClicks
)

const pagePeerMap = buildPagePeerMap(overlappingQueries)
const learnPages = Array.from(pageMap.values())
  .map(page => ({
    ...page,
    strongestPeers: Array.from(pagePeerMap.get(page.slug)?.entries() ?? [])
      .map(([peerSlug, sharedQueries]) => ({
        slug: peerSlug,
        title: learnTitles.get(peerSlug) ?? peerSlug,
        sharedQueries
      }))
      .sort((left, right) => right.sharedQueries - left.sharedQueries || left.slug.localeCompare(right.slug))
      .slice(0, 3)
  }))
  .sort(
    (left, right) =>
      right.sharedImpressions - left.sharedImpressions ||
      right.overlappingQueries - left.overlappingQueries ||
      right.sharedClicks - left.sharedClicks
  )

const summary = {
  input: path.resolve(options.csvPath),
  rows: rawRecords.length,
  learnRows: learnRecords.length,
  uniqueLearnPages: new Set(learnRecords.map(record => record.slug)).size,
  overlappingQueries: overlappingQueries.length,
  pairs: strongestPairs.length,
  minImpressions: options.minImpressions,
  minSharedUrls: options.minSharedUrls
}

const payload = {
  summary,
  overlappingQueries: overlappingQueries
    .sort(
      (left, right) =>
        right.totalImpressions - left.totalImpressions ||
        right.sharedPages.length - left.sharedPages.length ||
        right.totalClicks - left.totalClicks
    )
    .slice(0, options.top),
  strongestPairs: strongestPairs.slice(0, options.top),
  learnPages: learnPages.slice(0, options.top)
}

if (options.json) {
  console.log(JSON.stringify(payload, null, 2))
  process.exit(0)
}

printHumanSummary(payload)

function parseArgs(args: string[]): CliOptions {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage()
    process.exit(args.length === 0 ? 1 : 0)
  }

  let csvPath = ''
  let minImpressions = 20
  let minSharedUrls = 2
  let top = 20
  let json = false

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (!arg.startsWith('--')) {
      csvPath = csvPath || arg
      continue
    }

    if (arg === '--json') {
      json = true
      continue
    }

    const [flag, inlineValue] = arg.split('=', 2)
    const nextValue = inlineValue ?? args[index + 1]
    if (!inlineValue) {
      index += 1
    }

    switch (flag) {
      case '--min-impressions':
        minImpressions = parsePositiveInteger(flag, nextValue)
        break
      case '--min-shared-urls':
        minSharedUrls = parsePositiveInteger(flag, nextValue)
        break
      case '--top':
        top = parsePositiveInteger(flag, nextValue)
        break
      default:
        console.error(`Unknown option: ${flag}`)
        printUsage()
        process.exit(1)
    }
  }

  if (!csvPath) {
    console.error('Missing CSV path.')
    printUsage()
    process.exit(1)
  }

  return { csvPath, minImpressions, minSharedUrls, top, json }
}

function printUsage() {
  console.error(
    [
      'Usage: npm run audit:learn-gsc -- <export.csv> [--min-impressions 20] [--min-shared-urls 2] [--top 20] [--json]',
      '',
      'Expected CSV columns:',
      '- Query / Top queries',
      '- Page / Top pages / URL',
      '- Clicks',
      '- Impressions',
      '- Optional: CTR, Position'
    ].join('\n')
  )
}

function parsePositiveInteger(flag: string, value: string | undefined) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    console.error(`Invalid value for ${flag}: ${value ?? '(missing)'}`)
    process.exit(1)
  }
  return parsed
}

function parseCsv(text: string) {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let insideQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"') {
      if (insideQuotes && next === '"') {
        currentCell += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    if (!insideQuotes && char === ',') {
      currentRow.push(currentCell)
      currentCell = ''
      continue
    }

    if (!insideQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        index += 1
      }
      currentRow.push(currentCell)
      if (currentRow.some(cell => cell.trim().length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentCell = ''
      continue
    }

    currentCell += char
  }

  currentRow.push(currentCell)
  if (currentRow.some(cell => cell.trim().length > 0)) {
    rows.push(currentRow)
  }

  return rows
}

function resolveColumnIndexes(headerRow: string[]) {
  const normalized = headerRow.map(normalizeHeader)

  const query = findColumnIndex(normalized, ['query', 'top queries', 'queries', 'search query'])
  const page = findColumnIndex(normalized, ['page', 'top pages', 'url', 'landing page'])
  const clicks = findColumnIndex(normalized, ['clicks'])
  const impressions = findColumnIndex(normalized, ['impressions'])
  const ctr = findOptionalColumnIndex(normalized, ['ctr', 'site ctr'])
  const position = findOptionalColumnIndex(normalized, ['position', 'average position'])

  return { query, page, clicks, impressions, ctr, position }
}

function findColumnIndex(headerRow: string[], aliases: string[]) {
  const index = findOptionalColumnIndex(headerRow, aliases)
  if (index === -1) {
    console.error(`Missing required CSV column. Tried: ${aliases.join(', ')}`)
    process.exit(1)
  }
  return index
}

function findOptionalColumnIndex(headerRow: string[], aliases: string[]) {
  for (const alias of aliases) {
    const exactIndex = headerRow.findIndex(header => header === alias)
    if (exactIndex !== -1) {
      return exactIndex
    }
  }

  for (const alias of aliases) {
    const fuzzyIndex = headerRow.findIndex(header => header.includes(alias))
    if (fuzzyIndex !== -1) {
      return fuzzyIndex
    }
  }

  return -1
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function toRawRecord(
  row: string[],
  columns: {
    query: number
    page: number
    clicks: number
    impressions: number
    ctr: number
    position: number
  }
): RawRecord | null {
  const query = row[columns.query]?.trim() ?? ''
  const page = row[columns.page]?.trim() ?? ''

  if (!query || !page) {
    return null
  }

  return {
    query,
    page,
    clicks: parseNumber(row[columns.clicks]),
    impressions: parseNumber(row[columns.impressions]),
    ctr: columns.ctr === -1 ? null : parseNumber(row[columns.ctr]),
    position: columns.position === -1 ? null : parseNumber(row[columns.position])
  }
}

function parseNumber(value: string | undefined) {
  if (!value) {
    return 0
  }
  const normalized = value.replace(/[%,$]/g, '').replace(/,/g, '').trim()
  if (!normalized) {
    return 0
  }
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function extractLearnSlug(pageValue: string, knownSlugs: Set<string>) {
  try {
    const parsed = pageValue.startsWith('http://') || pageValue.startsWith('https://')
      ? new URL(pageValue)
      : new URL(pageValue, 'https://www.vtabs.example')
    const pathname = parsed.pathname.replace(/\/+$/, '')
    if (!pathname.startsWith('/learn/')) {
      return null
    }
    const slug = pathname.slice('/learn/'.length)
    if (!slug || slug.includes('/')) {
      return null
    }
    return knownSlugs.has(slug) ? slug : null
  } catch {
    return null
  }
}

function normalizeQuery(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function buildPagePeerMap(rows: QueryAuditRow[]) {
  const peerMap = new Map<string, Map<string, number>>()

  for (const row of rows) {
    for (let index = 0; index < row.sharedPages.length; index += 1) {
      for (let cursor = 0; cursor < row.sharedPages.length; cursor += 1) {
        if (index === cursor) {
          continue
        }
        const slug = row.sharedPages[index].slug
        const peerSlug = row.sharedPages[cursor].slug
        const peerCounts = peerMap.get(slug) ?? new Map<string, number>()
        peerCounts.set(peerSlug, (peerCounts.get(peerSlug) ?? 0) + 1)
        peerMap.set(slug, peerCounts)
      }
    }
  }

  return peerMap
}

function printHumanSummary(payload: {
  summary: {
    input: string
    rows: number
    learnRows: number
    uniqueLearnPages: number
    overlappingQueries: number
    pairs: number
    minImpressions: number
    minSharedUrls: number
  }
  overlappingQueries: QueryAuditRow[]
  strongestPairs: PairAuditRow[]
  learnPages: PageAuditRow[]
}) {
  console.log('Learn GSC Cannibalization Audit')
  console.log(`Input: ${payload.summary.input}`)
  console.log(
    [
      `Rows=${payload.summary.rows}`,
      `LearnRows=${payload.summary.learnRows}`,
      `UniqueLearnPages=${payload.summary.uniqueLearnPages}`,
      `OverlappingQueries=${payload.summary.overlappingQueries}`,
      `Pairs=${payload.summary.pairs}`,
      `MinImpressions=${payload.summary.minImpressions}`,
      `MinSharedUrls=${payload.summary.minSharedUrls}`
    ].join(' | ')
  )

  console.log('\nTop Overlapping Queries')
  if (payload.overlappingQueries.length === 0) {
    console.log('- No overlapping learn queries matched the current thresholds.')
  } else {
    payload.overlappingQueries.forEach((row, index) => {
      console.log(
        `${index + 1}. "${row.query}" | impressions=${formatNumber(row.totalImpressions)} | clicks=${formatNumber(row.totalClicks)} | pages=${row.sharedPages.length}`
      )
      row.sharedPages.forEach(page => {
        console.log(
          `   - ${page.slug} (${page.title}) | impressions=${formatNumber(page.impressions)} | clicks=${formatNumber(page.clicks)}`
        )
      })
    })
  }

  console.log('\nStrongest Page Pairs')
  if (payload.strongestPairs.length === 0) {
    console.log('- No shared learn page pairs matched the current thresholds.')
  } else {
    payload.strongestPairs.forEach((row, index) => {
      console.log(
        `${index + 1}. ${row.leftSlug} <-> ${row.rightSlug} | sharedQueries=${row.sharedQueries} | sharedImpressions=${formatNumber(row.sharedImpressions)} | sharedClicks=${formatNumber(row.sharedClicks)}`
      )
    })
  }

  console.log('\nMost Exposed Learn Pages')
  if (payload.learnPages.length === 0) {
    console.log('- No learn pages crossed the current overlap thresholds.')
  } else {
    payload.learnPages.forEach((row, index) => {
      const peers =
        row.strongestPeers.length > 0
          ? row.strongestPeers.map(peer => `${peer.slug} (${peer.sharedQueries})`).join(', ')
          : 'none'
      console.log(
        `${index + 1}. ${row.slug} | overlappingQueries=${row.overlappingQueries} | sharedImpressions=${formatNumber(row.sharedImpressions)} | peers=${peers}`
      )
    })
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(value)
}

function loadLearnGuideMap() {
  const sourcePath = path.resolve(process.cwd(), 'src/lib/learn/content.ts')
  const source = fs.readFileSync(sourcePath, 'utf8')
  const map = new Map<string, string>()
  const pattern = /slug:\s*'([^']+)'\s*,\s*\n\s*kind:\s*'[^']+'\s*,\s*\n\s*title:\s*'([^']+)'/g

  let match: RegExpExecArray | null = pattern.exec(source)
  while (match) {
    const [, slug, title] = match
    map.set(slug, title)
    match = pattern.exec(source)
  }

  if (map.size === 0) {
    console.error(`Failed to extract learn guide slugs from ${sourcePath}`)
    process.exit(1)
  }

  return map
}
