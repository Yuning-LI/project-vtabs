import { resolveKuailepuRuntimeSongPath } from '../src/lib/kuailepu/sourceFiles.ts'
import { allSongCatalog, songCatalog } from '../src/lib/songbook/catalog.ts'
import {
  publicSongManifest,
  publicSongManifestById,
  publicSongManifestBySlug
} from '../src/lib/songbook/publicManifest.ts'

type Issue = {
  severity: 'error' | 'warning'
  message: string
}

const issues: Issue[] = []
const seenIds = new Set<string>()
const seenSlugs = new Set<string>()
const seenFeaturedRanks = new Set<number>()

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

  if (entry.published && !resolveKuailepuRuntimeSongPath(entry.slug)) {
    issues.push({
      severity: 'error',
      message: `Published manifest entry ${entry.slug} is missing deployable raw JSON.`
    })
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
