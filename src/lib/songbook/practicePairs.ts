import { hasPublicRuntimeLyricToggle, loadPublicRuntimeSongPayload } from '@/lib/runtime-core/publicRuntime'
import { songCatalogBySlug } from '@/lib/songbook/catalog'
import {
  buildSongPageHref,
  getSupportedPublicSongInstruments,
  type PublicSongInstrumentId,
  type PublicSongPageQueryState
} from '@/lib/songbook/publicInstruments'
import { loadPracticePairAutoResults } from '@/lib/songbook/practicePairAutoResults'
import { resolvePublicSongFamily } from '@/lib/songbook/publicManifest'
import { getSongPresentation } from '@/lib/songbook/presentation'
import type { PracticePairCard, PracticePairSeed, PracticePairSuggestions } from '@/lib/songbook/practicePairTypes'

const FAMILY_LABELS = {
  nursery: 'Nursery Rhyme',
  folk: 'Folk Song',
  classical: 'Classical Melody',
  holiday: 'Holiday Song',
  hymn: 'Hymn or Spiritual',
  march: 'March or Parade Tune',
  dance: 'Dance Melody',
  media: 'Film, TV & Game Theme',
  song: 'Pop & Standard Melody'
} as const

const PRACTICE_PAIR_MAP: Record<string, readonly PracticePairSeed[]> = {
  'all-is-found': [
    {
      slug: 'can-you-feel-the-love-tonight',
      reason: 'Both songs reward calm phrase shaping and gentle breath control.'
    },
    {
      slug: 'let-it-go',
      reason: 'This makes a natural Frozen-era step up when you want a broader melodic range next.'
    }
  ],
  'cant-help-falling-in-love': [
    {
      slug: 'always-on-my-mind',
      reason: 'Both work well for slow, lyric-led phrasing and steady note connection.'
    },
    {
      slug: 'eternal-flame',
      reason: 'It keeps the same romantic, sustained practice mood without a big reading jump.'
    }
  ],
  'always-on-my-mind': [
    {
      slug: 'eternal-flame',
      reason: 'Both songs reward legato control and a soft, even tone.'
    },
    {
      slug: 'cant-help-falling-in-love',
      reason: 'It keeps the same slow-ballad feel while adding a more familiar sing-along contour.'
    }
  ],
  'bridge-over-troubled-water': [
    {
      slug: 'the-sound-of-silence',
      reason: 'Both songs stay in a reflective singer-songwriter lane with clear phrase pacing.'
    }
  ],
  'five-hundred-miles': [
    {
      slug: 'take-me-home-country-roads',
      reason: 'Both travel well together as familiar folk-country melodies with singable motion.'
    }
  ],
  'amazing-grace': [
    {
      slug: 'greensleeves',
      reason: 'Both make strong next-step lyrical practice pieces for breath and phrasing.'
    },
    {
      slug: 'ode-to-joy',
      reason: 'It gives you a more pulse-driven melody after a slower hymn-shaped tune.'
    }
  ],
  'whispering-hope': [
    {
      slug: 'beautiful-isle-of-somewhere',
      reason: 'Both songs reward sustained lines, careful lyric tracking, and gentle phrasing.'
    }
  ],
  'missouri-waltz': [
    {
      slug: 'tennessee-waltz',
      reason: 'Both songs sit naturally in a waltz-focused practice block.'
    }
  ],
  'a-fine-romance': [
    {
      slug: 'carolina-in-the-morning',
      reason: 'Both songs keep the practice set in the same classic-standard vocabulary.'
    }
  ],
  'apple-blossom-time': [
    {
      slug: 'carolina-in-the-morning',
      reason: 'Both songs fit an easy early-standard session with similar singable pacing.'
    }
  ],
  'angels-we-have-heard-on-high': [
    {
      slug: 'silent-night',
      reason: 'Both carols pair well when you want one bright song and one calmer lyrical follow-up.'
    },
    {
      slug: 'we-wish-you-a-merry-christmas',
      reason: 'It keeps the same seasonal session going with a more direct sing-along pulse.'
    }
  ],
  'jingle-bells': [
    {
      slug: 'we-wish-you-a-merry-christmas',
      reason: 'Both songs work well as a quick, familiar holiday practice pair.'
    }
  ],
  'ode-to-joy': [
    {
      slug: 'amazing-grace',
      reason: 'It gives you a slower lyrical contrast after a steady pulse-based melody.'
    }
  ],
  'scarborough-fair': [
    {
      slug: 'greensleeves',
      reason: 'Both songs support slow folk phrasing and a clear lyrical contour.'
    }
  ],
  'molly-malone': [
    {
      slug: 'the-wild-rover',
      reason: 'Both songs keep the session in a singable Irish folk lane with strong chorus memory.'
    }
  ],
  'drunken-sailor': [
    {
      slug: 'wellerman',
      reason: 'Both songs make a natural sea-song pair for repeated pulse practice.'
    }
  ]
}

