import type { SongIrDocument } from './songIr.ts'
import { buildSongIrSemanticQa } from './semanticQa.ts'

export type NativeRendererSupportStatus = 'supported' | 'fallback-required'

export type NativeRendererSupportDecision = {
  status: NativeRendererSupportStatus
  slug: string
  reasons: string[]
}

export const NATIVE_RENDERER_MVP_SEEDS = [
  'on-top-of-old-smoky',
  'the-coventry-carol',
  'good-christian-men-rejoice',
  'beautiful-isle-of-somewhere',
  'quartermasters-store',
  'camptown-races',
  'give-my-regards-to-broadway',
  'drink-to-me-only-with-thine-eyes',
  'careless-love',
  'over-there',
  'for-hes-a-jolly-good-fellow',
  'polly-wolly-doodle',
  'sometimes-i-feel-like-a-motherless-child',
  'waltzing-matilda',
  'the-bells-of-st-marys'
] as const

const NATIVE_RENDERER_MVP_SEED_SET = new Set<string>(NATIVE_RENDERER_MVP_SEEDS)

export function getNativeRendererMvpSeedSlugs() {
  return [...NATIVE_RENDERER_MVP_SEEDS]
}

export function evaluateNativeRendererSupport(
  slug: string,
  song: SongIrDocument | null
): NativeRendererSupportDecision {
  const safeSlug = slug.trim()
  const reasons: string[] = []

  if (!NATIVE_RENDERER_MVP_SEED_SET.has(safeSlug)) {
    reasons.push('not-in-native-mvp-seed-set')
  }

  if (!song) {
    reasons.push('missing-song-ir')
    return {
      status: 'fallback-required',
      slug: safeSlug,
      reasons
    }
  }

  if (song.version !== 0) {
    reasons.push(`unsupported-song-ir-version:${song.version}`)
  }

  if (song.source.kind !== 'musicxml-draft') {
    reasons.push(`unsupported-source:${song.source.kind}`)
  }

  if (song.unsupported.length > 0) {
    reasons.push(...song.unsupported.map(reason => `unsupported-syntax:${reason}`))
  }

  if (song.stats.noteCount <= 0) {
    reasons.push('empty-note-sequence')
  }

  if (song.stats.measureCount <= 0) {
    reasons.push('empty-measure-sequence')
  }

  const semanticQa = buildSongIrSemanticQa(song)
  if (semanticQa.missingO12FingeringCount > 0) {
    reasons.push(`missing-o12-fingering:${semanticQa.missingO12Fingerings.join(',')}`)
  }

  if (song.metadata.slug !== safeSlug) {
    reasons.push(`slug-mismatch:${song.metadata.slug}`)
  }

  return {
    status: reasons.length === 0 ? 'supported' : 'fallback-required',
    slug: safeSlug,
    reasons
  }
}
