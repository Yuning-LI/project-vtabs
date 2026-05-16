import { hasPublicKuailepuLyricToggle, loadKuailepuSongPayload } from '@/lib/kuailepu/runtime'
import { siteUrl } from '@/lib/site'
import { songCatalogBySlug } from '@/lib/songbook/catalog'
import { getSongPresentation } from '@/lib/songbook/presentation'
import { buildSongPageHref, type PublicSongInstrumentId } from '@/lib/songbook/publicInstruments'
import {
  getPublicSongManifestEntry,
  resolvePublicSongFamily
} from '@/lib/songbook/publicManifest'
import {
  getRecentlyAddedSongSlugs,
  RECENTLY_ADDED_HOMEPAGE_LIMIT,
  RECENTLY_ADDED_SONG_WINDOW
} from '@/lib/songbook/recentSongs'

export type LearnGuideKind = 'hub' | 'guide'

export type LearnGuideCard = {
  slug: string
  kind: LearnGuideKind
  title: string
  description: string
}

export type LearnSongCard = {
  slug: string
  href: string
  title: string
  familyLabel: string
  difficultyLabel: string
  keyLabel: string
  meterLabel: string
  hasPublicLyrics: boolean
}

type LearnSongReference =
  | string
  | {
      slug: string
      instrumentId?: PublicSongInstrumentId | null
    }

type LearnGuideSection = {
  title: string
  paragraphs: string[]
  bullets?: string[]
  songSlugs?: LearnSongReference[]
}

type LearnGuideFaq = {
  question: string
  answer: string
}

type LearnGuideDefinition = {
  slug: string
  kind: LearnGuideKind
  title: string
  description: string
  heroSummary?: string[]
  metaTitle?: string
  metaDescription?: string
  heroLabel: string
  intro: string[]
  featuredSongSlugs: LearnSongReference[]
  sections: LearnGuideSection[]
  faq: LearnGuideFaq[]
  relatedGuideSlugs: string[]
}

export type ResolvedLearnGuide = Omit<
  LearnGuideDefinition,
  'featuredSongSlugs' | 'relatedGuideSlugs' | 'sections'
> & {
  featuredSongs: LearnSongCard[]
  relatedGuides: LearnGuideCard[]
  sections: Array<
    LearnGuideSection & {
      songs: LearnSongCard[]
    }
  >
}

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

const FEATURED_GUIDE_SLUGS = [
  '12-hole-ocarina-letter-notes',
  'how-to-start-ocarina-with-letter-notes',
  'how-to-practice-ocarina-with-letter-notes',
  'new-songs',
  '6-hole-ocarina-letter-notes',
  'easy-12-hole-ocarina-songs',
  'recorder-letter-notes',
  'how-to-start-recorder-with-letter-notes',
  'how-to-practice-recorder-with-letter-notes',
  'easy-christmas-recorder-songs',
  'tin-whistle-letter-notes',
  'how-to-start-tin-whistle-with-letter-notes',
  'how-to-practice-tin-whistle-with-letter-notes',
  'easy-ocarina-songs-for-beginners',
  'easy-6-hole-ocarina-songs',
  'easy-christmas-ocarina-songs',
  'easy-recorder-songs-for-beginners',
  'easy-tin-whistle-songs',
  'easy-christmas-tin-whistle-songs',
  'nursery-rhyme-letter-notes',
  'easy-classical-letter-note-songs',
  'hymns-and-spiritual-letter-note-songs',
  'easy-songs-for-adult-beginners',
  'music-class-songs-for-beginners',
  'easy-songs-for-beginners',
  'songs-with-lyrics',
  'easy-sing-along-letter-note-songs',
  'first-performance-letter-note-songs',
  'simple-instruments-for-music-education',
  'christmas-letter-note-songs',
  'folk-songs-for-beginners',
  'celtic-tin-whistle-songs',
  'how-to-read-letter-notes',
  'march-and-parade-letter-note-songs',
  'patriotic-and-anthem-letter-note-songs',
  'world-folk-letter-note-songs',
  'ghibli-ocarina-songs',
  'wedding-and-ceremony-letter-note-songs',
  'calm-and-lyrical-letter-note-songs',
  'lullaby-and-bedtime-letter-note-songs',
  'dance-and-waltz-letter-note-songs'
] as const

const CELTIC_TIN_WHISTLE_SONG_SLUGS = new Set([
  'scarborough-fair',
  'greensleeves',
  'londonderry-air',
  'the-south-wind',
  'lough-leane',
  'irish-morning-wind',
  'irish-blackbird',
  'loch-lomond',
  'skye-boat-song',
  'scotland-the-brave',
  'auld-lang-syne',
  'wellerman'
])

const CEREMONY_SONG_SLUGS = new Set([
  'canon',
  'wedding-march',
  'wedding-march-alt',
  'amazing-grace',
  'a-thousand-years',
  'nearer-my-god-to-thee',
  'speak-softly-love',
  'air-on-the-g-string',
  'going-home'
])

const PATRIOTIC_ANTHEM_SONG_SLUGS = new Set([
  'america-the-beautiful',
  'battle-hymn-of-the-republic',
  'yankee-doodle',
  'american-patrol',
  'scotland-the-brave',
  'cavalry-march',
  'grenadiers-march',
  'the-internationale',
  'russian-national-anthem',
  'katyusha'
])

const WORLD_FOLK_SONG_SLUGS = new Set([
  'alouette',
  'arirang',
  'jasmine-flower',
  'sakura-sakura',
  'bella-ciao',
  'la-cucaracha',
  'el-condor-pasa',
  'hej-sokoly',
  'moscow-nights',
  'skye-boat-song',
  'troika',
  'red-berries-blossom',
  'the-hawthorn-tree',
  'waltzing-matilda'
])

const CALM_LYRICAL_SONG_SLUGS = new Set([
  'a-thousand-years',
  'a-town-with-an-ocean-view',
  'always-with-me',
  'amazing-grace',
  'air-on-the-g-string',
  'ballad-of-the-wind-fish',
  'beautiful-dreamer',
  'breath-of-the-wild-theme',
  'can-you-feel-the-love-tonight',
  'cant-help-falling-in-love',
  'chihiros-waltz',
  'city-of-stars',
  'fly-me-to-the-moon',
  'see-you-again',
  'casablanca',
  'careless-whisper',
  'carrying-you',
  'skye-boat-song',
  'childhood-memory',
  'edelweiss',
  'eponas-song',
  'going-home',
  'greensleeves',
  'hotel-california',
  'imagine',
  'kakariko-village',
  'la-vie-en-rose',
  'kiss-the-rain',
  'lemon-kenshi-yonezu',
  'let-it-be',
  'let-it-go',
  'love-is-blue',
  'londonderry-air',
  'lullaby',
  'mariage-damour',
  'memory-sky',
  'merry-christmas-mr-lawrence',
  'miphas-theme',
  'moonlight-lover',
  'my-heart-will-go-on',
  'moon-represents-my-heart',
  'moon-river',
  'moonlight-sonata',
  'nearer-my-god-to-thee',
  'over-the-rainbow',
  'old-memory',
  'one-summers-day',
  'on-wings-of-song',
  'path-of-the-wind',
  'the-promise-of-the-world',
  'princess-mononoke',
  'revalis-theme',
  'reminiscence',
  'right-here-waiting',
  'romeo-and-juliet',
  'river-flows-in-you',
  'sakura-sakura',
  'santa-lucia',
  'scarborough-fair',
  'schubert-serenade',
  'sealed-with-a-kiss',
  'song-of-time',
  'speak-softly-love',
  'stable-theme',
  'sweet-hour-of-prayer',
  'swing-low-sweet-chariot',
  'summer',
  'sailing',
  'tennessee-waltz',
  'tears-in-heaven',
  'the-sound-of-silence',
  'the-last-waltz',
  'traumerei',
  'inuyashas-affection',
  'until-the-end-of-the-world',
  'uchiage-hanabi',
  'where-do-i-begin',
  'you-raise-me-up',
  'yesterday',
  'yesterday-once-more',
  'zeldas-lullaby'
])

const LULLABY_BEDTIME_SONG_SLUGS = new Set([
  'ballad-of-the-wind-fish',
  'lullaby',
  'moonlight-sonata',
  'schubert-serenade',
  'traumerei',
  'air-on-the-g-string',
  'moscow-nights',
  'going-home',
  'sakura-sakura',
  'zeldas-lullaby'
])

const DANCE_WALTZ_SONG_SLUGS = new Set([
  'blue-bird',
  'butter-fly',
  'can-can',
  'chihiros-waltz',
  'cruel-angels-thesis',
  'detective-conan-main-theme',
  'habanera',
  'hes-a-pirate',
  'gurenge',
  'merry-go-round-of-life',
  'senbonzakura',
  'tennessee-waltz',
  'the-last-waltz',
  'woodpecker-polka',
  'waltz-no-2',
  'blacksmith-polka',
  'the-hawthorn-tree',
  'dancing-doll-and-teddy-bear',
  'flower-dance',
  'swan-lake',
  'turkish-march',
  'only-my-railgun',
  'unravel',
  'zen-zen-zense'
])

const SING_ALONG_SONG_SLUGS = new Set([
  'alouette',
  'daisy-bell',
  'twinkle-twinkle-little-star',
  'mary-had-a-little-lamb',
  'row-row-row-your-boat',
  'old-macdonald',
  'happy-birthday-to-you',
  'do-re-mi',
  'let-it-go',
  'jingle-bells',
  'deck-the-halls',
  'we-wish-you-a-merry-christmas',
  'joy-to-the-world',
  'auld-lang-syne',
  'imagine',
  'swing-low-sweet-chariot',
  'waltzing-matilda'
])

const FIRST_PERFORMANCE_SONG_SLUGS = new Set([
  'a-thousand-years',
  'a-town-with-an-ocean-view',
  'blue-bird',
  'butter-fly',
  'cruel-angels-thesis',
  'faded',
  'happy-birthday-to-you',
  'my-neighbor-totoro',
  'ode-to-joy',
  'amazing-grace',
  'canon',
  'wedding-march',
  'wedding-march-alt',
  'american-patrol',
  'gurenge',
  'hes-a-pirate',
  'detective-conan-main-theme',
  'let-it-go',
  'inuyashas-affection',
  'only-my-railgun',
  'senbonzakura',
  'the-imperial-march',
  'game-of-thrones-theme',
  'see-you-again',
  'song-of-storms',
  'sarias-song',
  'the-avengers',
  'stroll',
  'turkish-march',
  'unravel',
  'until-the-end-of-the-world',
  'zen-zen-zense',
  'parade-of-the-wooden-soldiers',
  'jingle-bells',
  'ponyo-on-the-cliff-by-the-sea'
])

const ZELDA_SONG_SLUGS = new Set([
  'ballad-of-the-wind-fish',
  'breath-of-the-wild-theme',
  'eponas-song',
  'kakariko-village',
  'miphas-theme',
  'revalis-theme',
  'sarias-song',
  'song-of-storms',
  'song-of-time',
  'stable-theme',
  'zeldas-lullaby'
])

const GHIBLI_SONG_SLUGS = new Set([
  'a-town-with-an-ocean-view',
  'always-with-me',
  'carrying-you',
  'chihiros-waltz',
  'merry-go-round-of-life',
  'my-neighbor-totoro',
  'one-summers-day',
  'path-of-the-wind',
  'ponyo-on-the-cliff-by-the-sea',
  'princess-mononoke',
  'stroll',
  'the-promise-of-the-world'
])

const EASY_OCARINA_SONG_SLUGS = new Set([
  'twinkle-twinkle-little-star',
  'mary-had-a-little-lamb',
  'frere-jacques',
  'london-bridge',
  'happy-birthday-to-you',
  'row-row-row-your-boat',
  'old-macdonald',
  'do-your-ears-hang-low',
  'ode-to-joy',
  'jingle-bells',
  'deck-the-halls',
  'silent-night',
  'amazing-grace'
])

const EASY_SIX_HOLE_OCARINA_SONG_SLUGS = new Set([
  'twinkle-twinkle-little-star',
  'mary-had-a-little-lamb',
  'frere-jacques',
  'london-bridge',
  'row-row-row-your-boat',
  'old-macdonald',
  'do-your-ears-hang-low',
  'jingle-bells',
  'deck-the-halls'
])

const EASY_TWELVE_HOLE_OCARINA_SONG_SLUGS = new Set([
  'twinkle-twinkle-little-star',
  'mary-had-a-little-lamb',
  'frere-jacques',
  'london-bridge',
  'happy-birthday-to-you',
  'ode-to-joy',
  'jingle-bells',
  'silent-night',
  'deck-the-halls',
  'amazing-grace'
])

const CHRISTMAS_OCARINA_SONG_SLUGS = new Set([
  'jingle-bells',
  'deck-the-halls',
  'silent-night',
  'we-wish-you-a-merry-christmas',
  'joy-to-the-world',
  'jolly-old-saint-nicholas',
  'god-rest-you-merry-gentlemen',
  'good-king-wenceslas',
  'happy-new-year'
])

const RECENT_SONG_SLUGS = getRecentlyAddedSongSlugs()
const RECENT_FEATURED_SONG_SLUGS = RECENT_SONG_SLUGS.slice(0, 12)
const RECENT_MID_WINDOW_SONG_SLUGS = RECENT_SONG_SLUGS.slice(12, 24)
const RECENT_LIBRARY_WINDOW_SONG_SLUGS = RECENT_SONG_SLUGS.slice(24, 36)
const RECENT_TRAILING_WINDOW_SONG_SLUGS = RECENT_SONG_SLUGS.slice(36)

