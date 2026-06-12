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
  getSongIngestReviewLogEntry
} from './lib/song-ingest-review-log.ts'

type SongDoc = {
  id?: string
  slug?: string
  title?: string
  published?: boolean
  review?: {
    status?: 'verified' | 'pending'
    checkedOn?: string
    note?: string
  }
  source?: {
    note?: string
  }
}

type SourceSanityReport = {
  source?: {
    kind?: string
    title?: string
    composer?: string | null
    sourceFile?: string | null
  }
  preview?: {
    openingLyricsLines?: string[]
    openingLetterNotes?: string[]
  }
  summary?: {
    status?: 'pass' | 'review'
    highestSeverity?: 'error' | 'warning' | 'info' | 'none'
    issueCount?: number
  }
  issues?: Array<{
    code?: string
    severity?: 'error' | 'warning' | 'info'
    message?: string
  }>
  suggestedSearchQueries?: string[]
}

type IngestReport = {
  title?: string
  source?: {
    draft?: string
    kind?: string
  }
  generation?: {
    sourceKeynote?: string
    targetKeynote?: string
    selectedTranspose?: number
    selectedTransposeSource?: string
    templateSlug?: string
  }
  hcConsistency?: {
    status?: 'ok' | 'review' | 'warning'
    warnings?: string[]
  }
}

type ManifestEntry = {
  slug?: string
  published?: boolean
  family?: string
}

type SeoProfile = {
  aliases?: string[]
  searchTerms?: string[]
  metaTitle?: string
  metaDescription?: string
}

type DoctorRow = {
  slug: string
  title: string | null
  sourceKind: string | null
  pipelineStage:
    | 'blocked'
    | 'review-needed'
    | 'ready-to-promote'
    | 'publish-layer-incomplete'
    | 'ready-to-publish'
    | 'published'
  files: {
    draft: string | null
    candidateRuntime: string | null
    candidateSongDoc: string | null
    candidateReport: string | null
    candidateSanity: string | null
    publicRuntime: string | null
    publicSongDoc: string | null
  }
  automaticChecks: {
    candidateArtifactsComplete: boolean
    runtimeFingeringAudit: {
      status: 'optimized' | 'pending' | 'missing'
      rulesVersion: string | null
    }
    runtimeTempo: {
      bpmDirectivePresent: boolean
      bpm: number | null
    }
    hcConsistency: {
      status: 'ok' | 'review' | 'warning' | 'missing'
      warnings: string[]
    }
    sourceSanity: {
      status: 'pass' | 'review' | 'missing'
      highestSeverity: 'error' | 'warning' | 'info' | 'none' | 'missing'
      issueCount: number
      issueCodes: string[]
    }
  }
  externalReview: {
    recorded: boolean
    clearedForPromotion: boolean
    clearanceReason: string | null
    reviewLogRecorded: boolean
    reviewNoteFiles: string[]
    candidateSongDocReview: ReviewSummary | null
    publicSongDocReview: ReviewSummary | null
    suggestedQueries: string[]
  }
  publicationLayer: {
    promotedToDataLayer: boolean
    manifestEntry: {
      exists: boolean
      published: boolean
      family: string | null
    }
    seoProfile: {
      exists: boolean
      aliasCount: number
      searchTermCount: number
      hasMetaTitle: boolean
      hasMetaDescription: boolean
    }
  }
  preview: {
    openingLyrics: string[]
    openingNotes: string[]
    sourceFile: string | null
  }
  nextSteps: string[]
}

type ReviewSummary = {
  status: 'verified' | 'pending' | 'unknown'
  checkedOn: string | null
  note: string | null
  countsAsEvidence: boolean
}

const usage =
  'Usage: npm run doctor:song-ingest -- <slug...> [--json]'

const args = process.argv.slice(2)
const jsonMode = args.includes('--json')
const slugs = args.filter(arg => !arg.startsWith('--'))

if (slugs.length === 0) {
  console.error(usage)
  process.exit(1)
}

const manifest = readJson<ManifestEntry[]>('data/songbook/public-song-manifest.json', [])
const seoProfiles = readJson<Record<string, SeoProfile>>('data/songbook/song-seo-profiles.json', {})
const rows = slugs.map(slug => inspectSlug(slug, manifest, seoProfiles))

if (jsonMode || rows.length > 1) {
  console.log(JSON.stringify(rows, null, 2))
  process.exit(0)
}

