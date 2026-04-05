import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { allSongCatalog, songCatalog } from './catalog'
import { publicSongManifest, getPublicSongManifestEntry } from './publicManifest'
import { getSongSeoProfileEntry, songSeoProfiles } from './seoProfiles'
import type { PublicSongFamily, SongDoc } from './types'

type CompactSongDoc = SongDoc & {
  review?: {
    status?: 'verified' | 'pending'
    checkedOn?: string
    note?: string
  }
}

type CandidateWorkflowStatus =
  | 'queued'
  | 'hold'
  | 'blocked'
  | 'reference-only'
  | 'duplicate'
  | 'imported-public'

type CandidateStatusReason =
  | 'already-public'
  | 'no-public-instruments'
  | 'ambiguous-identity'
  | 'unclear-identity'
  | 'copyright-risk'
  | 'traffic-reference-only'
  | 'duplicate-title'
  | 'unknown'

type CandidatePoolEntry = {
  href?: string
  songName?: string
  aliasName?: string
  searchResultTitle?: string
  candidateEnglishTitle?: string
  canonicalWesternTitle?: string
  publicTitle?: string
  existingPublicSlug?: string
  recommendedTitle?: string
  recommendedSlug?: string
  status?: string
  workflowStatus?: string
  statusReason?: string
  screeningDecision?: string
  rightsRisk?: string
  sourceSongUuid?: string
  lastCheckedOn?: string
  nextAction?: string
  supportsPublicInstruments?: boolean
  notes?: string
}

export type ImportDashboardSongRow = {
  id: string
  slug: string
  title: string
  sourceUrl: string | null
  sourceSongUuid: string | null
  family: PublicSongFamily | null
  isPublic: boolean
  isImportBacked: boolean
  hasManifest: boolean
  hasSeoProfile: boolean
  hasRuntimeRaw: boolean
  hasCompactDoc: boolean
  hasReferenceRaw: boolean
  reviewStatus: 'verified' | 'pending' | 'unknown'
  reviewCheckedOn: string | null
  importedOn: string | null
  issueFlags: string[]
}

export type ImportDashboardCandidateRow = {
  href: string
  sourceSongUuid: string | null
  songName: string
  aliasName: string | null
  searchResultTitle: string | null
  currentSlug: string | null
  publicTitle: string | null
  recommendedTitle: string | null
  recommendedSlug: string | null
  status: string | null
  workflowStatus: CandidateWorkflowStatus
  statusReason: CandidateStatusReason
  rightsRisk: string | null
  nextAction: string | null
  lastCheckedOn: string | null
  supportsPublicInstruments: boolean | null
  notes: string | null
  isCurrentlyPublic: boolean
}

export type SongImportDashboardData = {
  summary: {
    publicSongs: number
    allSongs: number
    publicManifestEntries: number
    seoProfiles: number
    runtimeRaw: number
    compactDocs: number
    referenceRaw: number
    importBackedPublicSongs: number
    pendingReview: number
    releaseIssues: number
  }
  git: {
    statusShortBranch: string
    unpushedCommits: string[]
  }
  songs: ImportDashboardSongRow[]
  recentImports: ImportDashboardSongRow[]
  candidatePool: {
    generatedOn: string | null
    nextStep: string | null
    summary: Record<string, number | string> | null
    workflowSummary: Partial<Record<CandidateWorkflowStatus, number>>
    reasonSummary: Partial<Record<CandidateStatusReason, number>>
    nextImportCandidates: ImportDashboardCandidateRow[]
    rows: ImportDashboardCandidateRow[]
  }
}

