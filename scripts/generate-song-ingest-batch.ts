import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { generateKuailepuRuntimeCandidate } from '../src/lib/songbook/kuailepuIngest.ts'
import {
  closeMusicXmlExtractorSession,
  createMusicXmlExtractorSession,
  extractMusicXmlScore,
  readMusicXmlText
} from '../src/lib/songbook/musicXml.ts'
import {
  buildSongIngestDraftFromMusicXmlExtract,
  type BuildSongIngestDraftOptions,
  type SongIngestDraft,
  type SongIngestLyricPolicy
} from '../src/lib/songbook/songIngestDraft.ts'
import type { PublicSongFamily } from '../src/lib/songbook/types.ts'

type CliOptions = BuildSongIngestDraftOptions & {
  inputs: string[]
  templateSlug?: string
  autoTransposeInstrument?: string
  limit?: number
  slugPrefix?: string
  outDraftDir: string
  outRuntimeDir?: string
  outSongDocDir?: string
  rankBaseUrl?: string
  outReport?: string
  graceMode: 'source-only' | 'payload-metadata'
}

type BatchEntry = {
  file: string
  slug: string
  title: string
  status: 'ok' | 'error'
  outputs?: {
    draft: string
    runtime?: string
    songDoc?: string
  }
  warnings: string[]
  stats?: SongIngestDraft['stats']
  generation?: {
    sourceKeynote: string
    targetKeynote: string
    transpose: number
  }
  error?: string
}

const usage =
  'Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/generate-song-ingest-batch.ts [path ...] [--template=happy-birthday-to-you] [--auto-transpose=o12] [--rank-base-url=http://127.0.0.1:3000] [--grace-mode=source-only|payload-metadata] [--family=folk] [--lyric-policy=show-publicly|hide-by-default|do-not-expose-toggle|no-lyrics] [--part=P1] [--voice=1] [--limit=50] [--slug-prefix=openewld-] [--out-draft-dir=reference/song-ingest-drafts] [--out-runtime-dir=data/kuailepu-runtime] [--out-songdoc-dir=data/kuailepu] [--report=exports/song-ingest/batch-generate.json]'

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const files = collectInputFiles(options.inputs.length > 0 ? options.inputs : ['private/openewld/dataset'])
const selectedFiles = typeof options.limit === 'number' ? files.slice(0, options.limit) : files

if (selectedFiles.length === 0) {
  console.error('No MusicXML files found.')
  process.exit(1)
}

if (selectedFiles.length > 1 && (options.title || options.slug)) {
  console.error('Do not pass --title or --slug when batch-generating multiple files.')
  process.exit(1)
}

const shouldGenerateRuntime = Boolean(options.outRuntimeDir || options.outSongDocDir)
if ((options.outRuntimeDir && !options.outSongDocDir) || (!options.outRuntimeDir && options.outSongDocDir)) {
  console.error('When generating runtime candidates in batch, provide both --out-runtime-dir and --out-songdoc-dir.')
  process.exit(1)
}

if (shouldGenerateRuntime && !options.templateSlug) {
  console.error('Batch runtime generation requires --template=<slug>.')
  process.exit(1)
}

const template = shouldGenerateRuntime
  ? (JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), 'data', 'kuailepu-runtime', `${options.templateSlug}.json`),
        'utf8'
      )
    ) as Record<string, unknown>)
  : null

const session = await createMusicXmlExtractorSession()
const entries: BatchEntry[] = []
const seenSlugs = new Set<string>()
const generatedRuntimeSlugs: string[] = []

