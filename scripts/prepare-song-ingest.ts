import fs from 'node:fs'
import path from 'node:path'
import {
  buildSongIngestDraftFromMusicXmlExtract,
  type BuildSongIngestDraftOptions,
  type SongIngestLyricPolicy
} from '../src/lib/songbook/songIngestDraft.ts'
import { buildSourceSanityReport } from '../src/lib/songbook/sourceSanity.ts'
import { extractMusicXmlScore, readMusicXmlText } from '../src/lib/songbook/musicXml.ts'
import type { PublicSongFamily } from '../src/lib/songbook/types.ts'

type CliOptions = BuildSongIngestDraftOptions & {
  input: string
  out?: string
  outSanity?: string
}

const DEFAULT_CANDIDATE_DRAFT_DIR = 'reference/song-publish-candidates/drafts'
const DEFAULT_CANDIDATE_SANITY_DIR = 'reference/song-publish-candidates/source-sanity'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/prepare-song-ingest.ts <input.musicxml|input.mxl> [--title="My Song"] [--slug=my-song] [--family=folk] [--part=P1] [--voice=1] [--keynote=1=G] [--lyric-policy=show-publicly|hide-by-default|do-not-expose-toggle|no-lyrics] [--out=${DEFAULT_CANDIDATE_DRAFT_DIR}/my-song.json] [--out-sanity=${DEFAULT_CANDIDATE_SANITY_DIR}/my-song.json]`

const options = parseArgs(process.argv.slice(2))

if (!options) {
  console.error(usage)
  process.exit(1)
}

const inputPath = path.resolve(process.cwd(), options.input)
const inputExt = path.extname(inputPath).toLowerCase()

if (!['.musicxml', '.xml', '.mxl'].includes(inputExt)) {
  console.error(`Unsupported input type: ${inputExt || '(no extension)'}`)
  console.error('Current internal tool supports MusicXML (.xml/.musicxml) and compressed MusicXML (.mxl).')
  process.exit(1)
}

const stats = await fs.promises.stat(inputPath).catch(() => null)
if (!stats?.isFile()) {
  console.error(`Input file not found: ${options.input}`)
  process.exit(1)
}

const xmlText = await readMusicXmlText(inputPath)
const extract = await extractMusicXmlScore(xmlText, options.partId)
const draft = buildSongIngestDraftFromMusicXmlExtract(extract, options)
const sanity = buildSourceSanityReport({
  draft,
  extract,
  sourceFile: path.relative(process.cwd(), inputPath)
})
const outputJson = JSON.stringify(draft, null, 2) + '\n'

if (options.out) {
  const outPath = path.resolve(process.cwd(), options.out)
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true })
  await fs.promises.writeFile(outPath, outputJson, 'utf8')
  console.log(`Wrote song ingest draft to ${path.relative(process.cwd(), outPath)}`)
}

const shouldWriteSanity = Boolean(options.out || options.outSanity)
if (shouldWriteSanity) {
  const resolvedSanityPath = path.resolve(
    process.cwd(),
    options.outSanity || `${DEFAULT_CANDIDATE_SANITY_DIR}/${draft.metadata.slug}.json`
  )
  await fs.promises.mkdir(path.dirname(resolvedSanityPath), { recursive: true })
  await fs.promises.writeFile(
    resolvedSanityPath,
    `${JSON.stringify(sanity, null, 2)}\n`,
    'utf8'
  )
  console.log(`Wrote source sanity report to ${path.relative(process.cwd(), resolvedSanityPath)}`)
}

console.log(outputJson)

function parseArgs(args: string[]): CliOptions | null {
  if (args.length === 0) return null

  const positional: string[] = []
  const options: Partial<CliOptions> = {}

  args.forEach(arg => {
    if (arg.startsWith('--title=')) {
      options.title = arg.slice('--title='.length)
      return
    }
    if (arg.startsWith('--slug=')) {
      options.slug = arg.slice('--slug='.length)
      return
    }
    if (arg.startsWith('--family=')) {
      options.family = parseFamily(arg.slice('--family='.length))
      return
    }
    if (arg.startsWith('--part=')) {
      options.partId = arg.slice('--part='.length)
      return
    }
    if (arg.startsWith('--voice=')) {
      options.voice = arg.slice('--voice='.length)
      return
    }
    if (arg.startsWith('--keynote=')) {
      options.keynote = arg.slice('--keynote='.length)
      return
    }
    if (arg.startsWith('--lyric-policy=')) {
      options.lyricPolicy = parseLyricPolicy(arg.slice('--lyric-policy='.length))
      return
    }
    if (arg.startsWith('--out=')) {
      options.out = arg.slice('--out='.length)
      return
    }
    if (arg.startsWith('--out-sanity=')) {
      options.outSanity = arg.slice('--out-sanity='.length)
      return
    }

    positional.push(arg)
  })

  const input = positional[0]
  if (!input) return null

  return {
    input,
    ...options
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
