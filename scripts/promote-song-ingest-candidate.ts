import fs from 'node:fs'
import path from 'node:path'
import type { KuailepuRuntimePayload } from '../src/lib/kuailepu/runtime.ts'
import {
  hasResolvedRuntimeBpmDirective,
  readResolvedRuntimeBpm,
  readSongIngestRuntimeMetadata
} from '../src/lib/songbook/songIngestRuntimeMetadata.ts'
import {
  SONG_INGEST_REVIEW_LOG_PATH,
  summarizeSongIngestReviewLogClearance
} from './lib/song-ingest-review-log.ts'

type CliOptions = {
  slugs: string[]
  runtimeDir: string
  songDocDir: string
  targetRuntimeDir: string
  targetSongDocDir: string
  force: boolean
}

const DEFAULT_CANDIDATE_RUNTIME_DIR = 'reference/song-publish-candidates/runtime'
const DEFAULT_CANDIDATE_SONGDOC_DIR = 'reference/song-publish-candidates/songdocs'
const DEFAULT_CANDIDATE_REPORT_DIR = 'reference/song-publish-candidates/reports'
const DEFAULT_CANDIDATE_SANITY_DIR = 'reference/song-publish-candidates/source-sanity'
const DEFAULT_REVIEW_NOTE_DIR = 'reference/song-publish-candidates/review-notes'
const DEFAULT_TARGET_RUNTIME_DIR = 'data/kuailepu-runtime'
const DEFAULT_TARGET_SONGDOC_DIR = 'data/kuailepu'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/promote-song-ingest-candidate.ts <slug...> [--runtime-dir=${DEFAULT_CANDIDATE_RUNTIME_DIR}] [--songdoc-dir=${DEFAULT_CANDIDATE_SONGDOC_DIR}] [--target-runtime-dir=${DEFAULT_TARGET_RUNTIME_DIR}] [--target-songdoc-dir=${DEFAULT_TARGET_SONGDOC_DIR}] [--force=true]`

const options = parseArgs(process.argv.slice(2))

if (!options) {
  console.error(usage)
  process.exit(1)
}

const promoted: string[] = []

for (const slug of options.slugs) {
  assertPromotable(slug, options)

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
    targetSongDocDir: values.get('target-songdoc-dir') || DEFAULT_TARGET_SONGDOC_DIR,
    force: values.get('force') === 'true'
  }
}

function assertPromotable(slug: string, options: CliOptions) {
  if (options.force) {
    return
  }

  const runtimeSource = path.resolve(process.cwd(), options.runtimeDir, `${slug}.json`)
  const songDocSource = path.resolve(process.cwd(), options.songDocDir, `${slug}.json`)
  const reportPath = path.resolve(process.cwd(), DEFAULT_CANDIDATE_REPORT_DIR, `${slug}-report.json`)
  const sanityPath = path.resolve(process.cwd(), DEFAULT_CANDIDATE_SANITY_DIR, `${slug}.json`)

  const problems: string[] = []

  if (!fs.existsSync(runtimeSource)) {
    problems.push(`Missing candidate runtime JSON: ${path.relative(process.cwd(), runtimeSource)}`)
  }
  if (!fs.existsSync(songDocSource)) {
    problems.push(`Missing candidate SongDoc: ${path.relative(process.cwd(), songDocSource)}`)
  }
  if (!fs.existsSync(reportPath)) {
    problems.push(`Missing candidate report: ${path.relative(process.cwd(), reportPath)}`)
  }
  if (!fs.existsSync(sanityPath)) {
    problems.push(`Missing source sanity report: ${path.relative(process.cwd(), sanityPath)}`)
  }

  const reviewClearance = getPromotionReviewClearance(slug, songDocSource)
  if (!reviewClearance.ok) {
    problems.push(
      reviewClearance.reason ||
        `Missing external review evidence for ${slug}. Record review in ${SONG_INGEST_REVIEW_LOG_PATH}, or add a legacy review note under ${DEFAULT_REVIEW_NOTE_DIR}/ and mark it approved, or update the candidate SongDoc review status to verified with a non-default review summary.`
    )
  }

  if (fs.existsSync(runtimeSource)) {
    const runtimePayload = JSON.parse(fs.readFileSync(runtimeSource, 'utf8')) as KuailepuRuntimePayload
    const runtimeMetadata = readSongIngestRuntimeMetadata(runtimePayload)
    const runtimeAudit = runtimeMetadata.runtimeFingeringAudit
    if (runtimeAudit?.status !== 'optimized') {
      problems.push(
        `Candidate runtime fingering audit is not optimized for ${slug}; rerun the candidate generation or npm run optimize:runtime-fingerings -- ${slug}.`
      )
    }
    if (!hasResolvedRuntimeBpmDirective(runtimePayload)) {
      problems.push(
        `Candidate runtime notation is missing a resolved {bpm:...} directive: ${path.relative(process.cwd(), runtimeSource)}`
      )
    }
    if (!readResolvedRuntimeBpm(runtimePayload)) {
      problems.push(
        `Candidate runtime BPM is missing or invalid: ${path.relative(process.cwd(), runtimeSource)}`
      )
    }
  }

  if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
      hcConsistency?: {
        status?: 'ok' | 'review' | 'warning'
        warnings?: string[]
      }
    }

    if (!report.hcConsistency?.status) {
      problems.push(
        `Candidate report is missing hcConsistency status: ${path.relative(process.cwd(), reportPath)}`
      )
    } else if (report.hcConsistency.status === 'warning') {
      problems.push(
        `HC consistency is warning for ${slug}: ${(report.hcConsistency.warnings ?? []).join(' | ') || 'see candidate report'}`
      )
    }
  }

  if (fs.existsSync(sanityPath)) {
    const sanity = JSON.parse(fs.readFileSync(sanityPath, 'utf8')) as {
      summary?: {
        status?: 'pass' | 'review'
      }
    }

    if (!sanity.summary?.status) {
      problems.push(
        `Source sanity summary is missing: ${path.relative(process.cwd(), sanityPath)}`
      )
    }
  }

  if (problems.length > 0) {
    throw new Error(
      [
        `Refusing to promote ${slug} because the candidate has not cleared the required ingest gates.`,
        ...problems.map(problem => `- ${problem}`),
        'Run `npm run doctor:song-ingest -- <slug>` for the full readiness summary, or rerun with `--force=true` only if you are intentionally overriding the gate.'
      ].join('\n')
    )
  }
}

function getPromotionReviewClearance(slug: string, songDocPath: string) {
  const reviewLogClearance = summarizeSongIngestReviewLogClearance(slug)
  if (reviewLogClearance.ok) {
    return {
      ok: true,
      reason: null
    }
  }

  if (reviewLogClearance.entry && reviewLogClearance.reason) {
    return {
      ok: false,
      reason: reviewLogClearance.reason
    }
  }

  const exactReviewNotePath = path.resolve(process.cwd(), DEFAULT_REVIEW_NOTE_DIR, `${slug}.md`)
  if (fs.existsSync(exactReviewNotePath)) {
    const text = fs.readFileSync(exactReviewNotePath, 'utf8')
    const decisionMatch = text.match(/^- Decision:\s*(.+)$/m)
    const approvedMatch = text.match(/^- Approved for publication:\s*(.+)$/m)
    const decision = decisionMatch?.[1]?.trim().toLowerCase() ?? ''
    const approved = approvedMatch?.[1]?.trim().toLowerCase() ?? ''

    if (!decision || decision === 'pending') {
      return {
        ok: false,
        reason: `Review note exists but Decision is still pending: ${path.relative(process.cwd(), exactReviewNotePath)}`
      }
    }

    if (!/\byes\b/.test(approved)) {
      return {
        ok: false,
        reason: `Review note exists but is not marked approved for publication: ${path.relative(process.cwd(), exactReviewNotePath)}`
      }
    }

    return {
      ok: true,
      reason: null
    }
  }

  if (!fs.existsSync(songDocPath)) {
    return {
      ok: false,
      reason: `Candidate SongDoc is missing, so promotion review status cannot be confirmed for ${slug}.`
    }
  }

  const songDoc = JSON.parse(fs.readFileSync(songDocPath, 'utf8')) as {
    review?: {
      status?: 'verified' | 'pending'
      note?: string
    }
  }
  const note = songDoc.review?.note?.trim() ?? ''

  if (songDoc.review?.status === 'verified') {
    return {
      ok: true,
      reason: null
    }
  }

  if (
    note &&
    note !==
      'Synthetic runtime compatibility candidate. Compare against the source MusicXML and an existing verified song before publication.'
  ) {
    return {
      ok: false,
      reason: `Candidate SongDoc review note exists but status is not verified for ${slug}; set review.status to verified only after external review actually passes.`
    }
  }

  return {
    ok: false,
    reason: `No approval-grade external review record found for ${slug}. Prefer recording it in ${SONG_INGEST_REVIEW_LOG_PATH}; legacy markdown review notes under ${DEFAULT_REVIEW_NOTE_DIR}/${slug}.md are still accepted.`
  }
}
