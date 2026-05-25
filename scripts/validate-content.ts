import fs from 'node:fs'
import path from 'node:path'
import { allSongCatalog, songCatalog } from '../src/lib/songbook/catalog.ts'
import {
  publicSongManifest,
  publicSongManifestById,
  publicSongManifestBySlug
} from '../src/lib/songbook/publicManifest.ts'
import { songSeoProfiles } from '../src/lib/songbook/seoProfiles.ts'

type Issue = {
  severity: 'error' | 'warning'
  message: string
}

const issues: Issue[] = []
const seenIds = new Set<string>()
const seenSlugs = new Set<string>()
const seenFeaturedRanks = new Set<number>()
const knownSongSlugs = new Set(allSongCatalog.map(song => song.slug))
const publicRuntimeDir = path.resolve(process.cwd(), 'data', 'kuailepu-runtime')
const supportedPublicRuntimeInstruments = new Set(['o12', 'o6', 'r8b', 'r8g', 'w6'])

for (const entry of publicSongManifest) {
  if (seenIds.has(entry.id)) {
    issues.push({ severity: 'error', message: `Duplicate manifest id: ${entry.id}` })
  }
  seenIds.add(entry.id)

  if (seenSlugs.has(entry.slug)) {
    issues.push({ severity: 'error', message: `Duplicate manifest slug: ${entry.slug}` })
  }
  seenSlugs.add(entry.slug)

  if (seenFeaturedRanks.has(entry.featuredRank)) {
    issues.push({
      severity: 'error',
      message: `Duplicate manifest featuredRank: ${entry.featuredRank}`
    })
  }
  seenFeaturedRanks.add(entry.featuredRank)

  const song = allSongCatalog.find(candidate => candidate.id === entry.id && candidate.slug === entry.slug)
  if (!song) {
    issues.push({
      severity: 'error',
      message: `Manifest entry ${entry.slug} does not match any SongDoc in allSongCatalog.`
    })
    continue
  }

  if (entry.published) {
    const publicRuntimePath = path.join(publicRuntimeDir, `${entry.slug}.json`)
    if (!fs.existsSync(publicRuntimePath)) {
      issues.push({
        severity: 'error',
        message: `Published manifest entry ${entry.slug} is missing deployable raw JSON under data/kuailepu-runtime/.`
      })
      continue
    }

    const runtimeShapeIssue = getPublishedRuntimeShapeIssue(publicRuntimePath, entry.slug)
    if (runtimeShapeIssue) {
      issues.push({
        severity: 'error',
        message: runtimeShapeIssue
      })
    }
  }
}

for (const song of songCatalog) {
  const manifestEntry = publicSongManifestBySlug.get(song.slug) ?? publicSongManifestById.get(song.id)
  if (!manifestEntry) {
    issues.push({
      severity: 'error',
      message: `Published song ${song.slug} is missing a public manifest entry.`
    })
  }
}

for (const [slug, profile] of Object.entries(songSeoProfiles)) {
  if (!knownSongSlugs.has(slug)) {
    issues.push({
      severity: 'error',
      message: `SEO profile ${slug} does not match any SongDoc slug in allSongCatalog.`
    })
  }

  if (!Array.isArray(profile.searchTerms) || profile.searchTerms.length < 2) {
    issues.push({
      severity: 'error',
      message: `SEO profile ${slug} must provide at least two searchTerms.`
    })
  }

  if (profile.searchTerms.some(term => typeof term !== 'string' || term.trim().length < 1)) {
    issues.push({
      severity: 'error',
      message: `SEO profile ${slug} contains an empty search term.`
    })
  }

  if (profile.searchTerms.some(term => containsCjk(term))) {
    issues.push({
      severity: 'error',
      message: `SEO profile ${slug} searchTerms must stay English-facing and should not include CJK text.`
    })
  }

  if (typeof profile.background !== 'string' || profile.background.trim().length < 1) {
    issues.push({
      severity: 'error',
      message: `SEO profile ${slug} must provide a non-empty background string.`
    })
  }

  if (typeof profile.practice !== 'string' || profile.practice.trim().length < 1) {
    issues.push({
      severity: 'error',
      message: `SEO profile ${slug} must provide a non-empty practice string.`
    })
  }

  if (containsCjk(profile.background) || containsCjk(profile.practice)) {
    issues.push({
      severity: 'error',
      message: `SEO profile ${slug} background/practice copy must stay English-facing and should not include CJK text.`
    })
  }
}

for (const song of songCatalog) {
  if (!songSeoProfiles[song.slug]) {
    issues.push({
      severity: 'warning',
      message: `Published song ${song.slug} is missing an explicit SEO profile and will use fallback copy.`
    })
  }
}

const manifestPublishedCount = publicSongManifest.filter(entry => entry.published).length
if (manifestPublishedCount !== songCatalog.length) {
  issues.push({
    severity: 'error',
    message: `Published manifest count ${manifestPublishedCount} does not match songCatalog count ${songCatalog.length}.`
  })
}

console.log(
  JSON.stringify(
    {
      manifestEntries: publicSongManifest.length,
      publishedManifestEntries: manifestPublishedCount,
      publishedSongs: songCatalog.length,
      seoProfiles: Object.keys(songSeoProfiles).length,
      issueCount: issues.length,
      issues
    },
    null,
    2
  )
)

if (issues.some(issue => issue.severity === 'error')) {
  process.exitCode = 1
}

function containsCjk(value: string) {
  return /[\u3400-\u9fff]/.test(value)
}

function getPublishedRuntimeShapeIssue(filePath: string, slug: string) {
  let parsed: unknown

  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown
  } catch (error) {
    return `Published runtime ${slug} is not valid JSON: ${
      error instanceof Error ? error.message : String(error)
    }`
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return `Published runtime ${slug} must be a JSON object.`
  }

  const payload = parsed as {
    instrumentFingerings?: Array<{
      instrument?: unknown
    }>
  }

  if (!Array.isArray(payload.instrumentFingerings) || payload.instrumentFingerings.length < 1) {
    return `Published runtime ${slug} is missing usable instrumentFingerings; this usually means a thin snapshot was written instead of the enriched public runtime payload.`
  }

  const availablePublicInstruments = payload.instrumentFingerings
    .map(option => (typeof option?.instrument === 'string' ? option.instrument.trim() : ''))
    .filter(instrument => instrument.length > 0 && supportedPublicRuntimeInstruments.has(instrument))

  if (availablePublicInstruments.length < 1) {
    return `Published runtime ${slug} does not expose any supported public instrument options in instrumentFingerings.`
  }

  return null
}
