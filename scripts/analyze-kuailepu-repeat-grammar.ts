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
    usesRepeats: boolean
  }
}

type CompareReport = {
  entries: CompareEntry[]
}

type RuntimePayload = {
  notation?: string
}

type RepeatFeatureKey =
  | 'repeat-start'
  | 'repeat-end'
  | 'numbered-ending'
  | 'play-directive'
  | 'section-label'

type RepeatFeature = {
  key: RepeatFeatureKey
  label: string
  description: string
  total: number
  byFit: Record<'strong' | 'partial' | 'weak', number>
  sampleSlugs: string[]
  snippets: string[]
}

type CliOptions = {
  input: string
  out: string
}

const DEFAULT_INPUT = 'tmp/openewld-overlap-all-fit.json'
const DEFAULT_OUT =
  'reference/song-publish-candidates/review-notes/kuailepu-repeat-grammar-analysis-2026-05-12.md'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/analyze-kuailepu-repeat-grammar.ts [--input=${DEFAULT_INPUT}] [--out=${DEFAULT_OUT}]`

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
const features = createFeatures()

for (const entry of report.entries.filter(item => item.referenceNotationFeatures.usesRepeats)) {
  const notation = readNotation(entry.referenceRuntimeFile)
  const metadata = extractKuailepuNotationMetadata(notation)
  collectFeature(
    features.get('repeat-start')!,
    metadata.repeatStats.repeatStartCount,
    entry,
    metadata.rawLines,
    /\|:/g
  )
  collectFeature(
    features.get('repeat-end')!,
    metadata.repeatStats.repeatEndCount,
    entry,
    metadata.rawLines,
    /:\|/g
  )
  collectFeature(
    features.get('numbered-ending')!,
    metadata.repeatStats.numberedEndingCount,
    entry,
    metadata.rawLines,
    /\[\d+\s*:/g
  )
  collectFeature(
    features.get('play-directive')!,
    metadata.repeatStats.playDirectiveCount,
    entry,
    metadata.directives.filter(item => item.category === 'play').map(item => item.lineText),
    /\{play:[^}]+\}/gi
  )
  collectFeature(
    features.get('section-label')!,
    metadata.repeatStats.sectionLabelCount,
    entry,
    metadata.sectionLabels.map(item => item.lineText),
    /^[A-Za-z0-9\u4e00-\u9fff]+:/gm
  )
}

const markdown = buildMarkdown(features, report)
const outPath = path.resolve(process.cwd(), options.out)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, markdown, 'utf8')

console.log(`Wrote Kuailepu repeat grammar analysis to ${path.relative(process.cwd(), outPath)}`)
console.log(
  JSON.stringify(
    {
      repeatSongs: report.entries.filter(item => item.referenceNotationFeatures.usesRepeats).length,
      features: [...features.values()].map(feature => ({ key: feature.key, total: feature.total }))
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

function createFeatures() {
  const list: RepeatFeature[] = [
    {
      key: 'repeat-start',
      label: 'Repeat Start',
      description: 'Opening repeat marker such as `|:`.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      sampleSlugs: [],
      snippets: []
    },
    {
      key: 'repeat-end',
      label: 'Repeat End',
      description: 'Closing repeat marker such as `:|`.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      sampleSlugs: [],
      snippets: []
    },
    {
      key: 'numbered-ending',
      label: 'Numbered Ending',
      description: 'Markers such as `[1:` and `[2:`.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      sampleSlugs: [],
      snippets: []
    },
    {
      key: 'play-directive',
      label: 'Play Directive',
      description: 'Playback structure directives such as `{play:A A B}`.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      sampleSlugs: [],
      snippets: []
    },
    {
      key: 'section-label',
      label: 'Section Label',
      description: 'Named section headers such as `A:` or `B:`.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      sampleSlugs: [],
      snippets: []
    }
  ]

  return new Map(list.map(feature => [feature.key, feature]))
}

function readNotation(runtimeFile: string) {
  const resolved = path.resolve(process.cwd(), runtimeFile)
  const payload = JSON.parse(fs.readFileSync(resolved, 'utf8')) as RuntimePayload
  return String(payload.notation ?? '')
}

function collectFeature(
  feature: RepeatFeature,
  totalMatches: number,
  entry: CompareEntry,
  sampleLines: string[],
  pattern: RegExp
) {
  if (totalMatches < 1) {
    return
  }

  feature.total += totalMatches
  feature.byFit[entry.trainingFit.level] += totalMatches
  if (!feature.sampleSlugs.includes(entry.slug)) {
    feature.sampleSlugs.push(entry.slug)
  }
  for (const line of sampleLines) {
    if (feature.snippets.length >= 8) {
      break
    }
    const matches = [...line.matchAll(pattern)]
    for (const match of matches) {
      if (feature.snippets.length >= 8) {
        break
      }
      const index = match.index ?? 0
      const start = Math.max(0, index - 18)
      const end = Math.min(line.length, index + match[0].length + 24)
      feature.snippets.push(
        line
          .slice(start, end)
          .replace(/\s+/g, ' ')
          .trim()
      )
    }
  }
}

function buildMarkdown(features: Map<RepeatFeatureKey, RepeatFeature>, report: CompareReport) {
  const ordered = [...features.values()].sort((left, right) => right.total - left.total)
  const lines: string[] = []
  lines.push('# Kuailepu Repeat Grammar Analysis (2026-05-12)')
  lines.push('')
  lines.push(`- Overlap songs with repeat grammar: ${report.entries.filter(item => item.referenceNotationFeatures.usesRepeats).length}`)
  lines.push('- Goal: separate structural navigation markers from melody-bearing notation.')
  lines.push('')
  lines.push('## Features')
  lines.push('')

  for (const feature of ordered) {
    if (feature.total < 1) continue
    lines.push(`### ${feature.label}`)
    lines.push('')
    lines.push(`- Meaning: ${feature.description}`)
    lines.push(`- Count: ${feature.total} (strong ${feature.byFit.strong}, partial ${feature.byFit.partial}, weak ${feature.byFit.weak})`)
    lines.push(`- Sample songs: ${feature.sampleSlugs.join(', ')}`)
    lines.push('- Snippets:')
    for (const snippet of feature.snippets) {
      lines.push(`- \`${snippet}\``)
    }
    lines.push('')
  }

  lines.push('## Working Interpretation')
  lines.push('')
  lines.push('- Numbered endings are the highest-confidence parsing hazard because their digits can be mistaken for note tokens.')
  lines.push('- `|:` and `:|` should be treated as structural navigation, not as note content.')
  lines.push('- `play` and section labels belong to local expansion logic, not token parsing.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
