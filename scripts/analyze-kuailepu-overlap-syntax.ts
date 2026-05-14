import fs from 'node:fs'
import path from 'node:path'

type TrainingFitLevel = 'strong' | 'partial' | 'weak'

type CompareEntry = {
  slug: string
  referenceRuntimeFile: string
  trainingFit: {
    level: TrainingFitLevel
    reason: string
  }
  referenceNotationFeatures: {
    usesChordMarkers: boolean
    usesOctaveG: boolean
    usesOctaveD: boolean
    usesCompactX: boolean
    usesCompactUnderscore: boolean
    usesRepeats: boolean
    usesGraceLike: boolean
    usesTupletLike: boolean
    usesSlurLike: boolean
  }
  noteOnlyAligned: {
    mismatchCount: number
    overlapRatio: number
    mismatchRatio: number
  }
  rests: {
    referenceLeadingRestSlots: number
    generatedLeadingRestSlots: number
  }
}

type CompareReport = {
  generatedOn: string
  summary: {
    comparedCount: number
    fitCounts: Record<TrainingFitLevel, number>
  }
  entries: CompareEntry[]
}

type RuntimePayload = {
  notation?: string
}

type PhenomenonDefinition = {
  key: string
  label: string
  status: 'supported' | 'partial' | 'unsupported'
  description: string
  whyItMatters: string
  test: (notation: string, entry: CompareEntry) => boolean
  extractSnippet: (notation: string) => string | null
}

type PhenomenonStat = {
  key: string
  label: string
  status: PhenomenonDefinition['status']
  description: string
  whyItMatters: string
  total: number
  byFit: Record<TrainingFitLevel, number>
  sampleSlugs: string[]
  snippets: string[]
}

type CliOptions = {
  input: string
  out: string
}