export function getSongImportDashboardData(): SongImportDashboardData {
  const runtimeSlugs = listJsonSlugs(path.resolve(process.cwd(), 'data', 'kuailepu-runtime'))
  const referenceSlugs = listJsonSlugs(path.resolve(process.cwd(), 'reference', 'songs'))
  const compactDocs = loadCompactSongDocs(path.resolve(process.cwd(), 'data', 'kuailepu'))
  const compactBySlug = new Map(compactDocs.map(song => [song.slug, song]))
  const catalogBySlug = new Map(allSongCatalog.map(song => [song.slug, song]))
  const sourceUrlToSlug = new Map<string, string>()

  compactDocs.forEach(song => {
    const sourceUrl = normalizeSourceUrl(song.source?.url)
    if (sourceUrl) {
      sourceUrlToSlug.set(sourceUrl, song.slug)
    }
  })

  const rowSlugs = new Set<string>([
    ...allSongCatalog.map(song => song.slug),
    ...compactDocs.map(song => song.slug)
  ])

  const songs = [...rowSlugs]
    .map(slug =>
      buildSongRow({
        slug,
        catalogSong: catalogBySlug.get(slug) ?? null,
        compactSong: compactBySlug.get(slug) ?? null,
        runtimeSlugs,
        referenceSlugs
      })
    )
    .sort(compareDashboardRows)

  const recentImports = songs
    .filter(song => song.isImportBacked)
    .sort(compareRecentImports)
    .slice(0, 18)

  const pendingReview = songs.filter(song => song.isImportBacked && song.reviewStatus !== 'verified').length
  const releaseIssues = songs.filter(song => song.issueFlags.length > 0).length
  const importBackedPublicSongs = songs.filter(song => song.isPublic && song.isImportBacked).length

  const candidatePool = loadCandidatePool(sourceUrlToSlug)

  return {
    summary: {
      publicSongs: songCatalog.length,
      allSongs: allSongCatalog.length,
      publicManifestEntries: publicSongManifest.length,
      seoProfiles: Object.keys(songSeoProfiles).length,
      runtimeRaw: runtimeSlugs.size,
      compactDocs: compactDocs.length,
      referenceRaw: referenceSlugs.size,
      importBackedPublicSongs,
      pendingReview,
      releaseIssues
    },
    git: {
      statusShortBranch: runGitCommand(['status', '--short', '--branch']),
      unpushedCommits: runGitCommand(['log', '--oneline', 'origin/main..HEAD'])
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
    },
    songs,
    recentImports,
    candidatePool
  }
}

function buildSongRow(input: {
  slug: string
  catalogSong: SongDoc | null
  compactSong: CompactSongDoc | null
  runtimeSlugs: Set<string>
  referenceSlugs: Set<string>
}): ImportDashboardSongRow {
  const { slug, catalogSong, compactSong, runtimeSlugs, referenceSlugs } = input
  const baseSong = catalogSong ?? compactSong
  const manifestEntry = baseSong ? getPublicSongManifestEntry(baseSong) : null
  const reviewStatus = compactSong?.review?.status ?? 'unknown'
  const issueFlags: string[] = []
  const isPublic = Boolean(catalogSong && catalogSong.published !== false)
  const hasManifest = Boolean(baseSong && manifestEntry)
  const hasSeoProfile = Boolean(getSongSeoProfileEntry(slug))
  const hasRuntimeRaw = runtimeSlugs.has(slug)
  const hasReferenceRaw = referenceSlugs.has(slug)

  if (isPublic && !hasManifest) {
    issueFlags.push('Missing manifest')
  }
  if (isPublic && !hasSeoProfile) {
    issueFlags.push('Missing SEO profile')
  }
  if (isPublic && !hasRuntimeRaw) {
    issueFlags.push('Missing deployable runtime raw JSON')
  }
  return {
    id: baseSong?.id ?? slug,
    slug,
    title: baseSong?.title ?? slug,
    sourceUrl: normalizeSourceUrl(compactSong?.source?.url),
    sourceSongUuid: extractKuailepuSongUuid(compactSong?.source?.url),
    family: manifestEntry?.family ?? null,
    isPublic,
    isImportBacked: Boolean(compactSong),
    hasManifest,
    hasSeoProfile,
    hasRuntimeRaw,
    hasCompactDoc: Boolean(compactSong),
    hasReferenceRaw,
    reviewStatus,
    reviewCheckedOn: compactSong?.review?.checkedOn ?? null,
    importedOn: resolveImportedOn(compactSong),
    issueFlags
  }
}