try {
  for (const file of selectedFiles) {
    const relativeFile = path.relative(process.cwd(), file)

    try {
      const xmlText = await readMusicXmlText(file)
      const extract = await extractMusicXmlScore(xmlText, options.partId, session)
      const draft = buildSongIngestDraftFromMusicXmlExtract(extract, {
        title: options.title,
        slug: options.slug,
        family: options.family,
        partId: options.partId,
        voice: options.voice,
        keynote: options.keynote,
        lyricPolicy: options.lyricPolicy
      })
      if (options.slugPrefix) {
        draft.metadata.slug = `${options.slugPrefix}${draft.metadata.slug}`.replace(/--+/g, '-')
        draft.songDocDraft.slug = draft.metadata.slug
      }

      if (seenSlugs.has(draft.metadata.slug)) {
        throw new Error(`Duplicate slug generated in batch: ${draft.metadata.slug}`)
      }
      seenSlugs.add(draft.metadata.slug)

      const draftOutput = writeJsonFile(
        options.outDraftDir,
        draft.metadata.slug,
        draft
      )

      let runtimeOutput: string | undefined
      let songDocOutput: string | undefined
      let generation: BatchEntry['generation']

      if (shouldGenerateRuntime && template && options.outRuntimeDir && options.outSongDocDir) {
        const generated = generateKuailepuRuntimeCandidate({
          draft,
          template,
          slug: draft.metadata.slug,
          title: draft.metadata.title,
          autoTransposeInstrument: options.autoTransposeInstrument,
          scrubRuntimeCache: true,
          graceMode: options.graceMode
        })

        runtimeOutput = writeJsonFile(options.outRuntimeDir, draft.metadata.slug, generated.runtimePayload)
        songDocOutput = writeJsonFile(options.outSongDocDir, draft.metadata.slug, generated.songDoc)
        generatedRuntimeSlugs.push(draft.metadata.slug)
        generation = {
          sourceKeynote: generated.sourceKeynote,
          targetKeynote: generated.targetKeynote,
          transpose: generated.selectedTranspose
        }
      }

      entries.push({
        file: relativeFile,
        slug: draft.metadata.slug,
        title: draft.metadata.title,
        status: 'ok',
        outputs: {
          draft: draftOutput,
          ...(runtimeOutput ? { runtime: runtimeOutput } : {}),
          ...(songDocOutput ? { songDoc: songDocOutput } : {})
        },
        warnings: draft.warnings,
        stats: draft.stats,
        ...(generation ? { generation } : {})
      })
    } catch (error) {
      entries.push({
        file: relativeFile,
        slug: path.basename(relativeFile, path.extname(relativeFile)).toLowerCase(),
        title: path.basename(relativeFile, path.extname(relativeFile)),
        status: 'error',
        warnings: [],
        error: error instanceof Error ? error.message : 'Unknown batch generation failure.'
      })
    }
  }
} finally {
  await closeMusicXmlExtractorSession(session)
}

if (shouldGenerateRuntime && options.rankBaseUrl && generatedRuntimeSlugs.length > 0) {
  execFileSync(
    'node',
    [
      '--experimental-strip-types',
      '--experimental-specifier-resolution=node',
      'scripts/optimize-runtime-fingerings.ts',
      ...generatedRuntimeSlugs,
      `--base-url=${options.rankBaseUrl}`
    ],
    {
      cwd: process.cwd(),
      stdio: 'inherit'
    }
  )
}

const report = {
  generatedOn: new Date().toISOString(),
  inputCount: selectedFiles.length,
  templateSlug: options.templateSlug ?? null,
  autoTransposeInstrument: options.autoTransposeInstrument ?? null,
  graceMode: options.graceMode,
  outDraftDir: options.outDraftDir,
  outRuntimeDir: options.outRuntimeDir ?? null,
  outSongDocDir: options.outSongDocDir ?? null,
  summary: summarize(entries),
  entries
}