const DEFAULT_INPUT = 'tmp/openewld-overlap-all-fit.json'
const DEFAULT_OUT =
  'reference/song-publish-candidates/review-notes/kuailepu-overlap-syntax-sample-analysis-2026-05-12.md'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/analyze-kuailepu-overlap-syntax.ts [--input=${DEFAULT_INPUT}] [--out=${DEFAULT_OUT}]`

const PHENOMENA: PhenomenonDefinition[] = [
  {
    key: 'compact-x',
    label: 'Compact short-slot `x` durations',
    status: 'supported',
    description: 'Single-slot compact note/rest duration syntax such as `1x` and `0x`.',
    whyItMatters: 'Already in our supported subset and common in Kuailepu originals.',
    test: (_notation, entry) => entry.referenceNotationFeatures.usesCompactX,
    extractSnippet: notation => findSnippet(notation, /(?:^|[^A-Za-z])(?:#?[1-7][gd'",]*|b[1-7][gd'",]*|0)x/i)
  },
  {
    key: 'upper-octave',
    label: 'Upper-octave markers `g` / apostrophe',
    status: 'supported',
    description: 'Kuailepu uses both native `g` and display-form apostrophe octave notation.',
    whyItMatters: 'We already round-trip octave height, but sample frequency helps confirm it is core syntax.',
    test: notation => /[1-7](?:g|')/.test(notation),
    extractSnippet: notation => findSnippet(notation, /[1-7](?:g|')+/)
  },
  {
    key: 'lower-octave',
    label: 'Lower-octave markers `d` / comma',
    status: 'supported',
    description: 'Lower register markers appear on a smaller subset of overlap songs.',
    whyItMatters: 'Useful to keep validating register handling and octave normalization.',
    test: notation => /[1-7](?:d|,)/.test(notation),
    extractSnippet: notation => findSnippet(notation, /[1-7](?:d|,)+/)
  },
  {
    key: 'tuplet-rhythm',
    label: 'Tuplet / dotted / complex rhythm markers',
    status: 'partial',
    description: 'Patterns such as `(3:`, `=` and `.` appear widely in Kuailepu originals.',
    whyItMatters: 'This is one of the main syntax families that still sits outside our clean generator subset.',
    test: (_notation, entry) => entry.referenceNotationFeatures.usesTupletLike,
    extractSnippet: notation => findSnippet(notation, /\(\s*\d+\s*:|=|\./)
  },
  {
    key: 'slur-groups',
    label: 'Parenthesized slur / grouped-note phrases',
    status: 'unsupported',
    description: 'Kuailepu often groups note phrases inside parentheses.',
    whyItMatters: 'Likely part syntax, part phrasing intent; we should understand it before emitting anything similar.',
    test: (_notation, entry) => entry.referenceNotationFeatures.usesSlurLike,
    extractSnippet: notation => findSnippet(notation, /\([^)]*[1-7][^)]*\)/)
  },
  {
    key: 'ornament-directives',
    label: 'Non-chord curly-brace directives',
    status: 'unsupported',
    description: 'Besides chord markers, Kuailepu originals contain extra `{...}` directives.',
    whyItMatters: 'These likely encode playback or ornament behavior and should be cataloged before reuse.',
    test: notation => /\{(?!cn:|bpm:|play:)[^}]+\}/i.test(notation),
    extractSnippet: notation => findSnippet(notation, /\{(?!cn:|bpm:|play:)[^}]+\}/i)
  },
  {
    key: 'repeat-grammar',
    label: 'Repeat grammar and section navigation',
    status: 'unsupported',
    description: 'Repeat bars, numbered endings, and section-level reuse appear in some songs.',
    whyItMatters: 'Important for future grammar coverage, but not required for the current single-pass generator.',
    test: notation =>
      /:\||\|:|\[\d/.test(notation) || /\{play:/i.test(notation) || /^[A-Za-z0-9]+:/m.test(notation),
    extractSnippet: notation => findSnippet(notation, /\{play:[^}]+\}|:\||\|:|\[\d|^[A-Za-z0-9]+:/m)
  },
  {
    key: 'bpm-directive',
    label: 'Tempo directives such as `{bpm:...}`',
    status: 'unsupported',
    description: 'Some Kuailepu originals embed explicit tempo directives in notation.',
    whyItMatters: 'These are runtime metadata, not melody truth, but useful when reverse-engineering notation grammar.',
    test: notation => /\{bpm:[^}]+\}/i.test(notation),
    extractSnippet: notation => findSnippet(notation, /\{bpm:[^}]+\}/i)
  },
  {
    key: 'pickup-rests',
    label: 'Leading pickup rests',
    status: 'partial',
    description: 'Some overlap songs start with explicit leading rest slots before the first note.',
    whyItMatters: 'We now synthesize this on narrow pickup cases; overlap samples help validate scope without overfitting.',
    test: (_notation, entry) => entry.rests.referenceLeadingRestSlots > 0,
    extractSnippet: notation => findSnippet(notation, /(^|\n)0+/)
  }
]

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
const notationCache = new Map<string, string>()

const stats = PHENOMENA.map(definition => analyzePhenomenon(definition, report.entries, notationCache))
  .filter(stat => stat.total > 0)
  .sort((left, right) => {
    const statusOrder = compareStatus(left.status) - compareStatus(right.status)
    if (statusOrder !== 0) {
      return statusOrder
    }
    if (left.total !== right.total) {
      return right.total - left.total
    }
    return left.label.localeCompare(right.label)
  })

const markdown = buildMarkdownReport(report, stats)
const outPath = path.resolve(process.cwd(), options.out)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, markdown, 'utf8')

console.log(`Wrote Kuailepu overlap syntax sample report to ${path.relative(process.cwd(), outPath)}`)
console.log(
  JSON.stringify(
    {
      comparedCount: report.summary.comparedCount,
      phenomenonCount: stats.length,
      topPhenomena: stats.slice(0, 8).map(stat => ({
        key: stat.key,
        total: stat.total,
        status: stat.status
      }))
    },
    null,
    2
  )
)

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
    out: values.get('out') || DEFAULT_OUT
  }
}

function analyzePhenomenon(
  definition: PhenomenonDefinition,
  entries: CompareEntry[],
  notationCache: Map<string, string>
): PhenomenonStat {
  const matches = entries
    .filter(entry => definition.test(readNotation(entry.referenceRuntimeFile, notationCache), entry))
    .sort(compareEntriesForSamples)

  return {
    key: definition.key,
    label: definition.label,
    status: definition.status,
    description: definition.description,
    whyItMatters: definition.whyItMatters,
    total: matches.length,
    byFit: {
      strong: matches.filter(entry => entry.trainingFit.level === 'strong').length,
      partial: matches.filter(entry => entry.trainingFit.level === 'partial').length,
      weak: matches.filter(entry => entry.trainingFit.level === 'weak').length
    },
    sampleSlugs: unique(matches.map(entry => entry.slug)).slice(0, 6),
    snippets: unique(
      matches
        .map(entry =>
          definition.extractSnippet(readNotation(entry.referenceRuntimeFile, notationCache))
        )
        .filter((value): value is string => Boolean(value))
    ).slice(0, 3)
  }
}

function readNotation(runtimeFile: string, cache: Map<string, string>) {
  const resolved = path.resolve(process.cwd(), runtimeFile)
  const cached = cache.get(resolved)
  if (cached !== undefined) {
    return cached
  }

  const payload = JSON.parse(fs.readFileSync(resolved, 'utf8')) as RuntimePayload
  const notation = String(payload.notation ?? '')
  cache.set(resolved, notation)
  return notation
}

function compareEntriesForSamples(left: CompareEntry, right: CompareEntry) {
  const fitRank = compareFit(left.trainingFit.level) - compareFit(right.trainingFit.level)
  if (fitRank !== 0) {
    return fitRank
  }

  if (left.noteOnlyAligned.mismatchRatio !== right.noteOnlyAligned.mismatchRatio) {
    return left.noteOnlyAligned.mismatchRatio - right.noteOnlyAligned.mismatchRatio
  }

  return left.slug.localeCompare(right.slug)
}

function compareFit(level: TrainingFitLevel) {
  if (level === 'strong') return 0
  if (level === 'partial') return 1
  return 2
}

function compareStatus(status: PhenomenonDefinition['status']) {
  if (status === 'unsupported') return 0
  if (status === 'partial') return 1
  return 2
}

function buildMarkdownReport(report: CompareReport, stats: PhenomenonStat[]) {
  const lines: string[] = []
  lines.push('# Kuailepu Overlap Syntax Sample Analysis (2026-05-12)')
  lines.push('')
  lines.push('This report treats overlap songs as a Kuailepu notation sample library, not as strict per-song truth payloads.')
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- Compared overlap songs: ${report.summary.comparedCount}`)
  lines.push(`- Strong training samples: ${report.summary.fitCounts.strong}`)
  lines.push(`- Partial training samples: ${report.summary.fitCounts.partial}`)
  lines.push(`- Weak / noisy samples: ${report.summary.fitCounts.weak}`)
  lines.push('- Working rule: use strong/partial songs to guide core converter rules, and use weak songs mainly to discover grammar surface area and sample syntax.')
  lines.push('')
  lines.push('## Why This Exists')
  lines.push('')
  lines.push('- Kuailepu originals are useful even when the melody version may differ from our XML source.')
  lines.push('- The overlap set helps us reverse-engineer real notation patterns used in the wild.')
  lines.push('- The goal is broader syntax understanding and better conversion rules, not 100% equality with human-entered Kuailepu pages.')
  lines.push('')
  lines.push('## Phenomena')
  lines.push('')

  stats.forEach(stat => {
    lines.push(`### ${stat.label}`)
    lines.push('')
    lines.push(`- Status in current project: \`${stat.status}\``)
    lines.push(`- Seen in overlap songs: ${stat.total} (strong ${stat.byFit.strong}, partial ${stat.byFit.partial}, weak ${stat.byFit.weak})`)
    lines.push(`- Meaning: ${stat.description}`)
    lines.push(`- Why it matters: ${stat.whyItMatters}`)
    lines.push(`- Sample songs: ${stat.sampleSlugs.join(', ')}`)
    if (stat.snippets.length > 0) {
      lines.push('- Representative syntax:')
      stat.snippets.forEach(snippet => {
        lines.push(`  - \`${snippet}\``)
      })
    }
    lines.push('')
  })

  const nextTargets = stats
    .filter(stat => stat.status !== 'supported')
    .slice(0, 5)
    .map(stat => `${stat.label} (${stat.total})`)

  lines.push('## Recommended Next Targets')
  lines.push('')
  lines.push('- Keep core rule work driven by `joy-to-the-world` and `we-wish-you-a-merry-christmas` first.')
  lines.push('- Use the syntax families below as the next reverse-engineering backlog, ordered by current overlap presence:')
  nextTargets.forEach(target => {
    lines.push(`- ${target}`)
  })
  lines.push('- Do not treat every weak song as melody truth; use them as grammar evidence unless external verification says they match the same version.')
  lines.push('')

  return `${lines.join('\n')}\n`
}

function findSnippet(notation: string, pattern: RegExp) {
  const match = notation.match(pattern)
  if (!match || typeof match.index !== 'number') {
    return null
  }

  const start = Math.max(0, match.index - 14)
  const end = Math.min(notation.length, match.index + match[0].length + 28)
  return notation
    .slice(start, end)
    .replace(/\s+/g, ' ')
    .trim()
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values))
}