function loadCandidatePool(sourceUrlToSlug: Map<string, string>) {
  const candidatePoolPath = path.resolve(
    process.cwd(),
    'data',
    'songbook',
    'kuailepu-western-candidate-pool.json'
  )

  if (!fs.existsSync(candidatePoolPath)) {
    return {
      generatedOn: null,
      nextStep: null,
      summary: null,
      workflowSummary: {},
      reasonSummary: {},
      nextImportCandidates: [] as ImportDashboardCandidateRow[],
      rows: [] as ImportDashboardCandidateRow[]
    }
  }

  const parsed = JSON.parse(fs.readFileSync(candidatePoolPath, 'utf8')) as {
    generatedOn?: string
    nextStep?: string
    summary?: Record<string, number | string>
    candidates?: CandidatePoolEntry[]
  }

  const rows = (parsed.candidates ?? [])
    .map(candidate => {
      const href = normalizeSourceUrl(candidate.href)
      const workflowStatus = resolveCandidateWorkflowStatus(candidate)
      const statusReason = resolveCandidateStatusReason(candidate, workflowStatus)
      const currentSlug = firstNonEmpty(
        href ? sourceUrlToSlug.get(href) : null,
        candidate.existingPublicSlug,
        candidate.recommendedSlug
      )
      const publicTitle = firstNonEmpty(candidate.publicTitle, candidate.recommendedTitle)
      const recommendedTitle = firstNonEmpty(
        candidate.recommendedTitle,
        candidate.publicTitle,
        candidate.candidateEnglishTitle,
        candidate.canonicalWesternTitle
      )
      const songName = firstNonEmpty(candidate.songName, recommendedTitle, currentSlug) ?? 'Untitled candidate'

      return {
        href: href ?? '',
        sourceSongUuid: firstNonEmpty(candidate.sourceSongUuid, href ? extractKuailepuSongUuid(href) : null),
        songName,
        aliasName: candidate.aliasName?.trim() || null,
        searchResultTitle: candidate.searchResultTitle?.trim() || null,
        currentSlug,
        publicTitle,
        recommendedTitle,
        recommendedSlug: firstNonEmpty(candidate.recommendedSlug, candidate.existingPublicSlug, currentSlug),
        status: candidate.status?.trim() || null,
        workflowStatus,
        statusReason,
        rightsRisk: candidate.rightsRisk?.trim() || null,
        nextAction: candidate.nextAction?.trim() || null,
        lastCheckedOn: firstNonEmpty(candidate.lastCheckedOn, parsed.generatedOn),
        supportsPublicInstruments:
          typeof candidate.supportsPublicInstruments === 'boolean'
            ? candidate.supportsPublicInstruments
            : null,
        notes: candidate.notes?.trim() || null,
        isCurrentlyPublic: Boolean(currentSlug && songCatalog.some(song => song.slug === currentSlug))
      }
    })
    .filter(row => row.href.length > 0)
    .sort(compareCandidateRows)

  const workflowSummary = countBy(rows, row => row.workflowStatus)
  const reasonSummary = countBy(rows, row => row.statusReason)
  const nextImportCandidates = rows.filter(row => row.workflowStatus === 'queued')

  return {
    generatedOn: parsed.generatedOn ?? null,
    nextStep: parsed.nextStep?.trim() || null,
    summary: parsed.summary ?? null,
    workflowSummary,
    reasonSummary,
    nextImportCandidates,
    rows
  }
}

function loadCompactSongDocs(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    return [] as CompactSongDoc[]
  }

  return fs
    .readdirSync(dirPath)
    .filter(file => file.endsWith('.json'))
    .map(file => JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf8')) as CompactSongDoc)
}

function listJsonSlugs(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    return new Set<string>()
  }

  return new Set(
    fs
      .readdirSync(dirPath)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace(/\.json$/, ''))
  )
}

function resolveImportedOn(song: CompactSongDoc | null) {
  if (!song) {
    return null
  }

  const note = song.source?.note ?? ''
  const noteMatch = note.match(/\b(20\d{2}-\d{2}-\d{2})\b/)
  if (noteMatch?.[1]) {
    return noteMatch[1]
  }

  return song.review?.checkedOn ?? null
}

function extractKuailepuSongUuid(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const match = value.match(/\/jianpu\/([^./]+)\.html/i)
  return match?.[1] ?? null
}

function normalizeSourceUrl(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return null
}

function resolveCandidateWorkflowStatus(candidate: CandidatePoolEntry): CandidateWorkflowStatus {
  const normalized = normalizeCandidateWorkflowStatus(candidate.workflowStatus)
  if (normalized) {
    return normalized
  }

  if (candidate.status === 'public-already-imported') {
    return 'imported-public'
  }

  if (candidate.status === 'skip-for-now') {
    if (candidate.screeningDecision === 'traffic-reference-only') {
      return 'reference-only'
    }

    if (candidate.notes?.toLowerCase().includes('duplicate')) {
      return 'duplicate'
    }

    if (
      candidate.screeningDecision === 'no-public-instruments' ||
      candidate.rightsRisk === 'copyrighted' ||
      candidate.rightsRisk === 'likely-copyrighted'
    ) {
      return 'blocked'
    }

    return 'hold'
  }

  return 'hold'
}

