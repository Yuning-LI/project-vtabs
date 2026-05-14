import fs from 'node:fs'
import path from 'node:path'

type CompareEntry = {
  slug: string
  referenceRuntimeFile: string
  trainingFit: {
    level: 'strong' | 'partial' | 'weak'
  }
  referenceNotationFeatures: {
    usesSlurLike: boolean
  }
}

type CompareReport = {
  generatedOn: string
  entries: CompareEntry[]
}

type RuntimePayload = {
  notation?: string
}

type GroupSample = {
  slug: string
  fit: 'strong' | 'partial' | 'weak'
  group: string
  context: string
}

type GroupCategoryKey =
  | 'tuplet-head'
  | 'adjacent-note-group'
  | 'phrase-group'
  | 'ornament-like'
  | 'mixed-other'

type GroupCategory = {
  key: GroupCategoryKey
  label: string
  description: string
  total: number
  byFit: Record<'strong' | 'partial' | 'weak', number>
  samples: GroupSample[]
}

type CliOptions = {
  input: string
  out: string
}

const DEFAULT_INPUT = 'tmp/openewld-overlap-all-fit.json'
const DEFAULT_OUT =
  'reference/song-publish-candidates/review-notes/kuailepu-slur-group-analysis-2026-05-12.md'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/analyze-kuailepu-slur-groups.ts [--input=${DEFAULT_INPUT}] [--out=${DEFAULT_OUT}]`

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
const categories = createEmptyCategories()
const notationCache = new Map<string, string>()
const allSamples: GroupSample[] = []

for (const entry of report.entries.filter(item => item.referenceNotationFeatures.usesSlurLike)) {
  const notation = readNotation(entry.referenceRuntimeFile, notationCache)
  const groups = extractParenthesizedGroups(notation)

  for (const group of groups) {
    const sample: GroupSample = {
      slug: entry.slug,
      fit: entry.trainingFit.level,
      group: group.group,
      context: group.context
    }
    allSamples.push(sample)
    const category = categorizeGroup(group.group)
    const bucket = categories.get(category)!
    bucket.total += 1
    bucket.byFit[entry.trainingFit.level] += 1
    if (bucket.samples.length < 8) {
      bucket.samples.push(sample)
    }
  }
}

const markdown = buildMarkdown(report, categories, allSamples)
const outPath = path.resolve(process.cwd(), options.out)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, markdown, 'utf8')

console.log(`Wrote Kuailepu slur-group analysis to ${path.relative(process.cwd(), outPath)}`)
console.log(
  JSON.stringify(
    {
      songCount: report.entries.filter(item => item.referenceNotationFeatures.usesSlurLike).length,
      groupCount: allSamples.length,
      categories: [...categories.values()].map(category => ({
        key: category.key,
        total: category.total
      }))
    },
    null,
    2
  )
)

function parseArgs(args: string[]): CliOptions | null {
  const values = new Map<string, string>()
  for (const arg of args) {
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (!match) {
      continue
    }
    values.set(match[1], match[2])
  }

  return {
    input: values.get('input') || DEFAULT_INPUT,
    out: values.get('out') || DEFAULT_OUT
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

function extractParenthesizedGroups(notation: string) {
  const groups: Array<{ group: string; context: string }> = []
  const pattern = /\(([^()]+)\)/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(notation)) !== null) {
    const group = match[1]?.trim()
    if (!group) {
      continue
    }

    const start = Math.max(0, match.index - 18)
    const end = Math.min(notation.length, match.index + match[0].length + 24)
    groups.push({
      group,
      context: notation
        .slice(start, end)
        .replace(/\s+/g, ' ')
        .trim()
    })
  }

  return groups
}

function categorizeGroup(group: string): GroupCategoryKey {
  if (/^\s*\d+\s*:/.test(group)) {
    return 'tuplet-head'
  }

  if (/^[#bn]?[0-7][^|()]*$/.test(group) && /[0-7].*[0-7]/.test(group)) {
    if (!/[A-Za-z{}]/.test(group)) {
      return 'adjacent-note-group'
    }
  }

  if (/^[#bn0-7x=._,'gd\s-]+$/.test(group)) {
    return 'phrase-group'
  }

  if (/[{}@;]/.test(group)) {
    return 'ornament-like'
  }

  return 'mixed-other'
}

function createEmptyCategories() {
  const entries: GroupCategory[] = [
    {
      key: 'tuplet-head',
      label: 'Tuplet Head',
      description: 'Parentheses used to introduce tuplet timing such as `(3:`.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      samples: []
    },
    {
      key: 'adjacent-note-group',
      label: 'Adjacent Note Group',
      description: 'Compact note groups like `(1gx2gx)` that attach directly to nearby notes.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      samples: []
    },
    {
      key: 'phrase-group',
      label: 'Phrase Group',
      description: 'Longer grouped note fragments that look like phrasing or visual chunking rather than tuplets.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      samples: []
    },
    {
      key: 'ornament-like',
      label: 'Ornament-Like Group',
      description: 'Groups mixed with directive-like or unusual symbols.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      samples: []
    },
    {
      key: 'mixed-other',
      label: 'Mixed / Other',
      description: 'Anything that does not clearly fit the buckets above.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      samples: []
    }
  ]

  return new Map(entries.map(entry => [entry.key, entry]))
}

function buildMarkdown(
  report: CompareReport,
  categories: Map<GroupCategoryKey, GroupCategory>,
  allSamples: GroupSample[]
) {
  const ordered = [...categories.values()].sort((left, right) => right.total - left.total)
  const lines: string[] = []

  lines.push('# Kuailepu Parenthesized Group Analysis (2026-05-12)')
  lines.push('')
  lines.push('This report isolates Kuailepu parenthesized note groups from the overlap sample library.')
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- Overlap songs with slur-like groups: ${report.entries.filter(item => item.referenceNotationFeatures.usesSlurLike).length}`)
  lines.push(`- Total extracted parenthesized groups: ${allSamples.length}`)
  lines.push('- Goal: determine whether parentheses are mostly tuplet timing, phrase chunking, or something that needs real semantic support.')
  lines.push('')
  lines.push('## Categories')
  lines.push('')

  for (const category of ordered) {
    if (category.total < 1) {
      continue
    }
    lines.push(`### ${category.label}`)
    lines.push('')
    lines.push(`- Meaning: ${category.description}`)
    lines.push(`- Count: ${category.total} (strong ${category.byFit.strong}, partial ${category.byFit.partial}, weak ${category.byFit.weak})`)
    lines.push('- Samples:')
    for (const sample of category.samples) {
      lines.push(`- ${sample.slug}: \`${sample.group}\` in \`${sample.context}\``)
    }
    lines.push('')
  }

  lines.push('## Working Interpretation')
  lines.push('')
  lines.push('- If most groups are tuplet heads or pure visual phrase chunks, we should not rush to add a heavy semantic slur model.')
  lines.push('- If a stable compact note-group shape dominates, we can likely normalize it earlier in the Kuailepu parsing path without changing runtime behavior.')
  lines.push('- Weak overlap songs are still valid evidence here because this task is about notation surface, not melody truth.')
  lines.push('')

  return `${lines.join('\n')}\n`
}