const row = rows[0]!
console.log(renderHumanSummary(row))

function inspectSlug(
  slug: string,
  manifest: ManifestEntry[],
  seoProfiles: Record<string, SeoProfile>
): DoctorRow {
  const files = {
    draft: existingPath(`reference/song-publish-candidates/drafts/${slug}.json`),
    candidateRuntime: existingPath(`reference/song-publish-candidates/runtime/${slug}.json`),
    candidateSongDoc: existingPath(`reference/song-publish-candidates/songdocs/${slug}.json`),
    candidateReport: existingPath(`reference/song-publish-candidates/reports/${slug}-report.json`),
    candidateSanity: existingPath(`reference/song-publish-candidates/source-sanity/${slug}.json`),
    publicRuntime: existingPath(`data/kuailepu-runtime/${slug}.json`),
    publicSongDoc: existingPath(`data/kuailepu/${slug}.json`)
  }

  const candidateSongDoc = files.candidateSongDoc ? readJson<SongDoc>(files.candidateSongDoc, null) : null
  const publicSongDoc = files.publicSongDoc ? readJson<SongDoc>(files.publicSongDoc, null) : null
  const candidateRuntime = files.candidateRuntime
    ? readJson<KuailepuRuntimePayload>(files.candidateRuntime, null)
    : null
  const sanity = files.candidateSanity
    ? readJson<SourceSanityReport>(files.candidateSanity, null)
    : null
  const report = files.candidateReport ? readJson<IngestReport>(files.candidateReport, null) : null

  const manifestEntry = manifest.find(entry => entry.slug === slug) ?? null
  const seoProfile = seoProfiles[slug] ?? null
  const reviewNoteFiles = findReviewNoteFiles(slug)
  const reviewLogEntry = getSongIngestReviewLogEntry(slug)
  const candidateReview = summarizeReview(candidateSongDoc?.review)
  const publicReview = summarizeReview(publicSongDoc?.review)
  const runtimeMetadata = candidateRuntime ? readSongIngestRuntimeMetadata(candidateRuntime) : {}
  const runtimeAuditStatus =
    runtimeMetadata.runtimeFingeringAudit?.status === 'optimized'
      ? 'optimized'
      : runtimeMetadata.runtimeFingeringAudit?.status === 'pending'
        ? 'pending'
        : 'missing'

  const automaticChecks = {
    candidateArtifactsComplete: Boolean(
      files.draft &&
        files.candidateRuntime &&
        files.candidateSongDoc &&
        files.candidateReport &&
        files.candidateSanity
    ),
    runtimeFingeringAudit: {
      status: runtimeAuditStatus,
      rulesVersion: runtimeMetadata.runtimeFingeringAudit?.rulesVersion ?? null
    },
    runtimeTempo: {
      bpmDirectivePresent: candidateRuntime ? hasResolvedRuntimeBpmDirective(candidateRuntime) : false,
      bpm: candidateRuntime ? readResolvedRuntimeBpm(candidateRuntime) : null
    },
    hcConsistency: {
      status: report?.hcConsistency?.status ?? 'missing',
      warnings: report?.hcConsistency?.warnings ?? []
    },
    sourceSanity: {
      status: sanity?.summary?.status ?? 'missing',
      highestSeverity: sanity?.summary?.highestSeverity ?? 'missing',
      issueCount: sanity?.summary?.issueCount ?? 0,
      issueCodes: (sanity?.issues ?? []).map(issue => issue.code).filter(isNonEmptyString)
    }
  } as const

  const externalReviewRecorded =
    Boolean(reviewLogEntry) ||
    reviewNoteFiles.length > 0 ||
    Boolean(candidateReview?.countsAsEvidence) ||
    Boolean(publicReview?.countsAsEvidence)
  const externalReviewClearance = getReviewClearance(slug, candidateSongDoc, publicSongDoc)

  const publicationLayer = {
    promotedToDataLayer: Boolean(files.publicRuntime && files.publicSongDoc),
    manifestEntry: {
      exists: Boolean(manifestEntry),
      published: Boolean(manifestEntry?.published),
      family: manifestEntry?.family ?? null
    },
    seoProfile: {
      exists: Boolean(seoProfile),
      aliasCount: seoProfile?.aliases?.length ?? 0,
      searchTermCount: seoProfile?.searchTerms?.length ?? 0,
      hasMetaTitle: Boolean(seoProfile?.metaTitle),
      hasMetaDescription: Boolean(seoProfile?.metaDescription)
    }
  }

  const title =
    candidateSongDoc?.title ??
    publicSongDoc?.title ??
    sanity?.source?.title ??
    report?.title ??
    null

  const stage = resolvePipelineStage({
    automaticChecks,
    externalReviewCleared: externalReviewClearance.ok,
    publicationLayer,
    manifestPublished: Boolean(manifestEntry?.published),
    publicSongPublished: Boolean(publicSongDoc?.published)
  })

  return {
    slug,
    title,
    sourceKind: sanity?.source?.kind ?? report?.source?.kind ?? inferSourceKind(candidateSongDoc, publicSongDoc),
    pipelineStage: stage,
    files,
    automaticChecks,
    externalReview: {
      recorded: externalReviewRecorded,
      clearedForPromotion: externalReviewClearance.ok,
      clearanceReason: externalReviewClearance.reason,
      reviewLogRecorded: Boolean(reviewLogEntry),
      reviewNoteFiles,
      candidateSongDocReview: candidateReview,
      publicSongDocReview: publicReview,
      suggestedQueries: sanity?.suggestedSearchQueries ?? []
    },
    publicationLayer,
    preview: {
      openingLyrics: sanity?.preview?.openingLyricsLines ?? [],
      openingNotes: sanity?.preview?.openingLetterNotes ?? [],
      sourceFile: sanity?.source?.sourceFile ?? report?.source?.draft ?? null
    },
    nextSteps: buildNextSteps({
      slug,
      automaticChecks,
      externalReviewCleared: externalReviewClearance.ok,
      publicationLayer,
      manifestEntryExists: Boolean(manifestEntry),
      seoProfileExists: Boolean(seoProfile),
      manifestPublished: Boolean(manifestEntry?.published),
      publicSongPublished: Boolean(publicSongDoc?.published)
    })
  }
}