const baseLearnGuideDefinitions: LearnGuideDefinition[] = [
  {
    slug: 'new-songs',
    kind: 'hub',
    title: 'Recently Added Song Pages',
    description:
      'Track the newest public song pages added to Play By Fingering, with fresh ocarina tabs, recorder notes, tin whistle letter notes, and fingering-chart-ready melody links.',
    heroLabel: 'Library Update',
    intro: [
      `This page is the public update hub for the newest songs added to the library. Instead of making Google discover each new melody page only through the sitemap or the homepage, this guide groups the latest ${RECENTLY_ADDED_SONG_WINDOW} public additions into one crawlable route with direct links back into the main song pages.`,
      'That makes the page useful for visitors as well. If you already know the core beginner songs and want to see what changed most recently, this is the fastest way to browse fresh additions without scanning the full library. Every card still opens a full runtime-backed practice page, so fresh releases stay immediately playable instead of feeling like announcement-only content.'
    ],
    metaTitle: 'Recently Added Ocarina Tabs, Recorder Notes, and Song Pages',
    metaDescription:
      'Browse the latest public song pages added to Play By Fingering, including new ocarina tabs, recorder notes, tin whistle letter notes, and fingering-chart-ready melody pages.',
    featuredSongSlugs: RECENT_FEATURED_SONG_SLUGS,
    sections: [
      {
        title: 'Why This Update Hub Exists',
        paragraphs: [
          'A sitemap is necessary, but it is not the same thing as a public internal-link page. New song pages benefit from a route that people can browse, link to, and revisit when the library is growing quickly.',
          'This guide keeps the newest additions grouped in one place so search engines can recrawl a stable update route while human visitors can spot fresh melody pages without guessing which songs were added recently.'
        ],
        bullets: [
          `The page keeps a rolling window of ${RECENTLY_ADDED_SONG_WINDOW} recently added songs.`,
          'The newest cards stay near the top instead of being buried inside the full library.',
          'Each card leads directly into a full playable song page instead of a teaser-only update list.'
        ]
      },
      {
        title: 'Still Fresh In The Current Release Window',
        paragraphs: [
          'These songs are no longer the very latest batch, but they are still part of the same current release wave. Keeping them on the page helps the site avoid a one-day-only update pattern and gives newer pages a little more internal-link breathing room.'
        ],
        songSlugs: RECENT_MID_WINDOW_SONG_SLUGS
      },
      {
        title: 'Earlier Additions In The Same Rolling Window',
        paragraphs: [
          'This part of the page carries the songs that have already moved beyond the newest release burst but still deserve a current-period link source. That matters more now that the publishing goal is multiple songs per day.'
        ],
        songSlugs: RECENT_LIBRARY_WINDOW_SONG_SLUGS
      },
      {
        title: 'About To Rotate Out',
        paragraphs: [
          'These are the oldest songs still inside the active recent-song window. They remain here until newer releases push them into the broader library, which keeps this page useful without turning it into a duplicate full catalog.'
        ],
        songSlugs: RECENT_TRAILING_WINDOW_SONG_SLUGS
      }
    ],
    faq: [
      {
        question: 'How many songs does this page keep at one time?',
        answer: `It keeps a rolling window of ${RECENTLY_ADDED_SONG_WINDOW} recently added public song pages, which matches roughly one week of updates at the current publishing pace.`
      },
      {
        question: 'Does this replace the full song library?',
        answer:
          'No. It is an update-focused hub. Use it when you want the newest additions first, then go back to the full library or the topic guides when you want broader browsing.'
      },
      {
        question: 'Do these links open a different kind of song page?',
        answer:
          'No. The update hub exists to surface fresh releases, not to fork the song experience, so the usual fingering, playback, and note-view tools stay available when you open a song.'
      }
    ],
    relatedGuideSlugs: [
      '12-hole-ocarina-letter-notes',
      'recorder-letter-notes',
      'tin-whistle-letter-notes',
      'easy-songs-for-adult-beginners',
      'ghibli-ocarina-songs',
      'zelda-ocarina-songs'
    ]
  },
  {
    slug: '12-hole-ocarina-letter-notes',
    kind: 'hub',
    title: '12-Hole Ocarina Letter Notes',
    description:
      'A public guide for players searching 12-hole ocarina letter notes, easy tabs, and finger chart songs with beginner-friendly starting points.',
    heroLabel: 'Instrument Guide',
    intro: [
      'This page gathers the song pages that work best as a first stop for players searching for 12-hole ocarina letter notes, 12-hole ocarina notes, or an easy finger chart song list. The goal is not to replace the song library, but to give search users a clearer way to begin.',
      'It is built around the practical first-use situations that make 12-hole search intent different from a generic library browse: a first warm-up song, a first sing-along melody, and one or two longer tunes that still stay readable in the standard 12-hole range.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'mary-had-a-little-lamb',
      'lightly-row',
      'frere-jacques',
      'london-bridge',
      'happy-birthday-to-you',
      'ode-to-joy',
      'amazing-grace',
      'jingle-bells',
      'silent-night',
      'deck-the-halls',
      'scarborough-fair'
    ],
    sections: [
      {
        title: 'Where Most Players Should Start',
        paragraphs: [
          'The best opening set for 12-hole ocarina readers is a small group of tunes with short phrases, familiar melodies, and enough repetition to make the letter-note view and finger chart feel useful right away.',
          'That is why this guide starts with nursery and teaching standards before moving on to longer hymn or classical melodies that still behave well as easy tabs.'
        ],
        songSlugs: [
          'twinkle-twinkle-little-star',
          'mary-had-a-little-lamb',
          'lightly-row',
          'frere-jacques'
        ]
      },
      {
        title: 'How To Use The Song Pages',
        paragraphs: [
          'Open a song page in the default letter-note view first. Keep the fingering chart visible until the phrase shape feels stable, and only switch to numbered notes when you want a backup reading view.',
          'On longer melodies, use the zoom and layout controls to keep the page readable instead of forcing everything into one glance.'
        ],
        bullets: [
          'Start in letter notes, not numbered notes.',
          'Keep the fingering chart on while learning the first pass.',
          'Use measure numbers and zoom to break longer tunes into phrases.'
        ]
      },
      {
        title: 'When You Are Ready For Longer Melodies',
        paragraphs: [
          'Once the easiest songs feel comfortable, move into tunes with wider phrase arcs and steadier breath planning. These pages still fit the same workflow, but they ask for better control over finger changes and pacing.'
        ],
        songSlugs: ['ode-to-joy', 'amazing-grace', 'silent-night']
      }
    ],
    faq: [
      {
        question: 'Is this a separate ocarina notation system?',
        answer:
          'No. It is a curated first-stop page for players who already search in 12-hole terms and want a smaller, more teachable opening set than the full library.'
      },
      {
        question: 'Who is this guide for?',
        answer:
          'It is for players who search directly for 12-hole ocarina letter notes and need a cleaner starting point than a full mixed library page.'
      }
    ],
    relatedGuideSlugs: [
      'how-to-start-ocarina-with-letter-notes',
      'how-to-practice-ocarina-with-letter-notes',
      'easy-12-hole-ocarina-songs',
      'easy-songs-for-beginners',
      'songs-with-lyrics',
      'simple-instruments-for-music-education'
    ]
  },
  {
    slug: 'easy-12-hole-ocarina-songs',
    kind: 'guide',
    title: 'Easy 12-Hole Ocarina Songs',
    description:
      'A beginner-focused 12-hole ocarina guide with easy songs, letter notes, beginner tabs, and finger charts for familiar melody practice.',
    heroLabel: 'Beginner Guide',
    intro: [
      'This page is for visitors who already know they want easy 12-hole ocarina songs and do not need a mixed-instrument landing page first. It narrows the site down to a cleaner first batch of melodies that fit the standard 12-hole public view well and answer the usual 12-hole ocarina songs or 12-hole ocarina notes search intent more directly.',
      'The goal is to create a cleaner progression: very short nursery tunes first, then holiday, hymn, and first-classical melodies that still sit comfortably for a standard 12-hole reader.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'lightly-row',
      'happy-birthday-to-you',
      'ode-to-joy',
      'jingle-bells',
      'amazing-grace',
      'mary-had-a-little-lamb',
      'frere-jacques',
      'london-bridge',
      'silent-night',
      'deck-the-halls',
      'scarborough-fair'
    ],
    sections: [
      {
        title: 'First Songs That Build Reading Confidence',
        paragraphs: [
          'The strongest first songs for a 12-hole beginner are not necessarily the shortest songs in the library. They are the songs where the phrase shape is easy to hear, the note movement is memorable, and the fingering chart stays readable without feeling crowded.',
          'That is why this guide begins with nursery standards, teaching tunes, and sing-along melodies before moving into the holiday and hymn tunes that beginners often search for next.'
        ],
        songSlugs: [
          'twinkle-twinkle-little-star',
          'mary-had-a-little-lamb',
          'lightly-row',
          'frere-jacques',
          'happy-birthday-to-you'
        ]
      },
      {
        title: 'Songs That Feel Bigger Without Becoming Advanced',
        paragraphs: [
          'Once the first short songs feel manageable, many players want melodies that sound fuller but still behave well in letter-note form. Familiar holiday tunes and slow hymn-style melodies are usually the best next step.'
        ],
        songSlugs: ['ode-to-joy', 'jingle-bells', 'silent-night', 'amazing-grace']
      },
      {
        title: 'How To Practice These 12-Hole Pages',
        paragraphs: [
          'Start in the default 12-hole view and keep the fingering chart visible until the melody feels stable. The goal is to build consistency on one reusable melody page instead of collecting screenshots or alternate tab versions.',
          'Use lyrics when they help phrase timing, and use zoom before changing note mode. That keeps the page closer to how a beginner actually reads.'
        ],
        bullets: [
          'Warm up with one short song you can already hum.',
          'Add one longer melody only after the first song feels automatic.',
          'Use numbered notes as a backup view, not the main reading mode.'
        ]
      }
    ],
    faq: [
      {
        question: 'Why is there a separate 12-hole beginner guide if the main ocarina guide already exists?',
        answer:
          'Because some searchers look specifically for easy 12-hole ocarina songs. This page answers that narrower intent with a cleaner first batch of melodies.'
      },
      {
        question: 'Does this change how the song pages work?',
        answer:
          'No. What changes is the repertoire order, not the page mechanics. This guide simply narrows the first batch to songs that behave well for a standard 12-hole beginner.'
      }
    ],
    relatedGuideSlugs: [
      '12-hole-ocarina-letter-notes',
      'easy-ocarina-songs-for-beginners',
      'easy-christmas-ocarina-songs'
    ]
  },
  {
    slug: '6-hole-ocarina-letter-notes',
    kind: 'hub',
    title: '6-Hole Ocarina Letter Notes',
    description:
      'A public guide for players who want 6-hole ocarina songs with letter notes, beginner-friendly melody choices, and direct links that open the song page with the 6-hole fingering view selected.',
    heroLabel: 'Instrument Guide',
    intro: [
      'This guide is for visitors who search specifically for 6-hole ocarina letter notes and want a starter set that opens with the right fingering view already in place. It removes the extra filtering step and keeps attention on short, range-safe melodies that make sense on 6-hole ocarina.',
      'That narrower focus matters because 6-hole players usually need short, range-safe melodies and setup confidence before they care about broader library coverage.'
    ],
    featuredSongSlugs: [
      { slug: 'twinkle-twinkle-little-star', instrumentId: 'o6' },
      { slug: 'mary-had-a-little-lamb', instrumentId: 'o6' },
      { slug: 'frere-jacques', instrumentId: 'o6' },
      { slug: 'london-bridge', instrumentId: 'o6' },
      { slug: 'row-row-row-your-boat', instrumentId: 'o6' },
      { slug: 'old-macdonald', instrumentId: 'o6' },
      { slug: 'jingle-bells', instrumentId: 'o6' },
      { slug: 'ode-to-joy', instrumentId: 'o6' },
      { slug: 'deck-the-halls', instrumentId: 'o6' },
      { slug: 'silent-night', instrumentId: 'o6' }
    ],
    sections: [
      {
        title: 'Best First Songs For 6-Hole Players',
        paragraphs: [
          'Short songs with repeated phrases make the 6-hole layout easier to trust. They let beginners stay focused on breath direction and fingering shape instead of trying to decode a long melody all at once.',
          'That is why this page starts with nursery and children’s-song standards before moving into longer holiday and classical favorites.'
        ],
        songSlugs: [
          { slug: 'twinkle-twinkle-little-star', instrumentId: 'o6' },
          { slug: 'mary-had-a-little-lamb', instrumentId: 'o6' },
          { slug: 'frere-jacques', instrumentId: 'o6' },
          { slug: 'london-bridge', instrumentId: 'o6' }
        ]
      },
      {
        title: 'How To Practice On The Public Song Pages',
        paragraphs: [
          'Open the song in the default letter-note view first and keep the fingering chart visible. On a 6-hole ocarina, that combination gives the clearest bridge between the melody you recognize and the finger pattern you need to build.',
          'If the phrase feels too dense, use measure numbers and zoom before switching to numbered notes. The goal of this guide is to keep the first reading pass simple, not to force more notation detail too early.'
        ],
        bullets: [
          'Start with songs that repeat the same phrase shape more than once.',
          'Keep the fingering chart on until the note changes feel familiar.',
          'Use zoom for phrase practice instead of trying to read the whole page at once.'
        ]
      },
      {
        title: 'When To Move Beyond The Easiest Tunes',
        paragraphs: [
          'Once the shortest melodies feel stable, step up to tunes with longer phrase lines or more sustained notes. They still work well on the same 6-hole view, but they ask for better breath timing and cleaner finger transitions.'
        ],
        songSlugs: [
          { slug: 'jingle-bells', instrumentId: 'o6' },
          { slug: 'ode-to-joy', instrumentId: 'o6' },
          { slug: 'silent-night', instrumentId: 'o6' }
        ]
      }
    ],
    faq: [
      {
        question: 'Do these links open a different kind of song page?',
        answer:
          'No. The practical difference is convenience: this guide starts from the 6-hole view so beginners can spend time on fingering and breath, not setup clicks.'
      },
      {
        question: 'Is this page only for absolute beginners?',
        answer:
          'It is beginner-first, but it is also useful for returning players who want familiar melodies to test their 6-hole fingering confidence.'
      }
    ],
    relatedGuideSlugs: [
      'easy-6-hole-ocarina-songs',
      'easy-ocarina-songs-for-beginners',
      '12-hole-ocarina-letter-notes'
    ]
  },
  {
    slug: 'recorder-letter-notes',
    kind: 'hub',
    title: 'Recorder Letter Notes',
    description:
      'A themed recorder entry page for searchable melody pages with letter notes, fingering support, and practical songs for classroom or beginner practice, including Baroque and German setup paths where supported.',
    heroLabel: 'Instrument Guide',
    intro: [
      'This guide is aimed at players and teachers searching for recorder letter notes instead of a full mixed song catalog. It gives them a narrower page with clearer next steps.',
      'That makes the page useful for classroom and home practice alike: it emphasizes melodies teachers can cue quickly, songs students can already sing, and setup choices that match the actual recorder in hand.'
    ],
    featuredSongSlugs: withInstrument(
      [
        'twinkle-twinkle-little-star',
        'mary-had-a-little-lamb',
        'lightly-row',
        'frere-jacques',
        'london-bridge',
        'old-macdonald',
        'happy-birthday-to-you',
        'ode-to-joy',
        'amazing-grace',
        'greensleeves',
        'scarborough-fair',
        'jingle-bells'
      ],
      'r8b'
    ),
    sections: [
      {
        title: 'Best Recorder Songs For First Reading Practice',
        paragraphs: [
          'Short classroom melodies work best here because they let new readers connect the letter-note line to finger movement before rhythm and phrase length become the bigger problem.'
        ],
        songSlugs: withInstrument(
          [
            'twinkle-twinkle-little-star',
            'mary-had-a-little-lamb',
            'lightly-row',
            'frere-jacques',
            'london-bridge',
            'old-macdonald',
            'happy-birthday-to-you'
          ],
          'r8b'
        )
      },
      {
        title: 'How This Supports Classroom Use',
        paragraphs: [
          'Recorder learners often need music that is searchable, readable on mobile, and easy to explain without staff notation. These pages do that by keeping the melody front and center.',
          'The function zone also gives teachers a way to simplify what students see before moving them to longer or denser tunes.'
        ],
        bullets: [
          'Use familiar melodies first so class time goes to finger patterns, not tune recognition.',
          'Choose the Baroque or German recorder setup that matches the recorder in hand.',
          'Turn lyrics on when the public page supports them and singing will help phrase entry.',
          'Move to longer songs only after the first easy pages feel automatic.'
        ]
      },
      {
        title: 'Next Songs To Add After The Basics',
        paragraphs: [
          'Once players handle the first nursery set comfortably, shift into holiday, hymn, folk, and classical melodies that stretch phrase control a little further.'
        ],
        songSlugs: withInstrument(
          ['ode-to-joy', 'amazing-grace', 'greensleeves', 'scarborough-fair', 'jingle-bells', 'silent-night'],
          'r8b'
        )
      }
    ],
    faq: [
      {
        question: 'Do these songs only work on recorder?',
        answer:
          'No. The public song pages can switch between the supported instruments, but this guide is written specifically for recorder-focused search intent, including Baroque and German recorder setup needs where supported.'
      },
      {
        question: 'Why use a recorder guide instead of the full library?',
        answer:
          'Because search users landing on a recorder-specific page get a clearer answer faster, which is better for both usability and search performance.'
      }
    ],
    relatedGuideSlugs: [
      'how-to-start-recorder-with-letter-notes',
      'how-to-practice-recorder-with-letter-notes',
      'easy-recorder-songs-for-beginners',
      'easy-christmas-recorder-songs',
      'folk-songs-for-beginners',
      'songs-with-lyrics'
    ]
  },
  {
    slug: 'tin-whistle-letter-notes',
    kind: 'hub',
    title: 'Tin Whistle Letter Notes',
    description:
      'A focused tin whistle landing page for players who want searchable melody pages with letter notes, familiar folk songs, and an easy path into the main library with key-specific whistle setup support where available.',
    heroLabel: 'Instrument Guide',
    intro: [
      'Tin whistle players often search for simple melody pages before they search by tune family. This guide is built to catch that intent and move visitors straight into songs they already recognize.',
      'The first links mix familiar beginner melodies with slower folk and hymn tunes that reward cleaner breath planning, so the page feels like a whistle-first practice shelf instead of a generic mixed library.'
    ],
    featuredSongSlugs: withInstrument(
      [
        'amazing-grace',
        'red-river-valley',
        'scarborough-fair',
        'greensleeves',
        'loch-lomond',
        'auld-lang-syne',
        'londonderry-air',
        'the-south-wind',
        'wellerman',
        'twinkle-twinkle-little-star',
        'ode-to-joy',
        'jingle-bells'
      ],
      'w6'
    ),
    sections: [
      {
        title: 'Easy Tin Whistle Songs To Begin With',
        paragraphs: [
          'The easiest whistle pages on the site are the ones where the melody is already familiar and the phrase structure is easy to hear before you even start playing.'
        ],
        songSlugs: withInstrument(
          ['twinkle-twinkle-little-star', 'ode-to-joy', 'amazing-grace', 'red-river-valley'],
          'w6'
        )
      },
      {
        title: 'When To Move Into Folk Songs',
        paragraphs: [
          'Folk songs are a natural second step because they build musical phrasing without overwhelming the player with long technical passages. They also tend to work well in letter-note form.'
        ],
        songSlugs: withInstrument(
          [
            'red-river-valley',
            'auld-lang-syne',
            'scarborough-fair',
            'greensleeves',
            'loch-lomond',
            'londonderry-air',
            'wellerman'
          ],
          'w6'
        )
      },
      {
        title: 'How To Practice These Pages',
        paragraphs: [
          'Stay on the fingering chart while the melody is still unstable, then use zoom and layout controls to keep the page readable during repeat practice.',
          'For slower tunes, keep attention on breath timing and phrase endings instead of trying to push speed too early.'
        ],
        bullets: [
          'Pick one familiar tune and one longer phrase tune.',
          'Use the same song page for repeated practice instead of jumping between transcriptions.',
          'Keep the matching whistle key selected when the song offers more than one setup.',
          'Treat numbered notes as a backup view, not the main reading mode.'
        ]
      }
    ],
    faq: [
      {
        question: 'Why does a tin whistle guide matter if the songs are already in the library?',
        answer:
          'Because a search user looking for tin whistle letter notes should land on a page that immediately confirms the site has that use case, instead of making them infer it from a broader library.'
      },
      {
        question: 'Can I still reach the full song page from here?',
        answer:
          'Yes. The value here is not a different destination but a whistle-first starting point, with the matching key view already selected when the song supports it.'
      }
    ],
    relatedGuideSlugs: [
      'how-to-start-tin-whistle-with-letter-notes',
      'how-to-practice-tin-whistle-with-letter-notes',
      'easy-tin-whistle-songs',
      'celtic-tin-whistle-songs',
      'folk-songs-for-beginners',
      'easy-christmas-tin-whistle-songs',
      'songs-with-lyrics'
    ]
  },
  {
    slug: 'how-to-start-ocarina-with-letter-notes',
    kind: 'guide',
    title: 'How to Start Ocarina With Letter Notes',
    description:
      'A practical starter guide for first-time ocarina players who want to begin with letter notes, visible fingering charts, and familiar songs instead of staff-heavy sheet music.',
    heroLabel: 'Starter Guide',
    intro: [
      'Many beginners search for help before they search for one song title. They want to know how to start ocarina in a way that feels readable, familiar, and close to the instrument in their hands.',
      'Instead of explaining technique in the abstract, it organizes the first week around a small sequence of songs: one tune you can hum already, one birthday or classroom melody, and one longer phrase piece once the fingers settle.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'mary-had-a-little-lamb',
      'frere-jacques',
      'ode-to-joy',
      'amazing-grace',
      'jingle-bells'
    ],
    sections: [
      {
        title: 'What To Do On Your First Day',
        paragraphs: [
          'The best first ocarina songs are the ones you can already hear in your head. That way the letter-note view helps you follow the melody shape instead of forcing you to decode both the tune and the fingering at the same time.',
          'Start with one nursery melody, keep the fingering chart on, and repeat the same page until the note changes feel predictable. That is more useful than jumping between many songs on day one.'
        ],
        bullets: [
          'Start with one song you can already hum from memory.',
          'Keep the fingering chart visible until the shape of the melody settles in.',
          'Use numbered notes only as a backup view, not the main way to learn the page.'
        ],
        songSlugs: [
          'twinkle-twinkle-little-star',
          'mary-had-a-little-lamb',
          'frere-jacques',
          'happy-birthday-to-you'
        ]
      },
      {
        title: 'How To Start On 12-Hole Ocarina',
        paragraphs: [
          'If you are starting on a standard 12-hole ocarina, stay in the default song view first. The easiest pages on the site are usually the ones with short phrases, familiar contour, and enough space that the fingering chart still feels readable.',
          'Once the first nursery songs feel comfortable, add one longer melody that asks for slower phrase control instead of faster finger changes.'
        ],
        songSlugs: ['london-bridge', 'ode-to-joy', 'jingle-bells', 'amazing-grace']
      },
      {
        title: 'How To Start On 6-Hole Ocarina',
        paragraphs: [
          'If you are starting on a 6-hole instrument, it helps to land directly on pages that open the 6-hole fingering view. Short repeated melodies work especially well because they let you confirm the finger pattern quickly before the song gets longer.',
          'Use the related 6-hole guide when you want a bigger pool of songs, but begin with the simplest pages first so the letter-note workflow feels trustworthy.'
        ],
        songSlugs: withInstrument(
          [
            'twinkle-twinkle-little-star',
            'mary-had-a-little-lamb',
            'row-row-row-your-boat',
            'jingle-bells'
          ],
          'o6'
        )
      }
    ],
    faq: [
      {
        question: 'Do I need to learn staff notation before using these pages?',
        answer:
          'No. The point is to let beginners start from recognizable tunes first, so note reading grows out of melody memory instead of depending on staff notation from day one.'
      },
      {
        question: 'Does this guide replace the main ocarina song pages?',
        answer:
          'No. It simply organizes the first steps more clearly, so a new player can move from one useful tune to the next without guessing where to begin.'
      }
    ],
    relatedGuideSlugs: [
      '12-hole-ocarina-letter-notes',
      'how-to-practice-ocarina-with-letter-notes',
      '6-hole-ocarina-letter-notes',
      'easy-ocarina-songs-for-beginners',
      'how-to-read-letter-notes'
    ]
  },
  {
    slug: 'how-to-start-recorder-with-letter-notes',
    kind: 'guide',
    title: 'How to Start Recorder With Letter Notes',
    description:
      'A practical starter guide for beginners and teachers who want to start recorder with letter notes, easy songs, and a clear bridge into simple finger patterns, including Baroque or German setup choices where supported.',
    heroLabel: 'Starter Guide',
    intro: [
      'Recorder beginners often search for a simpler way to begin than a full method book or a mixed library page. They want recorder letter notes, a handful of familiar songs, and a practice flow that works in short lessons or classroom warmups.',
      'The page is structured around short-lesson reality: a few tunes students already know, a readable first pass with visible fingering, and setup choices that match Baroque or German classroom recorders.'
    ],
    featuredSongSlugs: withInstrument(
      [
        'twinkle-twinkle-little-star',
        'mary-had-a-little-lamb',
        'lightly-row',
        'frere-jacques',
        'ode-to-joy',
        'happy-birthday-to-you'
      ],
      'r8b'
    ),
    sections: [
      {
        title: 'Best Recorder Songs For The First Lessons',
        paragraphs: [
          'The strongest first recorder pages are the ones that keep the melody familiar and the reading load light. That lets the student connect note names, finger changes, and breath timing without getting lost in staff-heavy notation or a long tune.',
          'Short nursery songs, teaching tunes, and birthday melodies are especially useful because the phrase shapes repeat and the tune is already easy to recognize.'
        ],
        songSlugs: withInstrument(
          [
            'twinkle-twinkle-little-star',
            'mary-had-a-little-lamb',
            'lightly-row',
            'frere-jacques',
            'happy-birthday-to-you'
          ],
          'r8b'
        )
      },
      {
        title: 'How To Use These Pages In Class Or Home Practice',
        paragraphs: [
          'Keep the page simple during the first pass. Leave the fingering chart visible, use one familiar tune at a time, and avoid changing settings too often while the melody is still new.',
          'For classroom use, these pages work best when the teacher can point to one clear melody page instead of moving students between screenshots, lyric sites, and separate fingering diagrams.'
        ],
        bullets: [
          'Use one short song as the class warm-up every week.',
          'Match the Baroque or German setup to the recorder before students start reading.',
          'Keep the fingering chart on until finger changes feel automatic.',
          'Turn lyrics on only when they help students hear phrase timing more clearly.'
        ],
        songSlugs: withInstrument(['jingle-bells', 'ode-to-joy', 'silent-night'], 'r8b')
      },
      {
        title: 'What To Add After The First Easy Songs',
        paragraphs: [
          'Once the first classroom melodies feel steady, move into one seasonal tune and one slightly longer lyrical tune. That adds variety without forcing beginners into a new notation system or a more complicated reading setup.'
        ],
        songSlugs: withInstrument(
          ['amazing-grace', 'deck-the-halls', 'we-wish-you-a-merry-christmas'],
          'r8b'
        )
      }
    ],
    faq: [
      {
        question: 'Is this guide only for children?',
        answer:
          'No. It also works for adult beginners, parents helping at home, and teachers who want a more direct melody-first reading layer for early lessons.'
      },
      {
        question: 'Do these links open a different recorder page?',
        answer:
          'No. The point is to land recorder learners closer to the right setup from the first click, especially when Baroque or German fingering choices matter.'
      }
    ],
    relatedGuideSlugs: [
      'recorder-letter-notes',
      'how-to-practice-recorder-with-letter-notes',
      'easy-recorder-songs-for-beginners',
      'music-class-songs-for-beginners',
      'how-to-read-letter-notes'
    ]
  },
  {
    slug: 'how-to-start-tin-whistle-with-letter-notes',
    kind: 'guide',
    title: 'How to Start Tin Whistle With Letter Notes',
    description:
      'A practical starter guide for new tin whistle players who want easy letter-note songs, visible fingerings, and a familiar first route into folk and beginner melody pages with key-specific setup support where available.',
    heroLabel: 'Starter Guide',
    intro: [
      'New tin whistle players often begin by searching for easy songs and clear fingerings, not by searching for ornament-heavy whistle repertoire. They want to know which melodies will actually feel manageable in the first week.',
      'The first set leans on tunes that teach breath and phrase shape without requiring ornament, which is closer to what a new whistle player actually needs than a broad folk archive.'
    ],
    featuredSongSlugs: withInstrument(
      [
        'twinkle-twinkle-little-star',
        'ode-to-joy',
        'amazing-grace',
        'red-river-valley',
        'auld-lang-syne',
        'scarborough-fair'
      ],
      'w6'
    ),
    sections: [
      {
        title: 'Best Tin Whistle Songs To Start With',
        paragraphs: [
          'The easiest first whistle pages are usually the melodies you already know well. That lowers the reading barrier and lets you focus on steady breath, clean finger lifts, and phrase endings instead of trying to guess the tune.',
          'Short familiar songs are the best first step. After that, slower folk or hymn melodies give you a better way to build phrasing without jumping straight into faster ornamented material.'
        ],
        songSlugs: withInstrument(
          ['twinkle-twinkle-little-star', 'ode-to-joy', 'amazing-grace', 'red-river-valley'],
          'w6'
        )
      },
      {
        title: 'How To Practice Breath And Phrase Shape',
        paragraphs: [
          'Use one page for repeated practice instead of collecting many alternate tabs. The whistle gets easier faster when you stay with one recognizable melody and listen for phrase shape while the fingers settle in.',
          'For slower songs, keep the breath relaxed and do not chase speed. A calm folk melody is often a better teacher than a fast showpiece in the early stage.'
        ],
        bullets: [
          'Keep the fingering chart on until the tune feels stable.',
          'Use the whistle key option that matches the fingering chart on the song page.',
          'Use zoom when a longer page feels crowded instead of abandoning the song.',
          'Choose one familiar song and one slower folk melody for each practice block.'
        ],
        songSlugs: withInstrument(['scarborough-fair', 'auld-lang-syne', 'the-south-wind'], 'w6')
      },
      {
        title: 'Where To Go After The First Easy Tunes',
        paragraphs: [
          'Once the first easy pages feel secure, move into the broader whistle guides. That keeps the same reading workflow while giving you more folk, seasonal, and Celtic-friendly material.'
        ],
        songSlugs: withInstrument(
          ['irish-morning-wind', 'loch-lomond', 'jingle-bells', 'silent-night'],
          'w6'
        )
      }
    ],
    faq: [
      {
        question: 'Is this guide only for Irish traditional players?',
        answer:
          'No. It is meant for new tin whistle players in general. It starts with very familiar melodies first, then points toward folk and Celtic-friendly material once the basics feel easier.'
      },
      {
        question: 'Does this page change the public whistle player?',
        answer:
          'No. It is a beginner path, not a separate player. The whistle view opens first, and supported key choices remain available when you start moving beyond the first few tunes.'
      }
    ],
    relatedGuideSlugs: [
      'tin-whistle-letter-notes',
      'how-to-practice-tin-whistle-with-letter-notes',
      'easy-tin-whistle-songs',
      'celtic-tin-whistle-songs',
      'how-to-read-letter-notes'
    ]
  },
  {
    slug: 'how-to-practice-ocarina-with-letter-notes',
    kind: 'guide',
    title: 'How to Practice Ocarina With Letter Notes',
    description:
      'A practical ocarina practice guide for beginners who want a simple routine built around letter notes, visible fingering charts, and a small set of familiar public song pages.',
    heroLabel: 'Practice Guide',
    intro: [
      'After the first few songs, many players stop searching for one melody and start searching for a better practice routine. They want to know how to use letter notes in a way that builds consistency instead of just collecting more tabs.',
      'This guide keeps the practice answer tied to real songs already worth repeating. Instead of abstract drills, it shows how to rotate short tunes, longer phrases, and repeat work so an ocarina routine stays simple enough to follow.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'london-bridge',
      'ode-to-joy',
      'amazing-grace',
      'silent-night',
      'jingle-bells'
    ],
    sections: [
      {
        title: 'Build A Short Daily Practice Loop',
        paragraphs: [
          'A good beginner practice loop does not need many songs. One short melody, one medium-length tune, and one slower lyrical song usually cover enough repetition, phrasing, and confidence-building for a day.',
          'Letter notes help most when the routine is stable. Repeating the same pages for several days usually teaches more than opening a different transcription every session.'
        ],
        bullets: [
          'Start with one song you can already hum from memory.',
          'Keep the fingering chart visible during the first passes.',
          'Use zoom or layout controls before switching to a different page.'
        ],
        songSlugs: [
          'twinkle-twinkle-little-star',
          'mary-had-a-little-lamb',
          'london-bridge',
          'row-row-row-your-boat'
        ]
      },
      {
        title: 'Add One Longer Song For Phrase Control',
        paragraphs: [
          'Once the shortest songs feel stable, add one melody that asks for slightly longer phrase control. This is where hymn and holiday melodies become useful, because they stay familiar while giving the breath more shape.'
        ],
        songSlugs: ['ode-to-joy', 'amazing-grace', 'silent-night', 'jingle-bells']
      },
      {
        title: 'When To Change View Settings',
        paragraphs: [
          'Do not change every control on every pass. Use the default letter-note view first, leave the fingering chart on, and only switch to numbered notes when you need a backup perspective.',
          'The point of practice is to reduce reading friction, not to create more layout choices than the melody itself needs.'
        ],
        songSlugs: ['frere-jacques', 'happy-birthday-to-you', 'deck-the-halls']
      }
    ],
    faq: [
      {
        question: 'Should I practice a different song every day?',
        answer:
          'Usually no. Most beginners improve faster by repeating a very small set of familiar pages until note changes and phrase shapes feel predictable.'
      },
      {
        question: 'Does this guide change the public ocarina song page?',
        answer:
          'No. It simply explains how to reuse the existing melody pages more deliberately, with a smaller routine and clearer practice priorities.'
      }
    ],
    relatedGuideSlugs: [
      'how-to-start-ocarina-with-letter-notes',
      '12-hole-ocarina-letter-notes',
      'easy-ocarina-songs-for-beginners',
      'how-to-read-letter-notes'
    ]
  },
  {
    slug: 'how-to-practice-recorder-with-letter-notes',
    kind: 'guide',
    title: 'How to Practice Recorder With Letter Notes',
    description:
      'A practical recorder practice guide for beginners, parents, and teachers who want simple routines built around letter notes, clear fingerings, and a small set of usable public song pages.',
    heroLabel: 'Practice Guide',
    intro: [
      'Recorder practice works best when the page is easier to follow than the student’s current technique. That is why so many beginners and teachers search for a clearer practice route, not just more songs.',
      'This guide turns the public recorder song pages into a simple routine: one short tune, one class-friendly repeat song, and one longer melody for phrase control.'
    ],
    featuredSongSlugs: withInstrument(
      [
        'twinkle-twinkle-little-star',
        'mary-had-a-little-lamb',
        'frere-jacques',
        'ode-to-joy',
        'jingle-bells',
        'amazing-grace'
      ],
      'r8b'
    ),
    sections: [
      {
        title: 'Use The Same Warm-Up Songs Repeatedly',
        paragraphs: [
          'A recorder warm-up is more useful when students already know the tune. That keeps the attention on finger changes, breathing, and rhythm instead of asking them to learn a new melody and a new pattern at the same time.'
        ],
        bullets: [
          'Pick one nursery melody and one sing-along melody.',
          'Leave the fingering chart on until the class stops hesitating on note changes.',
          'Use the same opening pages for several lessons in a row.'
        ],
        songSlugs: withInstrument(
          [
            'twinkle-twinkle-little-star',
            'mary-had-a-little-lamb',
            'frere-jacques',
            'happy-birthday-to-you'
          ],
          'r8b'
        )
      },
      {
        title: 'Add One Song That Trains Phrase Length',
        paragraphs: [
          'Once the first songs are comfortable, bring in one melody with slightly longer phrases. This helps the student practice airflow and note connection without leaving the same readable letter-note workflow.'
        ],
        songSlugs: withInstrument(['ode-to-joy', 'amazing-grace', 'silent-night'], 'r8b')
      },
      {
        title: 'Keep Home Practice And Class Practice Aligned',
        paragraphs: [
          'Students improve faster when home practice uses the exact melody page they already saw in class. Instead of sending families to unrelated lyric sheets or screenshots, reuse the same song links so finger memory and visual memory stay aligned.'
        ],
        songSlugs: withInstrument(
          ['jingle-bells', 'deck-the-halls', 'we-wish-you-a-merry-christmas'],
          'r8b'
        )
      }
    ],
    faq: [
      {
        question: 'Is this guide only for classroom recorder?',
        answer:
          'No. It also fits adult beginners and parents helping at home. The main idea is simply to turn the public recorder pages into a smaller, repeatable practice routine.'
      },
      {
        question: 'Why use letter notes instead of only staff notation for early practice?',
        answer:
          'Because many beginners need one reading layer they can trust before they are ready to decode everything from staff notation alone. Letter notes reduce that early friction.'
      }
    ],
    relatedGuideSlugs: [
      'how-to-start-recorder-with-letter-notes',
      'recorder-letter-notes',
      'easy-recorder-songs-for-beginners',
      'music-class-songs-for-beginners'
    ]
  },
  {
    slug: 'how-to-practice-tin-whistle-with-letter-notes',
    kind: 'guide',
    title: 'How to Practice Tin Whistle With Letter Notes',
    description:
      'A practical tin whistle practice guide for beginners who want to use letter notes, visible fingerings, and a small rotation of familiar songs to build steady breath and clean phrasing.',
    heroLabel: 'Practice Guide',
    intro: [
      'Tin whistle beginners often improve faster when they stop chasing more tabs and start repeating a few stable melodies. The question becomes less about finding another song and more about how to practice the songs they already have.',
      'This guide keeps that answer anchored to whistle-friendly melody pages already worth revisiting. It uses familiar tunes, slower folk songs, and seasonal melodies to build a simple routine without turning practice into a search project.'
    ],
    featuredSongSlugs: withInstrument(
      [
        'twinkle-twinkle-little-star',
        'ode-to-joy',
        'red-river-valley',
        'auld-lang-syne',
        'scarborough-fair',
        'silent-night'
      ],
      'w6'
    ),
    sections: [
      {
        title: 'Repeat One Familiar Tune Until The Fingers Settle',
        paragraphs: [
          'The whistle becomes easier when the melody is already in your ear. That lets you listen for clean finger lifts and balanced breath instead of guessing whether the page is correct.',
          'Keep the same first melody for several sessions so the page becomes a reference point instead of a new puzzle every time.'
        ],
        bullets: [
          'Choose one short familiar tune as the daily reset.',
          'Keep the fingering chart visible until the tune feels stable.',
          'Use letter notes to confirm melody direction before worrying about speed.'
        ],
        songSlugs: withInstrument(
          ['twinkle-twinkle-little-star', 'ode-to-joy', 'red-river-valley'],
          'w6'
        )
      },
      {
        title: 'Use Slower Folk Songs To Train Phrase Shape',
        paragraphs: [
          'Slower folk melodies are useful because they reward tone and phrasing, not just quick fingers. They are often better practice material than fast whistle showpieces in the early stage.'
        ],
        songSlugs: withInstrument(
          ['auld-lang-syne', 'scarborough-fair', 'the-south-wind', 'irish-morning-wind'],
          'w6'
        )
      },
      {
        title: 'Rotate In Seasonal Songs Without Changing Workflow',
        paragraphs: [
          'Once the core practice songs feel reliable, add one seasonal melody to keep the routine interesting. The point is variety without switching to a different notation style or a different public route.'
        ],
        songSlugs: withInstrument(['jingle-bells', 'silent-night', 'deck-the-halls'], 'w6')
      }
    ],
    faq: [
      {
        question: 'Do I need Irish traditional technique before using these pages?',
        answer:
          'No. This guide is for early-stage practice. It focuses on tune stability, phrasing, and readable note support before advanced ornament work becomes relevant.'
      },
      {
        question: 'Will these links still open the normal public whistle song page?',
        answer:
          'Yes. The whistle view is preselected, but the underlying public detail page and controls stay the same.'
      }
    ],
    relatedGuideSlugs: [
      'how-to-start-tin-whistle-with-letter-notes',
      'tin-whistle-letter-notes',
      'easy-tin-whistle-songs',
      'celtic-tin-whistle-songs'
    ]
  },
  {
    slug: 'easy-ocarina-songs-for-beginners',
    kind: 'guide',
    title: 'Easy Ocarina Songs For Beginners',
    description:
      'A guide page for beginners who want easy ocarina songs with letter notes, familiar melodies, and a clearer path into the public fingering-chart song pages.',
    heroLabel: 'Beginner Guide',
    intro: [
      'Many first-time players do not search for one song title. They search for an easier starting set, especially when they are still learning how letter notes, fingering charts, and breath phrasing work together on ocarina.',
      'This guide collects the public song pages that make the best beginner landing pages. It mixes short nursery songs with a few longer melodies that still feel approachable once the first finger patterns are stable.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'happy-birthday-to-you',
      'ode-to-joy',
      'jingle-bells',
      'amazing-grace',
      'silent-night'
    ],
    sections: [
      {
        title: 'Start With Familiar, Repetitive Melodies',
        paragraphs: [
          'The fastest early progress usually comes from songs you already know by ear. That lowers the reading load and lets you focus on rhythm, finger motion, and phrase shape instead of guessing how the tune should sound.',
          'Simple children’s songs and birthday melodies are especially useful because the phrases repeat and the destination notes feel obvious.'
        ],
        songSlugs: [
          'twinkle-twinkle-little-star',
          'mary-had-a-little-lamb',
          'frere-jacques',
          'happy-birthday-to-you'
        ]
      },
      {
        title: 'Move Into Longer Beginner-Friendly Favorites',
        paragraphs: [
          'Once the shortest tunes feel comfortable, it helps to move into songs that are still recognizable but ask for a little more control. This is where hymn, holiday, and light classical melodies become useful.'
        ],
        songSlugs: ['ode-to-joy', 'jingle-bells', 'amazing-grace', 'silent-night']
      },
      {
        title: 'How To Use This Guide',
        paragraphs: [
          'Use this page as a beginner playlist rather than a one-time article. Pick one short song, one medium song, and one seasonal or lyrical song so you get repetition without getting bored.',
          'If you play 6-hole ocarina, follow the related 6-hole guide next. If you play 12-hole ocarina, stay in the default view and use numbered notes only as a backup reading mode.'
        ],
        bullets: [
          'Start with a song you can already hum from memory.',
          'Keep the fingering chart visible until note changes feel automatic.',
          'Use one easy melody as a daily warm-up before longer songs.'
        ]
      }
    ],
    faq: [
      {
        question: 'Is this only for 12-hole ocarina?',
        answer:
          'No. It is an ocarina-first beginner guide, and related links can still send you straight into the 6-hole view when that instrument makes more sense.'
      },
      {
        question: 'Why not just list every easy song on one page?',
        answer:
          'Because beginners usually need a narrower first set. This guide is meant to shorten the gap between search intent and the songs that are most likely to feel manageable on day one.'
      }
    ],
    relatedGuideSlugs: [
      '12-hole-ocarina-letter-notes',
      '6-hole-ocarina-letter-notes',
      'easy-12-hole-ocarina-songs'
    ]
  },
  {
    slug: 'easy-6-hole-ocarina-songs',
    kind: 'guide',
    title: 'Easy 6-Hole Ocarina Songs',
    description:
      'A public beginner guide built around very approachable 6-hole ocarina songs, with direct links into the 6-hole public song view and a strong focus on short, confidence-building melodies.',
    heroLabel: 'Beginner Guide',
    intro: [
      'This page narrows the beginner problem even further than the general ocarina guides. It is for players who specifically want easy 6-hole ocarina songs and would rather begin with the shortest, most repeatable melodies in the library.',
      'Each song here is chosen to keep the first sessions compact: short range, repeatable rhythm, and enough familiarity that a beginner can tell quickly whether the fingering pattern is settling in.'
    ],
    featuredSongSlugs: [
      { slug: 'twinkle-twinkle-little-star', instrumentId: 'o6' },
      { slug: 'mary-had-a-little-lamb', instrumentId: 'o6' },
      { slug: 'frere-jacques', instrumentId: 'o6' },
      { slug: 'london-bridge', instrumentId: 'o6' },
      { slug: 'row-row-row-your-boat', instrumentId: 'o6' },
      { slug: 'jingle-bells', instrumentId: 'o6' },
      { slug: 'old-macdonald', instrumentId: 'o6' },
      { slug: 'do-your-ears-hang-low', instrumentId: 'o6' },
      { slug: 'deck-the-halls', instrumentId: 'o6' },
      { slug: 'ode-to-joy', instrumentId: 'o6' }
    ],
    sections: [
      {
        title: 'The Smallest Learning Steps',
        paragraphs: [
          'For 6-hole beginners, the best first page is often the page with the fewest surprises. Songs with compact range, repeated motives, and obvious cadence points make the first sessions feel productive instead of confusing.'
        ],
        songSlugs: [
          { slug: 'twinkle-twinkle-little-star', instrumentId: 'o6' },
          { slug: 'mary-had-a-little-lamb', instrumentId: 'o6' },
          { slug: 'row-row-row-your-boat', instrumentId: 'o6' },
          { slug: 'frere-jacques', instrumentId: 'o6' }
        ]
      },
      {
        title: 'Songs That Keep Beginners Interested',
        paragraphs: [
          'Once the first two or three melodies feel comfortable, switch to songs that are still easy but sound a little more like “real repertoire.” Holiday tunes and sing-along standards are useful here because they feel rewarding without becoming too abstract.'
        ],
        songSlugs: [
          { slug: 'london-bridge', instrumentId: 'o6' },
          { slug: 'old-macdonald', instrumentId: 'o6' },
          { slug: 'do-your-ears-hang-low', instrumentId: 'o6' },
          { slug: 'jingle-bells', instrumentId: 'o6' }
        ]
      },
      {
        title: 'What To Do After These Songs',
        paragraphs: [
          'After this set, the next step is usually not a harder article. It is a slightly longer melody in the same song-page workflow. Move into the broader 6-hole guide or the general easy ocarina guide when you want more variety without losing the beginner-friendly structure.'
        ],
        bullets: [
          'Keep one ultra-easy song as a daily reset tune.',
          'Add one new melody at a time instead of rotating through many pages.',
          'Use the broader ocarina guides when you want longer tunes without giving up the same easy-to-follow note layout.'
        ]
      }
    ],
    faq: [
      {
        question: 'Do I need a different site section for 6-hole songs?',
        answer:
          'No. What you need is a cleaner first subset, and that is what this page provides: the most approachable songs, already framed for 6-hole use.'
      },
      {
        question: 'Why are nursery songs included here?',
        answer:
          'Because on a 6-hole ocarina they are often the fastest way to build confidence with finger changes, breath control, and note recognition.'
      }
    ],
    relatedGuideSlugs: [
      '6-hole-ocarina-letter-notes',
      'easy-ocarina-songs-for-beginners',
      'nursery-rhyme-letter-notes'
    ]
  },
  {
    slug: 'easy-christmas-ocarina-songs',
    kind: 'guide',
    title: 'Easy Christmas Ocarina Songs',
    description:
      'A holiday-focused ocarina guide with easy Christmas songs, letter notes, and direct links into the public song pages for players who want seasonal melodies without leaving the main site workflow.',
    heroLabel: 'Seasonal Guide',
    intro: [
      'Holiday searchers usually do not want a broad mixed-song page. They want a short list of Christmas melodies that already feel playable on ocarina and can open straight into a readable public song page.',
      'This guide gives seasonal players a smaller shelf of carols and sing-along tunes that work quickly on ocarina, instead of making them scan the whole library during a short holiday practice window.'
    ],
    featuredSongSlugs: [
      'jingle-bells',
      'deck-the-halls',
      'silent-night',
      'we-wish-you-a-merry-christmas',
      'jolly-old-saint-nicholas',
      'joy-to-the-world',
      'hark-the-herald-angels-sing'
    ],
    sections: [
      {
        title: 'The Easiest Christmas Songs To Start With',
        paragraphs: [
          'The easiest holiday songs are usually the ones with compact phrases, obvious repetition, and a melody shape that most players already know before they open the page. Those songs turn seasonal curiosity into an actual first practice session.'
        ],
        songSlugs: [
          'jingle-bells',
          'deck-the-halls',
          'we-wish-you-a-merry-christmas',
          'jolly-old-saint-nicholas'
        ]
      },
      {
        title: 'Slower Songs For A More Lyrical Holiday Set',
        paragraphs: [
          'After the shortest tunes, slower Christmas melodies often work better than faster ones because they teach breath timing, phrase shape, and steadier fingering transitions without feeling technical.'
        ],
        songSlugs: [
          'silent-night',
          'joy-to-the-world',
          'god-rest-you-merry-gentlemen',
          'good-king-wenceslas',
          'hark-the-herald-angels-sing'
        ]
      },
      {
        title: 'How To Use This Page During The Holiday Season',
        paragraphs: [
          'Treat this guide like a seasonal practice shelf. Keep two or three songs open in rotation instead of trying to learn every Christmas tune at once.',
          'If you want the broader holiday set beyond ocarina-specific intent, continue into the general Christmas guide after this page.'
        ],
        bullets: [
          'Start with one fast sing-along tune and one slower lyrical tune.',
          'Leave the fingering chart on for the first few passes.',
          'Use the general Christmas guide when you want more holiday variety.'
        ]
      }
    ],
    faq: [
      {
        question: 'Is this only for December traffic?',
        answer:
          'It is seasonal by nature, but Christmas song pages often keep attracting search traffic before school concerts, holiday events, and winter practice periods.'
      },
      {
        question: 'Do these links open a different ocarina page?',
        answer:
          'No. The advantage is focus, not a separate format: holiday visitors get straight to the most usable Christmas melodies without wading through the full library first.'
      }
    ],
    relatedGuideSlugs: [
      'christmas-letter-note-songs',
      'easy-12-hole-ocarina-songs',
      '12-hole-ocarina-letter-notes'
    ]
  },
  {
    slug: 'easy-recorder-songs-for-beginners',
    kind: 'hub',
    title: 'Easy Recorder Songs for Beginners',
    description:
      'A recorder-first beginner guide for easy songs, letter notes, and finger-chart support with a cleaner path into the public melody library.',
    heroLabel: 'Instrument Guide',
    intro: [
      'Some searchers are not looking for recorder theory or a full catalog. They want easy recorder songs, simple recorder songs, and beginner tunes they can recognize quickly and start reading in letter notes right away.',
      'This page answers that need with a smaller recorder-first set: familiar classroom tunes first, then a few longer melodies that still feel realistic for early breath and fingering practice.'
    ],
    featuredSongSlugs: withInstrument(
      [
        'twinkle-twinkle-little-star',
        'mary-had-a-little-lamb',
        'lightly-row',
        'frere-jacques',
        'london-bridge',
        'old-macdonald',
        'row-row-row-your-boat',
        'happy-birthday-to-you',
        'ode-to-joy',
        'amazing-grace',
        'greensleeves',
        'scarborough-fair',
        'jingle-bells',
        'silent-night'
      ],
      'r8b'
    ),
    sections: [
      {
        title: 'Best First Recorder Songs On This Site',
        paragraphs: [
          'The strongest first recorder songs are the ones students already know by ear. That keeps practice focused on finger movement, phrase entry, and steady breathing instead of on trying to remember the tune itself.',
          'That is why the list leans on simple recorder songs from nursery, classroom, and first-lesson traditions before moving into longer public melody pages.'
        ],
        songSlugs: withInstrument(
          [
            'twinkle-twinkle-little-star',
            'mary-had-a-little-lamb',
            'lightly-row',
            'frere-jacques',
            'london-bridge',
            'old-macdonald',
            'row-row-row-your-boat'
          ],
          'r8b'
        )
      },
      {
        title: 'How To Use These Recorder Pages',
        paragraphs: [
          'Start with the shortest nursery songs in the default letter-note layout, then keep the fingering chart visible until the melody feels automatic.',
          'When the page starts to feel busy, use zoom and lyrics controls before abandoning a song that is otherwise good for practice.'
        ],
        bullets: [
          'Pick one song you can finish in a single session.',
          'Keep the fingering chart on for the first pass.',
          'Use lyrics only when they help phrase timing instead of distracting from note reading.'
        ]
      },
      {
        title: 'What To Learn After The First Nursery Songs',
        paragraphs: [
          'Once the first short songs feel settled, move into one familiar celebration tune and one longer melody. That helps recorder players build phrase length without leaving the same reading workflow.'
        ],
        songSlugs: withInstrument(
          [
            'happy-birthday-to-you',
            'ode-to-joy',
            'amazing-grace',
            'greensleeves',
            'scarborough-fair',
            'jingle-bells'
          ],
          'r8b'
        )
      }
    ],
    faq: [
      {
        question: 'Are these songs recorder-only?',
        answer:
          'No. The linked song pages still support the site-wide instrument views, but this guide is written to match recorder-specific beginner search intent.'
      },
      {
        question: 'Why is this different from the main recorder guide?',
        answer:
          'The main recorder guide balances broader recorder intent, while this page focuses tightly on easy beginner songs and the shortest first-step melodies.'
      }
    ],
    relatedGuideSlugs: [
      'recorder-letter-notes',
      'how-to-start-recorder-with-letter-notes',
      'easy-christmas-recorder-songs',
      'nursery-rhyme-letter-notes',
      'folk-songs-for-beginners'
    ]
  },
  {
    slug: 'easy-tin-whistle-songs',
    kind: 'hub',
    title: 'Easy Tin Whistle Songs',
    description:
      'A beginner tin whistle landing page for easy songs with letter notes, folk-friendly phrase shapes, and quick links into the public melody pages.',
    heroLabel: 'Instrument Guide',
    intro: [
      'Tin whistle searchers often start with easy songs, not with theory terms. They want tunes they already know, readable note labels, and a page that feels useful before they commit to learning ornamented traditional notation.',
      'This guide answers that intent with a small set of public-domain melodies that sound natural on whistle, start cleanly for beginners, and open with the whistle view selected from the first click.'
    ],
    featuredSongSlugs: withInstrument(
      [
        'amazing-grace',
        'red-river-valley',
        'scarborough-fair',
        'greensleeves',
        'loch-lomond',
        'auld-lang-syne',
        'londonderry-air',
        'wellerman',
        'the-south-wind',
        'twinkle-twinkle-little-star',
        'ode-to-joy',
        'jingle-bells'
      ],
      'w6'
    ),
    sections: [
      {
        title: 'Easy Tin Whistle Songs To Start With',
        paragraphs: [
          'The easiest whistle pages are the ones where phrase direction is obvious before you play. Familiar nursery and hymn-style melodies make the first reading pass much easier than dense dance tunes or highly ornamented session material.'
        ],
        songSlugs: withInstrument(
          ['twinkle-twinkle-little-star', 'ode-to-joy', 'amazing-grace', 'red-river-valley'],
          'w6'
        )
      },
      {
        title: 'When Folk Songs Become The Better Practice Material',
        paragraphs: [
          'After the first easy melodies, folk songs become more useful because they ask for longer breath control and a more vocal line without forcing fast technical execution.'
        ],
        songSlugs: withInstrument(
          [
            'red-river-valley',
            'scarborough-fair',
            'greensleeves',
            'loch-lomond',
            'auld-lang-syne',
            'londonderry-air',
            'wellerman'
          ],
          'w6'
        )
      },
      {
        title: 'How To Keep Whistle Practice Simple',
        paragraphs: [
          'Use the public page as a stable practice surface instead of hopping between tabs, screenshots, and separate lyric pages. Keep the same song open until the phrase shape sticks.'
        ],
        bullets: [
          'Choose one easy melody and one folk melody.',
          'Stay with letter notes first, not numbered notes.',
          'Use lyrics only when they help you hear phrase boundaries.'
        ]
      }
    ],
    faq: [
      {
        question: 'Does this page replace the main tin whistle guide?',
        answer:
          'No. It is a narrower beginner landing page built around easy-song search intent, while the broader tin whistle guide still covers a wider mix of song types.'
      },
      {
        question: 'Can these songs still work for recorder or ocarina?',
        answer:
          'Yes. The public song pages stay instrument-flexible, but this entry page is written for visitors who explicitly search for easy tin whistle songs.'
      }
    ],
    relatedGuideSlugs: [
      'tin-whistle-letter-notes',
      'celtic-tin-whistle-songs',
      'folk-songs-for-beginners',
      'easy-christmas-tin-whistle-songs'
    ]
  },
  {
    slug: 'easy-christmas-recorder-songs',
    kind: 'hub',
    title: 'Easy Christmas Recorder Songs',
    description:
      'A recorder-first Christmas landing page for familiar carols with letter notes, lyric-friendly practice pages, and direct links into the public recorder view.',
    heroLabel: 'Seasonal Song Guide',
    intro: [
      'Holiday recorder searchers often want one practical answer: a small set of Christmas songs they can open quickly for class, rehearsal, or home practice without sorting through the full library first.',
      'This page gives them that answer with a recorder-first shortlist for seasonal practice, so teachers, students, and families can open familiar carols quickly with recorder view selected from the start.'
    ],
    featuredSongSlugs: withInstrument(
      [
        'jingle-bells',
        'silent-night',
        'we-wish-you-a-merry-christmas',
        'deck-the-halls',
        'joy-to-the-world',
        'god-rest-you-merry-gentlemen',
        'hark-the-herald-angels-sing',
        'jolly-old-saint-nicholas',
        'happy-new-year',
        'auld-lang-syne',
        'auld-lang-syne-english'
      ],
      'r8b'
    ),
    sections: [
      {
        title: 'Best Christmas Songs To Start On Recorder',
        paragraphs: [
          'The strongest first recorder carols are the ones students can already sing before they finger them. That keeps the first pass focused on note changes and steady breathing instead of on tune recognition.'
        ],
        songSlugs: withInstrument(
          ['jingle-bells', 'we-wish-you-a-merry-christmas', 'deck-the-halls', 'joy-to-the-world'],
          'r8b'
        )
      },
      {
        title: 'What Works Well For School Or Group Practice',
        paragraphs: [
          'Recorder Christmas pages work best when they stay simple and recognizable. Carols with familiar lyrics and regular phrase shapes are easier to rehearse in class, at home, or before a short seasonal performance.'
        ],
        bullets: [
          'Start with one short sing-along carol and one slower lyrical carol.',
          'Keep the fingering chart visible for the first runs through each song.',
          'Use lyrics when they help students enter on the right phrase.'
        ],
        songSlugs: withInstrument(['jingle-bells', 'silent-night', 'we-wish-you-a-merry-christmas'], 'r8b')
      },
      {
        title: 'What To Add After The Easiest Carols',
        paragraphs: [
          'Once the first holiday set feels settled, add one richer carol with longer phrases. That gives recorder players more breath-planning practice without forcing a different reading setup.'
        ],
        songSlugs: withInstrument(
          [
            'god-rest-you-merry-gentlemen',
            'good-king-wenceslas',
            'silent-night',
            'joy-to-the-world',
            'hark-the-herald-angels-sing'
          ],
          'r8b'
        )
      }
    ],
    faq: [
      {
        question: 'Do these links open a separate recorder product?',
        answer:
          'No. They open the normal playable song pages already used across the site. This guide simply makes recorder-specific Christmas traffic land closer to the right instrument view.'
      },
      {
        question: 'Can students still switch away from recorder view?',
        answer:
          'Yes. The destination page still supports instrument switching, but this guide starts in recorder view because that is the intent the page is trying to answer.'
      }
    ],
    relatedGuideSlugs: [
      'christmas-letter-note-songs',
      'recorder-letter-notes',
      'easy-recorder-songs-for-beginners'
    ]
  },
  {
    slug: 'easy-christmas-tin-whistle-songs',
    kind: 'hub',
    title: 'Easy Christmas Tin Whistle Songs',
    description:
      'A whistle-first holiday guide for familiar Christmas melodies with letter notes, singable phrasing, and direct links into the public tin whistle view.',
    heroLabel: 'Seasonal Song Guide',
    intro: [
      'Tin whistle players often look for Christmas songs they can start quickly without opening staff-heavy arrangements or bouncing between separate lyric pages and fingering diagrams.',
      'This guide narrows that search into a small set of public holiday songs and opens each one in the whistle view by default, so the first click feels closer to the query that brought the visitor in.'
    ],
    featuredSongSlugs: withInstrument(
      [
        'jingle-bells',
        'silent-night',
        'deck-the-halls',
        'we-wish-you-a-merry-christmas',
        'joy-to-the-world',
        'hark-the-herald-angels-sing',
        'god-rest-you-merry-gentlemen',
        'jolly-old-saint-nicholas',
        'happy-new-year',
        'auld-lang-syne',
        'auld-lang-syne-english'
      ],
      'w6'
    ),
    sections: [
      {
        title: 'Easy Christmas Whistle Songs To Start With',
        paragraphs: [
          'The easiest whistle carols are the ones with a strong singable shape and short repeated phrases. That makes them better first passes than denser or less familiar holiday tunes.'
        ],
        songSlugs: withInstrument(
          ['jingle-bells', 'we-wish-you-a-merry-christmas', 'deck-the-halls', 'joy-to-the-world'],
          'w6'
        )
      },
      {
        title: 'Why Carols Work Well For Whistle Practice',
        paragraphs: [
          'Carols are useful whistle material because they reward clean breath timing and phrase endings without needing advanced ornamentation. They also stay recognizable even in a plain melody-first presentation.'
        ],
        bullets: [
          'Keep the melody plain before adding any whistle-style decoration.',
          'Use lyrics when they help you hear phrase boundaries.',
          'Stay on one carol until the line feels stable, then add a second contrasting tune.'
        ],
        songSlugs: withInstrument(
          [
            'silent-night',
            'joy-to-the-world',
            'god-rest-you-merry-gentlemen',
            'good-king-wenceslas',
            'hark-the-herald-angels-sing'
          ],
          'w6'
        )
      },
      {
        title: 'What To Add After The First Holiday Favorites',
        paragraphs: [
          'After the easiest carols feel secure, add one slower hymn-like melody and one brighter sing-along. That expands holiday repertoire while keeping the same whistle-friendly landing flow.'
        ],
        songSlugs: withInstrument(['silent-night', 'god-rest-you-merry-gentlemen', 'jingle-bells'], 'w6')
      }
    ],
    faq: [
      {
        question: 'Are these full traditional whistle arrangements?',
        answer:
          'No. They are melody-first public song pages. That keeps the holiday material more useful for first-pass learning, quick rehearsal, and repeat practice.'
      },
      {
        question: 'Why make a whistle-specific Christmas page if a general Christmas guide already exists?',
        answer:
          'Because instrument-specific search intent usually converts better when the entry page confirms both the season and the instrument immediately.'
      }
    ],
    relatedGuideSlugs: [
      'christmas-letter-note-songs',
      'easy-tin-whistle-songs',
      'celtic-tin-whistle-songs'
    ]
  },
  {
    slug: 'nursery-rhyme-letter-notes',
    kind: 'hub',
    title: 'Nursery Rhyme Letter Notes',
    description:
      'A nursery-rhyme guide for familiar beginner songs with letter notes, lyrics when available, and short phrase shapes that work well for first-week practice.',
    heroLabel: 'Beginner Song Guide',
    intro: [
      'Nursery rhymes are often the best first search answer for absolute beginners because the melody is already memorized before any note reading begins.',
      'This page stays tighter than the broader beginner hubs by focusing on ultra-familiar children’s repertoire, so parents, teachers, and self-learners can begin with the shortest and most recognizable tunes first.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'mary-had-a-little-lamb',
      'frere-jacques',
      'london-bridge',
      'row-row-row-your-boat',
      'old-macdonald',
      'its-a-small-world'
    ],
    sections: [
      {
        title: 'Why Nursery Songs Work So Well Early',
        paragraphs: [
          'A familiar nursery song lowers the cost of everything else. The learner already knows the tune, so the page only needs to teach note order, finger placement, and phrase timing.',
          'That makes these songs especially useful for children, classroom beginners, and adults returning to melody instruments after a long break.'
        ]
      },
      {
        title: 'Best Nursery-Rhyme Songs To Start With',
        paragraphs: [
          'These pages are short enough for repeated play-throughs and familiar enough that learners can often sing the line before they finish the first read.'
        ],
        songSlugs: [
          'twinkle-twinkle-little-star',
          'mary-had-a-little-lamb',
          'frere-jacques',
          'row-row-row-your-boat',
          'its-a-small-world'
        ]
      },
      {
        title: 'How To Move Beyond The Very First Songs',
        paragraphs: [
          'After the first nursery set feels easy, move into one slightly longer beginner song that keeps the same note-reading workflow but asks for steadier phrase control.'
        ],
        songSlugs: ['london-bridge', 'old-macdonald', 'its-a-small-world', 'ode-to-joy']
      }
    ],
    faq: [
      {
        question: 'Are nursery-rhyme pages only for children?',
        answer:
          'No. They are excellent first-step material for any beginner who wants familiar melodies and a low-friction way to practice note reading.'
      },
      {
        question: 'Do these pages use a different player?',
        answer:
          'No. Every card still opens the normal public song detail page, so the guide is an entry layer rather than a separate experience.'
      }
    ],
    relatedGuideSlugs: [
      'easy-songs-for-beginners',
      'easy-recorder-songs-for-beginners',
      'music-class-songs-for-beginners'
    ]
  },
  {
    slug: 'easy-songs-for-beginners',
    kind: 'hub',
    title: 'Easy Songs for Beginners',
    description:
      'A beginner-first guide that groups the shortest and most recognizable melody pages for new ocarina, recorder, and tin whistle players.',
    heroLabel: 'Beginner Song Guide',
    intro: [
      'This is the main entry page for searchers who are not looking for one specific song yet. They want easy songs, familiar tunes, and a place to begin without sorting through the whole catalog.',
      'Unlike the nursery or classroom-focused pages, this hub is meant to be the broad cross-instrument starter shelf: nursery tunes, birthday songs, first hymns, and first classical themes in one place.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'mary-had-a-little-lamb',
      'london-bridge',
      'frere-jacques',
      'ode-to-joy',
      'happy-birthday-to-you',
      'its-a-small-world'
    ],
    sections: [
      {
        title: 'What Makes A Good First Song',
        paragraphs: [
          'A true beginner song should be easy to recognize, forgiving to restart, and short enough that the fingering chart still feels like a help instead of a distraction.',
          'That is why nursery tunes and short public-domain melodies outperform more impressive-looking pieces for first-week practice.'
        ],
        bullets: [
          'Choose recognition over novelty.',
          'Choose short phrases over long technical passages.',
          'Choose one song you can finish over three songs you can only start.'
        ]
      },
      {
        title: 'Best First Songs On This Site',
        paragraphs: [
          'These are the songs that make the strongest first impression for beginners because they combine familiarity, repeated phrase shapes, and a readable page layout.'
        ],
        songSlugs: [
          'twinkle-twinkle-little-star',
          'mary-had-a-little-lamb',
          'london-bridge',
          'frere-jacques',
          'happy-birthday-to-you'
        ]
      },
      {
        title: 'What To Learn After The First Week',
        paragraphs: [
          'After the shortest tunes feel settled, move to one slightly longer melody that asks for better phrase pacing. That is where songs like Ode to Joy or Amazing Grace start to become useful.'
        ],
        songSlugs: ['ode-to-joy', 'amazing-grace', 'silent-night', 'its-a-small-world']
      }
    ],
    faq: [
      {
        question: 'Is this page only for one instrument?',
        answer:
          'No. It is a beginner guide for the site as a whole, and the linked songs still let players switch among the supported instrument views when they need them.'
      },
      {
        question: 'Should beginners start with lyrics on or off?',
        answer:
          'If the public song page supports lyrics and the tune is already sung in your head, lyrics can help phrase entry. If they add noise, leave them off and stay with the melody only.'
      }
    ],
    relatedGuideSlugs: [
      '12-hole-ocarina-letter-notes',
      'recorder-letter-notes',
      'tin-whistle-letter-notes'
    ]
  },
  {
    slug: 'songs-with-lyrics',
    kind: 'hub',
    title: 'Songs with Lyrics',
    description:
      'A lyric-focused guide that collects the public melody pages where lyrics are already supported, so players can sing through the phrase shape while learning the notes.',
    heroLabel: 'Lyrics Guide',
    intro: [
      'Some searchers are not just looking for notes. They want songs with lyrics so they can connect phrase entry, singing rhythm, and melody shape at the same time.',
      'This page gathers the public songs where the lyric line is already supported in the current runtime, making it a stronger landing page than the mixed library alone.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'jingle-bells',
      'silent-night',
      'we-wish-you-a-merry-christmas',
      'auld-lang-syne',
      'do-re-mi',
      'edelweiss',
      'la-vie-en-rose',
      'scarborough-fair',
      'moon-river',
      'cant-help-falling-in-love',
      'a-thousand-years',
      'fly-me-to-the-moon',
      'can-you-feel-the-love-tonight',
      'sealed-with-a-kiss',
      'yesterday-once-more',
      'let-it-be',
      'take-me-home-country-roads',
      'over-the-rainbow',
      'love-is-blue',
      'where-do-i-begin',
      'you-raise-me-up',
      'tears-in-heaven',
      'imagine',
      'hotel-california',
      'careless-whisper',
      'see-you-again'
    ],
    sections: [
      {
        title: 'Why Lyrics Help Some Learners',
        paragraphs: [
          'Lyrics can act as a phrase map. When a melody is already familiar as a song, seeing the words beside the notes often makes entry points easier to remember.'
        ],
        bullets: [
          'Use lyrics when singing improves your timing.',
          'Hide lyrics when they distract from fingering or note reading.',
          'Keep the same song page open so the rhythm, notes, and lyric line stay together.'
        ]
      },
      {
        title: 'Best Public Songs With Lyrics On This Site',
        paragraphs: [
          'These pages already support lyrics in the current public runtime and work well as lyric-first landing pages.'
        ],
        songSlugs: [
          'twinkle-twinkle-little-star',
          'jingle-bells',
          'silent-night',
          'we-wish-you-a-merry-christmas',
          'auld-lang-syne',
          'do-re-mi',
          'edelweiss',
          'la-vie-en-rose',
          'scarborough-fair',
          'moon-river',
          'cant-help-falling-in-love',
          'a-thousand-years',
          'fly-me-to-the-moon',
          'can-you-feel-the-love-tonight',
          'sealed-with-a-kiss',
          'yesterday-once-more',
          'let-it-be',
          'take-me-home-country-roads',
          'over-the-rainbow',
          'love-is-blue',
          'where-do-i-begin',
          'you-raise-me-up',
          'tears-in-heaven',
          'imagine',
          'hotel-california',
          'careless-whisper',
          'see-you-again'
        ]
      },
      {
        title: 'When To Use A Lyric Page Instead Of A Pure Melody Page',
        paragraphs: [
          'Choose a lyric-enabled page when the words help you hear the tune and remember phrase boundaries. Choose a melody-only page when you want the cleanest possible reading surface for finger work.'
        ],
        songSlugs: ['row-row-row-your-boat', 'do-re-mi', 'happy-new-year', 'moon-river', 'cant-help-falling-in-love', 'la-vie-en-rose', 'yesterday-once-more', 'let-it-be', 'take-me-home-country-roads', 'over-the-rainbow', 'hotel-california', 'careless-whisper', 'imagine', 'love-is-blue', 'where-do-i-begin', 'see-you-again']
      },
      {
        title: 'Additional Lyric-Friendly Ballads',
        paragraphs: [
          'If you want slower modern songs where the lyric line helps you hear the phrase shape, these pages are strong next choices after the best-known standards above.'
        ],
        songSlugs: ['edelweiss', 'sealed-with-a-kiss', 'cant-help-falling-in-love', 'a-thousand-years', 'fly-me-to-the-moon', 'you-raise-me-up', 'tears-in-heaven', 'imagine', 'love-is-blue', 'where-do-i-begin', 'see-you-again']
      }
    ],
    faq: [
      {
        question: 'Do all songs on the site show lyrics?',
        answer:
          'No. This guide only lists the public pages where lyrics are already available in the current runtime, which makes it a better landing page for lyric-related searches.'
      },
      {
        question: 'Can I still use the same page without the lyrics visible?',
        answer:
          'Yes. The song detail page still lets you turn lyrics off when you want a cleaner melody view.'
      }
    ],
    relatedGuideSlugs: [
      'easy-songs-for-adult-beginners',
      'calm-and-lyrical-letter-note-songs',
      'easy-songs-for-beginners',
      '12-hole-ocarina-letter-notes',
      'recorder-letter-notes'
    ]
  },
  {
    slug: 'easy-sing-along-letter-note-songs',
    kind: 'hub',
    title: 'Easy Sing-Along Letter Note Songs',
    description:
      'A sing-along guide for familiar melody pages that work well with lyrics, group practice, classroom use, and first-time players who learn best by hearing the words.',
    heroLabel: 'Sing-Along Song Guide',
    intro: [
      'Some visitors are not searching for a specific instrument first. They want easy songs they can sing with immediately, because singing the melody makes note reading and phrase timing easier.',
      'This guide gathers public song pages that work well for sing-alongs, school use, family music time, and casual group playing. The songs stay familiar, the pages stay readable, and the learning curve stays low.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'mary-had-a-little-lamb',
      'row-row-row-your-boat',
      'do-re-mi',
      'happy-birthday-to-you',
      'jingle-bells',
      'we-wish-you-a-merry-christmas',
      'take-me-home-country-roads',
      'let-it-be',
      'imagine',
      'lemon-tree',
      'its-a-small-world'
    ],
    sections: [
      {
        title: 'Why Sing-Along Songs Convert Better For Beginners',
        paragraphs: [
          'A sing-along melody is easier to start because the tune is already in the learner’s head. That reduces hesitation at the first note and gives the page an immediate purpose beyond silent reading.',
          'These songs are also useful for classroom demos, family practice, party music, and anyone who wants a familiar melody they can play and sing on the same page.'
        ],
        bullets: [
          'Choose songs people can sing from memory.',
          'Use lyric-enabled pages when the words help phrase timing.',
          'Keep the first repertoire short, repetitive, and socially familiar.'
        ]
      },
      {
        title: 'Best Easy Sing-Along Songs On This Site',
        paragraphs: [
          'These songs are short, recognizable, and forgiving enough for repeat play-throughs, which makes them strong landing pages for sing-along search intent.'
        ],
        songSlugs: [
          'twinkle-twinkle-little-star',
          'mary-had-a-little-lamb',
          'row-row-row-your-boat',
          'do-re-mi',
          'old-macdonald',
          'happy-birthday-to-you',
          'jingle-bells',
          'take-me-home-country-roads',
          'let-it-be',
          'imagine',
          'lemon-tree',
          'its-a-small-world'
        ]
      },
      {
        title: 'Seasonal And Group Songs To Add Next',
        paragraphs: [
          'Once the shortest nursery and classroom tunes feel easy, move into carols and celebration songs that still carry strong recognition but ask for steadier phrase pacing.'
        ],
        songSlugs: [
          'deck-the-halls',
          'we-wish-you-a-merry-christmas',
          'joy-to-the-world',
          'auld-lang-syne',
          'do-re-mi',
          'take-me-home-country-roads',
          'let-it-be',
          'imagine',
          'lemon-tree'
        ]
      }
    ],
    faq: [
      {
        question: 'What makes a good sing-along melody page?',
        answer:
          'The best sing-along pages are familiar enough that players already hear the tune, short enough to repeat several times, and clean enough that lyrics or note labels do not feel crowded.'
      },
      {
        question: 'Do I need lyrics visible for every sing-along song?',
        answer:
          'No. Lyrics help when they reinforce phrase timing, but many familiar songs still work well as sing-along material even if you use the melody alone.'
      }
    ],
    relatedGuideSlugs: [
      'songs-with-lyrics',
      'easy-songs-for-beginners',
      'music-class-songs-for-beginners'
    ]
  },
  {
    slug: 'first-performance-letter-note-songs',
    kind: 'hub',
    title: 'First Performance Letter Note Songs',
    description:
      'A practical guide for players choosing a first recital, ceremony, school, or group-performance melody with letter notes and a readable fingering-first page.',
    heroLabel: 'Performance Guide',
    intro: [
      'A first performance song needs a different balance than a first practice song. It should still be learnable, but it also needs enough recognition, shape, or ceremonial weight to feel worth performing in front of other people.',
      'This guide gathers public melody pages that work for school sharing, church use, celebrations, beginner recitals, and small group performances without forcing players into dense staff notation first.'
    ],
    featuredSongSlugs: [
      'ponyo-on-the-cliff-by-the-sea',
      'a-town-with-an-ocean-view',
      'happy-birthday-to-you',
      'ode-to-joy',
      'amazing-grace',
      'a-thousand-years',
      'canon',
      'wedding-march',
      'american-patrol',
      'hes-a-pirate',
      'my-heart-will-go-on',
      'let-it-go',
      'blue-bird',
      'gurenge',
      'cruel-angels-thesis',
      'detective-conan-main-theme',
      'only-my-railgun',
      'senbonzakura',
      'faded',
      'unravel',
      'butter-fly',
      'until-the-end-of-the-world',
      'inuyashas-affection',
      'zen-zen-zense',
      'stroll',
      'my-neighbor-totoro',
      'chihiros-waltz',
      'the-promise-of-the-world',
      'the-imperial-march',
      'game-of-thrones-theme',
      'see-you-again',
      'the-avengers'
    ],
    sections: [
      {
        title: 'What Makes A Good First Performance Song',
        paragraphs: [
          'A strong first performance piece should sound finished even at a moderate tempo. It should be familiar enough to feel rewarding, but stable enough that a beginner can keep breath, pulse, and phrase entry under control.',
          'That usually means avoiding the fastest showpieces and choosing melodies that still sound musical when played simply and clearly.'
        ],
        bullets: [
          'Choose a melody people recognize after the first phrase.',
          'Prefer stable pulse over technical speed.',
          'Use ceremony or celebration songs when the setting gives the music a clear role.'
        ]
      },
      {
        title: 'Reliable Songs For A First Public Performance',
        paragraphs: [
          'These pages work well when you want a song that feels presentable without asking for concert-level technique.'
        ],
        songSlugs: [
          'happy-birthday-to-you',
          'ode-to-joy',
          'amazing-grace',
          'a-thousand-years',
          'canon',
          'wedding-march',
          'wedding-march-alt',
          'let-it-go',
          'blue-bird',
          'gurenge',
          'cruel-angels-thesis',
          'detective-conan-main-theme',
          'only-my-railgun',
          'senbonzakura',
          'faded',
          'unravel',
          'butter-fly',
          'until-the-end-of-the-world',
          'inuyashas-affection',
          'zen-zen-zense',
          'stroll',
          'my-neighbor-totoro',
          'chihiros-waltz',
          'ponyo-on-the-cliff-by-the-sea',
          'a-town-with-an-ocean-view',
          'see-you-again'
        ]
      },
      {
        title: 'Brighter March And Ceremony Options',
        paragraphs: [
          'If the performance setting needs more pulse, parade energy, or ceremonial lift, these pages are strong next-step choices.'
        ],
        songSlugs: [
          'american-patrol',
          'hes-a-pirate',
          'turkish-march',
          'parade-of-the-wooden-soldiers',
          'jingle-bells',
          'my-heart-will-go-on',
          'let-it-go',
          'blue-bird',
          'gurenge',
          'cruel-angels-thesis',
          'detective-conan-main-theme',
          'only-my-railgun',
          'senbonzakura',
          'unravel',
          'butter-fly',
          'until-the-end-of-the-world',
          'inuyashas-affection',
          'zen-zen-zense',
          'stroll',
          'my-neighbor-totoro',
          'chihiros-waltz',
          'ponyo-on-the-cliff-by-the-sea',
          'a-town-with-an-ocean-view',
          'the-imperial-march',
          'game-of-thrones-theme',
          'see-you-again',
          'the-avengers'
        ]
      }
    ],
    faq: [
      {
        question: 'Should a first performance song be the easiest song I know?',
        answer:
          'Usually it should be one step above your easiest songs: secure enough to play under pressure, but still recognizable and musically satisfying to listeners.'
      },
      {
        question: 'Can these pages work for school or ceremony settings?',
        answer:
          'Yes. Many of the linked songs fit birthdays, school sharing, church use, wedding-related settings, or beginner recitals because they are familiar enough to work in front of listeners, not just in private practice.'
      }
    ],
    relatedGuideSlugs: [
      'easy-songs-for-adult-beginners',
      'wedding-and-ceremony-letter-note-songs',
      'march-and-parade-letter-note-songs'
    ]
  },
  {
    slug: 'zelda-ocarina-songs',
    kind: 'guide',
    title: 'Zelda Ocarina Songs and Letter Notes',
    description:
      'A focused Zelda melody guide for ocarina, recorder, and whistle players who want recognizable game themes on one clean letter-note path.',
    heroLabel: 'Game Theme Guide',
    intro: [
      'Zelda melody searches are rarely looking for one random game tune. Most players want a recognizable cluster: the calm Ocarina of Time melodies, a few stronger performance themes, and a page that keeps those songs readable without depending on scattered tab screenshots.',
      'This guide gathers the Zelda pages already on the site into one practical route, so visitors can compare the main melodies, keep the fingering chart visible, and move from one theme to the next without relearning the interface each time.'
    ],
    featuredSongSlugs: [
      'song-of-time',
      'zeldas-lullaby',
      'song-of-storms',
      'sarias-song',
      'eponas-song',
      'kakariko-village',
      'ballad-of-the-wind-fish',
      'breath-of-the-wild-theme',
      'miphas-theme',
      'revalis-theme',
      'stable-theme'
    ],
    sections: [
      {
        title: 'Best Known Zelda Songs To Open First',
        paragraphs: [
          'If you want the highest-recognition Zelda pages first, start with the Ocarina of Time group. These melodies are the ones most players already hear in their heads before they even open the page.'
        ],
        songSlugs: [
          'song-of-time',
          'zeldas-lullaby',
          'song-of-storms',
          'sarias-song',
          'eponas-song'
        ]
      },
      {
        title: 'Calmer Zelda Melodies For Breath And Phrase Practice',
        paragraphs: [
          'Not every Zelda tune needs to be bright or urgent. These pages work better when you want lyrical practice, calmer phrasing, and a game melody that still sounds complete at a slower tempo.'
        ],
        songSlugs: [
          'zeldas-lullaby',
          'song-of-time',
          'eponas-song',
          'kakariko-village',
          'ballad-of-the-wind-fish',
          'miphas-theme',
          'revalis-theme',
          'stable-theme',
          'breath-of-the-wild-theme'
        ]
      },
      {
        title: 'What To Add After The First Two Themes',
        paragraphs: [
          'Once the most familiar melodies feel stable, add one brighter song and one broader Breath of the Wild era theme. That gives the practice set more rhythmic range without leaving the same Zelda search intent.'
        ],
        songSlugs: [
          'song-of-storms',
          'sarias-song',
          'kakariko-village',
          'breath-of-the-wild-theme'
        ]
      }
    ],
    faq: [
      {
        question: 'Is this guide only for ocarina players?',
        answer:
          'No. It is especially relevant for ocarina searchers because Zelda demand is strong there, but recorder and tin whistle players also use it when they want familiar game themes in a simpler melody-first format.'
      },
      {
        question: 'Do these songs use a different page or notation system?',
        answer:
          'No. The Zelda guide changes the discovery path, not the reading system. Once you open a song, you still get the usual letter notes, fingering help, and numbered-note backup view.'
      }
    ],
    relatedGuideSlugs: [
      '12-hole-ocarina-letter-notes',
      'easy-songs-for-adult-beginners',
      'calm-and-lyrical-letter-note-songs',
      'first-performance-letter-note-songs'
    ]
  },
  {
    slug: 'ghibli-ocarina-songs',
    kind: 'guide',
    title: 'Studio Ghibli Songs and Letter Notes',
    description:
      'A focused Studio Ghibli melody guide for ocarina, recorder, and whistle players who want recognizable film themes on one clean letter-note path.',
    heroLabel: 'Film Theme Guide',
    intro: [
      'Studio Ghibli searches rarely stop at one title. Players usually want a cluster of recognisable melodies: one or two calm themes, a brighter song they already know by ear, and a page that lets them move across those pieces without going back to scattered screenshots or mixed notation systems.',
      'This guide gathers the Ghibli pages already in the library into one practical route, so visitors can compare the major Joe Hisaishi themes, vocal melodies, and lighter performance pieces while staying inside the same fingering-first song workflow.'
    ],
    featuredSongSlugs: [
      'merry-go-round-of-life',
      'always-with-me',
      'one-summers-day',
      'my-neighbor-totoro',
      'ponyo-on-the-cliff-by-the-sea',
      'the-promise-of-the-world',
      'a-town-with-an-ocean-view',
      'carrying-you',
      'princess-mononoke',
      'path-of-the-wind',
      'stroll',
      'chihiros-waltz'
    ],
    sections: [
      {
        title: 'Best Known Ghibli Songs To Open First',
        paragraphs: [
          'If you want the highest-recognition Ghibli pages first, start with the melodies most listeners already know by name or by ear. These pages give the strongest immediate payoff and usually make the easiest first internal-link path for soundtrack visitors.'
        ],
        songSlugs: [
          'merry-go-round-of-life',
          'always-with-me',
          'one-summers-day',
          'my-neighbor-totoro',
          'ponyo-on-the-cliff-by-the-sea'
        ]
      },
      {
        title: 'Calmer Ghibli Melodies For Breath And Phrase Practice',
        paragraphs: [
          'Not every Ghibli visitor wants the brightest or most theatrical page first. These songs work better when the goal is slower phrasing, softer articulation, and a melody that still feels complete at a moderate tempo.'
        ],
        songSlugs: [
          'always-with-me',
          'one-summers-day',
          'the-promise-of-the-world',
          'a-town-with-an-ocean-view',
          'path-of-the-wind',
          'carrying-you',
          'princess-mononoke'
        ]
      },
      {
        title: 'What To Add After The First Two Themes',
        paragraphs: [
          'Once the calmest pages feel stable, add one brighter singable song and one page with more rhythmic motion. That keeps the same Ghibli search intent while broadening articulation, pulse, and phrase shape.'
        ],
        songSlugs: [
          'ponyo-on-the-cliff-by-the-sea',
          'stroll',
          'my-neighbor-totoro',
          'chihiros-waltz',
          'merry-go-round-of-life'
        ]
      }
    ],
    faq: [
      {
        question: 'Is this guide only for ocarina players?',
        answer:
          'No. Ghibli demand is especially strong on ocarina, but recorder and tin whistle players also use these pages when they want recognizable soundtrack melodies in a lighter reading format.'
      },
      {
        question: 'Do these songs use a different page or notation system?',
        answer:
          'No. The Ghibli guide simply groups soundtrack favorites together. The actual song pages keep the usual letter notes, fingering help, and numbered-note backup view.'
      }
    ],
    relatedGuideSlugs: [
      'calm-and-lyrical-letter-note-songs',
      'first-performance-letter-note-songs',
      'easy-songs-for-adult-beginners',
      'dance-and-waltz-letter-note-songs'
    ]
  },
  {
    slug: 'simple-instruments-for-music-education',
    kind: 'guide',
    title: 'Simple Instruments for Music Education',
    description:
      'A beginner education guide about why melody-first instruments and readable song pages help teachers, students, and families start music practice faster.',
    heroLabel: 'Learning Guide',
    intro: [
      'This page plays the role of a blog-style education article, but it stays anchored to the actual product: searchable melody pages with letter notes, fingering charts, and familiar songs.',
      'The goal is to answer a broader question about beginner music learning rather than to compete with the song-list hubs directly, while still giving visitors a clear path into practical melody pages.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'mary-had-a-little-lamb',
      'ode-to-joy',
      'jingle-bells',
      'silent-night',
      'amazing-grace'
    ],
    sections: [
      {
        title: 'Why Simple Instruments Work Well Early',
        paragraphs: [
          'Early music learning works best when students can hear the tune quickly, match finger movement to visible note labels, and repeat a short phrase without too much setup.',
          'That is why melody-first instruments such as ocarina, recorder, and tin whistle often work well in beginner and classroom settings. They let practice begin with recognizable songs rather than with a heavy reading system.'
        ]
      },
      {
        title: 'What A Useful Beginner Resource Should Do',
        paragraphs: [
          'A useful beginner resource should reduce friction. It should make the tune recognizable, keep the page readable on mobile, and offer just enough visual help to guide finger placement without burying the melody.',
          'That is the gap these public song pages are meant to fill. They give players letter notes first, a fingering chart when needed, and optional numbered notes as a backup instead of the main view.'
        ],
        bullets: [
          'Readable note labels beat dense notation for many first-time learners.',
          'Familiar songs lower the cost of getting started.',
          'One stable page per melody is easier to revisit than scattered image posts.'
        ]
      },
      {
        title: 'Starter Songs Teachers And Families Can Use',
        paragraphs: [
          'A good starter sequence moves from very short nursery tunes into a few longer songs with stronger phrase shape. That lets learners gain confidence before they need sustained breath and finger control.'
        ],
        songSlugs: [
          'twinkle-twinkle-little-star',
          'mary-had-a-little-lamb',
          'frere-jacques',
          'ode-to-joy',
          'silent-night',
          'amazing-grace'
        ]
      }
    ],
    faq: [
      {
        question: 'Is this guide only for teachers?',
        answer:
          'No. It is useful for parents, self-learners, and classroom teachers who want a practical way to choose first songs and understand what makes an entry page useful.'
      },
      {
        question: 'How does this connect to the rest of the site?',
        answer:
          'Each song card opens a full song page with playback, fingering support, and note controls, so the guide works as a real practice entry point rather than a blog post with dead-end links.'
      }
    ],
    relatedGuideSlugs: [
      'music-class-songs-for-beginners',
      'easy-songs-for-beginners',
      'songs-with-lyrics'
    ]
  },
  {
    slug: 'christmas-letter-note-songs',
    kind: 'hub',
    title: 'Christmas Letter Note Songs',
    description:
      'A holiday landing page for Christmas songs with letter notes, lyric-friendly carols, and familiar seasonal melodies for ocarina, recorder, and tin whistle.',
    heroLabel: 'Seasonal Song Guide',
    intro: [
      'This page is built for searchers who are not looking for just one carol. They want a practical set of Christmas letter note songs they can open quickly for December practice, school use, church use, or family playing.',
      'It works as the broad holiday overview page, while the recorder and tin whistle Christmas hubs stay narrower for instrument-specific searches and seasonal rehearsal use.'
    ],
    featuredSongSlugs: [
      'jingle-bells',
      'silent-night',
      'we-wish-you-a-merry-christmas',
      'deck-the-halls',
      'god-rest-you-merry-gentlemen',
      'joy-to-the-world',
      'hark-the-herald-angels-sing'
    ],
    sections: [
      {
        title: 'Best Christmas Songs To Start With',
        paragraphs: [
          'The best first holiday pages are the ones people already hear in their head before they play. That makes it easier to use letter notes as a quick-reading aid instead of as a full reading system.',
          'Short, high-recognition carols also work better for repeat practice, seasonal events, and last-minute rehearsal.'
        ],
        songSlugs: [
          'jingle-bells',
          'we-wish-you-a-merry-christmas',
          'deck-the-halls',
          'joy-to-the-world'
        ]
      },
      {
        title: 'When Lyrics Make Holiday Practice Easier',
        paragraphs: [
          'Many Christmas songs are learned through singing first, so lyric-enabled pages can make phrase entry faster. If the words help you hear the melody, keep the lyric line visible while you learn the shape.',
          'If the page feels crowded, turn the lyrics off and return to the clean melody view without leaving the same song page.'
        ],
        bullets: [
          'Use lyric-enabled carols for sing-along practice and school rehearsal.',
          'Stay on the fingering chart for the first few passes, especially on unfamiliar instruments.',
          'Use zoom before switching away from the default letter-note view.'
        ],
        songSlugs: [
          'silent-night',
          'jingle-bells',
          'we-wish-you-a-merry-christmas',
          'hark-the-herald-angels-sing'
        ]
      },
      {
        title: 'Longer Or Richer Carols To Add Next',
        paragraphs: [
          'After the easiest carols feel comfortable, move into songs with a more lyrical or minor-mode shape. These pages are still approachable, but they ask for steadier breath and cleaner phrase control.'
        ],
        songSlugs: [
          'god-rest-you-merry-gentlemen',
          'good-king-wenceslas',
          'silent-night',
          'auld-lang-syne',
          'hark-the-herald-angels-sing'
        ]
      }
    ],
    faq: [
      {
        question: 'Is this page only for December traffic?',
        answer:
          'No. It is a seasonal guide, but many visitors rehearse Christmas songs well before December for school, church, and performance planning.'
      },
      {
        question: 'Do these songs open a different player?',
        answer:
          'No. This is mainly a seasonal shortlist. The carols still open in the standard song experience, with recorder view ready when that fits the search best.'
      }
    ],
    relatedGuideSlugs: [
      'songs-with-lyrics',
      'easy-songs-for-beginners',
      'simple-instruments-for-music-education'
    ]
  },
  {
    slug: 'folk-songs-for-beginners',
    kind: 'hub',
    title: 'Folk Songs for Beginners',
    description:
      'A public guide for familiar folk and traditional melodies with letter notes, singable phrase shapes, and approachable practice pages for ocarina, recorder, and tin whistle.',
    heroLabel: 'Folk Song Guide',
    intro: [
      'Folk and traditional melodies make strong beginner material because they usually have a clear vocal contour, memorable phrase shape, and a slower musical feel than fast showpieces or dense classical excerpts.',
      'This page stays with the broad beginner folk lane first: singable Anglo-American, British, and crossover traditional tunes that are easier to enter through melody recognition before moving into narrower Celtic or international clusters.'
    ],
    featuredSongSlugs: [
      'red-river-valley',
      'scarborough-fair',
      'greensleeves',
      'auld-lang-syne',
      'loch-lomond',
      'londonderry-air',
      'home-on-the-range',
      'down-by-the-salley-gardens',
      'wellerman'
    ],
    sections: [
      {
        title: 'Why Folk Songs Work So Well Early',
        paragraphs: [
          'A good beginner folk song usually gives you a singable line before it gives you technical pressure. That is useful on melody instruments because it lets players focus on breath timing, phrase shape, and note reading without feeling rushed.',
          'Folk pages also make strong crossover material for ocarina, recorder, and tin whistle because the melodies feel natural as unornamented single-line tunes.'
        ]
      },
      {
        title: 'Best First Folk Songs On This Site',
        paragraphs: [
          'These melodies are the strongest first options when you want something more lyrical than a nursery song but less intimidating than a concert-theme page.'
        ],
        songSlugs: [
          'red-river-valley',
          'auld-lang-syne',
          'scarborough-fair',
          'greensleeves',
          'loch-lomond',
          'home-on-the-range'
        ]
      },
      {
        title: 'Tin Whistle Friendly Folk Pages',
        paragraphs: [
          'Several folk pages are especially useful for whistle players because they have a vocal line, a clear phrase arc, and enough recognition to feel like real repertoire before ornament work begins.'
        ],
        songSlugs: withInstrument(
          [
            'red-river-valley',
            'scarborough-fair',
            'greensleeves',
            'loch-lomond',
            'londonderry-air',
            'wellerman'
          ],
          'w6'
        )
      },
      {
        title: 'How To Use Folk Songs For Better Phrasing',
        paragraphs: [
          'Treat folk melodies as breath and phrase practice, not as speed exercises. Let the line stay vocal and connected before you worry about polish.',
          'On whistle and recorder especially, these pages are a good place to build longer phrase confidence without jumping into ornamented notation.'
        ],
        bullets: [
          'Pick one familiar folk song and repeat it over several sessions.',
          'Use lyrics when they help you hear phrase boundaries.',
          'Keep the melody connected before adding more speed or volume.'
        ],
        songSlugs: [
          'greensleeves',
          'scarborough-fair',
          'down-by-the-salley-gardens',
          'londonderry-air',
          'auld-lang-syne'
        ]
      }
    ],
    faq: [
      {
        question: 'Are these songs only for tin whistle players?',
        answer:
          'No. Folk melodies are a natural fit for tin whistle, but recorder and ocarina users also come here when they want singable traditional tunes with lighter reading support.'
      },
      {
        question: 'Why not just use the main song library?',
        answer:
          'Because a folk-focused guide gives search users a direct answer and a more coherent starting set than a broad mixed catalog page.'
      }
    ],
    relatedGuideSlugs: [
      'celtic-tin-whistle-songs',
      'world-folk-letter-note-songs',
      'easy-songs-for-adult-beginners',
      'easy-songs-for-beginners'
    ]
  },
  {
    slug: 'celtic-tin-whistle-songs',
    kind: 'hub',
    title: 'Celtic Tin Whistle Songs',
    description:
      'A focused whistle guide for Celtic and Irish-style melodies with letter notes, singable phrase shapes, and direct paths into the public melody pages.',
    heroLabel: 'Tin Whistle Guide',
    intro: [
      'Some visitors are not just looking for any beginner song. They are searching specifically for Celtic or Irish-style whistle melodies that feel closer to the tunes they already hear in sessions, school groups, or home practice.',
      'This page is intentionally narrower than the broad folk hubs: it centers on whistle-native Irish, Scottish, and Celtic-flavored repertoire where phrasing and instrument color matter as much as melody recognition.'
    ],
    featuredSongSlugs: withInstrument(
      [
        'concerning-hobbits',
        'scarborough-fair',
        'greensleeves',
        'loch-lomond',
        'auld-lang-syne',
        'londonderry-air',
        'the-south-wind',
        'lough-leane',
        'irish-morning-wind',
        'irish-blackbird',
        'scotland-the-brave',
        'wellerman'
      ],
      'w6'
    ),
    sections: [
      {
        title: 'Best Celtic Whistle Songs To Start With',
        paragraphs: [
          'The best first Celtic-style pages are the ones with a strong vocal line and enough melodic familiarity that the player can hear the phrase before trying to decorate it. That makes them more useful than very fast dance tunes for early practice.',
          'Start with slower lyrical melodies first, then add brighter tunes once the basic phrase shape feels stable in plain, ornament-free playing.'
        ],
        songSlugs: withInstrument(
          [
            'concerning-hobbits',
            'scarborough-fair',
            'greensleeves',
            'loch-lomond',
            'auld-lang-syne',
            'londonderry-air',
            'the-south-wind'
          ],
          'w6'
        )
      },
      {
        title: 'How To Practice These Songs On Tin Whistle',
        paragraphs: [
          'Treat these public pages as melody-first references, not as full traditional session transcriptions. The goal is to learn the line cleanly before worrying about cuts, rolls, or stylistic embellishment.',
          'That approach works well for whistle players who want a searchable, mobile-friendly melody page instead of juggling screenshots, lyric sites, and staff-heavy PDFs.'
        ],
        bullets: [
          'Start with the default letter-note layout before trying to decorate the tune.',
          'Use the fingering chart until the phrase shape feels automatic.',
          'Keep the melody plain and connected before adding more speed or ornament.'
        ],
        songSlugs: withInstrument(
          [
            'concerning-hobbits',
            'the-south-wind',
            'lough-leane',
            'irish-blackbird',
            'irish-morning-wind'
          ],
          'w6'
        )
      },
      {
        title: 'What To Add After The First Slow Airs',
        paragraphs: [
          'Once the calmer melodies feel comfortable, add one brighter patriotic or folk-style tune and one familiar sing-along melody. That expands the repertoire without leaving the same whistle-friendly workflow.'
        ],
        songSlugs: withInstrument(
          ['scotland-the-brave', 'wellerman', 'auld-lang-syne', 'irish-blackbird'],
          'w6'
        )
      }
    ],
    faq: [
      {
        question: 'Does this page replace the main tin whistle guide?',
        answer:
          'No. It is a narrower landing page built for Celtic and Irish-style whistle search intent, while the broader tin whistle guide still covers a wider beginner mix.'
      },
      {
        question: 'Are these full session-style whistle arrangements?',
        answer:
          'No. They are melody-first public song pages with readable note labels and fingering support, which makes them better for first-pass learning and repeat practice.'
      }
    ],
    relatedGuideSlugs: [
      'easy-tin-whistle-songs',
      'folk-songs-for-beginners',
      'tin-whistle-letter-notes',
      'how-to-start-tin-whistle-with-letter-notes'
    ]
  },
  {
    slug: 'march-and-parade-letter-note-songs',
    kind: 'hub',
    title: 'March and Parade Letter Note Songs',
    description:
      'A public guide for march and parade-style melodies with letter notes, fingering charts, and readable ceremonial or processional tunes for ocarina, recorder, and tin whistle.',
    heroLabel: 'March Song Guide',
    intro: [
      'Some visitors are not searching for nursery songs or lyrical folk tunes. They want march-style melodies, parade tunes, or recognizable ceremonial music that feels steadier, brighter, and more rhythm-driven.',
      'This page is about pulse-first repertoire more than patriotic identity or wedding-only use, so it groups the tunes that help players rehearse strong beat shape, repeated leaps, and public-event energy.'
    ],
    featuredSongSlugs: [
      'american-patrol',
      'parade-of-the-wooden-soldiers',
      'wedding-march',
      'cavalry-march',
      'toy-march',
      'turkish-march',
      'hes-a-pirate',
      'merry-go-round-of-life',
      'the-imperial-march',
      'the-avengers'
    ],
    sections: [
      {
        title: 'Best March Songs To Start With',
        paragraphs: [
          'The best first march pages are the ones with a clear pulse and enough melodic familiarity that players can hear the motion before they worry about speed. That makes them easier to read than denser parade tunes with too many abrupt jumps.',
          'Start with songs that feel playful or ceremonial first, then move into more forceful marches once the phrase shape feels visually familiar in the default letter-note view.'
        ],
        songSlugs: [
          'parade-of-the-wooden-soldiers',
          'toy-march',
          'wedding-march',
          'american-patrol',
          'hes-a-pirate',
          'merry-go-round-of-life',
          'the-imperial-march',
          'the-avengers'
        ]
      },
      {
        title: 'How To Practice March-Style Pages',
        paragraphs: [
          'Treat these pages as pulse and phrase-shape practice, not as speed tests. A clean steady line is more useful than rushing through a tune that is supposed to feel structured and confident.',
          'March melodies also work well for players who want something more rhythmic than a hymn or folk song without jumping all the way into technical showpieces.'
        ],
        bullets: [
          'Keep the beat steady before trying to make the melody louder or faster.',
          'Use the fingering chart until repeated leaps feel automatic.',
          'Zoom in on longer march pages instead of forcing the whole tune into one glance.'
        ],
        songSlugs: ['american-patrol', 'cavalry-march', 'grenadiers-march', 'the-imperial-march']
      },
      {
        title: 'What To Add After The First Parade Tunes',
        paragraphs: [
          'Once the easiest march pages feel comfortable, add one brighter character piece and one more formal ceremonial melody. That keeps the practice mix interesting without leaving the same rhythm-focused workflow.'
        ],
        songSlugs: ['spanish-bullfighting-tune', 'turkish-march', 'wedding-march-alt', 'hes-a-pirate', 'merry-go-round-of-life', 'the-imperial-march', 'the-avengers']
      }
    ],
    faq: [
      {
        question: 'Are these only for advanced players?',
        answer:
          'No. Some march pages are longer than nursery songs, but several still work well for intermediate beginners who want a steadier rhythmic tune instead of only lyrical melodies.'
      },
      {
        question: 'Does this guide use a different song player?',
        answer:
          'No. It is a themed entry page only. The march songs still use the standard playback and note-reading tools, which matters when players want to compare pulse-heavy pieces quickly.'
      }
    ],
    relatedGuideSlugs: [
      'patriotic-and-anthem-letter-note-songs',
      'wedding-and-ceremony-letter-note-songs',
      'first-performance-letter-note-songs'
    ]
  },
  {
    slug: 'patriotic-and-anthem-letter-note-songs',
    kind: 'hub',
    title: 'Patriotic and Anthem Letter Note Songs',
    description:
      'A public guide for patriotic, anthem, and ceremonial melody pages with letter notes, fingering support, and recognisable tunes for school, parade, and home practice.',
    heroLabel: 'Anthem Song Guide',
    intro: [
      'Some visitors are not searching for a general beginner library. They want patriotic melodies, anthem-style tunes, or ceremonial songs that feel recognisable right away for school use, parade practice, or personal playing.',
      'This page is more civic and anthem-led than the broader march hub, so it favors recognisable public-memory repertoire for assemblies, school contexts, and statelier personal practice.'
    ],
    featuredSongSlugs: [
      'yankee-doodle',
      'american-patrol',
      'scotland-the-brave',
      'russian-national-anthem',
      'the-internationale',
      'katyusha'
    ],
    sections: [
      {
        title: 'Best First Pages For Recognisable Patriotic Melodies',
        paragraphs: [
          'The easiest starting point is usually a melody that is already familiar by ear. That lowers the reading load and makes it easier to focus on note names, breath control, and fingering instead of decoding an unfamiliar tune from scratch.',
          'Choose one page with a simple singable shape first, then add one slightly more ceremonial or march-driven melody after the basic phrase motion feels comfortable in the default letter-note view.'
        ],
        songSlugs: ['yankee-doodle', 'scotland-the-brave', 'katyusha']
      },
      {
        title: 'When You Want More March Energy',
        paragraphs: [
          'Some anthem-style searches are really looking for stronger parade rhythm rather than just a familiar patriotic melody. In that case, add one march page to the mix so practice includes clearer pulse and longer phrase control.',
          'These songs still work best when treated as clean reading practice first. The goal is a steady ceremonial line, not rushing for speed.'
        ],
        bullets: [
          'Pair one song-style melody with one march-style page.',
          'Keep the fingering chart visible on longer ceremonial tunes.',
          'Treat march pages as pulse practice first, not as speed tests.'
        ],
        songSlugs: ['american-patrol', 'cavalry-march', 'grenadiers-march']
      },
      {
        title: 'Formal Anthem And Ceremony Choices',
        paragraphs: [
          'For a more formal or stately practice mix, use pages that sound closer to an anthem, ceremonial hymn, or official melody. These songs are useful when the goal is a steadier, more deliberate character than a nursery tune or light folk piece.'
        ],
        songSlugs: ['russian-national-anthem', 'the-internationale', 'scotland-the-brave']
      }
    ],
    faq: [
      {
        question: 'Are these songs only for school or ceremony use?',
        answer:
          'No. They also work well for home practice when you want a more recognisable or stately melody than a nursery rhyme, especially if you prefer songs with a strong public or ceremonial character.'
      },
      {
        question: 'Does this page use a different notation system?',
        answer:
          'No. It is a themed public entry page. Every song still opens the normal public detail page with the same letter-note view, fingering support, and familiar controls.'
      }
    ],
    relatedGuideSlugs: [
      'march-and-parade-letter-note-songs',
      'music-class-songs-for-beginners',
      'first-performance-letter-note-songs'
    ]
  },
  {
    slug: 'world-folk-letter-note-songs',
    kind: 'hub',
    title: 'World Folk and Traditional Letter Note Songs',
    description:
      'A public guide for world folk and traditional melody pages with letter notes, fingering support, and recognisable international songs for ocarina, recorder, and tin whistle.',
    heroLabel: 'World Folk Song Guide',
    intro: [
      'Some visitors are not searching for only Western beginner songs. They want familiar traditional melodies from different regions, often because they already know the tune from school, family, culture, or international music classes.',
      'This page intentionally reaches beyond the English-language and Celtic-heavy folk hubs, grouping East Asian, European, Slavic, and Latin American standards into one international repertoire shelf.'
    ],
    featuredSongSlugs: [
      'arirang',
      'jasmine-flower',
      'sakura-sakura',
      'bella-ciao',
      'la-cucaracha',
      'el-condor-pasa'
    ],
    sections: [
      {
        title: 'East Asian Traditional Melodies',
        paragraphs: [
          'These songs work well for players who want graceful phrase shapes and memorable melodies that are already widely recognised beyond a single instrument community.',
          'They also make strong first choices for learners who want international repertoire without jumping straight into dense classical pages.'
        ],
        songSlugs: ['arirang', 'jasmine-flower', 'sakura-sakura']
      },
      {
        title: 'European And Slavic Sing-Along Favorites',
        paragraphs: [
          'Some traditional songs are best approached as melody-first sing-along pieces. They are useful when the goal is to build familiarity, phrasing, and a more natural sense of line rather than only reading short beginner fragments.',
          'Use these pages when you want cultural variety but still need a public song page that feels readable and practical for repeated practice.'
        ],
        bullets: [
          'Start with the song you can already hum from memory.',
          'Keep the fingering chart visible until repeated leaps feel automatic.',
          'Use lyric support when it is available, but treat the melody shape as the main anchor.'
        ],
        songSlugs: ['bella-ciao', 'hej-sokoly', 'moscow-nights', 'troika']
      },
      {
        title: 'Bright Rhythm And Travel-Friendly Melodies',
        paragraphs: [
          'These melodies bring a different kind of energy: stronger dance character, clearer pulse, or a travelling folk-song feel that makes them memorable after only a few repetitions.'
        ],
        songSlugs: ['la-cucaracha', 'el-condor-pasa', 'red-berries-blossom', 'the-hawthorn-tree']
      }
    ],
    faq: [
      {
        question: 'Is this page only for advanced players?',
        answer:
          'No. The songs vary in length and shape, but this guide is still built as a melody-first entry page. It helps learners find recognisable international tunes without leaving a familiar letter-note reading setup.'
      },
      {
        question: 'Are these full traditional arrangements?',
        answer:
          'No. These are public melody pages designed for practical reading and practice. They focus on the tune line with the same fingering and reading support used elsewhere on the site.'
      }
    ],
    relatedGuideSlugs: [
      'folk-songs-for-beginners',
      'music-class-songs-for-beginners',
      'songs-with-lyrics'
    ]
  },
  {
    slug: 'how-to-read-letter-notes',
    kind: 'guide',
    title: 'How to Read Letter Notes for Ocarina, Recorder and Tin Whistle',
    description:
      'A practical beginner guide to using letter notes, fingering charts, lyrics, and simple song pages without jumping straight into staff notation.',
    heroLabel: 'Learning Guide',
    intro: [
      'This page answers a broad beginner question that many searchers have before they even choose a song: how do letter notes actually help, and how should they be used on a melody instrument?',
      'The answer on this site is not abstract theory. It is a practical workflow built around public song pages with visible fingerings, optional lyrics, and a default reading mode that keeps the melody easy to scan.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'mary-had-a-little-lamb',
      'ode-to-joy',
      'amazing-grace',
      'jingle-bells',
      'scarborough-fair'
    ],
    sections: [
      {
        title: 'What Letter Notes Are Good For',
        paragraphs: [
          'Letter notes are useful because they reduce the reading barrier for people who want to start by hearing and playing a melody rather than decoding staff notation first.',
          'They are especially practical on simple melody instruments where players want to connect note names, fingering, and tune shape in one glance.'
        ],
        bullets: [
          'Use letter notes to start familiar melodies faster.',
          'Use the fingering chart as a visual backup while the note names settle in.',
          'Treat numbered notes as a backup option rather than the main reading view.'
        ]
      },
      {
        title: 'A Good Beginner Workflow',
        paragraphs: [
          'Start with one very familiar song in the default letter-note view. Keep the fingering chart on and resist switching settings too often during the first pass.',
          'After the melody feels stable, use zoom, layout, and lyric controls to make longer practice sessions more comfortable without changing the basic page.'
        ],
        songSlugs: [
          'twinkle-twinkle-little-star',
          'mary-had-a-little-lamb',
          'ode-to-joy',
          'jingle-bells'
        ]
      },
      {
        title: 'When To Move Beyond The Very Easiest Songs',
        paragraphs: [
          'Once the first nursery songs feel automatic, move into one slower lyrical tune and one familiar seasonal or folk tune. That gives you a broader reading challenge without abandoning the same letter-note workflow.'
        ],
        songSlugs: ['amazing-grace', 'scarborough-fair', 'silent-night']
      }
    ],
    faq: [
      {
        question: 'Are letter notes only for children or total beginners?',
        answer:
          'No. They are most helpful early, but many casual players and returning adults still prefer a melody-first page for quick practice or familiar tunes.'
      },
      {
        question: 'Does this site replace staff notation completely?',
        answer:
          'No. It gives a simpler starting layer for melody practice, especially when visitors want to begin with recognition, fingering, and phrase control before reading full notation.'
      }
    ],
    relatedGuideSlugs: [
      'easy-songs-for-beginners',
      '12-hole-ocarina-letter-notes',
      'recorder-letter-notes'
    ]
  },
  {
    slug: 'easy-classical-letter-note-songs',
    kind: 'hub',
    title: 'Easy Classical Letter Note Songs',
    description:
      'A public guide for approachable classical melodies with letter notes, fingering charts, and practical first themes for ocarina, recorder, and tin whistle players.',
    heroLabel: 'Classical Song Guide',
    intro: [
      'Many search visitors do not want a full classical catalog first. They want one page that gathers the best-known themes they can recognize quickly and start reading without staff-heavy notation.',
      'This guide keeps that entry path simple by leading with famous themes that are easy to recognize, easy to compare, and practical to start without reading full notation.'
    ],
    featuredSongSlugs: [
      'ode-to-joy',
      'fur-elise',
      'canon',
      'minuet-in-g',
      'air-on-the-g-string',
      'moonlight-sonata'
    ],
    sections: [
      {
        title: 'Best Classical Songs To Start With',
        paragraphs: [
          'The easiest classical entry pages are the ones with a strong public melody identity and a phrase shape people already know. That lowers the reading barrier and lets the letter-note view do its job.',
          'Start with the pages below before moving into slower or more expressive themes that need stronger breath planning.'
        ],
        songSlugs: ['ode-to-joy', 'minuet-in-g', 'fur-elise', 'canon']
      },
      {
        title: 'How To Practice Classical Pages Without Staff Overload',
        paragraphs: [
          'Treat these pages as melody practice first, not as a replacement for full notation study. Keep the focus on phrase shape, finger timing, and tone rather than on trying to decode everything at once.'
        ],
        bullets: [
          'Begin with the most familiar theme, not the most prestigious title.',
          'Keep the fingering chart visible until the phrase shape feels stable.',
          'Use zoom and measure numbers before switching away from the default letter-note view.'
        ]
      },
      {
        title: 'Longer Or Slower Classical Themes To Add Next',
        paragraphs: [
          'Once the first themes feel comfortable, add one slower lyrical page and one more formal melody. That builds patience, breath control, and phrase connection without leaving the same reading workflow.'
        ],
        songSlugs: ['air-on-the-g-string', 'moonlight-sonata', 'romeo-and-juliet', 'schubert-serenade']
      }
    ],
    faq: [
      {
        question: 'Is this page meant for advanced classical players only?',
        answer:
          'No. It is a search-friendly entry page for players who want famous classical melodies in a lighter reading format before dealing with fuller notation or longer arrangements.'
      },
      {
        question: 'Do these songs open a different classical player?',
        answer:
          'No. The classical guide only simplifies discovery. Once you choose a theme, the reading tools stay the same, which keeps famous melodies easy to compare across difficulty levels.'
      }
    ],
    relatedGuideSlugs: [
      'how-to-read-letter-notes',
      'easy-songs-for-beginners',
      '12-hole-ocarina-letter-notes'
    ]
  },
  {
    slug: 'music-class-songs-for-beginners',
    kind: 'guide',
    title: 'Easy Songs for Music Class and Home Practice',
    description:
      'A classroom-friendly guide for teachers, parents, and self-learners who need familiar songs with letter notes, lyric support, and low setup friction.',
    heroLabel: 'Learning Guide',
    intro: [
      'This page plays the role of a practical education article, not just another filtered list. It is designed for people who search for easy music class songs and then need real melody pages they can actually use.',
      'The goal is to connect that broad classroom intent to melody pages that teachers and families can actually reuse, so discovery turns into repeat practice instead of a one-time read.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'mary-had-a-little-lamb',
      'frere-jacques',
      'jingle-bells',
      'ode-to-joy',
      'happy-birthday-to-you',
      'its-a-small-world'
    ],
    sections: [
      {
        title: 'What Makes A Good Music Class Song',
        paragraphs: [
          'The best classroom melodies are already familiar, short enough to repeat, and readable without a heavy notation barrier. That is why nursery songs, simple holiday pieces, and a few famous themes do so well early on.',
          'They let class time go to timing, finger movement, and confident tune entry instead of to basic song recognition.'
        ]
      },
      {
        title: 'A Practical First Sequence',
        paragraphs: [
          'A strong first sequence starts with two or three very short songs, then adds one holiday song and one simple classical theme. That keeps the class moving forward without a sudden jump in difficulty.'
        ],
        songSlugs: [
          'twinkle-twinkle-little-star',
          'mary-had-a-little-lamb',
          'frere-jacques',
          'jingle-bells',
          'ode-to-joy',
          'its-a-small-world'
        ]
      },
      {
        title: 'How To Reuse The Same Pages At Home',
        paragraphs: [
          'The same melody pages can carry over into home practice because they keep the tune stable across devices and sessions. Families do not need a different handout or screenshot every time they revisit the song.'
        ],
        bullets: [
          'Send learners back to one stable song URL instead of a cropped image.',
          'Use lyric-enabled pages when singing helps with phrase entry.',
          'Move to a longer tune only after the first songs feel automatic.'
        ],
        songSlugs: ['happy-birthday-to-you', 'row-row-row-your-boat', 'old-macdonald', 'its-a-small-world']
      }
    ],
    faq: [
      {
        question: 'Is this page only for school teachers?',
        answer:
          'No. It is also useful for parents, tutors, and self-learners who want a reliable first-song path without building their own starter list from scratch.'
      },
      {
        question: 'Does this replace the main song library?',
        answer:
          'No. It gives classroom and home-practice visitors a narrower landing page first, then sends them into reusable song pages instead of leaving them with a one-off article.'
      }
    ],
    relatedGuideSlugs: [
      'simple-instruments-for-music-education',
      'easy-songs-for-beginners',
      'nursery-rhyme-letter-notes'
    ]
  },
  {
    slug: 'hymns-and-spiritual-letter-note-songs',
    kind: 'hub',
    title: 'Hymns and Spiritual Letter Note Songs',
    description:
      'A public hymn and spiritual guide for players who want reflective melodies with letter notes, lyric-friendly pages, and calm practice material for ocarina, recorder, and tin whistle.',
    heroLabel: 'Hymn Song Guide',
    intro: [
      'Some visitors are not looking for a mixed beginner catalog. They want a smaller set of hymn or spiritual-style melodies they can open quickly for personal practice, church use, or quiet home playing.',
      'This page gives them a direct entry point into reflective repertoire, where lyrics can help phrasing, the fingering chart stays close at hand, and the overall reading load remains light.'
    ],
    featuredSongSlugs: [
      'amazing-grace',
      'were-you-there',
      'silent-night',
      'joy-to-the-world',
      'greensleeves',
      'going-home'
    ],
    sections: [
      {
        title: 'The Best First Hymn Pages To Open',
        paragraphs: [
          'The strongest first hymn-style pages are the ones with a clear vocal contour and enough familiarity that players can hear the next phrase before they play it. That makes the letter-note layer more useful and less intimidating.',
          'Start with the most recognisable melodies first, then add longer or more sustained pages after the first pass feels comfortable.'
        ],
        songSlugs: ['amazing-grace', 'silent-night', 'joy-to-the-world', 'were-you-there']
      },
      {
        title: 'Why These Songs Work Well For Reflective Practice',
        paragraphs: [
          'Hymn and spiritual melodies reward tone, breath pacing, and phrase patience more than speed. That makes them a practical next step after very short beginner songs.',
          'They are also useful for players who want expressive material without needing a dense staff-notation score.'
        ],
        bullets: [
          'Keep the fingering chart on for the first few passes through a slower melody.',
          'Use lyrics when singing helps you feel the phrase entry and cadence.',
          'Treat these pages as breath and tone work, not as speed exercises.'
        ],
        songSlugs: ['amazing-grace', 'were-you-there', 'going-home']
      },
      {
        title: 'Related Songs To Add After The First Hymns',
        paragraphs: [
          'Once the first reflective tunes feel steady, add adjacent folk and seasonal melodies that use a similar lyrical pace. That broadens the repertoire without changing the same melody-first workflow.'
        ],
        songSlugs: ['greensleeves', 'scarborough-fair', 'auld-lang-syne']
      }
    ],
    faq: [
      {
        question: 'Is this page only for church musicians?',
        answer:
          'No. It is also useful for self-learners, families, and casual players who want calmer lyrical songs instead of very short nursery tunes or brighter march-style melodies.'
      },
      {
        question: 'Do these songs use a different public player?',
        answer:
          'No. The hymn page narrows the repertoire, not the player. Once opened, the songs keep the usual note layout and playback controls that make slower lyrical practice easy to revisit.'
      }
    ],
    relatedGuideSlugs: [
      'songs-with-lyrics',
      'folk-songs-for-beginners',
      'easy-songs-for-adult-beginners'
    ]
  },
  {
    slug: 'easy-songs-for-adult-beginners',
    kind: 'guide',
    title: 'Easy Songs for Adult Beginners',
    description:
      'A practical guide for adult beginners who want familiar melodies with letter notes, fingering support, and a less child-focused way into ocarina, recorder, or tin whistle practice.',
    heroLabel: 'Learning Guide',
    intro: [
      'Adult beginners often want the same low-friction reading support as younger learners, but they do not necessarily want to begin with only children’s songs or classroom framing. This page answers that broader search intent directly.',
      'The goal is to give returning adults and first-time hobby players a cleaner route into familiar melodies that feel less child-centered and more personally motivating.'
    ],
    featuredSongSlugs: [
      'ode-to-joy',
      'amazing-grace',
      'over-the-rainbow',
      'moonlight-lover',
      'moon-river',
      'cant-help-falling-in-love',
      'a-thousand-years',
      'fly-me-to-the-moon',
      'scarborough-fair',
      'greensleeves',
      'auld-lang-syne',
      'canon',
      'childhood-memory',
      'edelweiss',
      'la-vie-en-rose',
      'memory-sky',
      'romeo-and-juliet',
      'sealed-with-a-kiss',
      'moon-represents-my-heart',
      'happy-birthday-to-you',
      'can-you-feel-the-love-tonight',
      'yesterday-once-more',
      'tennessee-waltz',
      'the-last-waltz',
      'waltz-no-2',
      'zeldas-lullaby',
      'song-of-time',
      'carrying-you',
      'my-heart-will-go-on',
      'river-flows-in-you',
      'speak-softly-love',
      'summer',
      'always-with-me',
      'one-summers-day',
      'path-of-the-wind',
      'ponyo-on-the-cliff-by-the-sea',
      'the-promise-of-the-world',
      'a-town-with-an-ocean-view',
      'stroll',
      'my-neighbor-totoro',
      'chihiros-waltz',
      'yesterday',
      'the-sound-of-silence',
      'right-here-waiting',
      'let-it-be',
      'take-me-home-country-roads',
      'hotel-california',
      'imagine',
      'lemon-tree',
      'careless-whisper',
      'love-is-blue',
      'where-do-i-begin',
      'mariage-damour',
      'kiss-the-rain',
      'casablanca',
      'sailing',
      'you-raise-me-up',
      'tears-in-heaven',
      'old-memory',
      'reminiscence',
      'flower-dance',
      'let-it-go',
      'lemon-kenshi-yonezu',
      'blue-bird',
      'gurenge',
      'cruel-angels-thesis',
      'detective-conan-main-theme',
      'only-my-railgun',
      'senbonzakura',
      'uchiage-hanabi',
      'unravel',
      'butter-fly',
      'until-the-end-of-the-world',
      'inuyashas-affection',
      'zen-zen-zense'
    ],
    sections: [
      {
        title: 'What Adult Beginners Usually Need First',
        paragraphs: [
          'Most adult beginners do not need more complexity. They need familiar melodies, stable page layouts, and enough visual support to start playing without feeling pushed into a children-only learning path.',
          'That is why this guide leans toward well-known classical themes, lyrical folk songs, and a few universal song standards.'
        ]
      },
      {
        title: 'The Best First Songs For Returning Adult Players',
        paragraphs: [
          'Start with one tune that feels almost automatic by ear, then add one slower lyrical melody and one famous theme. That gives you variety without multiplying difficulty too quickly.'
        ],
        songSlugs: [
          'ode-to-joy',
          'amazing-grace',
          'over-the-rainbow',
          'moonlight-lover',
          'moon-river',
          'cant-help-falling-in-love',
          'a-thousand-years',
          'fly-me-to-the-moon',
          'scarborough-fair',
          'greensleeves',
          'auld-lang-syne',
          'canon',
          'childhood-memory',
          'edelweiss',
          'la-vie-en-rose',
          'memory-sky',
          'romeo-and-juliet',
          'sealed-with-a-kiss',
          'moon-represents-my-heart',
          'can-you-feel-the-love-tonight',
          'yesterday',
          'the-sound-of-silence',
          'right-here-waiting',
          'let-it-be',
          'take-me-home-country-roads',
          'hotel-california',
          'imagine',
          'lemon-tree',
          'careless-whisper',
          'love-is-blue',
          'where-do-i-begin',
          'mariage-damour',
          'kiss-the-rain',
          'casablanca',
          'sailing',
          'you-raise-me-up',
          'tears-in-heaven',
          'old-memory',
          'reminiscence',
          'flower-dance',
          'let-it-go',
          'lemon-kenshi-yonezu',
          'blue-bird',
          'gurenge',
          'cruel-angels-thesis',
          'detective-conan-main-theme',
          'only-my-railgun',
          'senbonzakura',
          'uchiage-hanabi',
          'unravel',
          'butter-fly',
          'until-the-end-of-the-world',
          'inuyashas-affection',
          'zen-zen-zense',
          'yesterday-once-more',
          'tennessee-waltz',
          'the-last-waltz',
          'waltz-no-2',
          'zeldas-lullaby',
          'song-of-time',
          'my-heart-will-go-on',
          'summer',
          'concerning-hobbits',
          'ponyo-on-the-cliff-by-the-sea',
          'the-promise-of-the-world',
          'a-town-with-an-ocean-view',
          'speak-softly-love',
          'stroll',
          'my-neighbor-totoro',
          'chihiros-waltz',
          'game-of-thrones-theme',
          'city-of-stars',
          'see-you-again',
          'the-avengers'
        ]
      },
      {
        title: 'How To Use The Site Without Overcomplicating Practice',
        paragraphs: [
          'Use the default letter-note page first and avoid changing too many settings at once. The fastest gains usually come from repeating one or two familiar melodies, not from browsing dozens of pages in a single session.'
        ],
        bullets: [
          'Choose recognition before difficulty: pick the tune you already hear in your head.',
          'Keep the fingering chart visible until the page feels visually familiar.',
          'Use songs with lyrics when the words help you hear phrase timing more clearly.'
        ],
        songSlugs: ['happy-birthday-to-you', 'amazing-grace', 'over-the-rainbow', 'moonlight-lover', 'greensleeves', 'moon-river', 'cant-help-falling-in-love', 'a-thousand-years', 'childhood-memory', 'edelweiss', 'la-vie-en-rose', 'memory-sky', 'romeo-and-juliet', 'sealed-with-a-kiss', 'moon-represents-my-heart', 'can-you-feel-the-love-tonight', 'yesterday', 'the-sound-of-silence', 'right-here-waiting', 'let-it-be', 'take-me-home-country-roads', 'hotel-california', 'imagine', 'lemon-tree', 'careless-whisper', 'love-is-blue', 'where-do-i-begin', 'mariage-damour', 'kiss-the-rain', 'casablanca', 'sailing', 'you-raise-me-up', 'tears-in-heaven', 'old-memory', 'reminiscence', 'flower-dance', 'let-it-go', 'lemon-kenshi-yonezu', 'blue-bird', 'gurenge', 'cruel-angels-thesis', 'detective-conan-main-theme', 'only-my-railgun', 'senbonzakura', 'uchiage-hanabi', 'unravel', 'butter-fly', 'until-the-end-of-the-world', 'inuyashas-affection', 'zen-zen-zense', 'yesterday-once-more', 'tennessee-waltz', 'the-last-waltz', 'waltz-no-2', 'zeldas-lullaby', 'carrying-you', 'river-flows-in-you', 'always-with-me', 'concerning-hobbits', 'ponyo-on-the-cliff-by-the-sea', 'the-promise-of-the-world', 'a-town-with-an-ocean-view', 'stroll', 'my-neighbor-totoro', 'chihiros-waltz', 'city-of-stars', 'see-you-again', 'the-avengers', 'princess-mononoke', 'speak-softly-love']
      }
    ],
    faq: [
      {
        question: 'Is this guide only for older adults?',
        answer:
          'No. It is for any adult beginner, including returning players and hobby learners who want a more familiar and less classroom-driven first-song path.'
      },
      {
        question: 'Does this page change the song player or notation system?',
        answer:
          'No. It only groups existing public song pages into a more targeted entry route for adult-beginner search intent.'
      }
    ],
    relatedGuideSlugs: [
      'how-to-read-letter-notes',
      'calm-and-lyrical-letter-note-songs',
      'songs-with-lyrics',
      'easy-classical-letter-note-songs',
      'folk-songs-for-beginners'
    ]
  },
  {
    slug: 'wedding-and-ceremony-letter-note-songs',
    kind: 'hub',
    title: 'Wedding and Ceremony Letter Note Songs',
    description:
      'A public ceremony-focused guide for players who want wedding processional, recessional, and reflective letter-note melodies with fingering support on one clean entry page.',
    heroLabel: 'Ceremony Song Guide',
    intro: [
      'Some visitors are not searching for a general beginner song list. They need a smaller set of calm, recognisable melodies that fit wedding aisles, ceremonies, and formal moments, and they need those pages quickly.',
      'This guide is about formal event fit more than march pulse or patriotic context, so it keeps the focus on processional, recessional, and reflective melodies that hold up in ceremony settings.'
    ],
    featuredSongSlugs: [
      'canon',
      'wedding-march',
      'wedding-march-alt',
      'amazing-grace',
      'a-thousand-years',
      'speak-softly-love',
      'air-on-the-g-string',
      'going-home',
      'mariage-damour',
      'where-do-i-begin'
    ],
    sections: [
      {
        title: 'Best Ceremony Songs To Open First',
        paragraphs: [
          'The strongest first pages for ceremonies are the ones with immediate recognition and a stable phrase flow. They let players focus on entrance timing, breathing, and confident note changes instead of learning an unfamiliar tune at the same time.',
          'That is why this guide starts with Canon, Wedding March, and Amazing Grace before moving outward into quieter reflective melodies.'
        ],
        songSlugs: ['canon', 'wedding-march', 'amazing-grace', 'a-thousand-years', 'speak-softly-love', 'mariage-damour']
      },
      {
        title: 'How To Choose Between Processional and Reflective Pages',
        paragraphs: [
          'Processional choices usually need a steadier forward pulse, while reflective ceremony pages ask for calmer phrasing and warmer tone. Keeping both types in one guide helps players compare pages without bouncing around the whole library.'
        ],
        bullets: [
          'Use Canon or Wedding March when you need a recognisable ceremony entrance feel.',
          'Use Amazing Grace or Going Home when you want a slower, more reflective pace.',
          'Keep the fingering chart visible on the first run so timing and note shape stay aligned under pressure.'
        ],
        songSlugs: ['wedding-march-alt', 'going-home', 'air-on-the-g-string', 'speak-softly-love', 'where-do-i-begin']
      },
      {
        title: 'What To Practice Before A Real Event',
        paragraphs: [
          'Ceremony pages should be rehearsed as complete runs, not just as isolated phrases. The goal is a page that feels dependable enough for entrances, pauses, and restarts in a real room.',
          'These songs work best when you practice the exact page flow, keep the layout stable, and resist changing settings at the last minute.'
        ],
        songSlugs: ['canon', 'wedding-march', 'a-thousand-years', 'air-on-the-g-string', 'speak-softly-love', 'mariage-damour', 'where-do-i-begin']
      }
    ],
    faq: [
      {
        question: 'Is this only for formal weddings?',
        answer:
          'No. It is also useful for recitals, memorials, school ceremonies, and other events where players want a smaller set of calm or processional-ready melody pages.'
      },
      {
        question: 'Do these songs use a different player or notation system?',
        answer:
          'No. This guide is only a focused public entry page. Every card still opens the same song detail page with the usual letter notes, fingering support, and optional numbered-note backup view.'
      }
    ],
    relatedGuideSlugs: [
      'easy-classical-letter-note-songs',
      'hymns-and-spiritual-letter-note-songs',
      'first-performance-letter-note-songs'
    ]
  },
  {
    slug: 'calm-and-lyrical-letter-note-songs',
    kind: 'hub',
    title: 'Calm and Lyrical Letter Note Songs',
    description:
      'A public guide for slow, lyrical, and reflective melody pages with letter notes, fingering support, and gentle repertoire for ocarina, recorder, and tin whistle.',
    heroLabel: 'Lyrical Song Guide',
    intro: [
      'Some visitors are not looking for a flashy first tune or a classroom nursery song. They want calmer melody pages that feel reflective, lyrical, and useful for slower practice or quiet performance.',
      'This guide answers that intent directly by keeping the letter-note layout, fingering chart, and optional numbered-note backup view familiar from song to song, so learners can focus on pulse rather than interface changes.'
    ],
    featuredSongSlugs: [
      'amazing-grace',
      'over-the-rainbow',
      'moonlight-lover',
      'moon-river',
      'cant-help-falling-in-love',
      'a-thousand-years',
      'fly-me-to-the-moon',
      'air-on-the-g-string',
      'childhood-memory',
      'edelweiss',
      'greensleeves',
      'going-home',
      'la-vie-en-rose',
      'memory-sky',
      'sealed-with-a-kiss',
      'moon-represents-my-heart',
      'romeo-and-juliet',
      'can-you-feel-the-love-tonight',
      'yesterday-once-more',
      'tennessee-waltz',
      'the-last-waltz',
      'zeldas-lullaby',
      'lullaby',
      'traumerei',
      'song-of-time',
      'carrying-you',
      'my-heart-will-go-on',
      'river-flows-in-you',
      'merry-christmas-mr-lawrence',
      'speak-softly-love',
      'concerning-hobbits',
      'summer',
      'always-with-me',
      'the-promise-of-the-world',
      'a-town-with-an-ocean-view',
      'one-summers-day',
      'path-of-the-wind',
      'chihiros-waltz',
      'princess-mononoke',
      'yesterday',
      'the-sound-of-silence',
      'right-here-waiting',
      'let-it-be',
      'hotel-california',
      'imagine',
      'careless-whisper',
      'love-is-blue',
      'where-do-i-begin',
      'mariage-damour',
      'kiss-the-rain',
      'casablanca',
      'sailing',
      'you-raise-me-up',
      'tears-in-heaven',
      'old-memory',
      'reminiscence',
      'let-it-go',
      'lemon-kenshi-yonezu',
      'uchiage-hanabi',
      'until-the-end-of-the-world',
      'inuyashas-affection',
      'city-of-stars',
      'see-you-again'
    ],
    sections: [
      {
        title: 'Best Calm Songs To Open First',
        paragraphs: [
          'The strongest first pages in this group are the ones with an immediately singable line and enough melodic familiarity that the player can focus on tone and breath instead of on decoding a dense tune. That is why Amazing Grace, Greensleeves, and Air on the G String work so well here.',
          'They give slower practice value without forcing the player into long technical passages or large jumps right away.'
        ],
        songSlugs: ['amazing-grace', 'over-the-rainbow', 'moonlight-lover', 'greensleeves', 'moon-river', 'cant-help-falling-in-love', 'a-thousand-years', 'fly-me-to-the-moon', 'air-on-the-g-string', 'childhood-memory', 'edelweiss', 'going-home', 'la-vie-en-rose', 'memory-sky', 'romeo-and-juliet', 'sealed-with-a-kiss', 'moon-represents-my-heart', 'can-you-feel-the-love-tonight', 'yesterday', 'the-sound-of-silence', 'right-here-waiting', 'let-it-be', 'hotel-california', 'imagine', 'careless-whisper', 'love-is-blue', 'where-do-i-begin', 'mariage-damour', 'kiss-the-rain', 'casablanca', 'sailing', 'you-raise-me-up', 'tears-in-heaven', 'old-memory', 'reminiscence', 'let-it-go', 'lemon-kenshi-yonezu', 'uchiage-hanabi', 'until-the-end-of-the-world', 'inuyashas-affection', 'tennessee-waltz', 'the-last-waltz', 'zeldas-lullaby', 'merry-christmas-mr-lawrence', 'concerning-hobbits', 'path-of-the-wind', 'the-promise-of-the-world', 'a-town-with-an-ocean-view', 'chihiros-waltz', 'speak-softly-love', 'city-of-stars', 'see-you-again']
      },
      {
        title: 'How To Practice Lyrical Pages',
        paragraphs: [
          'Treat these songs as breath and phrase-shape work first. A calm melody becomes more useful when the player keeps the line connected, leaves room for phrase endings, and avoids chasing speed that the tune does not need.',
          'These pages are especially practical when you want one stable URL for quiet daily practice, lesson assignments, or event preparation without switching between images, lyric sheets, and staff-heavy PDFs.'
        ],
        bullets: [
          'Keep the fingering chart on until slower phrase changes feel automatic.',
          'Use lyrics only when they help you hear cadence points and phrase entry.',
          'Zoom in on longer lyrical pages instead of trying to rush through the full sheet.'
        ],
        songSlugs: ['lullaby', 'over-the-rainbow', 'moonlight-lover', 'moon-river', 'cant-help-falling-in-love', 'a-thousand-years', 'traumerei', 'schubert-serenade', 'childhood-memory', 'edelweiss', 'la-vie-en-rose', 'memory-sky', 'romeo-and-juliet', 'sealed-with-a-kiss', 'moon-represents-my-heart', 'yesterday', 'the-sound-of-silence', 'right-here-waiting', 'let-it-be', 'hotel-california', 'imagine', 'careless-whisper', 'love-is-blue', 'where-do-i-begin', 'mariage-damour', 'kiss-the-rain', 'casablanca', 'sailing', 'you-raise-me-up', 'tears-in-heaven', 'old-memory', 'reminiscence', 'lemon-kenshi-yonezu', 'uchiage-hanabi', 'until-the-end-of-the-world', 'inuyashas-affection', 'yesterday-once-more', 'tennessee-waltz', 'the-last-waltz', 'zeldas-lullaby', 'song-of-time', 'river-flows-in-you', 'summer', 'concerning-hobbits', 'the-promise-of-the-world', 'a-town-with-an-ocean-view', 'one-summers-day', 'chihiros-waltz', 'city-of-stars', 'see-you-again']
      },
      {
        title: 'What To Add After The First Reflective Tunes',
        paragraphs: [
          'Once the calmest pages feel comfortable, add one folk melody and one classical page that still keep a lyrical contour. That broadens the repertoire without leaving the same slower, phrase-first workflow.'
        ],
        songSlugs: ['scarborough-fair', 'over-the-rainbow', 'moonlight-lover', 'sakura-sakura', 'childhood-memory', 'edelweiss', 'la-vie-en-rose', 'memory-sky', 'moonlight-sonata', 'moon-represents-my-heart', 'romeo-and-juliet', 'can-you-feel-the-love-tonight', 'carrying-you', 'my-heart-will-go-on', 'inuyashas-affection', 'always-with-me', 'concerning-hobbits', 'the-promise-of-the-world', 'a-town-with-an-ocean-view', 'princess-mononoke', 'speak-softly-love', 'love-is-blue', 'where-do-i-begin', 'mariage-damour', 'city-of-stars', 'see-you-again', 'yesterday', 'sealed-with-a-kiss', 'you-raise-me-up', 'tears-in-heaven', 'old-memory', 'reminiscence']
      }
    ],
    faq: [
      {
        question: 'Are these songs only for advanced players?',
        answer:
          'No. Several of these pages are approachable for adult beginners and returning players because the challenge is more about steady breath and connected tone than about fast technical execution.'
      },
      {
        question: 'Does this calm-song guide change the player or notation system?',
        answer:
          'No. It is only a themed entry page. The songs keep the usual letter notes, fingering chart, and optional numbered-note backup view once you open them.'
      }
    ],
    relatedGuideSlugs: [
      'easy-songs-for-adult-beginners',
      'songs-with-lyrics',
      'hymns-and-spiritual-letter-note-songs',
      'easy-classical-letter-note-songs'
    ]
  },
  {
    slug: 'lullaby-and-bedtime-letter-note-songs',
    kind: 'hub',
    title: 'Lullaby and Bedtime Letter Note Songs',
    description:
      'A public guide for lullabies, bedtime melodies, and other quiet letter-note songs with fingering support and slower, calmer practice material.',
    heroLabel: 'Bedtime Song Guide',
    intro: [
      'Some visitors are specifically looking for lullabies, bedtime melodies, or other songs that feel gentle enough for quiet home playing. They are not searching for a mixed song list or a faster beginner set.',
      'This guide answers that intent with a smaller group of calm song pages, so players can move straight into readable letter notes, keep the fingering chart on, and settle into a quieter practice flow.'
    ],
    featuredSongSlugs: [
      'lullaby',
      'moonlight-sonata',
      'schubert-serenade',
      'traumerei',
      'air-on-the-g-string',
      'moscow-nights',
      'zeldas-lullaby'
    ],
    sections: [
      {
        title: 'Best Bedtime Songs To Open First',
        paragraphs: [
          'The best starting pages here are the ones with a gentle contour and enough familiarity that the player can stay focused on breath, tone, and smooth phrase endings. Brahms Lullaby, Traumerei, and Air on the G String are strong first choices for that reason.',
          'They feel calm and readable without pushing the player into fast ornaments, march-like rhythm, or a crowded score.'
        ],
        songSlugs: ['lullaby', 'traumerei', 'air-on-the-g-string', 'schubert-serenade', 'zeldas-lullaby']
      },
      {
        title: 'How To Use These Pages For Quiet Practice',
        paragraphs: [
          'These songs work best when they are treated as phrase-shape and tone-control practice, not as speed exercises. A bedtime melody becomes more useful when the player keeps the line connected, leaves space at cadences, and uses the slower pace to stabilize finger changes.',
          'They are also practical for parents, teachers, and returning players who want a calm melody page on one URL instead of moving between lyric sites, screenshots, and staff-only sheets.'
        ],
        bullets: [
          'Keep the fingering chart visible until the slower note changes feel automatic.',
          'Use zoom for longer lyrical pages rather than rushing to play the whole sheet at once.',
          'Let lyrics guide phrase shape only when the song page supports them and they help you hear the cadence.'
        ],
        songSlugs: ['moonlight-sonata', 'moscow-nights', 'going-home', 'zeldas-lullaby']
      },
      {
        title: 'What To Add After The First Lullabies',
        paragraphs: [
          'Once the gentlest pages feel comfortable, add one folk melody and one classical page that still keep a soft contour. That broadens the bedtime repertoire without leaving the same calm, melody-first workflow.'
        ],
        songSlugs: ['sakura-sakura', 'greensleeves', 'londonderry-air']
      }
    ],
    faq: [
      {
        question: 'Is this page only for children or baby songs?',
        answer:
          'No. It is also useful for adult beginners, returning players, and anyone who wants slower lyrical repertoire for evening practice, lessons, or quiet performance.'
      },
      {
        question: 'Do these bedtime songs use a different player?',
        answer:
          'No. This guide only narrows the entry path. The bedtime songs still use the usual letter notes, fingering support, and optional numbered-note backup view once you open them.'
      }
    ],
    relatedGuideSlugs: [
      'calm-and-lyrical-letter-note-songs',
      'easy-songs-for-adult-beginners',
      'easy-classical-letter-note-songs'
    ]
  },
  {
    slug: 'dance-and-waltz-letter-note-songs',
    kind: 'hub',
    title: 'Dance and Waltz Letter Note Songs',
    description:
      'A public guide for lively dance, waltz-like, and polka-style melody pages with letter notes, fingering charts, and brighter rhythmic practice.',
    heroLabel: 'Dance Song Guide',
    intro: [
      'Some visitors are not looking for the calmest beginner page or a seasonal song list. They want something more rhythmic: a dance melody, a polka, a waltz-like song, or another tune with a clear pulse and stronger motion.',
      'This guide gives that entry point while preserving the familiar note layout and fingering support, so players can work on pulse and motion without switching to a different kind of reading page.'
    ],
    featuredSongSlugs: [
      'can-can',
      'chihiros-waltz',
      'habanera',
      'waltz-no-2',
      'tennessee-waltz',
      'the-last-waltz',
      'woodpecker-polka',
      'blacksmith-polka',
      'the-hawthorn-tree',
      'turkish-march',
      'hes-a-pirate',
      'merry-go-round-of-life',
      'flower-dance',
      'blue-bird',
      'gurenge',
      'cruel-angels-thesis',
      'detective-conan-main-theme',
      'only-my-railgun',
      'senbonzakura',
      'unravel',
      'butter-fly',
      'zen-zen-zense'
    ],
    sections: [
      {
        title: 'Best Dance Pages To Start With',
        paragraphs: [
          'The easiest first picks in this group are the melodies with a clear repeated pulse and a recognizable hook. Can-Can and Habanera work well because players usually already know the contour, which frees them to focus on articulation and beat placement.',
          'They also make a good contrast with slower lyrical pages, so visitors who want more energy can find a better fit right away.'
        ],
        songSlugs: ['can-can', 'habanera', 'chihiros-waltz', 'waltz-no-2', 'tennessee-waltz', 'the-last-waltz', 'woodpecker-polka', 'blacksmith-polka', 'merry-go-round-of-life', 'flower-dance', 'blue-bird', 'gurenge', 'cruel-angels-thesis', 'detective-conan-main-theme', 'only-my-railgun', 'senbonzakura', 'unravel', 'butter-fly', 'zen-zen-zense']
      },
      {
        title: 'How To Practice Brighter Rhythmic Songs',
        paragraphs: [
          'Treat these pages as pulse and articulation work before chasing speed. A dance melody becomes cleaner when the player keeps the beat steady, shapes short repeated figures clearly, and avoids overblowing the accented notes.',
          'These songs are useful when you want a more animated practice set without opening a dense orchestra score or a full piano arrangement.'
        ],
        bullets: [
          'Keep the fingering chart visible while repeated-note patterns settle in.',
          'Count the pulse out loud before trying to increase speed.',
          'Use shorter practice loops so articulation stays clear instead of blurry.'
        ],
        songSlugs: ['dancing-doll-and-teddy-bear', 'swan-lake', 'chihiros-waltz', 'waltz-no-2', 'tennessee-waltz', 'the-last-waltz', 'the-hawthorn-tree', 'flower-dance', 'blue-bird', 'gurenge', 'cruel-angels-thesis', 'detective-conan-main-theme', 'only-my-railgun', 'senbonzakura', 'unravel', 'butter-fly', 'zen-zen-zense']
      },
      {
        title: 'What To Add After The First Polkas And Waltz-Like Tunes',
        paragraphs: [
          'Once the shorter dance pages feel secure, add one broader classical page and one march-like tune. That keeps the brighter energy while expanding the rhythm shapes you can read without changing to a different practice setup.'
        ],
        songSlugs: ['turkish-march', 'american-patrol', 'parade-of-the-wooden-soldiers', 'hes-a-pirate', 'detective-conan-main-theme', 'merry-go-round-of-life', 'chihiros-waltz', 'waltz-no-2', 'tennessee-waltz', 'the-last-waltz']
      }
    ],
    faq: [
      {
        question: 'Are these full concert arrangements?',
        answer:
          'No. They are melody-first public pages meant to keep the main tune readable, which makes them more useful for everyday practice on ocarina, recorder, and tin whistle.'
      },
      {
        question: 'Does this page replace the classical or march guides?',
        answer:
          'No. This guide is narrower. It is meant for visitors whose search intent is specifically lively dance-like repertoire, while the broader classical and march guides still cover a wider mix.'
      }
    ],
    relatedGuideSlugs: [
      'easy-classical-letter-note-songs',
      'march-and-parade-letter-note-songs',
      'easy-songs-for-adult-beginners'
    ]
  }
]

