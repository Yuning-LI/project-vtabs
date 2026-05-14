import fs from 'node:fs'
import path from 'node:path'
import { extractKuailepuNotationMetadata } from '../src/lib/songbook/kuailepuImport.ts'

type RuntimePayload = {
  notation?: string
}

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

type CliOptions = {
  input: string
  out: string
}

const DEFAULT_INPUT = 'tmp/openewld-overlap-all-fit.json'
const DEFAULT_OUT =
  'reference/song-publish-candidates/review-notes/kuailepu-keynote-hint-analysis-2026-05-12.md'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/analyze-kuailepu-keynote-hints.ts [--input=${DEFAULT_INPUT}] [--out=${DEFAULT_OUT}]`

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
const samples: Array<{ slug: string; fit: string; hint: string; context: string }> = []

for (const entry of report.entries) {
  const notation = readNotation(entry.referenceRuntimeFile)
  const hints = extractKuailepuNotationMetadata(notation).keynoteHints
  for (const hint of hints) {
    samples.push({
      slug: entry.slug,
      fit: entry.trainingFit.level,
      hint: hint.value,
      context: hint.lineText.replace(/\s+/g, ' ').trim()
    })
  }
}

const lines: string[] = []
lines.push('# Kuailepu Inline Keynote Hint Analysis (2026-05-12)')
lines.push('')
lines.push(`- Total inline keynote hints found in overlap set: ${samples.length}`)
lines.push('- Goal: determine whether `{1=...}` should be treated as local tonality metadata only, or if it implies a later modulation model.')
lines.push('')
lines.push('## Samples')
lines.push('')
for (const sample of samples) {
  lines.push(`- ${sample.slug} (${sample.fit}): \`${sample.hint}\` in \`${sample.context}\``)
}
lines.push('')
lines.push('## Working Interpretation')
lines.push('')
lines.push('- Inline keynote hints should not enter melody token parsing.')
lines.push('- For now they are best treated as metadata hints only.')
lines.push('- If more examples accumulate, we can later decide whether they imply real local modulation support.')
lines.push('')

const outPath = path.resolve(process.cwd(), options.out)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8')

console.log(`Wrote Kuailepu keynote hint analysis to ${path.relative(process.cwd(), outPath)}`)
console.log(JSON.stringify({ sampleCount: samples.length }, null, 2))

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
