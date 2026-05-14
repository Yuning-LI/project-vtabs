import fs from 'node:fs'
import path from 'node:path'
import { extractKuailepuNotationMetadata } from '../src/lib/songbook/kuailepuImport.ts'

type CompareEntry = {
  slug: string
  referenceRuntimeFile: string
  trainingFit: {
    level: 'strong' | 'partial' | 'weak'
  }
  referenceNotationFeatures: {
    usesTupletLike: boolean
  }
}

type CompareReport = {
  entries: CompareEntry[]
}

type RuntimePayload = {
  notation?: string
}

type MarkerKey =
  | 'dot'
  | 'underscore'
  | 'equals'
  | 'slash'
  | 'tuplet-head'
  | 'v-marker'
  | 'dollar-marker'
  | 'tilde-marker'

type MarkerStat = {
  key: MarkerKey
  label: string
  total: number
  byFit: Record<'strong' | 'partial' | 'weak', number>
  sampleSlugs: string[]
}

type CliOptions = {
  input: string
  out: string
}

const DEFAULT_INPUT = 'tmp/openewld-overlap-all-fit.json'
const DEFAULT_OUT =
  'reference/song-publish-candidates/review-notes/kuailepu-rhythm-marker-analysis-2026-05-12.md'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/analyze-kuailepu-rhythm-markers.ts [--input=${DEFAULT_INPUT}] [--out=${DEFAULT_OUT}]`

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const inputPath = path.resolve(process.cwd(), options.input)
if (!fs.existsSync(inputPath)) {
  console.error(`Overlap compare report not found: ${options.input}`)
  process.exit(1)
}

const report = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as CompareReport
const stats = createStats()

for (const entry of report.entries.filter(item => item.referenceNotationFeatures.usesTupletLike)) {
  const notation = readNotation(entry.referenceRuntimeFile)
  const markers = extractKuailepuNotationMetadata(notation).rhythmMarkerStats
  collect(stats.get('dot')!, markers.dotCount, entry)
  collect(stats.get('underscore')!, markers.underscoreCount, entry)
  collect(stats.get('equals')!, markers.equalsCount, entry)
  collect(stats.get('slash')!, markers.slashCount, entry)
  collect(stats.get('tuplet-head')!, markers.tupletHeadCount, entry)
  collect(stats.get('v-marker')!, markers.vMarkerCount, entry)
  collect(stats.get('dollar-marker')!, markers.dollarMarkerCount, entry)
  collect(stats.get('tilde-marker')!, markers.tildeMarkerCount, entry)
}

const markdown = buildMarkdown(stats, report)
const outPath = path.resolve(process.cwd(), options.out)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, markdown, 'utf8')

console.log(`Wrote Kuailepu rhythm marker analysis to ${path.relative(process.cwd(), outPath)}`)
console.log(
  JSON.stringify(
    {
      songCount: report.entries.filter(item => item.referenceNotationFeatures.usesTupletLike).length,
      stats: [...stats.values()].map(stat => ({ key: stat.key, total: stat.total }))
    },
    null,
    2
  )
)

function parseArgs(args: string[]): CliOptions | null {
  const values = new Map<string, string>()
  for (const arg of args) {
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (!match) continue
    values.set(match[1], match[2])
  }
  return {
    input: values.get('input') || DEFAULT_INPUT,
    out: values.get('out') || DEFAULT_OUT
  }
}

function createStats() {
  const list: MarkerStat[] = [
    { key: 'dot', label: 'Dot', total: 0, byFit: { strong: 0, partial: 0, weak: 0 }, sampleSlugs: [] },
    { key: 'underscore', label: 'Underscore', total: 0, byFit: { strong: 0, partial: 0, weak: 0 }, sampleSlugs: [] },
    { key: 'equals', label: 'Equals', total: 0, byFit: { strong: 0, partial: 0, weak: 0 }, sampleSlugs: [] },
    { key: 'slash', label: 'Slash', total: 0, byFit: { strong: 0, partial: 0, weak: 0 }, sampleSlugs: [] },
    { key: 'tuplet-head', label: 'Tuplet Head', total: 0, byFit: { strong: 0, partial: 0, weak: 0 }, sampleSlugs: [] },
    { key: 'v-marker', label: 'v Marker', total: 0, byFit: { strong: 0, partial: 0, weak: 0 }, sampleSlugs: [] },
    { key: 'dollar-marker', label: '$ Marker', total: 0, byFit: { strong: 0, partial: 0, weak: 0 }, sampleSlugs: [] },
    { key: 'tilde-marker', label: '~ Marker', total: 0, byFit: { strong: 0, partial: 0, weak: 0 }, sampleSlugs: [] }
  ]
  return new Map(list.map(item => [item.key, item]))
}

function readNotation(runtimeFile: string) {
  const resolved = path.resolve(process.cwd(), runtimeFile)
  const payload = JSON.parse(fs.readFileSync(resolved, 'utf8')) as RuntimePayload
  return String(payload.notation ?? '')
}

function collect(stat: MarkerStat, count: number, entry: CompareEntry) {
  if (count < 1) return
  stat.total += count
  stat.byFit[entry.trainingFit.level] += count
  if (!stat.sampleSlugs.includes(entry.slug)) {
    stat.sampleSlugs.push(entry.slug)
  }
}

function buildMarkdown(stats: Map<MarkerKey, MarkerStat>, report: CompareReport) {
  const ordered = [...stats.values()].sort((left, right) => right.total - left.total)
  const lines: string[] = []
  lines.push('# Kuailepu Rhythm Marker Analysis (2026-05-12)')
  lines.push('')
  lines.push(`- Overlap songs with tuplet-like rhythm markers: ${report.entries.filter(item => item.referenceNotationFeatures.usesTupletLike).length}`)
  lines.push('- Goal: separate core duration syntax from low-confidence extra markers that may still pollute lightweight parsing.')
  lines.push('')
  lines.push('## Marker Counts')
  lines.push('')
  for (const stat of ordered) {
    if (stat.total < 1) continue
    lines.push(`- ${stat.label}: ${stat.total} (strong ${stat.byFit.strong}, partial ${stat.byFit.partial}, weak ${stat.byFit.weak})`)
    lines.push(`  sample songs: ${stat.sampleSlugs.join(', ')}`)
  }
  lines.push('')
  lines.push('## Working Interpretation')
  lines.push('')
  lines.push('- `.`, `_`, `=` are core duration syntax and should stay in the parser.')
  lines.push('- real tuplet heads like `(3:` exist but are much rarer than dot/equals/underscore rhythm notation.')
  lines.push('- markers like `v`, `$`, `~` are likely safer to classify as low-confidence extras until proven otherwise.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
