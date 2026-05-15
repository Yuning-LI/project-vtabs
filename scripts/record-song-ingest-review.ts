import fs from 'node:fs'
import path from 'node:path'
import {
  readSongIngestReviewLog,
  writeSongIngestReviewLog,
  type SongIngestReviewLogEntry
} from './lib/song-ingest-review-log.ts'

type CliOptions = {
  slug: string
  status: SongIngestReviewLogEntry['status']
  approve: boolean
  refs: string[]
  summary: string
  checkedOn: string
  titleMatch?: SongIngestReviewLogEntry['titleMatch']
  openingLyricsMatch?: SongIngestReviewLogEntry['openingLyricsMatch']
  openingMelodyMatch?: SongIngestReviewLogEntry['openingMelodyMatch']
  startsAtMainTune?: SongIngestReviewLogEntry['startsAtMainTune']
  issues: string[]
}

const usage =
  'Usage: npm run record:song-ingest-review -- <slug> --status=verified|hold|pending --approve=true|false --refs=Wikipedia,MuseScore --summary="..." [--checked-on=2026-05-15] [--title-match=exact|variant|unknown] [--opening-lyrics-match=exact|variant|no-lyrics|unknown] [--opening-melody-match=exact|approximate|unknown] [--starts-at-main-tune=yes|no|unknown] [--issues=item1|item2]'

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const log = readSongIngestReviewLog()
const entry: SongIngestReviewLogEntry = {
  slug: options.slug,
  status: options.status,
  approvedForPublication: options.approve,
  checkedOn: options.checkedOn,
  references: options.refs,
  summary: options.summary,
  titleMatch: options.titleMatch,
  openingLyricsMatch: options.openingLyricsMatch,
  openingMelodyMatch: options.openingMelodyMatch,
  startsAtMainTune: options.startsAtMainTune,
  issues: options.issues.length > 0 ? options.issues : undefined
}

log.entries[options.slug] = entry
log.updatedAt = new Date().toISOString()
writeSongIngestReviewLog(log)
syncSongDocReview(options.slug, entry)

console.log(
  JSON.stringify(
    {
      ok: true,
      slug: options.slug,
      review: entry
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

  const slug = positional[0]
  const statusValue = values.get('status')
  const summary = values.get('summary')?.trim() ?? ''
  if (!slug || !statusValue || !summary) {
    return null
  }

  if (!['pending', 'hold', 'verified'].includes(statusValue)) {
    throw new Error(`Unsupported review status: ${statusValue}`)
  }

  return {
    slug,
    status: statusValue as SongIngestReviewLogEntry['status'],
    approve: values.get('approve') === 'true',
    refs: splitList(values.get('refs')),
    summary,
    checkedOn: values.get('checked-on') || new Date().toISOString().slice(0, 10),
    titleMatch: asOptionalEnum(values.get('title-match'), ['exact', 'variant', 'unknown']),
    openingLyricsMatch: asOptionalEnum(values.get('opening-lyrics-match'), [
      'exact',
      'variant',
      'no-lyrics',
      'unknown'
    ]),
    openingMelodyMatch: asOptionalEnum(values.get('opening-melody-match'), [
      'exact',
      'approximate',
      'unknown'
    ]),
    startsAtMainTune: asOptionalEnum(values.get('starts-at-main-tune'), ['yes', 'no', 'unknown']),
    issues: splitList(values.get('issues'), '|')
  }
}

function splitList(value: string | undefined, separator = ',') {
  return String(value || '')
    .split(separator)
    .map(item => item.trim())
    .filter(Boolean)
}

function asOptionalEnum<T extends string>(value: string | undefined, allowed: T[]) {
  if (!value) {
    return undefined
  }
  if (!allowed.includes(value as T)) {
    throw new Error(`Unsupported value: ${value}. Expected one of ${allowed.join(', ')}`)
  }
  return value as T
}

function syncSongDocReview(slug: string, entry: SongIngestReviewLogEntry) {
  const targets = [
    path.resolve(process.cwd(), 'reference/song-publish-candidates/songdocs', `${slug}.json`),
    path.resolve(process.cwd(), 'data/kuailepu', `${slug}.json`)
  ]

  targets.forEach(targetPath => {
    if (!fs.existsSync(targetPath)) {
      return
    }

    const songDoc = JSON.parse(fs.readFileSync(targetPath, 'utf8')) as {
      review?: {
        status?: 'verified' | 'pending'
        checkedOn?: string
        note?: string
      }
    }
    songDoc.review = {
      status: entry.status === 'verified' && entry.approvedForPublication ? 'verified' : 'pending',
      checkedOn: entry.checkedOn,
      note: buildSongDocReviewNote(entry)
    }
    fs.writeFileSync(targetPath, `${JSON.stringify(songDoc, null, 2)}\n`, 'utf8')
  })
}

function buildSongDocReviewNote(entry: SongIngestReviewLogEntry) {
  const refsText = entry.references.length > 0 ? `Refs: ${entry.references.join(', ')}. ` : ''
  const issuesText = entry.issues && entry.issues.length > 0 ? `Issues: ${entry.issues.join(' | ')}. ` : ''
  return `${refsText}${entry.summary}${issuesText}`.trim()
}
