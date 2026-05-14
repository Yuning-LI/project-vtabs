import fs from 'node:fs'
import path from 'node:path'

type SongDoc = {
  slug?: string
  title?: string
}

type SourceSanityReport = {
  source?: {
    title?: string
    composer?: string | null
    sourceFile?: string | null
  }
  preview?: {
    openingLyricsLines?: string[]
    openingLetterNotes?: string[]
  }
  suggestedSearchQueries?: string[]
  issues?: Array<{
    code?: string
    severity?: string
    message?: string
  }>
}

const DEFAULT_OUT_DIR = 'reference/song-publish-candidates/review-notes'

const usage =
  'Usage: npm run scaffold:song-ingest-review-note -- <slug> [--stdout] [--force] [--out=reference/song-publish-candidates/review-notes/<slug>.md]'

const args = process.argv.slice(2)
const slug = args.find(arg => !arg.startsWith('--'))
const stdoutMode = args.includes('--stdout')
const force = args.includes('--force')
const outArg = args.find(arg => arg.startsWith('--out='))

if (!slug) {
  console.error(usage)
  process.exit(1)
}

const candidateSongDocPath = resolveIfExists(`reference/song-publish-candidates/songdocs/${slug}.json`)
const publicSongDocPath = resolveIfExists(`data/kuailepu/${slug}.json`)
const sanityPath = resolveIfExists(`reference/song-publish-candidates/source-sanity/${slug}.json`)

if (!candidateSongDocPath && !publicSongDocPath) {
  console.error(`SongDoc not found for slug: ${slug}`)
  process.exit(1)
}

if (!sanityPath) {
  console.error(`Source sanity report not found for slug: ${slug}`)
  process.exit(1)
}

const songDoc = readJson<SongDoc>(candidateSongDocPath ?? publicSongDocPath!)
const sanity = readJson<SourceSanityReport>(sanityPath)
const title = songDoc.title ?? sanity.source?.title ?? slug
const output = renderTemplate({
  slug,
  title,
  composer: sanity.source?.composer ?? null,
  sourceFile: sanity.source?.sourceFile ?? null,
  openingLyrics: sanity.preview?.openingLyricsLines ?? [],
  openingNotes: sanity.preview?.openingLetterNotes ?? [],
  suggestedQueries: sanity.suggestedSearchQueries ?? [],
  sanityIssues: sanity.issues ?? []
})

if (stdoutMode) {
  process.stdout.write(output)
  process.exit(0)
}

const outputPath = path.resolve(
  process.cwd(),
  outArg?.slice('--out='.length) || `${DEFAULT_OUT_DIR}/${slug}.md`
)

if (fs.existsSync(outputPath) && !force) {
  console.error(
    `Review note already exists: ${path.relative(process.cwd(), outputPath)}\nUse --force to overwrite or --stdout to print the template.`
  )
  process.exit(1)
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, output, 'utf8')
console.log(`Wrote review note template to ${path.relative(process.cwd(), outputPath)}`)

function renderTemplate(input: {
  slug: string
  title: string
  composer: string | null
  sourceFile: string | null
  openingLyrics: string[]
  openingNotes: string[]
  suggestedQueries: string[]
  sanityIssues: Array<{
    code?: string
    severity?: string
    message?: string
  }>
}) {
  const today = new Date().toISOString().slice(0, 10)
  const lines: string[] = []

  lines.push(`# External Review: ${input.title}`)
  lines.push('')
  lines.push(`- Date: \`${today}\``)
  lines.push(`- Slug: \`${input.slug}\``)
  lines.push(`- Title: ${input.title}`)
  lines.push(`- Composer / attribution: ${input.composer || 'TBD'}`)
  lines.push(`- Source file: ${input.sourceFile || 'TBD'}`)
  lines.push(`- Reviewer:`)
  lines.push(`- Decision: pending`)
  lines.push('')
  lines.push('## Candidate Preview')
  lines.push('')
  if (input.openingLyrics.length > 0) {
    lines.push(`- Opening lyrics: ${input.openingLyrics.join(' / ')}`)
  } else {
    lines.push('- Opening lyrics: none extracted')
  }
  if (input.openingNotes.length > 0) {
    lines.push(`- Opening notes: ${input.openingNotes.join(' ')}`)
  } else {
    lines.push('- Opening notes: unavailable')
  }
  if (input.sanityIssues.length > 0) {
    lines.push('- Automatic flags:')
    input.sanityIssues.forEach(issue => {
      const code = issue.code || 'unknown'
      const severity = issue.severity || 'unknown'
      const message = issue.message || ''
      lines.push(`  - [${severity}] ${code}: ${message}`)
    })
  } else {
    lines.push('- Automatic flags: none')
  }
  lines.push('')
  lines.push('## References Checked')
  lines.push('')
  lines.push('- 1.')
  lines.push('- 2.')
  lines.push('- 3.')
  lines.push('')
  lines.push('## Required Checks')
  lines.push('')
  lines.push('- Title / attribution match:')
  lines.push('- Opening lyric match:')
  lines.push('- Opening melody contour match:')
  lines.push('- Starts at main tune instead of bridge / coda / fragment:')
  lines.push('- Remaining risk or variant note:')
  lines.push('')
  lines.push('## Suggested Search Queries')
  lines.push('')
  if (input.suggestedQueries.length > 0) {
    input.suggestedQueries.forEach(query => {
      lines.push(`- ${query}`)
    })
  } else {
    lines.push('- Add queries here.')
  }
  lines.push('')
  lines.push('## Publish Decision')
  lines.push('')
  lines.push('- Approved for publication: no / yes')
  lines.push('- If no, what must be fixed first:')
  lines.push('- If yes, what aliases / SEO notes matter:')
  lines.push('')

  return `${lines.join('\n')}\n`
}

function resolveIfExists(relativePath: string) {
  const absolutePath = path.resolve(process.cwd(), relativePath)
  return fs.existsSync(absolutePath) ? absolutePath : null
}

function readJson<T>(absolutePath: string) {
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8')) as T
}