function buildNextSteps(input: {
  slug: string
  automaticChecks: DoctorRow['automaticChecks']
  externalReviewCleared: boolean
  publicationLayer: DoctorRow['publicationLayer']
  manifestEntryExists: boolean
  seoProfileExists: boolean
  manifestPublished: boolean
  publicSongPublished: boolean
}) {
  if (input.publicSongPublished && input.manifestPublished) {
    return ['Song is already published; only rerun publish checks if the runtime/songdoc changed again.']
  }

  const steps: string[] = []

  if (!input.automaticChecks.candidateArtifactsComplete) {
    steps.push(
      `Generate the missing candidate artifacts for ${input.slug}: draft, runtime, songdoc, report, and source-sanity.`
    )
  }

  if (input.automaticChecks.hcConsistency.status === 'warning') {
    steps.push('Fix the ingest/converter issue until HC consistency is no longer in warning status.')
  }

  if (input.automaticChecks.runtimeFingeringAudit.status !== 'optimized') {
    steps.push(
      `Rerun candidate generation or npm run optimize:runtime-fingerings -- ${input.slug} so runtime fingering pruning definitely uses the current public rules.`
    )
  }

  if (
    !input.automaticChecks.runtimeTempo.bpmDirectivePresent ||
    !input.automaticChecks.runtimeTempo.bpm
  ) {
    steps.push(
      `Regenerate ${input.slug} with a resolved BPM so runtime notation contains {bpm:...} and the payload has a valid bpm value.`
    )
  }

  if (!input.externalReviewCleared) {
    steps.push(
      `Run npm run record:song-ingest-review -- ${input.slug} --status=verified --approve=true --refs=Wikipedia,MuseScore --summary="External review passed." after the mandatory external melody/version review.`
    )
  }

  if (!input.publicationLayer.promotedToDataLayer && input.externalReviewCleared) {
    steps.push(`Promote the candidate into data/ with npm run promote:song-ingest-candidate -- ${input.slug}.`)
  }

  if (input.publicationLayer.promotedToDataLayer && !input.manifestEntryExists) {
    steps.push('Add the song to data/songbook/public-song-manifest.json before publication.')
  }

  if (input.publicationLayer.promotedToDataLayer && !input.seoProfileExists) {
    steps.push('Add a song SEO profile with aliases, search terms, metadata, and FAQ copy.')
  }

  if (
    input.publicationLayer.promotedToDataLayer &&
    input.manifestEntryExists &&
    input.seoProfileExists &&
    !input.manifestPublished
  ) {
    steps.push(`Run npm run publish:song-ingest-candidate -- ${input.slug}.`)
  }

  return dedupe(steps)
}

