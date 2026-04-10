import fs from 'node:fs'
import path from 'node:path'

export type SongSeoProfile = {
  searchTerms: string[]
  aliases?: string[]
  metaTitle?: string | null
  metaDescription?: string | null
  overview?: string
  extraFaqs?: Array<{
    question: string
    answer: string
  }>
  background: string
  practice: string
}

const songSeoProfilesPath = path.resolve(
  process.cwd(),
  'data',
  'songbook',
  'song-seo-profiles.json'
)

let cachedSongSeoProfiles: Record<string, SongSeoProfile> | null = null

export function loadSongSeoProfiles() {
  if (cachedSongSeoProfiles) {
    return cachedSongSeoProfiles
  }

  if (!fs.existsSync(songSeoProfilesPath)) {
    cachedSongSeoProfiles = {}
    return cachedSongSeoProfiles
  }

  const parsed = JSON.parse(fs.readFileSync(songSeoProfilesPath, 'utf8')) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Song SEO profiles file must be an object keyed by slug.')
  }

  cachedSongSeoProfiles = Object.fromEntries(
    Object.entries(parsed).map(([slug, profile]) => [slug, normalizeSongSeoProfile(slug, profile)])
  )
  return cachedSongSeoProfiles
}

export const songSeoProfiles = loadSongSeoProfiles()

export function getSongSeoProfileEntry(slug: string) {
  return songSeoProfiles[slug] ?? null
}

export function hasSongSeoProfile(slug: string) {
  return Boolean(getSongSeoProfileEntry(slug))
}

function normalizeSongSeoProfile(slug: string, profile: unknown): SongSeoProfile {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new Error(`Song SEO profile "${slug}" must be an object.`)
  }

  const candidate = profile as Partial<SongSeoProfile>
  if (!Array.isArray(candidate.searchTerms)) {
    throw new Error(`Song SEO profile "${slug}" must provide searchTerms as an array.`)
  }
  if (
    candidate.metaTitle !== undefined &&
    candidate.metaTitle !== null &&
    (typeof candidate.metaTitle !== 'string' || candidate.metaTitle.trim().length < 1)
  ) {
    throw new Error(
      `Song SEO profile "${slug}" must provide metaTitle as a non-empty string when present.`
    )
  }
  if (
    candidate.metaDescription !== undefined &&
    candidate.metaDescription !== null &&
    (typeof candidate.metaDescription !== 'string' || candidate.metaDescription.trim().length < 1)
  ) {
    throw new Error(
      `Song SEO profile "${slug}" must provide metaDescription as a non-empty string when present.`
    )
  }
  if (
    candidate.overview !== undefined &&
    (typeof candidate.overview !== 'string' || candidate.overview.trim().length < 1)
  ) {
    throw new Error(
      `Song SEO profile "${slug}" must provide overview as a non-empty string when present.`
    )
  }
  if (typeof candidate.background !== 'string' || candidate.background.trim().length < 1) {
    throw new Error(`Song SEO profile "${slug}" must provide a non-empty background string.`)
  }
  if (typeof candidate.practice !== 'string' || candidate.practice.trim().length < 1) {
    throw new Error(`Song SEO profile "${slug}" must provide a non-empty practice string.`)
  }
  if (candidate.extraFaqs !== undefined && !Array.isArray(candidate.extraFaqs)) {
    throw new Error(`Song SEO profile "${slug}" must provide extraFaqs as an array when present.`)
  }

  return {
    searchTerms: candidate.searchTerms
      .map(term => (typeof term === 'string' ? term.trim() : ''))
      .filter(term => term.length > 0),
    aliases: Array.isArray(candidate.aliases)
      ? candidate.aliases
          .map(alias => (typeof alias === 'string' ? alias.trim() : ''))
          .filter(alias => alias.length > 0)
      : [],
    metaTitle:
      typeof candidate.metaTitle === 'string' && candidate.metaTitle.trim().length > 0
        ? candidate.metaTitle.trim()
        : null,
    metaDescription:
      typeof candidate.metaDescription === 'string' && candidate.metaDescription.trim().length > 0
        ? candidate.metaDescription.trim()
        : null,
    overview:
      typeof candidate.overview === 'string' && candidate.overview.trim().length > 0
        ? candidate.overview.trim()
        : undefined,
    extraFaqs: Array.isArray(candidate.extraFaqs)
      ? candidate.extraFaqs.map((item, index) => normalizeSongSeoFaq(slug, item, index))
      : [],
    background: candidate.background.trim(),
    practice: candidate.practice.trim()
  }
}

function normalizeSongSeoFaq(slug: string, item: unknown, index: number) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error(`Song SEO profile "${slug}" extraFaqs[${index}] must be an object.`)
  }

  const candidate = item as { question?: unknown; answer?: unknown }
  if (typeof candidate.question !== 'string' || candidate.question.trim().length < 1) {
    throw new Error(
      `Song SEO profile "${slug}" extraFaqs[${index}] must provide a non-empty question string.`
    )
  }
  if (typeof candidate.answer !== 'string' || candidate.answer.trim().length < 1) {
    throw new Error(
      `Song SEO profile "${slug}" extraFaqs[${index}] must provide a non-empty answer string.`
    )
  }

  return {
    question: candidate.question.trim(),
    answer: candidate.answer.trim()
  }
}
