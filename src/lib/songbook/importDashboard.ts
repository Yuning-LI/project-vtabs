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

type CandidatePoolEntry = {
  href?: string
  songName?: string
  aliasName?: string
  publicTitle?: string
  existingPublicSlug?: string
  status?: string
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
  songName: string
  aliasName: string | null
  currentSlug: string | null
  publicTitle: string | null
  status: string | null
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
    summary: Record<string, number | string> | null
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
      summary: null,
      rows: [] as ImportDashboardCandidateRow[]
    }
  }

  const parsed = JSON.parse(fs.readFileSync(candidatePoolPath, 'utf8')) as {
    generatedOn?: string
    summary?: Record<string, number | string>
    candidates?: CandidatePoolEntry[]
  }

  const rows = (parsed.candidates ?? [])
    .map(candidate => {
      const href = normalizeSourceUrl(candidate.href)
      const currentSlug = href ? sourceUrlToSlug.get(href) ?? candidate.existingPublicSlug ?? null : null
      const publicTitle = candidate.publicTitle?.trim() || null
      const songName = candidate.songName?.trim() || currentSlug || 'Untitled candidate'

      return {
        href: href ?? '',
        songName,
        aliasName: candidate.aliasName?.trim() || null,
        currentSlug,
        publicTitle,
        status: candidate.status?.trim() || null,
        supportsPublicInstruments:
          typeof candidate.supportsPublicInstruments === 'boolean'
            ? candidate.supportsPublicInstruments
            : null,
        notes: candidate.notes?.trim() || null,
        isCurrentlyPublic: Boolean(currentSlug && songCatalog.some(song => song.slug === currentSlug))
      }
    })
    .filter(row => row.href.length > 0)

  return {
    generatedOn: parsed.generatedOn ?? null,
    summary: parsed.summary ?? null,
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
