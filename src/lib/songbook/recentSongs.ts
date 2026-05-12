/**
 * Keep this list newest-first.
 *
 * The recent-song hub is meant to stay tight enough to feel current instead of
 * becoming a second full library index. With the current release goal of about
 * 5-6 songs per day, a 42-song window covers roughly one week of fresh public
 * additions.
 *
 * Maintenance rule:
 * - after each public publish batch, prepend the new slugs
 * - keep only the newest 42 public songs in this file
 * - do not include candidate-only or unpublished songs
 */
export const RECENTLY_ADDED_SONG_WINDOW = 42
export const RECENTLY_ADDED_HOMEPAGE_LIMIT = 12

const RECENTLY_ADDED_SONG_SLUGS = [
  'molly-malone',
  'for-hes-a-jolly-good-fellow',
  'a-town-with-an-ocean-view',
  'the-promise-of-the-world',
  'ponyo-on-the-cliff-by-the-sea',
  'battle-hymn-of-the-republic',
  'sweet-hour-of-prayer',
  'swing-low-sweet-chariot',
  'alouette',
  'breath-of-the-wild-theme',
  'stable-theme',
  'revalis-theme',
  'miphas-theme',
  'ballad-of-the-wind-fish',
  'kakariko-village',
  'eponas-song',
  'sarias-song',
  'song-of-storms',
  'nearer-my-god-to-thee',
  'beautiful-dreamer',
  'daisy-bell',
  'america-the-beautiful',
  'chihiros-waltz',
  'my-neighbor-totoro',
  'stroll',
  'mariage-damour',
  'where-do-i-begin',
  'love-is-blue',
  'the-avengers',
  'city-of-stars',
  'see-you-again',
  'inuyashas-affection',
  'detective-conan-main-theme',
  'only-my-railgun',
  'until-the-end-of-the-world',
  'butter-fly',
  'unravel',
  'zen-zen-zense',
  'uchiage-hanabi',
  'senbonzakura',
  'cruel-angels-thesis',
  'gurenge',
] as const

export function getRecentlyAddedSongSlugs(limit = RECENTLY_ADDED_SONG_WINDOW) {
  return RECENTLY_ADDED_SONG_SLUGS.slice(0, limit)
}