function resolvePipelineStage(input: {
  automaticChecks: DoctorRow['automaticChecks']
  externalReviewCleared: boolean
  publicationLayer: DoctorRow['publicationLayer']
  manifestPublished: boolean
  publicSongPublished: boolean
}): DoctorRow['pipelineStage'] {
  if (input.publicationLayer.promotedToDataLayer && input.manifestPublished && input.publicSongPublished) {
    return 'published'
  }

  if (
    !input.automaticChecks.candidateArtifactsComplete ||
    input.automaticChecks.hcConsistency.status === 'warning' ||
    input.automaticChecks.runtimeFingeringAudit.status !== 'optimized' ||
    !input.automaticChecks.runtimeTempo.bpmDirectivePresent ||
    !input.automaticChecks.runtimeTempo.bpm
  ) {
    return 'blocked'
  }

  if (!input.externalReviewCleared) {
    return 'review-needed'
  }

  if (!input.publicationLayer.promotedToDataLayer) {
    return 'ready-to-promote'
  }

  if (
    !input.publicationLayer.manifestEntry.exists ||
    !input.publicationLayer.seoProfile.exists
  ) {
    return 'publish-layer-incomplete'
  }

  return 'ready-to-publish'
}

function summarizeReview(review: SongDoc['review'] | undefined): ReviewSummary | null {
  if (!review) return null

  const note = normalizeNullableString(review.note)
  const status = review.status ?? 'unknown'

  return {
    status,
    checkedOn: normalizeNullableString(review.checkedOn),
    note,
    countsAsEvidence:
      status === 'verified' ||
      (Boolean(note) && !isDefaultReviewNote(note))
  }
}

function getReviewClearance(
  slug: string,
  candidateSongDoc: SongDoc | null,
  publicSongDoc: SongDoc | null
) {
  const reviewLogEntry = getSongIngestReviewLogEntry(slug)
  if (reviewLogEntry) {
    if (reviewLogEntry.status !== 'verified') {
      return {
        ok: false,
        reason: `Review log exists but status is ${reviewLogEntry.status}: ${SONG_INGEST_REVIEW_LOG_PATH}`
      }
    }
    if (!reviewLogEntry.approvedForPublication) {
      return {
        ok: false,
        reason: `Review log exists but approvedForPublication=false: ${SONG_INGEST_REVIEW_LOG_PATH}`
      }
    }
    return {
      ok: true,
      reason: null
    }
  }

  const exactReviewNotePath = path.resolve(
    process.cwd(),
    'reference/song-publish-candidates/review-notes',
    `${slug}.md`
  )

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

  const candidateReview = summarizeReview(candidateSongDoc?.review)
  if (candidateReview?.status === 'verified') {
    return {
      ok: true,
      reason: null
    }
  }

  const publicReview = summarizeReview(publicSongDoc?.review)
  if (publicReview?.status === 'verified') {
    return {
      ok: true,
      reason: null
    }
  }

  return {
    ok: false,
    reason: 'No approval-grade external review record found yet.'
  }
}

function isDefaultReviewNote(note: string) {
  const normalized = note.trim()

  return [
    'Synthetic runtime compatibility candidate. Compare against the source MusicXML and an existing verified song before publication.',
    'Imported from an authorized runtime detail page and normalized into the current lightweight renderer. Manual melody review is still required before publication.'
  ].includes(normalized)
}

function inferSourceKind(candidateSongDoc: SongDoc | null, publicSongDoc: SongDoc | null) {
  const sourceNote = `${candidateSongDoc?.source?.note ?? ''} ${publicSongDoc?.source?.note ?? ''}`.toLowerCase()
  if (sourceNote.includes('songingestdraft') || sourceNote.includes('musicxml ingest pipeline')) {
    return 'musicxml'
  }
  if (sourceNote.includes('kuailepu')) {
    return 'kuailepu'
  }
  return null
}