const LEARN_GUIDE_SEO_OVERRIDES: Partial<
  Record<string, Pick<LearnGuideDefinition, 'heroSummary' | 'metaTitle' | 'metaDescription'>>
> = {
  '12-hole-ocarina-letter-notes': {
    metaTitle: '12-Hole Ocarina Letter Notes, Easy Tabs, and Finger Charts',
    heroSummary: [
      'Players who search for 12-hole ocarina letter notes are usually looking for recognizable melodies, easy tabs, 12-hole ocarina notes, and a finger chart that turns tune memory into finger movement without forcing them through full staff notation first. This hub gathers that exact use case around songs that already work well on a standard 12-hole instrument, including nursery standards, first-lesson tunes, hymns, holiday melodies, and slow classical themes that keep the page readable while breath support is still developing.',
      'That mix matters because the 12-hole ocarina rewards stable phrasing and familiar contour more than random tab collections. Many of these melodies come from public-domain traditions that beginners already know by ear, so the letter-note layer and fingering chart become practical learning tools instead of decoration. Use this page when you want a clean first stop for beginner ocarina repertoire, direct song links, and public melody pages that still let you move into numbered notes only when you actually need the backup view.'
    ],
    metaDescription:
      '12-hole ocarina letter notes with easy tabs, finger charts, and beginner songs for nursery, teaching, folk, hymn, holiday, and first-lesson practice.'
  },
  'easy-12-hole-ocarina-songs': {
    metaTitle: 'Easy 12-Hole Ocarina Songs with Letter Notes',
    metaDescription:
      'Easy 12-hole ocarina songs with letter notes, finger charts, and beginner tabs for familiar melodies, teaching tunes, hymns, and holiday tunes.'
  },
  '6-hole-ocarina-letter-notes': {
    heroSummary: [
      'A 6-hole ocarina search usually comes from players using a compact pendant or starter instrument who need songs that fit a smaller layout and feel playable right away. This hub is built for that exact moment. It favors short melodies, repeated phrases, and familiar beginner repertoire that opens directly in the 6-hole view, so learners can spend more time hearing phrase shape and less time hunting for a different fingering chart after every click.',
      'That approach works especially well because small ocarinas reward confidence, repetition, and stable breath more than large jumps in complexity. Nursery tunes, simple carols, and first classical melodies give beginners enough musical context to trust what they are seeing on the page. The result is not a separate runtime or a new notation system. It is a tighter public entry point for 6-hole finger charts, easy tabs, and melody pages that stay readable while finger patterns are still becoming automatic.'
    ],
    metaDescription:
      '6-hole ocarina letter notes with beginner songs, easy tabs, and finger charts that open directly in the 6-hole view.'
  },
  'recorder-letter-notes': {
    heroSummary: [
      'Recorder players often arrive from school music, home practice, or classroom search terms that are much more specific than a general song library. They want recorder letter notes, an easy finger chart, and a set of songs that feels ready for eight-hole beginner use without requiring a staff-reading detour. This hub is written around that context, with familiar melodies that work well for recorder classes, first solo practice, and students who need to connect note names to simple finger patterns quickly.',
      'That makes the page useful well beyond pure SEO. Teachers can send students to one clean route, parents can find recognizable songs without sorting through unrelated repertoire, and beginners can stay on melody-first pages that already support fingering help and optional numbered-note backup. The repertoire also fits the real history of recorder teaching: school songs, holiday pieces, and public-domain tunes that students can sing before they play. That combination helps recorder practice feel concrete, searchable, and easy to repeat.'
    ],
    metaDescription:
      'Recorder letter notes, easy songs, and finger-chart-friendly melody pages for classroom practice, home beginners, and first eight-hole tunes.'
  },
  'tin-whistle-letter-notes': {
    heroSummary: [
      'Tin whistle players usually look for melody pages that respect the instrument itself: clear phrase shapes, familiar tunes, and a timbre that shines on folk airs, hymns, and singable standards. This hub answers that search intent with letter notes, visual charts, and whistle-ready pages that open in the tin whistle view from the start. It is especially useful for beginners who recognize the tune but still need help matching breath, fingering, and contour on a six-hole whistle.',
      'The category also fits the instrument culturally. A whistle sounds at home in public-domain folk repertoire, Celtic airs, simple hymns, and ceremonial melodies because the instrument carries line and ornament so naturally even before advanced technique arrives. That is why this page leans into familiar melody-first repertoire instead of abstract exercises. Use it when you want easy tabs, readable whistle charts, and a practical bridge from first-note practice into the kinds of songs that actually make players keep picking up the instrument.'
    ]
  },
  'how-to-start-ocarina-with-letter-notes': {
    metaDescription:
      'Learn how to start ocarina with letter notes, beginner songs, and visual charts that turn familiar tunes into a first practice routine.'
  },
  'how-to-start-recorder-with-letter-notes': {
    metaTitle: 'How to Start Recorder with Letter Notes and Easy Songs',
    metaDescription:
      'Start recorder with letter notes, easy classroom songs, and finger charts that connect beginner melody reading to simple finger patterns at home or in class.'
  },
  'how-to-start-tin-whistle-with-letter-notes': {
    metaDescription:
      'Start tin whistle with letter notes, easy tabs, and visual charts that help beginners build breath control through familiar tunes.'
  },
  'how-to-practice-ocarina-with-letter-notes': {
    metaDescription:
      'Practice ocarina with letter notes using easy songs, visual charts, and a simple routine for tone, fingering, and phrase control.'
  },
  'how-to-practice-recorder-with-letter-notes': {
    metaDescription:
      'Practice recorder with letter notes using easy songs, finger charts, and short routines for classroom players and home beginners.'
  },
  'how-to-practice-tin-whistle-with-letter-notes': {
    metaDescription:
      'Practice tin whistle with letter notes using easy tabs, visual charts, and short routines for breath, cuts, and steady phrasing.'
  },
  'easy-6-hole-ocarina-songs': {
    metaDescription:
      'Easy 6-hole ocarina songs with letter notes, finger charts, and beginner tabs that open directly in the 6-hole view.'
  },
  'easy-christmas-ocarina-songs': {
    metaDescription:
      'Easy Christmas ocarina songs with letter notes, visual charts, and beginner-friendly carols for seasonal practice and performances.'
  },
  'easy-recorder-songs-for-beginners': {
    metaTitle: 'Easy Recorder Songs for Beginners with Letter Notes',
    heroSummary: [
      'Recorder beginners usually need songs that feel playable in a school week, not a giant archive of mixed repertoire. This hub focuses on that first practical batch: easy recorder songs students already know, rhythms teachers can count aloud, and note patterns that make sense on an eight-hole recorder without forcing dense staff reading. It is built for classroom warmups, first solos, and home review sessions where easy tabs and a finger chart are more useful than a formal method-book page.',
      'The strongest songs here come from nursery rhyme, holiday, and public-domain teaching traditions because they are memorable, singable, and easy to recheck by ear. That is exactly why recorder teachers keep returning to them. A familiar melody lets beginners notice finger changes, breath release, and articulation instead of guessing what the tune should sound like. Use this page when you want a recorder-first route into truly beginner-friendly songs, direct links into the public library, and practice material that feels realistic for school music and home repetition.'
    ],
    metaDescription:
      'Easy recorder songs for beginners with letter notes, finger charts, and classroom-friendly melody pages for first lessons, solos, and home practice.'
  },
  'easy-tin-whistle-songs': {
    heroSummary: [
      'Easy tin whistle songs should do more than stay short. They need to support breath timing, simple phrasing, and the bright, direct sound that makes the whistle so appealing in the first place. This hub collects beginner-friendly melodies that sit naturally on whistle, from universally known songs to folk and hymn standards that sound satisfying before a player starts adding ornament. It is the right landing page for people who search for easy tabs, simple whistle tunes, and first songs that do not feel like dry exercises.',
      'That repertoire works because the whistle has always lived close to melody-first traditions. Public-domain tunes, community songs, and singable airs let players hear success early, and they give the visual chart real context on the page. Instead of opening a dense arrangement, beginners can stay inside a readable melody line, repeat phrases, and build confidence with songs that sound complete even at a slower tempo. The result is a cleaner way into whistle practice, especially for new players who want familiar music with a natural folk feel.'
    ]
  },
  'easy-christmas-recorder-songs': {
    heroSummary: [
      'Christmas recorder pages serve a real seasonal use case: school concerts, classroom rotations, winter assemblies, and families looking for carols that students can actually play in time. This hub focuses on that practical repertoire. It brings together easy Christmas songs that fit recorder technique, keep the melody clear, and give beginners a visual chart they can trust while holiday performance pressure is still low but very real. The result is a much better landing page than sending a teacher or student into a general mixed song list.',
      'Recorder works especially well for holiday material because so many carols are public-domain melodies with balanced phrases and easy-to-recognize contours. Students can often sing them before they touch the instrument, which makes rhythm entry and finger planning much easier. That is why this page leans on familiar Christmas tunes instead of novelty filler. Use it when you need easy tabs, winter recital pieces, or short seasonal songs that still sound complete on recorder and lead straight into usable practice pages.'
    ]
  },
  'easy-christmas-tin-whistle-songs': {
    heroSummary: [
      'Christmas music is one of the most natural fits for tin whistle because the instrument can carry carol melodies with clarity, warmth, and enough brightness to sound festive even in very simple arrangements. This hub gathers easy Christmas songs that work well for whistle beginners, including public-domain carols and holiday standards that stay readable in letter notes and reward steady breath more than technical ornament. It is built for searchers who want seasonal whistle tabs without wading through unrelated tune lists first.',
      'That focus matters in December, when players often want pieces for family gatherings, church events, school performances, or casual holiday busking. Familiar carols let beginners rely on tune memory, which means the visual chart and note labels become genuinely helpful instead of overwhelming. Many of these melodies also have long cultural histories, so they already live in a repertoire people expect to hear on a whistle. Use this page when you want a seasonal path into easy tabs, singable phrasing, and whistle-friendly Christmas repertoire.'
    ]
  },
  'nursery-rhyme-letter-notes': {
    metaTitle: 'Nursery Rhyme Letter Notes and Easy First Songs',
    heroSummary: [
      'Nursery rhyme pages are not filler content on a beginner music site. They are some of the most effective first reading material because the melodies are short, repetitive, and deeply familiar from school, family singing, and early classroom music. This hub gathers that repertoire into one place for players who want letter notes, easy tabs, and visual charts that match the first songs children and beginners actually recognize. It is especially useful for recorder classes, where eight-hole beginner fingering lines up naturally with simple tune contours.',
      'These songs also reduce cognitive load in a way advanced repertoire cannot. When a student already knows the melody, attention can go to finger placement, pulse, and breathing instead of guessing pitch direction. That is why nursery songs remain central to music education across generations. They are public-domain standards, adaptable across instruments, and ideal for short lesson cycles. Use this page when you need starter repertoire for school, home practice, or early childhood music sessions built around songs children already recognize immediately.'
    ],
    metaDescription:
      'Nursery rhyme letter notes, easy first songs, and short melody pages for parent-led practice, classroom starters, and early beginners.'
  },
  'easy-songs-for-beginners': {
    metaTitle: 'Easy Beginner Songs with Letter Notes for Ocarina, Recorder, Tin Whistle',
    heroSummary: [
      'Beginner players do not always search by instrument first. Many simply want easy songs they can recognize, play in one sitting, and repeat enough times to feel real progress. This hub is built for that broader intent. It collects melody pages that stay useful across ocarina, recorder, and tin whistle, while still emphasizing easy tabs, visual charts, and beginner-friendly repertoire instead of dense notation or advanced arrangements. In other words, it acts as a true entry shelf for the public library rather than a thin category page.',
      'The song mix matters here. Familiar nursery melodies, carols, folk tunes, and first classical themes all teach slightly different skills while staying accessible to new readers. They also come with strong search demand because beginners often ask for exactly these song names plus phrases like visual chart, letter notes, or easy tabs. That gives the page both search relevance and practical value. Use it when you want one place to compare easy repertoire, discover low-pressure first songs, and branch into more specific instrument or theme guides only after the basics feel comfortable.'
    ],
    metaDescription:
      'Easy beginner songs with letter notes, visual charts, and first-step melody pages for ocarina, recorder, and tin whistle.'
  },
  'simple-instruments-for-music-education': {
    metaTitle: 'Simple Instruments for Music Education and Beginner Song Practice',
    metaDescription:
      'Simple instruments for music education, beginner song practice, and classroom-friendly melody pages with letter notes and fingering support.'
  },
  'music-class-songs-for-beginners': {
    metaTitle: 'Easy Music Class Songs with Letter Notes for School and Home',
    metaDescription:
      'Easy music class songs with letter notes, lyric-friendly melody pages, and reusable practice songs for school lessons and home review.'
  },
  'songs-with-lyrics': {
    heroSummary: [
      'Some learners read melody faster when the words stay visible. Lyrics help them hear phrase timing, breathing points, and repeated sections without needing to decode rhythm from notation alone. This hub is built around that very practical habit. It gathers song pages where public lyrics are available, so players can sing, hum, or silently track the text while using letter notes and visual charts to understand the tune. That makes the page useful for beginners, teachers, choirs, and anyone who learns best when language supports memory.',
      'The repertoire also reflects how real people use melody instruments. Holiday songs, folk standards, nursery pieces, and sing-along favorites often become easier when the lyric line is present, because the words carry stress, cadence, and structure. That is especially true in classrooms and family music settings, where playing and singing often happen together. Use this page when you want beginner songs with lyrics, easy tabs that stay connected to phrasing, and a reliable path into public melody pages that do not separate the tune from the text that gives it shape.'
    ],
    metaDescription:
      'Songs with lyrics, letter notes, and visual charts for players who learn melody, phrasing, and breathing faster when words stay visible.'
  },
  'easy-sing-along-letter-note-songs': {
    heroSummary: [
      'Sing-along repertoire has a different job from generic beginner repertoire. These songs need to be instantly recognizable, easy to join vocally, and simple enough that a player can lead a room without losing the beat or the melody line. This hub focuses on exactly that set of needs. It brings together letter-note songs that work for classrooms, family music time, seasonal gatherings, and informal group singing, with a strong emphasis on familiar choruses, public-domain standards, and visual charts that make quick preparation realistic.',
      'That context is why the song mix leans toward nursery favorites, holiday standards, and evergreen group melodies rather than obscure pieces. A true sing-along page should help someone accompany children, friends, or students with confidence, even if they only had a few minutes to prepare. Lyrics matter, repetition matters, and steady phrase entry matters more than technical display. Use this page when you need easy tabs for group participation, melody pages that support singing as well as playing, and repertoire that feels social instead of isolated.'
    ],
    metaDescription:
      'Easy sing-along songs with letter notes, visual charts, and beginner tabs for classroom, family, choir, and holiday practice.'
  },
  'first-performance-letter-note-songs': {
    heroSummary: [
      'A first performance needs repertoire that feels reliable under pressure. Beginners preparing for a recital, school assembly, family celebration, or short public appearance usually need songs that are recognizable, steady in pulse, and forgiving enough to survive nerves. This hub is built around that reality. It collects melody pages that can serve as first-performance material, from ceremonial tunes and holiday pieces to famous film, game, and public-event themes that sound complete without requiring advanced technique or a full arrangement.',
      'That makes the page more than a recital keyword target. It gives learners and teachers a practical shortlist of songs that are easier to announce, easier for listeners to recognize, and easier to rehearse repeatedly without switching materials. A good first performance song often has a strong hook, manageable length, and enough dignity to fit a formal moment, whether the player chooses a wedding classic, a march-like favorite, or a famous soundtrack melody. Use this hub when you want easy tabs, visual charts, and public melody pages that help beginners move from private practice toward their first confident appearance in front of other people.'
    ]
  },
  'christmas-letter-note-songs': {
    metaTitle: 'Christmas Letter Note Songs for Ocarina, Recorder, Tin Whistle',
    heroSummary: [
      'Christmas song searches bring in players from many directions: parents looking for family carols, teachers preparing winter concerts, church musicians needing a simple melody line, and beginners who just want festive songs they already know. This hub gives those users one broad holiday entry point. It gathers Christmas letter-note songs across the site into a single page built around public-domain carols, seasonal sing-alongs, and easy tabs that work on melody instruments without changing the underlying song pages.',
      'Holiday repertoire benefits from familiarity more than almost any other category. Most players can already hear these tunes in their heads, which makes visual charts and note labels far more effective for quick learning. The songs also carry strong seasonal intent for search, especially around classroom music, church performance, and family gatherings. Use this page when you need a wider holiday overview than an instrument-specific hub can offer, or when you want one place to compare Christmas melodies before branching into recorder, whistle, sing-along, or beginner-focused routes.'
    ],
    metaDescription:
      'Christmas letter note songs, seasonal carols, and visual-chart melody pages for ocarina, recorder, tin whistle, school, and family practice.'
  },
  'folk-songs-for-beginners': {
    metaTitle: 'Easy Folk Songs for Beginners with Letter Notes',
    heroSummary: [
      'Folk songs remain some of the best beginner repertoire because they were built to travel by memory, voice, and simple instruments long before modern tab pages existed. This hub gathers beginner-friendly folk melodies with letter notes and visual charts, giving players a route into centuries of public-domain repertoire that still feels alive on ocarina, recorder, and tin whistle. The melodies are singable, structurally clear, and often familiar enough that new players can hear the phrase direction before every fingering pattern feels secure.',
      'That historical context matters. Folk music is not just an SEO theme. It is one of the deepest sources of practical melody-first teaching material, and it suits the whistle in particular because the instrument shares so much of its color, breath phrasing, and ornament potential with traditional song and dance culture. Recorder and ocarina players benefit too, especially on slower airs and ballad-like tunes. Use this page when you want public-domain repertoire, easy tabs, and traditional songs that feel culturally grounded instead of algorithmically grouped.'
    ],
    metaDescription:
      'Easy folk songs for beginners with letter notes, visual charts, and public-domain melodies suited to ocarina, recorder, and tin whistle.'
  },
  'celtic-tin-whistle-songs': {
    metaTitle: 'Celtic Tin Whistle Songs with Letter Notes',
    heroSummary: [
      'Celtic whistle players usually are not searching for generic beginner tabs. They want tunes that actually sound right on the instrument: Irish airs, Scottish songs, and traditional melodies that match the bright edge and singing sustain of the whistle. This hub is built for that repertoire. It collects whistle-friendly pages with letter notes and visual charts so players can begin with the melody itself, whether they are learning a first air, preparing for a folk session, or looking for a tune that still sounds idiomatic before ornament enters the picture.',
      'The whistle belongs naturally to this music because the repertoire and the instrument have grown together in popular imagination and in real playing traditions. Public-domain songs such as Auld Lang Syne, Loch Lomond, and other traditional airs remain strong beginner material precisely because they teach phrasing, breath shape, and expressive timing without requiring technical complexity at the start. Use this page when you want Celtic and British traditional melodies, clear whistle tabs, and a more culturally specific route than a broad beginner or folk hub can provide.'
    ],
    metaDescription:
      'Celtic tin whistle songs with letter notes, Irish and Scottish airs, and beginner-friendly whistle melodies for folk practice.'
  },
  'how-to-read-letter-notes': {
    metaTitle: 'Read Letter Notes for Ocarina, Recorder, Tin Whistle'
  },
  'march-and-parade-letter-note-songs': {
    metaTitle: 'March and Parade Songs with Letter Notes',
    heroSummary: [
      'March and parade melodies answer a very different search intent from lullabies or nursery songs. Players looking for this repertoire usually need a strong pulse, ceremonial energy, and tunes that project clearly in a school program, recital, civic event, or themed practice session. This hub gathers those melody pages in one place, with letter notes and visual charts that help beginners hold steady rhythm while working through recognizable march-like themes, patriotic staples, and public-domain parade tunes.',
      'These pieces are useful because they teach beat stability and articulation in a way slower lyrical songs do not. A march exposes rushing, weak entries, and uneven breath very quickly, which makes it practical practice material as well as performance repertoire. Many of the melodies here also carry historical associations with ceremonies, public events, and traditional band culture, giving the category real context beyond keywords. Use this page when you want easy tabs for strong-pulse music, beginner recital pieces, or melody pages that feel formal and energetic at the same time.'
    ],
    metaDescription:
      'March and parade songs with letter notes, visual charts, and steady pulse practice for recital, band, and ceremony repertoire.'
  },
  'patriotic-and-anthem-letter-note-songs': {
    metaTitle: 'Patriotic and Anthem Songs with Letter Notes',
    heroSummary: [
      'Patriotic songs and anthem melodies are often searched for with a specific event in mind: a school ceremony, civic program, memorial observance, or classroom music lesson tied to cultural history. This hub gives those searches a focused landing page. It gathers letter-note melody pages for patriotic tunes, anthems, and ceremonial songs that can be approached by beginners with visual charts and familiar melodic outlines instead of large ensemble scores or staff-heavy arrangements.',
      'The category works because these pieces live at the intersection of public memory and practical performance. Many are recognizable after only a few notes, which helps learners keep time and phrasing under pressure. At the same time, they introduce a more formal emotional register than nursery or holiday music. That makes them useful for assemblies, recitals, and history-linked music education. Use this page when you need civic or anthem repertoire with easy tabs, searchable melody pages, and a cleaner route into songs that fit formal public occasions.'
    ],
    metaDescription:
      'Patriotic songs and anthems with letter notes, visual charts, and beginner-friendly melody pages for school and civic performances.'
  },
  'world-folk-letter-note-songs': {
    metaTitle: 'World Folk and Traditional Songs with Letter Notes',
    heroSummary: [
      'World folk repertoire gives beginners something a generic song list cannot: melodies shaped by different languages, histories, and regional traditions, yet still simple enough to learn through letter notes and visual charts. This hub brings those songs together across Asian, European, and American traditions so players can move from one cultural sound world to another without losing a familiar melody-first reading setup. It is a useful page for curious beginners, teachers building a broader repertoire set, and anyone searching for traditional songs beyond the usual English-language standards.',
      'The value here is variety with context, not random international keywords. Songs such as Arirang, Jasmine Flower, Sakura Sakura, Bella Ciao, and other traditional melodies have real historical depth, public-domain visibility, and strong educational use because they are memorable while still sounding distinct from one another. They also work well on melody instruments that thrive on clear contour and singable phrasing. Use this page when you want global beginner repertoire, easy tabs with cultural range, and traditional songs that expand the site beyond one narrow folk tradition.'
    ],
    metaDescription:
      'World folk songs with letter notes, visual charts, and international beginner melodies from Asia, Europe, and the Americas.'
  },
  'easy-classical-letter-note-songs': {
    heroSummary: [
      'Classical searchers often do not want full scores or piano reductions. They want the famous melody they can already recognize, presented clearly enough to play on a melody instrument with letter notes and a visual chart. This hub serves that exact intent. It gathers easy classical themes, slow movements, and well-known excerpts that are memorable, searchable, and practical for beginners who want the prestige and emotional pull of classical music without jumping straight into advanced notation or technical arrangements.',
      'That makes the category especially strong for melody instruments such as ocarina, recorder, and tin whistle. These instruments can carry a famous theme beautifully when the page stays focused on line, breath, and phrase shape. Public recognition also helps beginners because they can hear whether a melody is moving in the right direction long before every note is perfect. Use this page when you want classical beginner repertoire, famous themes with easy tabs, and a way to explore Mozart, Beethoven, Bach, and related melody pages through a much more approachable entry point.'
    ],
    metaDescription:
      'Easy classical songs with letter notes, visual charts, and beginner melody pages for famous themes on ocarina, recorder, and whistle.'
  },
  'hymns-and-spiritual-letter-note-songs': {
    heroSummary: [
      'Hymns and spirituals remain some of the most practical melody pages for beginners because they combine familiar contour, strong phrase structure, and a slower musical pace that supports breath planning. This hub gathers that repertoire for players who want letter notes, visual charts, and songs suited to church practice, reflective home playing, school music, or community performance. Many of these melodies are public-domain standards that have stayed in circulation for generations, which makes them both searchable and genuinely useful.',
      'The category also offers a different emotional color from nursery, dance, or march repertoire. Hymns reward sustained tone, clean phrase endings, and steady attention to musical line instead of speed. That is why they work so well for developing players on ocarina, recorder, and tin whistle. Spirituals bring similar accessibility while adding rhythmic identity and cultural depth. Use this page when you want sacred or reflective melody pages, beginner-friendly hymn tunes, and easy tabs that fit real worship, teaching, or quiet-practice contexts.'
    ],
    metaDescription:
      'Hymns and spirituals with letter notes, visual charts, and beginner melody pages for church, school, and reflective practice.'
  },
  'easy-songs-for-adult-beginners': {
    heroSummary: [
      'Adult beginners often want the same low-friction reading support as younger learners, but they do not necessarily want to begin with only children’s songs or classroom framing. This guide answers that broader search intent directly by leaning toward melodies that feel emotionally familiar, culturally recognizable, or quietly impressive even when played simply. Alongside folk standards and calm classics, that now includes selected film and game themes that still work well in a melody-first layout.',
      'That broader repertoire mix matters because many returning adult players are motivated by recognition more than by pedagogy. They want one or two songs they already care about, a page that does not overwhelm them, and a practice loop they can revisit without feeling boxed into beginner-only material. Use this page when you want easy tabs, visual charts, and low-pressure songs that still feel rewarding for adults, hobby players, and returning wind-instrument learners.'
    ],
    metaDescription:
      'Easy songs for adult beginners with letter notes, visual charts, and low-pressure melodies for steady practice on melody instruments.'
  },
  'wedding-and-ceremony-letter-note-songs': {
    metaTitle: 'Wedding and Ceremony Songs with Letter Notes',
    heroSummary: [
      'Wedding and ceremony music brings a more formal kind of search intent than ordinary beginner pages. Visitors landing here are often preparing for a procession, recessional, vow renewal, memorial, or another event where the melody needs dignity more than difficulty. This hub collects songs that suit those moments, from wedding staples and hymn-like ceremony pieces to slow classical melodies that remain clear in letter notes and visual chart form. It gives players a direct route into repertoire that feels appropriate for a public occasion.',
      'That context matters because ceremony music needs both recognition and emotional steadiness. A beginner-friendly melody page can still be suitable for an aisle entrance or reflective event if the tune is familiar, balanced, and played with control. Canon, Wedding March, Amazing Grace, and similar pieces carry that kind of cultural weight. Use this page when you need ceremony repertoire, processional melody ideas, or easy tabs for formal events without relying on dense arrangement sheets.'
    ],
    metaDescription:
      'Wedding and ceremony songs with letter notes, visual charts, and melody pages for processionals, recessional music, and formal events.'
  },
  'calm-and-lyrical-letter-note-songs': {
    heroSummary: [
      'Not every beginner wants bright nursery songs or high-energy practice pieces. Many are searching for calm, lyrical melodies they can use to work on tone, breath control, and expressive phrasing without racing through difficult rhythms. This hub is designed for that mood and that technique goal. It gathers slow songs, reflective airs, and singable classical, folk, film, and soundtrack melodies that stay useful in letter notes, with visual charts that let players focus on sound and line instead of decoding a crowded score.',
      'This repertoire also has real musical depth. Slow lyrical songs teach more than relaxation. They expose uneven breath, rough transitions, and weak phrase endings very clearly, which makes them excellent for players trying to sound musical rather than merely accurate. Many of the melodies here are beloved public-domain tunes or highly recognizable modern themes, so the practice feels emotionally rewarding as well. Use this page when you want expressive beginner repertoire, quiet melody pages, and easy tabs that support legato playing on ocarina, recorder, or whistle.'
    ],
    metaDescription:
      'Calm and lyrical songs with letter notes, visual charts, and expressive melody pages for breath control and reflective practice.'
  },
  'lullaby-and-bedtime-letter-note-songs': {
    heroSummary: [
      'Lullabies and bedtime melodies deserve their own hub because they solve a specific need: quiet, gentle repertoire for evening practice, early childhood music, and slow tone work that does not feel sterile. This page gathers those songs into one route, focusing on melodies with soft contour, memorable phrasing, and a naturally restful character. For beginners, that often means easier breathing, fewer rhythmic surprises, and a better environment for learning through letter notes and visual charts on a calm public page.',
      'The repertoire also carries strong cultural familiarity. Brahms Lullaby, simple folk cradle songs, and other bedtime standards have remained in use for generations precisely because they are singable and emotionally clear. That makes them valuable for parents, teachers, and adult beginners alike. Use this hub when you want songs for quiet practice, bedtime routines, or reflective lessons, and when you need melody pages that stay gentle in tone while still building breath control, smooth finger changes, and confidence with slower musical pacing.'
    ]
  },
  'dance-and-waltz-letter-note-songs': {
    heroSummary: [
      'Dance and waltz melodies bring motion back into beginner practice. Players who search for this repertoire usually want songs with a clear pulse, memorable hooks, and enough rhythmic life to feel fun without becoming technically overwhelming. This hub gathers polkas, waltz-like tunes, lively dance melodies, and a few soundtrack themes with strong triple-meter or dance-like motion, making them a strong next step for learners who are ready to move beyond nursery songs and slow airs into something more animated.',
      'That energy is useful musically as well as commercially. Dance tunes teach articulation, beat stability, and phrase repetition in ways calmer repertoire cannot. They also pull from public-domain traditions and recognizable soundtrack writing, from Can-Can and Habanera to polka melodies and film themes that still work beautifully on melody instruments. Use this page when you want rhythmic beginner repertoire, easy tabs with more movement, and public melody pages that help players develop pulse, articulation, and confidence while keeping the music lively.'
    ]
  }
}