function resolveCandidateStatusReason(
  candidate: CandidatePoolEntry,
  workflowStatus: CandidateWorkflowStatus
): CandidateStatusReason {
  const normalized = normalizeCandidateStatusReason(candidate.statusReason)
  if (normalized) {
    return normalized
  }

  if (workflowStatus === 'imported-public') {
    return 'already-public'
  }

  if (workflowStatus === 'duplicate') {
    return 'duplicate-title'
  }

  if (candidate.screeningDecision === 'no-public-instruments') {
    return 'no-public-instruments'
  }

  if (
    candidate.screeningDecision === 'hold-no-clear-western-demand' ||
    candidate.screeningDecision === 'hold-ambiguous-title'
  ) {
    return 'ambiguous-identity'
  }

  if (candidate.screeningDecision === 'traffic-reference-only') {
    return 'traffic-reference-only'
  }

  if (
    candidate.screeningDecision === 'remove-modern-copyrighted' ||
    candidate.rightsRisk === 'copyrighted' ||
    candidate.rightsRisk === 'likely-copyrighted'
  ) {
    return 'copyright-risk'
  }

  if (workflowStatus === 'hold') {
    return 'unclear-identity'
  }

  return 'unknown'
}

function normalizeCandidateWorkflowStatus(value: string | null | undefined) {
  if (value === 'queued' || value === 'hold' || value === 'blocked' || value === 'reference-only' || value === 'duplicate' || value === 'imported-public') {
    return value
  }

  return null
}

function normalizeCandidateStatusReason(value: string | null | undefined) {
  if (
    value === 'already-public' ||
    value === 'no-public-instruments' ||
    value === 'ambiguous-identity' ||
    value === 'unclear-identity' ||
    value === 'copyright-risk' ||
    value === 'traffic-reference-only' ||
    value === 'duplicate-title' ||
    value === 'unknown'
  ) {
    return value
  }

  return null
}

function compareDashboardRows(left: ImportDashboardSongRow, right: ImportDashboardSongRow) {
  if (left.issueFlags.length !== right.issueFlags.length) {
    return right.issueFlags.length - left.issueFlags.length
  }

  if (left.isPublic !== right.isPublic) {
    return Number(right.isPublic) - Number(left.isPublic)
  }

  if (left.isImportBacked !== right.isImportBacked) {
    return Number(right.isImportBacked) - Number(left.isImportBacked)
  }

  return compareRecentImports(left, right)
}

function compareRecentImports(left: ImportDashboardSongRow, right: ImportDashboardSongRow) {
  const leftDate = left.importedOn ?? ''
  const rightDate = right.importedOn ?? ''

  if (leftDate !== rightDate) {
    return rightDate.localeCompare(leftDate)
  }

  return left.slug.localeCompare(right.slug)
}

function compareCandidateRows(left: ImportDashboardCandidateRow, right: ImportDashboardCandidateRow) {
  const statusOrder: CandidateWorkflowStatus[] = [
    'queued',
    'hold',
    'blocked',
    'reference-only',
    'duplicate',
    'imported-public'
  ]

  const leftIndex = statusOrder.indexOf(left.workflowStatus)
  const rightIndex = statusOrder.indexOf(right.workflowStatus)

  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex
  }

  const leftDate = left.lastCheckedOn ?? ''
  const rightDate = right.lastCheckedOn ?? ''
  if (leftDate !== rightDate) {
    return rightDate.localeCompare(leftDate)
  }

  return left.songName.localeCompare(right.songName)
}

function countBy<T, K extends string>(rows: T[], getKey: (row: T) => K) {
  return rows.reduce<Partial<Record<K, number>>>((counts, row) => {
    const key = getKey(row)
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
}

function runGitCommand(args: string[]) {
  try {
    return execFileSync('git', args, {
      cwd: process.cwd(),
      encoding: 'utf8'
    }).trim()
  } catch (error) {
    return `Git command failed: ${String(error)}`
  }
}
