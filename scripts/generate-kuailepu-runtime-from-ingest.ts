import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { generateKuailepuRuntimeCandidate } from '../src/lib/songbook/kuailepuIngest.ts'
import { analyzeHcNotation, buildHcConsistencySummary } from '../src/lib/songbook/hcNotation.ts'
import type { SongIngestDraft } from '../src/lib/songbook/songIngestDraft.ts'
import { buildSourceSanityReport } from '../src/lib/songbook/sourceSanity.ts'
import { ensureBaseUrlReachable, startManagedDevServer, stopManagedDevServer } from './lib/local-dev-server.ts'
import type { KuailepuRuntimePayload } from '../src/lib/kuailepu/runtime.ts'

type CliOptions = {
  input: string
  templateSlug: string
  slug: string
  title?: string
  keynote?: string
  transpose: number | null
  autoTransposeInstrument?: string
  rankBaseUrl?: string
  skipRuntimeFingeringOptimize: boolean
  tempoBpm: number | null
  outRuntime: string
  outSongDoc?: string
  outReport?: string
  outSanity?: string
  scrubRuntimeCache: boolean
  graceMode: 'source-only' | 'payload-metadata'
}

const DEFAULT_CANDIDATE_RUNTIME_DIR = 'reference/song-publish-candidates/runtime'
const DEFAULT_CANDIDATE_SONGDOC_DIR = 'reference/song-publish-candidates/songdocs'
const DEFAULT_CANDIDATE_REPORT_DIR = 'reference/song-publish-candidates/reports'
const DEFAULT_CANDIDATE_SANITY_DIR = 'reference/song-publish-candidates/source-sanity'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/generate-kuailepu-runtime-from-ingest.ts <draft.json> --template=<slug> --slug=<slug> [--title="Title"] [--keynote=1=F] [--transpose=-7|--auto-transpose=o12] [--tempo-bpm=96] [--rank-base-url=http://127.0.0.1:3000] [--skip-runtime-fingering-optimize=true] [--grace-mode=source-only|payload-metadata] [--out-runtime=${DEFAULT_CANDIDATE_RUNTIME_DIR}/<slug>.json] [--out-songdoc=${DEFAULT_CANDIDATE_SONGDOC_DIR}/<slug>.json] [--out-report=${DEFAULT_CANDIDATE_REPORT_DIR}/<slug>-report.json] [--out-sanity=${DEFAULT_CANDIDATE_SANITY_DIR}/<slug>.json] [--keep-template-cache]`

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const draft = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), options.input), 'utf8')
) as SongIngestDraft
const sourceSanity = buildSourceSanityReport({
  draft,
  sourceFile: path.relative(process.cwd(), path.resolve(process.cwd(), options.input))
})
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
  tempoBpm: options.tempoBpm,
  scrubRuntimeCache: options.scrubRuntimeCache,
  graceMode: options.graceMode
})

writeJson(options.outRuntime, generated.runtimePayload)
console.log(`Wrote synthetic runtime JSON to ${options.outRuntime}`)

if (options.outSongDoc) {
  writeJson(options.outSongDoc, generated.songDoc)
  console.log(`Wrote candidate SongDoc to ${options.outSongDoc}`)
}

await runRuntimeFingeringOptimizationIfNeeded(options)

const optimizedRuntimePayload = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), options.outRuntime), 'utf8')
) as KuailepuRuntimePayload
const hcValidation = analyzeHcNotation(String(optimizedRuntimePayload.notation ?? ''))
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
  },
  hcValidation,
  hcConsistency: buildHcConsistencySummary(draft, hcValidation),
  sourceSanity
}

if (options.outReport) {
  writeJson(options.outReport, ingestReport)
  console.log(`Wrote ingest report to ${options.outReport}`)
} else {
  console.log(JSON.stringify(ingestReport, null, 2))
}

if (options.outSanity) {
  writeJson(options.outSanity, sourceSanity)
  console.log(`Wrote source sanity report to ${options.outSanity}`)
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
  if (!input || !templateSlug || !slug) return null

  return {
    input,
    templateSlug,
    slug,
    title: values.get('title'),
    keynote: values.get('keynote'),
    transpose: values.has('transpose') ? Number(values.get('transpose')) : null,
    autoTransposeInstrument: values.get('auto-transpose'),
    rankBaseUrl: values.get('rank-base-url'),
    skipRuntimeFingeringOptimize: values.get('skip-runtime-fingering-optimize') === 'true',
    tempoBpm: values.has('tempo-bpm') ? Number(values.get('tempo-bpm')) : null,
    outRuntime: values.get('out-runtime') || `${DEFAULT_CANDIDATE_RUNTIME_DIR}/${slug}.json`,
    outSongDoc: values.get('out-songdoc') || `${DEFAULT_CANDIDATE_SONGDOC_DIR}/${slug}.json`,
    outReport: values.get('out-report') || `${DEFAULT_CANDIDATE_REPORT_DIR}/${slug}-report.json`,
    outSanity: values.get('out-sanity') || `${DEFAULT_CANDIDATE_SANITY_DIR}/${slug}.json`,
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

async function runRuntimeFingeringOptimizationIfNeeded(options: CliOptions) {
  if (options.skipRuntimeFingeringOptimize) {
    return
  }

  let managedServer: Awaited<ReturnType<typeof startManagedDevServer>> | null = null
  let baseUrl = options.rankBaseUrl?.trim() || null

  try {
    if (baseUrl) {
      await ensureBaseUrlReachable(baseUrl)
    } else {
      managedServer = await startManagedDevServer()
      baseUrl = managedServer.baseUrl
    }

    execFileSync(
      'node',
      [
        '--experimental-strip-types',
        '--experimental-specifier-resolution=node',
        'scripts/optimize-runtime-fingerings.ts',
        options.slug,
        `--base-url=${baseUrl}`
      ],
      {
        cwd: process.cwd(),
        stdio: 'inherit'
      }
    )
  } finally {
    await stopManagedDevServer(managedServer)
  }
}