const learnGuideDefinitions: LearnGuideDefinition[] = baseLearnGuideDefinitions.map(guide => ({
  ...guide,
  ...(LEARN_GUIDE_SEO_OVERRIDES[guide.slug] ?? {})
}))

const learnGuideDefinitionBySlug = new Map(
  learnGuideDefinitions.map(guide => [guide.slug, guide] as const)
)

const learnSongCardCache = new Map<string, LearnSongCard | null>()

export function getLearnGuideCards() {
  return learnGuideDefinitions.map(toLearnGuideCard)
}

export function getFeaturedLearnGuideCards() {
  return FEATURED_GUIDE_SLUGS.map(slug => getLearnGuideCard(slug)).filter(
    (guide): guide is LearnGuideCard => Boolean(guide)
  )
}

export function getLearnGuideSlugs() {
  return learnGuideDefinitions.map(guide => guide.slug)
}

export function getLearnGuideCard(slug: string) {
  const guide = learnGuideDefinitionBySlug.get(slug)
  return guide ? toLearnGuideCard(guide) : null
}

export function getLearnGuideMetadata(slug: string) {
  const guide = learnGuideDefinitionBySlug.get(slug)
  if (!guide) {
    return null
  }

  return {
    title: guide.metaTitle ?? guide.title,
    description: guide.metaDescription ?? guide.description
  }
}

