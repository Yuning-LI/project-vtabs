import fs from 'node:fs'
import path from 'node:path'

type TrainingFitLevel = 'strong' | 'partial' | 'weak'
type SampleUsefulnessLevel =
  | 'converter-training'
  | 'structure-variant'
  | 'notation-sample'
  | 'low-value'

type CompareEntry = {
  slug: string
  xmlFile: string
  referenceRuntimeFile: string
  referenceSongUuid: string | null
  referenceKeynote: string | null
  generatedKeynote: string
  sourceWarnings: string[]
  trainingFit: {
    level: TrainingFitLevel
    reason: string
  }
  sampleUsefulness: {
    level: SampleUsefulnessLevel
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
  referenceNotationProfile: {
    directiveCategories: string[]
    tempoValues: number[]
    keynoteHints: string[]
    repeatStats: {
      repeatStartCount: number
      repeatEndCount: number
      numberedEndingCount: number
      playDirectiveCount: number
      sectionLabelCount: number
    }
    rhythmMarkerStats: {
      dotCount: number
      underscoreCount: number
      equalsCount: number
      slashCount: number
      tupletHeadCount: number
      vMarkerCount: number
      dollarMarkerCount: number
      tildeMarkerCount: number
    }
    normalizedPreview: string[]
  }
}

type CompareReport = {
  generatedOn: string
  entries: CompareEntry[]
}

type BucketSummary = {
  count: number
  slugs: string[]
}

type BucketEntry = {
  slug: string
  fit: CompareEntry['trainingFit']
  usefulness: CompareEntry['sampleUsefulness']
  xmlFile: string
  referenceRuntimeFile: string
  referenceSongUuid: string | null
  referenceKeynote: string | null
  generatedKeynote: string
  noteOnlyAligned: CompareEntry['noteOnlyAligned']
  sourceWarnings: string[]
  notationProfile: CompareEntry['referenceNotationProfile']
}

type OverlapBuckets = {
  generatedOn: string
  sourceReport: string
  summary: {
    total: number
    byTrainingFit: Record<TrainingFitLevel, BucketSummary>
    bySampleUsefulness: Record<SampleUsefulnessLevel, BucketSummary>
  }
  buckets: Record<SampleUsefulnessLevel, BucketEntry[]>
}

type CliOptions = {
  input: string
  out: string
}

const DEFAULT_INPUT = 'tmp/openewld-overlap-all-fit.json'
const DEFAULT_OUTPUT =
  'reference/song-publish-candidates/openewld-overlap-sample-buckets.json'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/export-song-ingest-overlap-buckets.ts [--input=${DEFAULT_INPUT}] [--out=${DEFAULT_OUTPUT}]`

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

const bucketEntries = report.entries
  .map<BucketEntry>(entry => ({
    slug: entry.slug,
    fit: entry.trainingFit,
    usefulness: entry.sampleUsefulness,
    xmlFile: entry.xmlFile,
    referenceRuntimeFile: entry.referenceRuntimeFile,
    referenceSongUuid: entry.referenceSongUuid,
    referenceKeynote: entry.referenceKeynote,
    generatedKeynote: entry.generatedKeynote,
    noteOnlyAligned: entry.noteOnlyAligned,
    sourceWarnings: entry.sourceWarnings,
    notationProfile: entry.referenceNotationProfile
  }))
  .sort((left, right) => left.slug.localeCompare(right.slug))

const usefulnessLevels: SampleUsefulnessLevel[] = [
  'converter-training',
  'structure-variant',
  'notation-sample',
  'low-value'
]
const trainingLevels: TrainingFitLevel[] = ['strong', 'partial', 'weak']

const buckets: OverlapBuckets['buckets'] = {
  'converter-training': bucketEntries.filter(
    entry => entry.usefulness.level === 'converter-training'
  ),
  'structure-variant': bucketEntries.filter(
    entry => entry.usefulness.level === 'structure-variant'
  ),
  'notation-sample': bucketEntries.filter(
    entry => entry.usefulness.level === 'notation-sample'
  ),
  'low-value': bucketEntries.filter(entry => entry.usefulness.level === 'low-value')
}

const output: OverlapBuckets = {
  generatedOn: new Date().toISOString(),
  sourceReport: path.relative(process.cwd(), inputPath),
  summary: {
    total: bucketEntries.length,
    byTrainingFit: Object.fromEntries(
      trainingLevels.map(level => [
        level,
        {
          count: bucketEntries.filter(entry => entry.fit.level === level).length,
          slugs: bucketEntries
            .filter(entry => entry.fit.level === level)
            .map(entry => entry.slug)
        }
      ])
    ) as Record<TrainingFitLevel, BucketSummary>,
    bySampleUsefulness: Object.fromEntries(
      usefulnessLevels.map(level => [
        level,
        {
          count: bucketEntries.filter(entry => entry.usefulness.level === level).length,
          slugs: bucketEntries
            .filter(entry => entry.usefulness.level === level)
            .map(entry => entry.slug)
        }
      ])
    ) as Record<SampleUsefulnessLevel, BucketSummary>
  },
  buckets
}

const outPath = path.resolve(process.cwd(), options.out)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')

console.log(`Wrote overlap sample buckets to ${path.relative(process.cwd(), outPath)}`)
console.log(JSON.stringify(output.summary.bySampleUsefulness, null, 2))

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
