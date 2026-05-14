import fs from 'node:fs'
import path from 'node:path'

type CliOptions = {
  slugs: string[]
  runtimeDir: string
  songDocDir: string
  targetRuntimeDir: string
  targetSongDocDir: string
}

const DEFAULT_CANDIDATE_RUNTIME_DIR = 'reference/song-publish-candidates/runtime'
const DEFAULT_CANDIDATE_SONGDOC_DIR = 'reference/song-publish-candidates/songdocs'
const DEFAULT_TARGET_RUNTIME_DIR = 'data/kuailepu-runtime'
const DEFAULT_TARGET_SONGDOC_DIR = 'data/kuailepu'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/promote-song-ingest-candidate.ts <slug...> [--runtime-dir=${DEFAULT_CANDIDATE_RUNTIME_DIR}] [--songdoc-dir=${DEFAULT_CANDIDATE_SONGDOC_DIR}] [--target-runtime-dir=${DEFAULT_TARGET_RUNTIME_DIR}] [--target-songdoc-dir=${DEFAULT_TARGET_SONGDOC_DIR}]`

const options = parseArgs(process.argv.slice(2))

if (!options) {
  console.error(usage)
  process.exit(1)
}

const promoted: string[] = []

for (const slug of options.slugs) {
  const runtimeSource = path.resolve(process.cwd(), options.runtimeDir, `${slug}.json`)
  const songDocSource = path.resolve(process.cwd(), options.songDocDir, `${slug}.json`)
  const runtimeTarget = path.resolve(process.cwd(), options.targetRuntimeDir, `${slug}.json`)
  const songDocTarget = path.resolve(process.cwd(), options.targetSongDocDir, `${slug}.json`)

  if (!fs.existsSync(runtimeSource)) {
    throw new Error(`Missing candidate runtime JSON for ${slug}: ${path.relative(process.cwd(), runtimeSource)}`)
  }
  if (!fs.existsSync(songDocSource)) {
    throw new Error(`Missing candidate SongDoc for ${slug}: ${path.relative(process.cwd(), songDocSource)}`)
  }

  fs.mkdirSync(path.dirname(runtimeTarget), { recursive: true })
  fs.mkdirSync(path.dirname(songDocTarget), { recursive: true })
  fs.copyFileSync(runtimeSource, runtimeTarget)
  fs.copyFileSync(songDocSource, songDocTarget)

  promoted.push(slug)
  console.log(`Promoted ${slug}`)
  console.log(`  runtime: ${path.relative(process.cwd(), runtimeSource)} -> ${path.relative(process.cwd(), runtimeTarget)}`)
  console.log(`  songdoc: ${path.relative(process.cwd(), songDocSource)} -> ${path.relative(process.cwd(), songDocTarget)}`)
}

console.log(
  JSON.stringify(
    {
      promoted,
      source: {
        runtimeDir: options.runtimeDir,
        songDocDir: options.songDocDir
      },
      target: {
        runtimeDir: options.targetRuntimeDir,
        songDocDir: options.targetSongDocDir
      }
    },
    null,
    2
  )
)

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

  if (positional.length < 1) {
    return null
  }

  return {
    slugs: positional,
    runtimeDir: values.get('runtime-dir') || DEFAULT_CANDIDATE_RUNTIME_DIR,
    songDocDir: values.get('songdoc-dir') || DEFAULT_CANDIDATE_SONGDOC_DIR,
    targetRuntimeDir: values.get('target-runtime-dir') || DEFAULT_TARGET_RUNTIME_DIR,
    targetSongDocDir: values.get('target-songdoc-dir') || DEFAULT_TARGET_SONGDOC_DIR
  }
}