export function getResolvedLearnGuide(slug: string): ResolvedLearnGuide | null {
  const guide = learnGuideDefinitionBySlug.get(slug)
  if (!guide) {
    return null
  }

  return {
    ...guide,
    featuredSongs: resolveLearnSongCards(guide.featuredSongSlugs),
    relatedGuides: resolveLearnGuideCards(guide.relatedGuideSlugs),
    sections: guide.sections.map(section => ({
      ...section,
      songs: resolveLearnSongCards(section.songSlugs ?? [])
    }))
  }
}

export function getRecentLearnSongCards(limit = RECENTLY_ADDED_HOMEPAGE_LIMIT) {
  return resolveLearnSongCards(getRecentlyAddedSongSlugs(limit))
}

export function getRecentlyAddedSongWindowSize() {
  return RECENTLY_ADDED_SONG_WINDOW
}

export function getRelatedSongCards(currentSlug: string, limit = 6) {
  const currentCard = getLearnSongCard(currentSlug)
  if (!currentCard) {
    return []
  }

  const currentFamily = resolvePublicSongFamily(currentSlug)
  const currentRank = getPublicSongManifestEntry(currentSlug)?.featuredRank ?? Number.MAX_SAFE_INTEGER

  return Object.values(songCatalogBySlug)
    .map(song => getLearnSongCard(song.slug))
    .filter((card): card is LearnSongCard => Boolean(card))
    .filter(card => card.slug !== currentSlug)
    .filter(card => hasEnglishDisplayTitle(card.title))
    .sort((left, right) => {
      const leftFamilyScore = resolvePublicSongFamily(left.slug) === currentFamily ? 0 : 1
      const rightFamilyScore = resolvePublicSongFamily(right.slug) === currentFamily ? 0 : 1
      if (leftFamilyScore !== rightFamilyScore) {
        return leftFamilyScore - rightFamilyScore
      }

      const leftLyricsScore = left.hasPublicLyrics === currentCard.hasPublicLyrics ? 0 : 1
      const rightLyricsScore = right.hasPublicLyrics === currentCard.hasPublicLyrics ? 0 : 1
      if (leftLyricsScore !== rightLyricsScore) {
        return leftLyricsScore - rightLyricsScore
      }

      const leftRank = getPublicSongManifestEntry(left.slug)?.featuredRank ?? Number.MAX_SAFE_INTEGER
      const rightRank = getPublicSongManifestEntry(right.slug)?.featuredRank ?? Number.MAX_SAFE_INTEGER
      const leftDistance = Math.abs(leftRank - currentRank)
      const rightDistance = Math.abs(rightRank - currentRank)
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance
      }

      return left.title.localeCompare(right.title)
    })
    .slice(0, limit)
}

