import { siteUrl } from '../site.ts'

export const SONG_PREVIEW_IMAGE_WIDTH = 1200
export const SONG_PREVIEW_IMAGE_HEIGHT = 630

export function getSongSeoSummary(title: string) {
  return `Play ${title} with ocarina tabs, recorder notes, tin whistle notes, letter notes, and visual finger charts.`
}

export function getSongSeoDescription(title: string, existingDescription?: string | null) {
  const summary = getSongSeoSummary(title)
  const existing = existingDescription?.trim()
  if (!existing) {
    return summary
  }

  const normalized = existing.toLowerCase()
  const coversCoreTerms = [
    'ocarina tabs',
    'recorder notes',
    'tin whistle notes',
    'letter notes'
  ].every(term => normalized.includes(term))

  if (coversCoreTerms) {
    return existing
  }

  const songSpecificTail = existing.replace(/^Play\s+.+?\.\s*/i, '').trim()
  return songSpecificTail ? `${summary} ${songSpecificTail}` : summary
}

export function getSongPreviewImagePath(slug: string) {
  return `/static/song-previews/${slug}.jpg`
}

export function getSongPreviewImageUrl(slug: string) {
  return `${siteUrl}${getSongPreviewImagePath(slug)}`
}
