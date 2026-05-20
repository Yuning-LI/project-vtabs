import type { PublicSongInstrumentId } from './publicInstruments.ts'
import type { AutoPracticePairSeed } from './practicePairTypes.ts'
import {
  loadPracticePairMetadataBySlug,
  type PracticePairSongMetadata
} from './practicePairMetadata.ts'

const AUTO_REASON_LIBRARY = {
  sameTagAndMeter:
    'This keeps the same practice feel and rhythmic flow, so the next tune should feel natural right away.',
  sameTag:
    'It carries forward a very similar practice mood, making it a natural next tune after this one.',
  sameMeter:
    'It keeps a similar pulse and phrase feel, so you can stay in the same timing groove.',
  sameFamily:
    'It stays close in style and reading feel, which makes it a steady next-song choice.',
  difficultyStep:
    'It feels like a clean next step without making the reading jump too sharply.',
  popularFallback:
    'It is a strong follow-up if you want another familiar melody with a comparable reading load.'
} as const

export function computeAutoPracticePairSeeds(
  currentSlug: string,
  requestedInstrumentId: PublicSongInstrumentId | null | undefined,
  limit = 6
): AutoPracticePairSeed[] {
  const metadataBySlug = loadPracticePairMetadataBySlug()
  const current = metadataBySlug[currentSlug]
  if (!current) {
    return []
  }

  return Object.values(metadataBySlug)
    .filter(candidate => candidate.slug !== currentSlug)
    .map(candidate => scoreCandidate(current, candidate, requestedInstrumentId ?? null))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score
      }

      return left.slug.localeCompare(right.slug)
    })
    .slice(0, limit)
}

function scoreCandidate(
  current: PracticePairSongMetadata,
  candidate: PracticePairSongMetadata,
  requestedInstrumentId: PublicSongInstrumentId | null
) {
  let score = 0
  const sharedTags = candidate.tags.filter(tag => current.tags.includes(tag))

  if (candidate.family && candidate.family === current.family) {
    score += 40
  }

  if (candidate.meterLabel === current.meterLabel) {
    score += 22
  } else if (candidate.meterGroup === current.meterGroup) {
    score += 10
  }

  const difficultyGap = Math.abs(candidate.difficultyTier - current.difficultyTier)
  if (difficultyGap === 0) {
    score += 24
  } else if (difficultyGap === 1) {
    score += 12
  } else {
    score -= 18
  }

  if (candidate.hasPublicLyrics === current.hasPublicLyrics) {
    score += 8
  }

  if (sharedTags.length > 0) {
    score += 18 + Math.min(sharedTags.length - 1, 2) * 6
  }

  if (requestedInstrumentId) {
    if (candidate.supportedInstrumentIds.includes(requestedInstrumentId)) {
      score += 16
    } else {
      score -= 8
    }
  }

  const rankDistance = Math.abs(candidate.featuredRank - current.featuredRank)
  if (Number.isFinite(rankDistance)) {
    if (rankDistance <= 8) {
      score += 12
    } else if (rankDistance <= 20) {
      score += 8
    } else if (rankDistance <= 40) {
      score += 4
    }
  }

  score += popularityBoost(candidate.featuredRank)

  return {
    slug: candidate.slug,
    reason: chooseReason(current, candidate, sharedTags.length),
    score
  } satisfies AutoPracticePairSeed
}

function popularityBoost(featuredRank: number) {
  if (!Number.isFinite(featuredRank)) {
    return 0
  }

  if (featuredRank <= 24) {
    return 10
  }

  if (featuredRank <= 60) {
    return 6
  }

  if (featuredRank <= 120) {
    return 3
  }

  return 0
}

function chooseReason(
  current: PracticePairSongMetadata,
  candidate: PracticePairSongMetadata,
  sharedTagCount: number
) {
  if (
    sharedTagCount > 0 &&
    (candidate.meterLabel === current.meterLabel || candidate.meterGroup === current.meterGroup)
  ) {
    return AUTO_REASON_LIBRARY.sameTagAndMeter
  }

  if (sharedTagCount > 0) {
    return AUTO_REASON_LIBRARY.sameTag
  }

  if (candidate.meterLabel === current.meterLabel || candidate.meterGroup === current.meterGroup) {
    return AUTO_REASON_LIBRARY.sameMeter
  }

  if (candidate.family && candidate.family === current.family) {
    return AUTO_REASON_LIBRARY.sameFamily
  }

  if (Math.abs(candidate.difficultyTier - current.difficultyTier) <= 1) {
    return AUTO_REASON_LIBRARY.difficultyStep
  }

  return AUTO_REASON_LIBRARY.popularFallback
}
