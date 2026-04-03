import { hasPublicKuailepuLyricToggle, loadKuailepuSongPayload } from '../src/lib/kuailepu/runtime.ts'
import { resolveKuailepuRuntimeSongPath } from '../src/lib/kuailepu/sourceFiles.ts'
import { allSongCatalog } from '../src/lib/songbook/catalog.ts'
import { importedSongCatalog } from '../src/lib/songbook/importedCatalog.ts'
import { getPublicSongManifestEntry, isPublicSongPublished } from '../src/lib/songbook/publicManifest.ts'
import { getSupportedPublicSongInstruments } from '../src/lib/songbook/publicInstruments.ts'
import { getSongPresentation } from '../src/lib/songbook/presentation.ts'
import { getSongSeoProfileEntry } from '../src/lib/songbook/seoProfiles.ts'

const input = process.argv[2]

if (!input) {
  console.error('Usage: npm run doctor:song -- <slug-or-id>')
  process.exit(1)
}

const song =
  allSongCatalog.find(candidate => candidate.slug === input) ??
  allSongCatalog.find(candidate => candidate.id === input)

if (!song) {
  console.error(`Song not found for input: ${input}`)
  process.exit(1)
}

const manifestEntry = getPublicSongManifestEntry(song)
const importedSong =
  importedSongCatalog.find(candidate => candidate.slug === song.slug) ??
  importedSongCatalog.find(candidate => candidate.id === song.id)
const runtimePayload = loadKuailepuSongPayload(song.slug)
const explicitSeoProfile = getSongSeoProfileEntry(song.slug)
const presentation = getSongPresentation(song, {
  publicLyricsAvailable: runtimePayload ? hasPublicKuailepuLyricToggle(runtimePayload) : false
})

console.log(
  JSON.stringify(
    {
      id: song.id,
      slug: song.slug,
      title: presentation.title,
      published: isPublicSongPublished(song),
      manifest: manifestEntry,
      hasImportedSongDoc: Boolean(importedSong),
      hasDeployableRuntimeJson: Boolean(resolveKuailepuRuntimeSongPath(song.slug)),
      publicLyricsAvailable: runtimePayload ? hasPublicKuailepuLyricToggle(runtimePayload) : false,
      supportedPublicInstruments: runtimePayload
        ? getSupportedPublicSongInstruments(runtimePayload).map(instrument => ({
            id: instrument.id,
            label: instrument.label
          }))
        : [],
      seo: {
        source: explicitSeoProfile ? 'explicit-profile' : 'fallback-generator',
        searchTerms: explicitSeoProfile?.searchTerms ?? null,
        familyLabel: presentation.familyLabel,
        difficultyLabel: presentation.difficultyLabel,
        metaDescription: presentation.metaDescription
      }
    },
    null,
    2
  )
)
