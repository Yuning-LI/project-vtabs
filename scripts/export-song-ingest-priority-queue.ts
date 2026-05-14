import fs from 'node:fs'
import path from 'node:path'

type RankedEntry = {
  slug: string
  title: string
  file: string
  score: number
  tier: 'high' | 'medium' | 'low'
  reasons: string[]
  diagnostics: {
    hcConsistencyStatus: 'ok' | 'review' | 'warning' | 'missing'
    usesAdvancedSurface: boolean
    usesRepeats: boolean
    roundTripMismatchCount: number | null
    graceNoteCount: number
    measureCount: number
    noteCount: number
    lyricNoteCount: number
    chordCount: number
    leadingRestCount: number | null
    crossMeasureTieCount: number | null
    hasShortOpeningMeasure: boolean | null
    hasShortClosingMeasure: boolean | null
    transpose: number | null
  }
}

type RankingReport = {
  entries: RankedEntry[]
}

type PriorityQueueEntry = RankedEntry & {
  lane: 'fast-track' | 'careful-track' | 'defer-track'
}

type CliOptions = {
  input: string
  out: string
}

const DEFAULT_INPUT =
  'reference/song-publish-candidates/openewld-source-quality-ranking.json'
const DEFAULT_OUT =
  'reference/song-publish-candidates/openewld-priority-queue.json'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/export-song-ingest-priority-queue.ts [--input=${DEFAULT_INPUT}] [--out=${DEFAULT_OUT}]`

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const ranking = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), options.input), 'utf8')
) as RankingReport

const entries: PriorityQueueEntry[] = ranking.entries.map(entry => ({
  ...entry,
  lane: classifyLane(entry)
}))

const output = {
  generatedOn: new Date().toISOString(),
  sourceRanking: options.input,
  summary: {
    total: entries.length,
    fastTrackCount: entries.filter(entry => entry.lane === 'fast-track').length,
    carefulTrackCount: entries.filter(entry => entry.lane === 'careful-track').length,
    deferTrackCount: entries.filter(entry => entry.lane === 'defer-track').length
  },
  lanes: {
    'fast-track': entries.filter(entry => entry.lane === 'fast-track'),
    'careful-track': entries.filter(entry => entry.lane === 'careful-track'),
    'defer-track': entries.filter(entry => entry.lane === 'defer-track')
  },
  entries
}

const outPath = path.resolve(process.cwd(), options.out)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(`Wrote priority queue to ${path.relative(process.cwd(), outPath)}`)
console.log(JSON.stringify(output.summary, null, 2))

function parseArgs(args: string[]): CliOptions | null {
  const values = new Map<string, string>()
  args.forEach(arg => {
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (!match) return
    values.set(match[1], match[2])
  })

  return {
    input: values.get('input') || DEFAULT_INPUT,
    out: values.get('out') || DEFAULT_OUT
  }
}

function classifyLane(entry: RankedEntry): PriorityQueueEntry['lane'] {
  const roundTripMismatch = entry.diagnostics.roundTripMismatchCount ?? 999
  const absTranspose = Math.abs(entry.diagnostics.transpose ?? 0)

  if (
    entry.tier === 'high' &&
    entry.diagnostics.hcConsistencyStatus === 'ok' &&
    !entry.diagnostics.usesAdvancedSurface &&
    !entry.diagnostics.usesRepeats &&
    roundTripMismatch === 0 &&
    entry.diagnostics.graceNoteCount === 0 &&
    absTranspose <= 2 &&
    (entry.diagnostics.leadingRestCount ?? 0) <= 1 &&
    (entry.diagnostics.crossMeasureTieCount ?? 0) === 0 &&
    entry.diagnostics.measureCount >= 10 &&
    entry.diagnostics.measureCount <= 40 &&
    entry.diagnostics.noteCount >= 35 &&
    entry.diagnostics.noteCount <= 160
  ) {
    return 'fast-track'
  }

  if (
    entry.tier !== 'low' &&
    entry.diagnostics.hcConsistencyStatus !== 'warning' &&
    roundTripMismatch <= 8 &&
    entry.diagnostics.graceNoteCount === 0
  ) {
    return 'careful-track'
  }

  return 'defer-track'
}