function findReviewNoteFiles(slug: string) {
  const reviewDir = path.resolve(process.cwd(), 'reference/song-publish-candidates/review-notes')
  if (!fs.existsSync(reviewDir)) return []

  const matched: string[] = []

  for (const file of fs.readdirSync(reviewDir)) {
    if (!/\.(md|json)$/i.test(file) || file.startsWith('_')) {
      continue
    }

    const absolutePath = path.join(reviewDir, file)
    const relativePath = path.relative(process.cwd(), absolutePath)
    const lowerFileName = file.toLowerCase()

    if (lowerFileName.includes(slug.toLowerCase())) {
      matched.push(relativePath)
      continue
    }

    const text = fs.readFileSync(absolutePath, 'utf8')
    if (
      text.includes(`\`${slug}\``) ||
      text.includes(`/${slug}.json`) ||
      text.includes(` ${slug}`) ||
      text.includes(`${slug}\n`)
    ) {
      matched.push(relativePath)
    }
  }

  return matched.sort()
}

function renderHumanSummary(row: DoctorRow) {
  const lines: string[] = []

  lines.push(`slug: ${row.slug}`)
  lines.push(`title: ${row.title ?? '(unknown)'}`)
  lines.push(`stage: ${row.pipelineStage}`)
  lines.push(`source: ${row.sourceKind ?? '(unknown)'}`)
  lines.push('')
  lines.push('candidate files:')
  lines.push(`- draft: ${renderPresence(row.files.draft)}`)
  lines.push(`- candidate runtime: ${renderPresence(row.files.candidateRuntime)}`)
  lines.push(`- candidate songdoc: ${renderPresence(row.files.candidateSongDoc)}`)
  lines.push(`- candidate report: ${renderPresence(row.files.candidateReport)}`)
  lines.push(`- candidate sanity: ${renderPresence(row.files.candidateSanity)}`)
  lines.push('')
  lines.push('automatic checks:')
  lines.push(`- candidate artifacts complete: ${String(row.automaticChecks.candidateArtifactsComplete)}`)
  lines.push(`- runtime fingering audit: ${row.automaticChecks.runtimeFingeringAudit.status}`)
  lines.push(
    `- runtime bpm: ${row.automaticChecks.runtimeTempo.bpm ?? '(missing)'}; directive present: ${String(row.automaticChecks.runtimeTempo.bpmDirectivePresent)}`
  )
  lines.push(`- hc consistency: ${row.automaticChecks.hcConsistency.status}`)
  lines.push(`- source sanity: ${row.automaticChecks.sourceSanity.status}`)

  if (row.automaticChecks.sourceSanity.issueCodes.length > 0) {
    lines.push(`- sanity issues: ${row.automaticChecks.sourceSanity.issueCodes.join(', ')}`)
  }

  lines.push('')
  lines.push('external review:')
  lines.push(`- recorded: ${String(row.externalReview.recorded)}`)
  lines.push(`- cleared for promotion: ${String(row.externalReview.clearedForPromotion)}`)
  lines.push(`- review log: ${String(row.externalReview.reviewLogRecorded)} (${SONG_INGEST_REVIEW_LOG_PATH})`)
  if (row.externalReview.clearanceReason) {
    lines.push(`- clearance note: ${row.externalReview.clearanceReason}`)
  }
  if (row.externalReview.reviewNoteFiles.length > 0) {
    lines.push(`- review note files: ${row.externalReview.reviewNoteFiles.join(', ')}`)
  }
  if (row.externalReview.suggestedQueries.length > 0) {
    lines.push(`- suggested queries: ${row.externalReview.suggestedQueries.join(' | ')}`)
  }

  lines.push('')
  lines.push('publication layer:')
  lines.push(`- promoted to data/: ${String(row.publicationLayer.promotedToDataLayer)}`)
  lines.push(`- manifest entry: ${String(row.publicationLayer.manifestEntry.exists)}`)
  lines.push(`- SEO profile: ${String(row.publicationLayer.seoProfile.exists)}`)

  if (row.nextSteps.length > 0) {
    lines.push('')
    lines.push('next steps:')
    row.nextSteps.forEach(step => {
      lines.push(`- ${step}`)
    })
  }

  return `${lines.join('\n')}\n`
}

function renderPresence(filePath: string | null) {
  return filePath ? `yes (${filePath})` : 'no'
}

function existingPath(relativePath: string) {
  const absolutePath = path.resolve(process.cwd(), relativePath)
  return fs.existsSync(absolutePath) ? relativePath : null
}

function readJson<T>(filePath: string, fallback: T): T {
  const absolutePath = path.resolve(process.cwd(), filePath)
  if (!fs.existsSync(absolutePath)) {
    return fallback
  }

  return JSON.parse(fs.readFileSync(absolutePath, 'utf8')) as T
}

function normalizeNullableString(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function dedupe(values: string[]) {
  return [...new Set(values)]
}
