import fs from 'node:fs'
import path from 'node:path'
import type { PublicSongFamily, SongDoc } from './types'

export type PublicSongManifestEntry = {
  id: string
  slug: string
  family: PublicSongFamily
  featuredRank: number
  published: boolean
}

const publicSongManifestPath = path.resolve(
  process.cwd(),
  'data',
  'songbook',
  'public-song-manifest.json'
)

let cachedPublicSongManifest: PublicSongManifestEntry[] | null = null

export function loadPublicSongManifest() {
  if (cachedPublicSongManifest) {
    return cachedPublicSongManifest
  }

  if (!fs.existsSync(publicSongManifestPath)) {
    cachedPublicSongManifest = []
    return cachedPublicSongManifest
  }

  const parsed = JSON.parse(fs.readFileSync(publicSongManifestPath, 'utf8')) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error('Public song manifest must be an array.')
  }

  cachedPublicSongManifest = parsed.map((entry, index) => normalizePublicSongManifestEntry(entry, index))
  return cachedPublicSongManifest
}

export const publicSongManifest = loadPublicSongManifest()
export const publicSongManifestById = new Map(publicSongManifest.map(entry => [entry.id, entry]))
export const publicSongManifestBySlug = new Map(publicSongManifest.map(entry => [entry.slug, entry]))

export function getPublicSongManifestEntry(songOrSlug: SongDoc | string) {
  if (typeof songOrSlug === 'string') {
    return publicSongManifestBySlug.get(songOrSlug) ?? null
  }

  return publicSongManifestBySlug.get(songOrSlug.slug) ?? publicSongManifestById.get(songOrSlug.id) ?? null
}

export function resolvePublicSongFamily(songOrSlug: SongDoc | string) {
  return getPublicSongManifestEntry(songOrSlug)?.family ?? null
}

export function isPublicSongPublished(song: SongDoc) {
  const manifestEntry = getPublicSongManifestEntry(song)
  if (manifestEntry) {
    return manifestEntry.published
  }

  return song.published !== false
}

export function sortSongDocsByPublicManifest(songs: SongDoc[]) {
  return [...songs].sort((left, right) => {
    const leftRank = getPublicSongManifestEntry(left)?.featuredRank ?? Number.MAX_SAFE_INTEGER
    const rightRank = getPublicSongManifestEntry(right)?.featuredRank ?? Number.MAX_SAFE_INTEGER

    if (leftRank !== rightRank) {
      return leftRank - rightRank
    }

    return left.slug.localeCompare(right.slug)
  })
}

function normalizePublicSongManifestEntry(entry: unknown, index: number): PublicSongManifestEntry {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`Public song manifest entry at index ${index} must be an object.`)
  }

  const candidate = entry as Partial<PublicSongManifestEntry>
  if (typeof candidate.id !== 'string' || candidate.id.trim().length < 1) {
    throw new Error(`Public song manifest entry at index ${index} is missing a valid id.`)
  }
  if (typeof candidate.slug !== 'string' || candidate.slug.trim().length < 1) {
    throw new Error(`Public song manifest entry at index ${index} is missing a valid slug.`)
  }
  if (!isPublicSongFamily(candidate.family)) {
    throw new Error(
      `Public song manifest entry "${candidate.slug}" has an invalid family "${String(candidate.family)}".`
    )
  }
  if (!Number.isInteger(candidate.featuredRank) || Number(candidate.featuredRank) < 1) {
    throw new Error(`Public song manifest entry "${candidate.slug}" has an invalid featuredRank.`)
  }
  if (typeof candidate.published !== 'boolean') {
    throw new Error(`Public song manifest entry "${candidate.slug}" must set published to true or false.`)
  }

  return {
    id: candidate.id.trim(),
    slug: candidate.slug.trim(),
    family: candidate.family,
    featuredRank: Number(candidate.featuredRank),
    published: candidate.published
  }
}

function isPublicSongFamily(value: unknown): value is PublicSongFamily {
  return (
    value === 'nursery' ||
    value === 'folk' ||
    value === 'classical' ||
    value === 'holiday' ||
    value === 'hymn' ||
    value === 'march' ||
    value === 'dance' ||
    value === 'song'
  )
}
