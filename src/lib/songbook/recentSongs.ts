import { publicSongManifest } from './publicManifest'

/**
 * The recent-song hub should now follow public publication state automatically.
 *
 * Source of truth:
 * - `data/songbook/public-song-manifest.json`
 * - higher `featuredRank` means a more recently published public song
 *
 * This keeps `/learn/new-songs` and the homepage teaser in sync with real
 * public releases instead of relying on a second hand-maintained slug list.
 */
export const RECENTLY_ADDED_SONG_WINDOW = 42
export const RECENTLY_ADDED_HOMEPAGE_LIMIT = 12

const RECENTLY_ADDED_SONG_SLUGS = publicSongManifest
  .filter(entry => entry.published)
  .sort((left, right) => {
    if (left.featuredRank !== right.featuredRank) {
      return right.featuredRank - left.featuredRank
    }

    return left.slug.localeCompare(right.slug)
  })
  .map(entry => entry.slug)

export function getRecentlyAddedSongSlugs(limit = RECENTLY_ADDED_SONG_WINDOW) {
  return RECENTLY_ADDED_SONG_SLUGS.slice(0, limit)
}