if (options.outReport) {
  const reportPath = path.resolve(process.cwd(), options.outReport)
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Wrote batch generate report to ${path.relative(process.cwd(), reportPath)}`)
}

console.log(JSON.stringify(report.summary, null, 2))

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

  return {
    inputs: positional,
    templateSlug: values.get('template'),
    autoTransposeInstrument: values.get('auto-transpose'),
    title: values.get('title'),
    slug: values.get('slug'),
    family: values.has('family') ? parseFamily(values.get('family')!) : undefined,
    partId: values.get('part'),
    voice: values.get('voice'),
    keynote: values.get('keynote'),
    lyricPolicy: values.has('lyric-policy')
      ? parseLyricPolicy(values.get('lyric-policy')!)
      : undefined,
    limit: values.has('limit') ? Number(values.get('limit')) : undefined,
    slugPrefix: values.get('slug-prefix'),
    outDraftDir: values.get('out-draft-dir') || 'reference/song-ingest-drafts',
    outRuntimeDir: values.get('out-runtime-dir'),
    outSongDocDir: values.get('out-songdoc-dir'),
    rankBaseUrl: values.get('rank-base-url'),
    outReport: values.get('report'),
    graceMode:
      values.get('grace-mode') === 'payload-metadata' ? 'payload-metadata' : 'source-only'
  }
}

function collectInputFiles(inputs: string[]) {
  return inputs
    .flatMap(input => {
      const resolved = path.resolve(process.cwd(), input)
      if (!fs.existsSync(resolved)) {
        return []
      }

      const stats = fs.statSync(resolved)
      if (stats.isFile()) {
        return isMusicXmlFile(resolved) ? [resolved] : []
      }

      return walkMusicXmlFiles(resolved)
    })
    .sort((left, right) => left.localeCompare(right))
}

function walkMusicXmlFiles(root: string): string[] {
  const output: string[] = []
  const queue = [root]

  while (queue.length > 0) {
    const current = queue.shift()!
    const entries = fs.readdirSync(current, { withFileTypes: true })

    entries.forEach(entry => {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        queue.push(fullPath)
        return
      }

      if (entry.isFile() && isMusicXmlFile(fullPath)) {
        output.push(fullPath)
      }
    })
  }

  return output
}

function isMusicXmlFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  return ext === '.xml' || ext === '.musicxml' || ext === '.mxl'
}

function writeJsonFile(outputDir: string, slug: string, value: unknown) {
  const resolvedDir = path.resolve(process.cwd(), outputDir)
  const filePath = path.join(resolvedDir, `${slug}.json`)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  return path.relative(process.cwd(), filePath)
}

function summarize(entries: BatchEntry[]) {
  const ok = entries.filter(entry => entry.status === 'ok')
  const error = entries.filter(entry => entry.status === 'error')

  return {
    total: entries.length,
    okCount: ok.length,
    errorCount: error.length,
    lyricSongs: ok.filter(entry => (entry.stats?.lyricNoteCount ?? 0) > 0).length,
    chordSongs: ok.filter(entry => (entry.stats?.chordCount ?? 0) > 0).length,
    graceSongs: ok.filter(entry => (entry.stats?.graceNoteCount ?? 0) > 0).length,
    warningSongs: ok.filter(entry => entry.warnings.length > 0).length
  }
}

function parseFamily(value: string): PublicSongFamily {
  const normalized = value.trim() as PublicSongFamily
  if (
    normalized !== 'nursery' &&
    normalized !== 'folk' &&
    normalized !== 'classical' &&
    normalized !== 'holiday' &&
    normalized !== 'hymn' &&
    normalized !== 'march' &&
    normalized !== 'dance' &&
    normalized !== 'media' &&
    normalized !== 'song'
  ) {
    throw new Error(`Unsupported family: ${value}`)
  }

  return normalized
}

function parseLyricPolicy(value: string): SongIngestLyricPolicy {
  const normalized = value.trim() as SongIngestLyricPolicy
  if (
    normalized !== 'show-publicly' &&
    normalized !== 'hide-by-default' &&
    normalized !== 'do-not-expose-toggle' &&
    normalized !== 'no-lyrics'
  ) {
    throw new Error(`Unsupported lyric policy: ${value}`)
  }

  return normalized
}
