import path from 'node:path'
import { execFileSync } from 'node:child_process'

type CliOptions = {
  input: string
  title?: string
  slug?: string
  family?: string
  part?: string
  voice?: string
  keynote?: string
  tempoBpm?: string
  lyricPolicy?: string
  template: string
  autoTranspose: string
  rankBaseUrl?: string
  skipRuntimeFingeringOptimize: boolean
  graceMode: 'source-only' | 'payload-metadata'
}

const usage =
  'Usage: npm run ingest:song-candidate -- <input.xml|input.mxl> --slug=<slug> [--title="Song Title"] [--family=folk] [--part=P1] [--voice=1] [--keynote=1=G] [--tempo-bpm=96] [--lyric-policy=show-publicly|hide-by-default|do-not-expose-toggle|no-lyrics] [--template=happy-birthday-to-you] [--auto-transpose=o12] [--rank-base-url=http://127.0.0.1:3000] [--skip-runtime-fingering-optimize=true] [--grace-mode=source-only|payload-metadata]'

const options = parseArgs(process.argv.slice(2))

if (!options) {
  console.error(usage)
  process.exit(1)
}

const slug = options.slug || deriveSlugFromInput(options.input)
const title = options.title || humanizeSlug(slug)
const draftPath = `reference/song-publish-candidates/drafts/${slug}.json`
const reportPath = `reference/song-publish-candidates/reports/${slug}-report.json`
const sanityPath = `reference/song-publish-candidates/source-sanity/${slug}.json`
const runtimePath = `reference/song-publish-candidates/runtime/${slug}.json`
const songDocPath = `reference/song-publish-candidates/songdocs/${slug}.json`

runScript('scripts/prepare-song-ingest.ts', [
  options.input,
  `--title=${title}`,
  `--slug=${slug}`,
  ...(options.family ? [`--family=${options.family}`] : []),
  ...(options.part ? [`--part=${options.part}`] : []),
  ...(options.voice ? [`--voice=${options.voice}`] : []),
  ...(options.keynote ? [`--keynote=${options.keynote}`] : []),
  ...(options.lyricPolicy ? [`--lyric-policy=${options.lyricPolicy}`] : []),
  `--out=${draftPath}`,
  `--out-sanity=${sanityPath}`
])

runScript('scripts/generate-kuailepu-runtime-from-ingest.ts', [
  draftPath,
  `--template=${options.template}`,
  `--slug=${slug}`,
  `--title=${title}`,
  `--auto-transpose=${options.autoTranspose}`,
  ...(options.tempoBpm ? [`--tempo-bpm=${options.tempoBpm}`] : []),
  ...(options.rankBaseUrl ? [`--rank-base-url=${options.rankBaseUrl}`] : []),
  ...(options.skipRuntimeFingeringOptimize ? ['--skip-runtime-fingering-optimize=true'] : []),
  `--grace-mode=${options.graceMode}`,
  `--out-runtime=${runtimePath}`,
  `--out-songdoc=${songDocPath}`,
  `--out-report=${reportPath}`,
  `--out-sanity=${sanityPath}`
])

console.log(
  JSON.stringify(
    {
      ok: true,
      slug,
      title,
      outputs: {
        draft: draftPath,
        runtime: runtimePath,
        songdoc: songDocPath,
        report: reportPath,
        sanity: sanityPath
      },
      nextSteps: [
        `npm run doctor:song-ingest -- ${slug}`,
        `npm run record:song-ingest-review -- ${slug} --status=verified --approve=true --refs=Wikipedia,MuseScore --summary="External review passed."`
      ]
    },
    null,
    2
  )
)

function runScript(scriptPath: string, args: string[]) {
  execFileSync(
    'node',
    [
      '--experimental-strip-types',
      '--experimental-specifier-resolution=node',
      scriptPath,
      ...args
    ],
    {
      cwd: process.cwd(),
      stdio: 'inherit'
    }
  )
}

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

  const input = positional[0]
  if (!input) {
    return null
  }

  return {
    input,
    title: values.get('title'),
    slug: values.get('slug'),
    family: values.get('family'),
    part: values.get('part'),
    voice: values.get('voice'),
    keynote: values.get('keynote'),
    tempoBpm: values.get('tempo-bpm'),
    lyricPolicy: values.get('lyric-policy'),
    template: values.get('template') || 'happy-birthday-to-you',
    autoTranspose: values.get('auto-transpose') || 'o12',
    rankBaseUrl: values.get('rank-base-url'),
    skipRuntimeFingeringOptimize: values.get('skip-runtime-fingering-optimize') === 'true',
    graceMode:
      values.get('grace-mode') === 'payload-metadata' ? 'payload-metadata' : 'source-only'
  }
}

function deriveSlugFromInput(input: string) {
  const baseName = path.basename(input, path.extname(input))
  const slug = baseName
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!slug) {
    throw new Error(`Could not derive slug from input: ${input}`)
  }

  return slug
}

function humanizeSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}
