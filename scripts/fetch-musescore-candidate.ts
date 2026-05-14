import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

type CliOptions = {
  input: string
  slug: string
  sourceId: string
  title?: string
  note?: string
  types: string[]
  outputRoot: string
  downloader: string
  copyFrom?: string
}

const DEFAULT_OUTPUT_ROOT = 'private/musescore-candidates'
const DEFAULT_SOURCE_ID = 'source-1'
const DEFAULT_DOWNLOADER = 'dl-librescore@latest'
const DEFAULT_TYPES = ['musicxml', 'pdf', 'midi']
const ALLOWED_TYPES = new Set(['midi', 'mp3', 'pdf', 'mscz', 'mscx', 'musicxml', 'flac', 'ogg'])
const askedForHelp = process.argv.slice(2).includes('--help') || process.argv.slice(2).includes('-h')

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/fetch-musescore-candidate.ts --input=<musescore-url|local-score|local-folder> --slug=<slug> [--source-id=${DEFAULT_SOURCE_ID}] [--title="Song Title"] [--types=musicxml,pdf,midi] [--out-root=${DEFAULT_OUTPUT_ROOT}] [--copy-from=<downloaded-file-or-folder>] [--note="arrangement note"]`

const options = parseArgs(process.argv.slice(2))

if (!options) {
  console.log(usage)
  process.exit(askedForHelp ? 0 : 1)
}

const targetDir = path.resolve(process.cwd(), options.outputRoot, options.slug, options.sourceId)
fs.mkdirSync(targetDir, { recursive: true })

if (options.copyFrom) {
  const copyFromPath = path.resolve(process.cwd(), options.copyFrom)
  if (!fs.existsSync(copyFromPath)) {
    throw new Error(`copy-from path not found: ${options.copyFrom}`)
  }
  copyIntoTarget(copyFromPath, targetDir)
} else {
  execFileSync(
    'npx',
    [
      options.downloader,
      '-i',
      options.input,
      '-t',
      ...options.types,
      '-o',
      targetDir
    ],
    {
      cwd: process.cwd(),
      stdio: 'inherit'
    }
  )
}

const files = listRelativeFiles(targetDir)
const sourceRecord = {
  slug: options.slug,
  sourceId: options.sourceId,
  title: options.title ?? null,
  input: options.input,
  copyFrom: options.copyFrom ?? null,
  types: options.types,
  note: options.note ?? null,
  downloader: options.copyFrom ? null : options.downloader,
  fetchedAt: new Date().toISOString(),
  files
}

fs.writeFileSync(
  path.join(targetDir, 'source.json'),
  `${JSON.stringify(sourceRecord, null, 2)}\n`,
  'utf8'
)

if (/^https?:\/\//i.test(options.input)) {
  fs.writeFileSync(path.join(targetDir, 'source.url.txt'), `${options.input}\n`, 'utf8')
}

console.log(
  JSON.stringify(
    {
      targetDir: path.relative(process.cwd(), targetDir),
      files
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
      if (arg === '--help' || arg === '-h') {
        return
      }
      throw new Error(`Unsupported argument: ${arg}`)
    }

    values.set(match[1], match[2])
  })

  if (args.includes('--help') || args.includes('-h')) {
    return null
  }

  const input = values.get('input')
  const slug = values.get('slug')
  if (!input || !slug) {
    return null
  }

  const types = (values.get('types') || DEFAULT_TYPES.join(','))
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)

  if (types.length < 1) {
    throw new Error('At least one type is required.')
  }

  types.forEach(type => {
    if (!ALLOWED_TYPES.has(type)) {
      throw new Error(`Unsupported file type: ${type}`)
    }
  })

  return {
    input,
    slug,
    sourceId: sanitizePathToken(values.get('source-id') || DEFAULT_SOURCE_ID),
    title: values.get('title'),
    note: values.get('note'),
    types,
    outputRoot: values.get('out-root') || DEFAULT_OUTPUT_ROOT,
    downloader: values.get('downloader') || DEFAULT_DOWNLOADER,
    copyFrom: values.get('copy-from')
  }
}

function sanitizePathToken(value: string) {
  const normalized = value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-')
  if (!normalized) {
    throw new Error(`Invalid source id: ${value}`)
  }
  return normalized
}

function copyIntoTarget(sourcePath: string, targetDir: string) {
  const stats = fs.statSync(sourcePath)
  if (stats.isDirectory()) {
    const entries = fs.readdirSync(sourcePath, { withFileTypes: true })
    entries.forEach(entry => {
      copyIntoTarget(path.join(sourcePath, entry.name), path.join(targetDir, entry.name))
    })
    return
  }

  fs.mkdirSync(path.dirname(targetDir), { recursive: true })
  fs.copyFileSync(sourcePath, targetDir)
}

function listRelativeFiles(rootDir: string) {
  const results: string[] = []

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    entries.forEach(entry => {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
        return
      }
      results.push(path.relative(rootDir, fullPath))
    })
  }

  walk(rootDir)
  return results.sort((left, right) => left.localeCompare(right))
}