export function getSuggestedGuideCardsForSong(songSlug: string) {
  const family = resolvePublicSongFamily(songSlug)
  const songCard = getLearnSongCard(songSlug)

  let suggestedSlugs: string[]

  if (CEREMONY_SONG_SLUGS.has(songSlug)) {
    suggestedSlugs = [
      'wedding-and-ceremony-letter-note-songs',
      FIRST_PERFORMANCE_SONG_SLUGS.has(songSlug) ? 'first-performance-letter-note-songs' : null,
      family === 'hymn' ? 'hymns-and-spiritual-letter-note-songs' : null,
      family === 'classical' || family === 'march' ? 'easy-classical-letter-note-songs' : null,
      'easy-songs-for-adult-beginners',
      '12-hole-ocarina-letter-notes',
      'recorder-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (PATRIOTIC_ANTHEM_SONG_SLUGS.has(songSlug)) {
    suggestedSlugs = [
      'patriotic-and-anthem-letter-note-songs',
      FIRST_PERFORMANCE_SONG_SLUGS.has(songSlug) ? 'first-performance-letter-note-songs' : null,
      family === 'march' ? 'march-and-parade-letter-note-songs' : null,
      family === 'folk' ? 'folk-songs-for-beginners' : null,
      'music-class-songs-for-beginners',
      'easy-songs-for-adult-beginners',
      'recorder-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (WORLD_FOLK_SONG_SLUGS.has(songSlug)) {
    suggestedSlugs = [
      'world-folk-letter-note-songs',
      family === 'folk' ? 'folk-songs-for-beginners' : null,
      'music-class-songs-for-beginners',
      'easy-songs-for-adult-beginners',
      songCard?.hasPublicLyrics ? 'songs-with-lyrics' : null,
      'tin-whistle-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (ZELDA_SONG_SLUGS.has(songSlug)) {
    suggestedSlugs = [
      'zelda-ocarina-songs',
      LULLABY_BEDTIME_SONG_SLUGS.has(songSlug) ? 'lullaby-and-bedtime-letter-note-songs' : null,
      CALM_LYRICAL_SONG_SLUGS.has(songSlug) ? 'calm-and-lyrical-letter-note-songs' : null,
      FIRST_PERFORMANCE_SONG_SLUGS.has(songSlug) ? 'first-performance-letter-note-songs' : null,
      '12-hole-ocarina-letter-notes',
      'easy-songs-for-adult-beginners',
      'recorder-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (GHIBLI_SONG_SLUGS.has(songSlug)) {
    suggestedSlugs = [
      'ghibli-ocarina-songs',
      CALM_LYRICAL_SONG_SLUGS.has(songSlug) ? 'calm-and-lyrical-letter-note-songs' : null,
      FIRST_PERFORMANCE_SONG_SLUGS.has(songSlug) ? 'first-performance-letter-note-songs' : null,
      DANCE_WALTZ_SONG_SLUGS.has(songSlug) ? 'dance-and-waltz-letter-note-songs' : null,
      'easy-songs-for-adult-beginners',
      '12-hole-ocarina-letter-notes',
      'recorder-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (LULLABY_BEDTIME_SONG_SLUGS.has(songSlug)) {
    suggestedSlugs = [
      'lullaby-and-bedtime-letter-note-songs',
      'calm-and-lyrical-letter-note-songs',
      family === 'classical' ? 'easy-classical-letter-note-songs' : null,
      family === 'folk' ? 'folk-songs-for-beginners' : null,
      'easy-songs-for-adult-beginners',
      songCard?.hasPublicLyrics ? 'songs-with-lyrics' : null,
      '12-hole-ocarina-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (DANCE_WALTZ_SONG_SLUGS.has(songSlug)) {
    suggestedSlugs = [
      'dance-and-waltz-letter-note-songs',
      FIRST_PERFORMANCE_SONG_SLUGS.has(songSlug) ? 'first-performance-letter-note-songs' : null,
      family === 'classical' ? 'easy-classical-letter-note-songs' : null,
      family === 'march' ? 'march-and-parade-letter-note-songs' : null,
      family === 'folk' ? 'world-folk-letter-note-songs' : null,
      'easy-songs-for-adult-beginners',
      'recorder-letter-notes',
      '12-hole-ocarina-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (CALM_LYRICAL_SONG_SLUGS.has(songSlug)) {
    suggestedSlugs = [
      'calm-and-lyrical-letter-note-songs',
      family === 'hymn' ? 'hymns-and-spiritual-letter-note-songs' : null,
      family === 'classical' ? 'easy-classical-letter-note-songs' : null,
      family === 'folk' ? 'folk-songs-for-beginners' : null,
      FIRST_PERFORMANCE_SONG_SLUGS.has(songSlug) ? 'first-performance-letter-note-songs' : null,
      'easy-songs-for-adult-beginners',
      songCard?.hasPublicLyrics ? 'songs-with-lyrics' : null,
      '12-hole-ocarina-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (CHRISTMAS_OCARINA_SONG_SLUGS.has(songSlug)) {
    suggestedSlugs = [
      'easy-christmas-ocarina-songs',
      'christmas-letter-note-songs',
      SING_ALONG_SONG_SLUGS.has(songSlug) ? 'easy-sing-along-letter-note-songs' : null,
      'easy-12-hole-ocarina-songs',
      'easy-ocarina-songs-for-beginners',
      songCard?.hasPublicLyrics ? 'songs-with-lyrics' : null,
      '12-hole-ocarina-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (EASY_SIX_HOLE_OCARINA_SONG_SLUGS.has(songSlug)) {
    suggestedSlugs = [
      'easy-6-hole-ocarina-songs',
      '6-hole-ocarina-letter-notes',
      SING_ALONG_SONG_SLUGS.has(songSlug) ? 'easy-sing-along-letter-note-songs' : null,
      'easy-ocarina-songs-for-beginners',
      family === 'holiday' ? 'easy-christmas-ocarina-songs' : null,
      family === 'nursery' ? 'nursery-rhyme-letter-notes' : null,
      family === 'holiday' ? 'christmas-letter-note-songs' : null,
      '12-hole-ocarina-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (EASY_TWELVE_HOLE_OCARINA_SONG_SLUGS.has(songSlug)) {
    suggestedSlugs = [
      'easy-12-hole-ocarina-songs',
      SING_ALONG_SONG_SLUGS.has(songSlug) ? 'easy-sing-along-letter-note-songs' : null,
      'easy-ocarina-songs-for-beginners',
      family === 'holiday' ? 'easy-christmas-ocarina-songs' : null,
      family === 'holiday' ? 'christmas-letter-note-songs' : null,
      '12-hole-ocarina-letter-notes',
      '6-hole-ocarina-letter-notes',
      songCard?.hasPublicLyrics ? 'songs-with-lyrics' : null
    ].filter((slug): slug is string => Boolean(slug))
  } else if (EASY_OCARINA_SONG_SLUGS.has(songSlug)) {
    suggestedSlugs = [
      'easy-ocarina-songs-for-beginners',
      'easy-12-hole-ocarina-songs',
      SING_ALONG_SONG_SLUGS.has(songSlug) ? 'easy-sing-along-letter-note-songs' : null,
      family === 'holiday' ? 'easy-christmas-ocarina-songs' : null,
      family === 'holiday' ? 'christmas-letter-note-songs' : null,
      family === 'hymn' ? 'hymns-and-spiritual-letter-note-songs' : null,
      family === 'classical' ? 'easy-classical-letter-note-songs' : null,
      '12-hole-ocarina-letter-notes',
      '6-hole-ocarina-letter-notes',
      songCard?.hasPublicLyrics ? 'songs-with-lyrics' : null
    ].filter((slug): slug is string => Boolean(slug))
  } else if (family === 'nursery' || family === 'media' || family === 'song') {
    suggestedSlugs = [
      family === 'nursery' ? 'nursery-rhyme-letter-notes' : 'easy-recorder-songs-for-beginners',
      FIRST_PERFORMANCE_SONG_SLUGS.has(songSlug) ? 'first-performance-letter-note-songs' : null,
      'easy-sing-along-letter-note-songs',
      'easy-ocarina-songs-for-beginners',
      'easy-songs-for-beginners',
      '12-hole-ocarina-letter-notes',
      '6-hole-ocarina-letter-notes',
      'music-class-songs-for-beginners',
      songCard?.hasPublicLyrics ? 'songs-with-lyrics' : null,
      'simple-instruments-for-music-education'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (family === 'holiday') {
    suggestedSlugs = [
      'easy-christmas-ocarina-songs',
      'christmas-letter-note-songs',
      SING_ALONG_SONG_SLUGS.has(songSlug) ? 'easy-sing-along-letter-note-songs' : null,
      'easy-ocarina-songs-for-beginners',
      'easy-12-hole-ocarina-songs',
      'music-class-songs-for-beginners',
      'songs-with-lyrics',
      'easy-tin-whistle-songs',
      '12-hole-ocarina-letter-notes',
      'simple-instruments-for-music-education'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (family === 'folk' || family === 'hymn') {
    suggestedSlugs = [
      family === 'folk' && CELTIC_TIN_WHISTLE_SONG_SLUGS.has(songSlug)
        ? 'celtic-tin-whistle-songs'
        : null,
      family === 'hymn' ? 'hymns-and-spiritual-letter-note-songs' : null,
      SING_ALONG_SONG_SLUGS.has(songSlug) ? 'easy-sing-along-letter-note-songs' : null,
      'folk-songs-for-beginners',
      'easy-songs-for-adult-beginners',
      family === 'hymn' ? 'easy-ocarina-songs-for-beginners' : null,
      'easy-tin-whistle-songs',
      'tin-whistle-letter-notes',
      songCard?.hasPublicLyrics ? 'songs-with-lyrics' : null,
      '12-hole-ocarina-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (family === 'classical') {
    suggestedSlugs = [
      'easy-classical-letter-note-songs',
      FIRST_PERFORMANCE_SONG_SLUGS.has(songSlug) ? 'first-performance-letter-note-songs' : null,
      'easy-ocarina-songs-for-beginners',
      'easy-songs-for-adult-beginners',
      'how-to-read-letter-notes',
      '12-hole-ocarina-letter-notes',
      'recorder-letter-notes',
      'easy-songs-for-beginners'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (family === 'march') {
    suggestedSlugs = [
      'march-and-parade-letter-note-songs',
      FIRST_PERFORMANCE_SONG_SLUGS.has(songSlug) ? 'first-performance-letter-note-songs' : null,
      'easy-classical-letter-note-songs',
      'music-class-songs-for-beginners',
      'how-to-read-letter-notes',
      'recorder-letter-notes',
      '12-hole-ocarina-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else {
    suggestedSlugs = [
      '12-hole-ocarina-letter-notes',
      songCard?.hasPublicLyrics ? 'songs-with-lyrics' : null,
      'recorder-letter-notes',
      'simple-instruments-for-music-education'
    ].filter((slug): slug is string => Boolean(slug))
  }

  return uniqueStrings(suggestedSlugs)
    .map(slug => getLearnGuideCard(slug))
    .filter((guide): guide is LearnGuideCard => Boolean(guide))
    .slice(0, 3)
}

export function getLearnGuideUrl(slug: string) {
  return `${siteUrl}/learn/${slug}`
}

function getLearnSongCard(songRef: LearnSongReference) {
  const slug = typeof songRef === 'string' ? songRef : songRef.slug
  if (learnSongCardCache.has(slug)) {
    const cachedCard = learnSongCardCache.get(slug) ?? null
    return adaptLearnSongCardReference(cachedCard, songRef)
  }

  const song = songCatalogBySlug[slug]
  if (!song) {
    learnSongCardCache.set(slug, null)
    return null
  }

  const runtimePayload = loadKuailepuSongPayload(song.slug)
  const hasPublicLyrics = runtimePayload ? hasPublicKuailepuLyricToggle(runtimePayload) : false
  const presentation = getSongPresentation(song, {
    publicLyricsAvailable: hasPublicLyrics
  })
  const family = resolvePublicSongFamily(song.slug)
  const familyLabel = family ? FAMILY_LABELS[family] : 'Melody Page'

  const card: LearnSongCard = {
    slug: song.slug,
    href: `/song/${song.slug}`,
    title: presentation.title,
    familyLabel,
    difficultyLabel: presentation.difficultyLabel,
    keyLabel: presentation.keyLabel,
    meterLabel: presentation.meterLabel,
    hasPublicLyrics
  }

  learnSongCardCache.set(slug, card)
  return adaptLearnSongCardReference(card, songRef)
}

function resolveLearnSongCards(songRefs: LearnSongReference[]) {
  return songRefs
    .map(songRef => getLearnSongCard(songRef))
    .filter((card): card is LearnSongCard => Boolean(card))
}

function resolveLearnGuideCards(slugs: string[]) {
  return slugs
    .map(slug => getLearnGuideCard(slug))
    .filter((guide): guide is LearnGuideCard => Boolean(guide))
}

function toLearnGuideCard(guide: LearnGuideDefinition): LearnGuideCard {
  return {
    slug: guide.slug,
    kind: guide.kind,
    title: guide.title,
    description: guide.description
  }
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)]
}

function withInstrument(
  songSlugs: string[],
  instrumentId: PublicSongInstrumentId
): LearnSongReference[] {
  return songSlugs.map(slug => ({
    slug,
    instrumentId
  }))
}

function adaptLearnSongCardReference(
  card: LearnSongCard | null,
  songRef: LearnSongReference
) {
  if (!card) {
    return null
  }

  if (typeof songRef === 'string' || !songRef.instrumentId) {
    return card
  }

  return {
    ...card,
    href: buildSongPageHref({
      songId: card.slug,
      instrumentId: songRef.instrumentId
    })
  }
}

function hasEnglishDisplayTitle(value: string) {
  return /[A-Za-z]/.test(value)
}