export function getPracticePairSuggestions(
  currentSlug: string,
  queryState: PublicSongPageQueryState,
  fallbackSlugs: string[] = []
): PracticePairSuggestions | null {
  const manualSeeds = PRACTICE_PAIR_MAP[currentSlug] ?? []
  const autoSeeds = loadPracticePairAutoResults()[currentSlug] ?? []

  const resolvedFromSeeds = [...manualSeeds, ...autoSeeds]
    .map(seed => toPracticePairCard(seed, queryState))
    .filter((card): card is PracticePairCard => Boolean(card))

  const seen = new Set(resolvedFromSeeds.map(card => card.slug))
  const fallbackCards = fallbackSlugs
    .filter(slug => slug !== currentSlug)
    .filter(slug => !seen.has(slug))
    .map(slug => toPracticePairCard({ slug, reason: 'A strong follow-up if you want one more familiar melody after this song.' }, queryState))
    .filter((card): card is PracticePairCard => Boolean(card))

  const items = [...resolvedFromSeeds, ...fallbackCards].slice(0, 3)

  if (items.length < 1) {
    return null
  }

  return {
    items
  }
}

function toPracticePairCard(
  seed: PracticePairSeed,
  queryState: PublicSongPageQueryState
): PracticePairCard | null {
  const song = songCatalogBySlug[seed.slug]
  if (!song) {
    return null
  }

  const runtimePayload = loadPublicRuntimeSongPayload(song.slug)
  const hasPublicLyrics = runtimePayload ? hasPublicRuntimeLyricToggle(runtimePayload) : false
  const presentation = getSongPresentation(song, {
    publicLyricsAvailable: hasPublicLyrics
  })
  const family = resolvePublicSongFamily(song.slug)
  const familyLabel = family ? FAMILY_LABELS[family] : 'Melody Page'
  const instrumentId = resolveCompatibleInstrumentId(runtimePayload, queryState.instrumentId)

  return {
    slug: song.slug,
    href: buildSongPageHref({
      songId: song.slug,
      instrumentId,
      noteLabelMode: queryState.noteLabelMode ?? null
    }),
    title: presentation.title,
    familyLabel,
    difficultyLabel: presentation.difficultyLabel,
    keyLabel: presentation.keyLabel,
    meterLabel: presentation.meterLabel,
    hasPublicLyrics,
    supportedInstrumentIds: getSupportedPublicSongInstruments(runtimePayload).map(item => item.id),
    reason: seed.reason
  }
}

function resolveCompatibleInstrumentId(
  payload: ReturnType<typeof loadPublicRuntimeSongPayload>,
  requestedInstrumentId: PublicSongInstrumentId | null | undefined
) {
  if (!payload || !requestedInstrumentId) {
    return null
  }

  const supportedInstruments = getSupportedPublicSongInstruments(payload)
  return supportedInstruments.some(instrument => instrument.id === requestedInstrumentId)
    ? requestedInstrumentId
    : null
}
