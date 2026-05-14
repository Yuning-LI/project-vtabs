import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  buildSyntheticRuntimePayloadForInstrument
} from '../src/lib/songbook/kuailepuIngest.ts'
import { resolveKuailepuRuntimeSongPath } from '../src/lib/kuailepu/sourceFiles.ts'
import type { KuailepuRuntimePayload } from '../src/lib/kuailepu/runtime.ts'
import type { PublicSongInstrumentId } from '../src/lib/songbook/publicInstruments.ts'

type CliOptions = {
  slug: string
  instrument: PublicSongInstrumentId
  outSlug: string
  outRuntime: string
  outReport: string
  baseUrl?: string
}

const usage =
  'Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/probe-instrument-transpose.ts <slug> --instrument=o6|o12|r8b|r8g|w6 [--out-slug=<slug>] [--out-runtime=reference/song-publish-candidates/runtime/<slug>.json] [--out-report=reference/song-publish-candidates/reports/<slug>.json] [--base-url=http://127.0.0.1:3000]'

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const sourcePath = resolveKuailepuRuntimeSongPath(options.slug)
if (!sourcePath) {
  throw new Error(`Runtime payload not found for slug: ${options.slug}`)
}

const payload = JSON.parse(fs.readFileSync(sourcePath, 'utf8')) as KuailepuRuntimePayload
const result = buildSyntheticRuntimePayloadForInstrument(payload, options.instrument)
if (!result) {
  throw new Error(
    `Could not build an instrument-specific transposed runtime payload for ${options.slug} / ${options.instrument}.`
  )
}

const nextPayload = {
  ...result.payload,
  song_uuid: typeof payload.song_uuid === 'string' ? payload.song_uuid : `synthetic-${options.outSlug}`,
  song_name: payload.song_name,
  alias_name: payload.alias_name,
  song_pinyin: options.outSlug.replace(/-/g, '')
}

writeJson(options.outRuntime, nextPayload)

const report = {
  sourceSlug: options.slug,
  outputSlug: options.outSlug,
  sourcePath: path.relative(process.cwd(), sourcePath),
  outputRuntime: path.relative(process.cwd(), path.resolve(process.cwd(), options.outRuntime)),
  ...result.report
}

if (options.baseUrl) {
  execFileSync(
    'node',
    [
      '--experimental-strip-types',
      '--experimental-specifier-resolution=node',
      'scripts/optimize-runtime-fingerings.ts',
      options.outSlug,
      `--base-url=${options.baseUrl}`,
      `--report=${options.outReport}`
    ],
    {
      cwd: process.cwd(),
      stdio: 'inherit'
    }
  )
} else {
  writeJson(options.outReport, report)
}

console.log(JSON.stringify(report, null, 2))

function parseArgs(args: string[]): CliOptions | null {
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

  const slug = positional[0]?.trim()
  const instrument = values.get('instrument')?.trim() as PublicSongInstrumentId | undefined
  if (!slug || !instrument || !['o12', 'o6', 'r8b', 'r8g', 'w6'].includes(instrument)) {
    return null
  }

  const outSlug = values.get('out-slug')?.trim() || `${slug}--${instrument}-transpose`

  return {
    slug,
    instrument,
    outSlug,
    outRuntime:
      values.get('out-runtime') ||
      `reference/song-publish-candidates/runtime/${outSlug}.json`,
    outReport:
      values.get('out-report') ||
      `reference/song-publish-candidates/reports/${outSlug}.json`,
    baseUrl: values.get('base-url')
  }
}

function writeJson(filePath: string, value: unknown) {
  const resolved = path.resolve(process.cwd(), filePath)
  fs.mkdirSync(path.dirname(resolved), { recursive: true })
  fs.writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}
