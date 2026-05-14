import fs from 'node:fs'
import path from 'node:path'
import { extractKuailepuNotationMetadata } from '../src/lib/songbook/kuailepuImport.ts'

type CompareEntry = {
  slug: string
  referenceRuntimeFile: string
  trainingFit: {
    level: 'strong' | 'partial' | 'weak'
  }
}

type CompareReport = {
  entries: CompareEntry[]
}

type RuntimePayload = {
  notation?: string
}
type DirectiveCategoryKey = ReturnType<
  typeof extractKuailepuNotationMetadata
>['directives'][number]['category']

type DirectiveSample = {
  slug: string
  fit: 'strong' | 'partial' | 'weak'
  directive: string
  context: string
}

type DirectiveCategory = {
  key: DirectiveCategoryKey
  label: string
  description: string
  total: number
  byFit: Record<'strong' | 'partial' | 'weak', number>
  samples: DirectiveSample[]
}

type CliOptions = {
  input: string
  out: string
}

const DEFAULT_INPUT = 'tmp/openewld-overlap-all-fit.json'
const DEFAULT_OUT =
  'reference/song-publish-candidates/review-notes/kuailepu-directive-analysis-2026-05-12.md'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/analyze-kuailepu-directives.ts [--input=${DEFAULT_INPUT}] [--out=${DEFAULT_OUT}]`

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
let directiveCount = 0

for (const entry of report.entries) {
  const notation = readNotation(entry.referenceRuntimeFile)
  const directives = extractKuailepuNotationMetadata(notation).directives.map(directive => ({
    directive: directive.raw,
    context: directive.lineText,
    category: directive.category
  }))
  for (const directive of directives) {
    directiveCount += 1
    const bucket = categories.get(directive.category)!
    bucket.total += 1
    bucket.byFit[entry.trainingFit.level] += 1
    if (bucket.samples.length < 8) {
      bucket.samples.push({
        slug: entry.slug,
        fit: entry.trainingFit.level,
        directive: directive.directive,
        context: directive.context
      })
    }
  }
}

const markdown = buildMarkdown(categories, directiveCount)
const outPath = path.resolve(process.cwd(), options.out)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, markdown, 'utf8')

console.log(`Wrote Kuailepu directive analysis to ${path.relative(process.cwd(), outPath)}`)
console.log(
  JSON.stringify(
    {
      directiveCount,
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
    if (!match) continue
    values.set(match[1], match[2])
  }
  return {
    input: values.get('input') || DEFAULT_INPUT,
    out: values.get('out') || DEFAULT_OUT
  }
}

function readNotation(runtimeFile: string) {
  const resolved = path.resolve(process.cwd(), runtimeFile)
  const payload = JSON.parse(fs.readFileSync(resolved, 'utf8')) as RuntimePayload
  return String(payload.notation ?? '')
}

function createEmptyCategories() {
  const entries: DirectiveCategory[] = [
    {
      key: 'bpm',
      label: 'Tempo Directive',
      description: 'Metadata-like tempo directive such as `{bpm:120}`.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      samples: []
    },
    {
      key: 'play',
      label: 'Playback / Section Directive',
      description: 'Section playback instruction such as `{play:A A B}`.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      samples: []
    },
    {
      key: 'hot',
      label: 'Hot Marker',
      description: 'Directive such as `{hot}` that appears to be playback or emphasis metadata, not melody tokens.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      samples: []
    },
    {
      key: 'keynote',
      label: 'Inline Keynote Hint',
      description: 'Inline tonality hints such as `{1=bA}`.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      samples: []
    },
    {
      key: 'group',
      label: 'Group Wrapper',
      description: 'Visual or structural wrappers such as `{group}` and `{/group}`.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      samples: []
    },
    {
      key: 'dynamic-toggle',
      label: 'Dynamic / Playback Toggle',
      description: 'Toggle-like directives such as `{ff:off}`.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      samples: []
    },
    {
      key: 'other',
      label: 'Other Directive',
      description: 'Anything else inside non-chord braces that may need separate inspection.',
      total: 0,
      byFit: { strong: 0, partial: 0, weak: 0 },
      samples: []
    }
  ]

  return new Map(entries.map(entry => [entry.key, entry]))
}

function buildMarkdown(categories: Map<DirectiveCategoryKey, DirectiveCategory>, directiveCount: number) {
  const ordered = [...categories.values()].sort((left, right) => right.total - left.total)
  const lines: string[] = []
  lines.push('# Kuailepu Non-Chord Directive Analysis (2026-05-12)')
  lines.push('')
  lines.push(`- Total extracted non-chord directives: ${directiveCount}`)
  lines.push('- Goal: separate metadata-like directives from anything that may affect parsing semantics.')
  lines.push('')
  lines.push('## Categories')
  lines.push('')

  for (const category of ordered) {
    if (category.total < 1) continue
    lines.push(`### ${category.label}`)
    lines.push('')
    lines.push(`- Meaning: ${category.description}`)
    lines.push(`- Count: ${category.total} (strong ${category.byFit.strong}, partial ${category.byFit.partial}, weak ${category.byFit.weak})`)
    lines.push('- Samples:')
    for (const sample of category.samples) {
      lines.push(`- ${sample.slug}: \`${sample.directive}\` in \`${sample.context}\``)
    }
    lines.push('')
  }

  lines.push('## Working Interpretation')
  lines.push('')
  lines.push('- `bpm` should be treated as metadata and excluded from note parsing.')
  lines.push('- `play` should remain a section/playback expansion concern, not a note token concern.')
  lines.push('- `hot` currently looks like a metadata marker and should be skipped in local parsing unless later evidence shows stronger semantics.')
  lines.push('- inline keynote hints such as `1=bA` should be recognized as tonality metadata, not note tokens.')
  lines.push('- `group` wrappers look structural and should be removable without changing note meaning.')
  lines.push('- toggle directives like `ff:off` should stay outside melody parsing.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
