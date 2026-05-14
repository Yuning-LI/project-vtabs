import fs from 'node:fs'
import path from 'node:path'

type CompareEntry = {
  slug: string
  referenceRuntimeFile: string
  xmlFile: string
  trainingFit: {
    level: 'strong' | 'partial' | 'weak'
    reason: string
  }
  sampleUsefulness: {
    level: 'converter-training' | 'structure-variant' | 'notation-sample' | 'low-value'
    reason: string
    signals: string[]
  }
  noteOnlyAligned: {
    comparedCount: number
    mismatchCount: number
    overlapRatio: number
    mismatchRatio: number
    bestReferenceStart: number
    bestGeneratedStart: number
  }
  melody: {
    mismatchCount: number
  }
  noteOnly: {
    mismatchCount: number
  }
  rests: {
    referenceLeadingRestSlots: number
    generatedLeadingRestSlots: number
    referenceTotalRestSlots: number
    generatedTotalRestSlots: number
  }
}

type CompareReport = {
  generatedOn: string
  entries: CompareEntry[]
}

type TrainingPoolEntry = {
  slug: string
  fit: 'strong' | 'partial'
  reason: string
  usefulness: CompareEntry['sampleUsefulness']
  xmlFile: string
  referenceRuntimeFile: string
  noteOnlyAligned: CompareEntry['noteOnlyAligned']
  melodyMismatchCount: number
  noteOnlyMismatchCount: number
  rests: CompareEntry['rests']
}

type TrainingPool = {
  generatedOn: string
  sourceReport: string
  summary: {
    strongCount: number
    partialCount: number
    total: number
  }
  entries: TrainingPoolEntry[]
}

type CliOptions = {
  input: string
  out: string
}

const DEFAULT_INPUT = 'tmp/openewld-overlap-all-fit.json'
const DEFAULT_OUTPUT = 'reference/song-publish-candidates/openewld-training-pool.json'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/export-song-ingest-training-pool.ts [--input=${DEFAULT_INPUT}] [--out=${DEFAULT_OUTPUT}]`

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const inputPath = path.resolve(process.cwd(), options.input)
if (!fs.existsSync(inputPath)) {
  console.error(`Compare report not found: ${options.input}`)
  process.exit(1)
}

const report = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as CompareReport
const entries = report.entries
  .filter(entry => entry.sampleUsefulness.level === 'converter-training')
  .map<TrainingPoolEntry>(entry => ({
    slug: entry.slug,
    fit:
      entry.trainingFit.level === 'strong' || entry.trainingFit.level === 'partial'
        ? entry.trainingFit.level
        : 'partial',
    reason: entry.trainingFit.reason,
    usefulness: entry.sampleUsefulness,
    xmlFile: entry.xmlFile,
    referenceRuntimeFile: entry.referenceRuntimeFile,
    noteOnlyAligned: entry.noteOnlyAligned,
    melodyMismatchCount: entry.melody.mismatchCount,
    noteOnlyMismatchCount: entry.noteOnly.mismatchCount,
    rests: entry.rests
  }))
  .sort((left, right) => {
    if (left.fit !== right.fit) {
      return left.fit === 'strong' ? -1 : 1
    }
    return left.slug.localeCompare(right.slug)
  })

const pool: TrainingPool = {
  generatedOn: new Date().toISOString(),
  sourceReport: path.relative(process.cwd(), inputPath),
  summary: {
    strongCount: entries.filter(entry => entry.fit === 'strong').length,
    partialCount: entries.filter(entry => entry.fit === 'partial').length,
    total: entries.length
  },
  entries
}

const outPath = path.resolve(process.cwd(), options.out)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(pool, null, 2)}\n`, 'utf8')
console.log(`Wrote training pool to ${path.relative(process.cwd(), outPath)}`)
console.log(JSON.stringify(pool.summary, null, 2))

function parseArgs(args: string[]): CliOptions | null {
  const values = new Map<string, string>()

  args.forEach(arg => {
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (!match) {
      return
    }
    values.set(match[1], match[2])
  })

  return {
    input: values.get('input') || DEFAULT_INPUT,
    out: values.get('out') || DEFAULT_OUTPUT
  }
}
