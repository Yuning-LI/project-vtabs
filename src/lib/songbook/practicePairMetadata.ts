import { hasPublicKuailepuLyricToggle, loadKuailepuSongPayload } from '../kuailepu/runtime.ts'
import { songCatalogBySlug } from './catalog.ts'
import { getSupportedPublicSongInstruments } from './publicInstruments.ts'
import { getPublicSongManifestEntry, resolvePublicSongFamily } from './publicManifest.ts'
import { getSongPresentation } from './presentation.ts'
import type { PublicSongFamily } from './types.ts'

export type PracticePairDifficulty = 0 | 1 | 2

export type PracticePairTag =
  | 'calm-lyrical'
  | 'steady-pulse'
  | 'waltz'
  | 'compound-meter'
  | 'holiday-singalong'
  | 'folk-chorus'
  | 'ceremony-hymn'
  | 'sea-song'
  | 'classic-standard'
  | 'lullaby'
  | 'patriotic'

export type PracticePairSongMetadata = {
  slug: string
  title: string
  family: PublicSongFamily | null
  featuredRank: number
  hasPublicLyrics: boolean
  difficultyLabel: string
  difficultyTier: PracticePairDifficulty
  meterLabel: string
  meterGroup: string
  keyLabel: string
  supportedInstrumentIds: string[]
  tags: PracticePairTag[]
}

const TAG_MAP: Partial<Record<string, PracticePairTag[]>> = {
  'all-is-found': ['calm-lyrical', 'lullaby'],
  'always-on-my-mind': ['calm-lyrical'],
  'amazing-grace': ['calm-lyrical', 'ceremony-hymn'],
  'angels-we-have-heard-on-high': ['holiday-singalong'],
  'auld-lang-syne': ['folk-chorus'],
  'beautiful-dreamer': ['calm-lyrical'],
  'beautiful-isle-of-somewhere': ['calm-lyrical', 'ceremony-hymn'],
  'bridge-over-troubled-water': ['calm-lyrical'],
  'can-you-feel-the-love-tonight': ['calm-lyrical'],
  'cant-help-falling-in-love': ['calm-lyrical'],
  'carolina-in-the-morning': ['classic-standard'],
  'deck-the-halls': ['holiday-singalong', 'steady-pulse'],
  'drunken-sailor': ['sea-song', 'steady-pulse', 'folk-chorus'],
  'eternal-flame': ['calm-lyrical'],
  'five-hundred-miles': ['folk-chorus'],
  'go-tell-it-on-the-mountain': ['holiday-singalong', 'ceremony-hymn'],
  'greensleeves': ['calm-lyrical', 'folk-chorus'],
  'i-saw-three-ships': ['holiday-singalong', 'steady-pulse'],
  'jingle-bells': ['holiday-singalong', 'steady-pulse'],
  'joshua-fit-the-battle-of-jericho': ['ceremony-hymn', 'steady-pulse'],
  'let-it-go': ['calm-lyrical'],
  'missouri-waltz': ['waltz', 'calm-lyrical'],
  'molly-malone': ['folk-chorus'],
  'nearer-my-god-to-thee': ['ceremony-hymn', 'calm-lyrical'],
  'ode-to-joy': ['steady-pulse'],
  'oh-susanna': ['folk-chorus', 'steady-pulse'],
  'o-christmas-tree': ['holiday-singalong'],
  'row-row-row-your-boat': ['steady-pulse'],
  'scarborough-fair': ['calm-lyrical', 'folk-chorus'],
  'shenandoah': ['calm-lyrical', 'folk-chorus'],
  'silent-night': ['holiday-singalong', 'calm-lyrical'],
  'simple-gifts': ['folk-chorus', 'steady-pulse'],
  'skye-boat-song': ['calm-lyrical', 'folk-chorus'],
  'sweet-hour-of-prayer': ['ceremony-hymn', 'calm-lyrical'],
  'swing-low-sweet-chariot': ['ceremony-hymn', 'folk-chorus'],
  'take-me-home-country-roads': ['folk-chorus'],
  'tennessee-waltz': ['waltz', 'calm-lyrical'],
  'the-sound-of-silence': ['calm-lyrical'],
  'the-wild-rover': ['folk-chorus', 'steady-pulse'],
  'we-wish-you-a-merry-christmas': ['holiday-singalong', 'steady-pulse'],
  'wellerman': ['sea-song', 'steady-pulse', 'folk-chorus'],
  'whispering-hope': ['calm-lyrical'],
  'waltzing-matilda': ['folk-chorus', 'waltz'],
  'yankee-doodle': ['patriotic', 'steady-pulse']
}

let cachedMetadataBySlug: Record<string, PracticePairSongMetadata> | null = null

export function loadPracticePairMetadataBySlug() {
  if (cachedMetadataBySlug) {
    return cachedMetadataBySlug
  }

  cachedMetadataBySlug = Object.fromEntries(
    Object.values(songCatalogBySlug)
      .map(song => {
        const runtimePayload = loadKuailepuSongPayload(song.slug)
        const hasPublicLyrics = runtimePayload ? hasPublicKuailepuLyricToggle(runtimePayload) : false
        const presentation = getSongPresentation(song, { publicLyricsAvailable: hasPublicLyrics })
        const family = resolvePublicSongFamily(song.slug)
        const featuredRank =
          getPublicSongManifestEntry(song.slug)?.featuredRank ?? Number.MAX_SAFE_INTEGER
        const supportedInstrumentIds = runtimePayload
          ? getSupportedPublicSongInstruments(runtimePayload).map(item => item.id)
          : []

        return [
          song.slug,
          {
            slug: song.slug,
            title: presentation.title,
            family,
            featuredRank,
            hasPublicLyrics,
            difficultyLabel: presentation.difficultyLabel,
            difficultyTier: toDifficultyTier(presentation.difficultyLabel),
            meterLabel: presentation.meterLabel,
            meterGroup: toMeterGroup(presentation.meterLabel),
            keyLabel: presentation.keyLabel,
            supportedInstrumentIds,
            tags: TAG_MAP[song.slug] ?? inferTags(song.slug, family, presentation.meterLabel)
          } satisfies PracticePairSongMetadata
        ] as const
      })
  )

  return cachedMetadataBySlug
}

function toDifficultyTier(label: string): PracticePairDifficulty {
  if (label === 'Intermediate to advanced') {
    return 2
  }

  if (label === 'Intermediate') {
    return 1
  }

  return 0
}

function toMeterGroup(meterLabel: string) {
  const normalized = meterLabel.trim()
  if (normalized === '3/4') {
    return 'triple'
  }
  if (normalized === '6/8') {
    return 'compound'
  }
  if (normalized === '2/4' || normalized === '2/2' || normalized === '4/4') {
    return 'duple'
  }

  return normalized || 'other'
}

function inferTags(
  slug: string,
  family: PublicSongFamily | null,
  meterLabel: string
): PracticePairTag[] {
  const tags = new Set<PracticePairTag>()

  if (family === 'holiday') {
    tags.add('holiday-singalong')
  }
  if (family === 'hymn') {
    tags.add('ceremony-hymn')
  }
  if (family === 'folk') {
    tags.add('folk-chorus')
  }
  if (family === 'march') {
    tags.add('steady-pulse')
  }
  if (meterLabel === '3/4') {
    tags.add('waltz')
  }
  if (meterLabel === '6/8') {
    tags.add('compound-meter')
  }
  if (/lullaby|still still still|sleep|brahms/i.test(slug)) {
    tags.add('lullaby')
  }

  return [...tags]
}
