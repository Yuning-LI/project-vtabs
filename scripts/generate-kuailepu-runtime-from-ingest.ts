import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { generateKuailepuRuntimeCandidate } from '../src/lib/songbook/kuailepuIngest.ts'
import type { SongIngestDraft } from '../src/lib/songbook/songIngestDraft.ts'

type CliOptions = {
  input: string
  templateSlug: string
  slug: string
  title?: string
  keynote?: string
  transpose: number | null
  autoTransposeInstrument?: string
  rankBaseUrl?: string
  outRuntime: string
  outSongDoc?: string
  outReport?: string
  scrubRuntimeCache: boolean
  graceMode: 'source-only' | 'payload-metadata'
}

const usage =
  'Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/generate-kuailepu-runtime-from-ingest.ts <draft.json> --template=<slug> --slug=<slug> [--title="Title"] [--keynote=1=F] [--transpose=-7|--auto-transpose=o12] [--rank-base-url=http://127.0.0.1:3000] [--grace-mode=source-only|payload-metadata] --out-runtime=data/kuailepu-runtime/<slug>.json [--out-songdoc=data/kuailepu/<slug>.json] [--out-report=exports/song-ingest/<slug>-report.json] [--keep-template-cache]'

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const draft = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), options.input), 'utf8')
) as SongIngestDraft
const templatePath = path.resolve(
  process.cwd(),
  'data',
  'kuailepu-runtime',
  `${options.templateSlug}.json`
)
const template = JSON.parse(fs.readFileSync(templatePath, 'utf8')) as Record<string, unknown>
  const generated = generateKuailepuRuntimeCandidate({
    draft,
    template,
    slug: options.slug,
    title: options.title,
    keynote: options.keynote,
    transpose: options.transpose,
    autoTransposeInstrument: options.autoTransposeInstrument,
    scrubRuntimeCache: options.scrubRuntimeCache,
    graceMode: options.graceMode
  })

writeJson(options.outRuntime, generated.runtimePayload)
console.log(`Wrote synthetic runtime JSON to ${options.outRuntime}`)

if (options.outSongDoc) {
  writeJson(options.outSongDoc, generated.songDoc)
  console.log(`Wrote candidate SongDoc to ${options.outSongDoc}`)
}

if (options.rankBaseUrl) {
  execFileSync(
    'node',
    [
      '--experimental-strip-types',
      '--experimental-specifier-resolution=node',
      'scripts/optimize-runtime-fingerings.ts',
      options.slug,
      `--base-url=${options.rankBaseUrl}`
    ],
    {
      cwd: process.cwd(),
      stdio: 'inherit'
    }
  )
}

const ingestReport = {
  ...generated.ingestReport,
  source: {
    draft: path.relative(process.cwd(), path.resolve(process.cwd(), options.input)),
    kind: draft.source.kind,
    partId: draft.source.partId,
    voice: draft.source.voice
  },
  generation: {
    ...generated.ingestReport.generation,
    templateSlug: options.templateSlug
  }
}

if (options.outReport) {
  writeJson(options.outReport, ingestReport)
  console.log(`Wrote ingest report to ${options.outReport}`)
} else {
  console.log(JSON.stringify(ingestReport, null, 2))
}

function parseArgs(args: string[]): CliOptions | null {
  if (args.length === 0) return null

  const positional: string[] = []
  const values = new Map<string, string>()

  args.forEach(arg => {
    if (!arg.startsWith('--')) {
      positional.push(arg)
      return
    }

    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (!match) {
      values.set(arg.slice(2), 'true')
      return
    }

    values.set(match[1], match[2])
  })

  const input = positional[0]
  const templateSlug = values.get('template')
  const slug = values.get('slug')
  const outRuntime = values.get('out-runtime')
  if (!input || !templateSlug || !slug || !outRuntime) return null

  return {
    input,
    templateSlug,
    slug,
    title: values.get('title'),
    keynote: values.get('keynote'),
    transpose: values.has('transpose') ? Number(values.get('transpose')) : null,
    autoTransposeInstrument: values.get('auto-transpose'),
    rankBaseUrl: values.get('rank-base-url'),
    outRuntime,
    outSongDoc: values.get('out-songdoc'),
    outReport: values.get('out-report'),
    scrubRuntimeCache: values.get('keep-template-cache') !== 'true',
    graceMode:
      values.get('grace-mode') === 'payload-metadata' ? 'payload-metadata' : 'source-only'
  }
}
function writeJson(filePath: string, value: unknown) {
  const resolved = path.resolve(process.cwd(), filePath)
  fs.mkdirSync(path.dirname(resolved), { recursive: true })
  fs.writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}
