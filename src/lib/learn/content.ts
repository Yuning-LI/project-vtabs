import { hasPublicKuailepuLyricToggle, loadKuailepuSongPayload } from '@/lib/kuailepu/runtime'
import { siteUrl } from '@/lib/site'
import { songCatalogBySlug } from '@/lib/songbook/catalog'
import { getSongPresentation } from '@/lib/songbook/presentation'
import { buildSongPageHref, type PublicSongInstrumentId } from '@/lib/songbook/publicInstruments'
import {
  getPublicSongManifestEntry,
  resolvePublicSongFamily
} from '@/lib/songbook/publicManifest'

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
  song: 'Popular Song Melody'
} as const

const FEATURED_GUIDE_SLUGS = [
  '12-hole-ocarina-letter-notes',
  'how-to-start-ocarina-with-letter-notes',
  '6-hole-ocarina-letter-notes',
  'easy-12-hole-ocarina-songs',
  'recorder-letter-notes',
  'how-to-start-recorder-with-letter-notes',
  'easy-christmas-recorder-songs',
  'tin-whistle-letter-notes',
  'how-to-start-tin-whistle-with-letter-notes',
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
  'simple-instruments-for-music-education',
  'christmas-letter-note-songs',
  'folk-songs-for-beginners',
  'celtic-tin-whistle-songs',
  'how-to-read-letter-notes',
  'march-and-parade-letter-note-songs',
  'patriotic-and-anthem-letter-note-songs',
  'world-folk-letter-note-songs',
  'wedding-and-ceremony-letter-note-songs',
  'calm-and-lyrical-letter-note-songs',
  'lullaby-and-bedtime-letter-note-songs',
  'dance-and-waltz-letter-note-songs'
] as const

const CELTIC_TIN_WHISTLE_SONG_SLUGS = new Set([
  'the-south-wind',
  'lough-leane',
  'irish-morning-wind',
  'irish-blackbird',
  'loch-lomond',
  'scotland-the-brave',
  'auld-lang-syne'
])

const CEREMONY_SONG_SLUGS = new Set([
  'canon',
  'wedding-march',
  'wedding-march-alt',
  'amazing-grace',
  'air-on-the-g-string',
  'going-home'
])

const PATRIOTIC_ANTHEM_SONG_SLUGS = new Set([
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
  'arirang',
  'jasmine-flower',
  'sakura-sakura',
  'bella-ciao',
  'la-cucaracha',
  'el-condor-pasa',
  'hej-sokoly',
  'moscow-nights',
  'troika',
  'red-berries-blossom',
  'the-hawthorn-tree'
])

const CALM_LYRICAL_SONG_SLUGS = new Set([
  'amazing-grace',
  'air-on-the-g-string',
  'going-home',
  'greensleeves',
  'londonderry-air',
  'lullaby',
  'moonlight-sonata',
  'on-wings-of-song',
  'sakura-sakura',
  'santa-lucia',
  'scarborough-fair',
  'schubert-serenade',
  'traumerei'
])

const LULLABY_BEDTIME_SONG_SLUGS = new Set([
  'lullaby',
  'moonlight-sonata',
  'schubert-serenade',
  'traumerei',
  'air-on-the-g-string',
  'moscow-nights',
  'going-home',
  'sakura-sakura'
])

const DANCE_WALTZ_SONG_SLUGS = new Set([
  'can-can',
  'habanera',
  'woodpecker-polka',
  'blacksmith-polka',
  'the-hawthorn-tree',
  'dancing-doll-and-teddy-bear',
  'swan-lake',
  'turkish-march'
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
  'happy-new-year'
])

const learnGuideDefinitions: LearnGuideDefinition[] = [
  {
    slug: '12-hole-ocarina-letter-notes',
    kind: 'hub',
    title: '12-Hole Ocarina Letter Notes',
    description:
      'A public guide for players who want easy-to-read ocarina letter-note songs with fingering charts, switchable numbered notes, and beginner-friendly starting points.',
    heroLabel: 'Instrument Guide',
    intro: [
      'This page gathers the song pages that work best as a first stop for players searching for 12-hole ocarina letter notes. The goal is not to replace the song library, but to give search users a more obvious way to begin.',
      'Every linked melody still opens the same public song page, so visitors can keep the fingering chart visible, switch to numbered notes when needed, and stay inside the same page shell.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'mary-had-a-little-lamb',
      'frere-jacques',
      'london-bridge',
      'ode-to-joy',
      'amazing-grace'
    ],
    sections: [
      {
        title: 'Where Most Players Should Start',
        paragraphs: [
          'The best opening set for 12-hole ocarina readers is a small group of tunes with short phrases, familiar melodies, and enough repetition to make the letter-note view feel useful right away.',
          'That is why this guide starts with nursery and folk standards before moving on to longer hymn or classical melodies.'
        ],
        songSlugs: [
          'twinkle-twinkle-little-star',
          'mary-had-a-little-lamb',
          'london-bridge',
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
          'No. It is a themed entry page that points into the same public song detail pages, where letter notes, fingering charts, and numbered-note backup views already exist.'
      },
      {
        question: 'Who is this guide for?',
        answer:
          'It is for players who search directly for 12-hole ocarina letter notes and need a cleaner starting point than a full mixed library page.'
      }
    ],
    relatedGuideSlugs: [
      'how-to-start-ocarina-with-letter-notes',
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
      'A beginner-focused 12-hole ocarina guide with familiar songs, letter notes, and direct links into the main public song pages that already support fingering charts and switchable note labels.',
    heroLabel: 'Beginner Guide',
    intro: [
      'This page is for visitors who already know they want easy 12-hole ocarina songs and do not need a mixed-instrument landing page first. It narrows the site down to a cleaner first batch of melodies that fit the standard 12-hole public view well.',
      'The linked songs still use the same public detail pages. This guide simply gives beginners a more obvious first path and a better search landing page for 12-hole-specific intent.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'happy-birthday-to-you',
      'ode-to-joy',
      'jingle-bells',
      'silent-night',
      'amazing-grace'
    ],
    sections: [
      {
        title: 'First Songs That Build Reading Confidence',
        paragraphs: [
          'The strongest first songs for a 12-hole beginner are not necessarily the shortest songs in the library. They are the songs where the phrase shape is easy to hear, the note movement is memorable, and the fingering chart stays readable without feeling crowded.',
          'That is why this guide begins with nursery standards and sing-along melodies before moving into the holiday and hymn tunes that beginners often search for next.'
        ],
        songSlugs: [
          'twinkle-twinkle-little-star',
          'mary-had-a-little-lamb',
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
          'Start in the default 12-hole view and keep the fingering chart visible until the melody feels stable. The goal is to build consistency on the same public page instead of collecting multiple screenshots or alternate tab versions.',
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
          'No. It is still the same public song page route with the same controls, fingering chart, and note-label options.'
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
      'This guide is for visitors who search specifically for 6-hole ocarina letter notes and want song pages that feel ready to use right away. The linked songs still open the same public detail pages, but these entry links can point straight into the 6-hole instrument view.',
      'That makes the page more useful as a landing page for search traffic while keeping the public song route, fingering logic, and runtime behavior exactly the same.'
    ],
    featuredSongSlugs: [
      { slug: 'twinkle-twinkle-little-star', instrumentId: 'o6' },
      { slug: 'mary-had-a-little-lamb', instrumentId: 'o6' },
      { slug: 'frere-jacques', instrumentId: 'o6' },
      { slug: 'london-bridge', instrumentId: 'o6' },
      { slug: 'jingle-bells', instrumentId: 'o6' },
      { slug: 'ode-to-joy', instrumentId: 'o6' }
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
          'No. They open the same public song pages, but this guide can point into the 6-hole ocarina view so visitors do not need to reselect the instrument every time.'
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
      'A themed recorder entry page for searchable melody pages with letter notes, fingering support, and practical songs for classroom or beginner practice.',
    heroLabel: 'Instrument Guide',
    intro: [
      'This guide is aimed at players and teachers searching for recorder letter notes instead of a full mixed song catalog. It gives them a narrower page with clearer next steps.',
      'The linked songs still use the same public runtime page, but these cards open the recorder view by default so visitors land closer to the instrument they searched for and can still switch views later if needed.'
    ],
    featuredSongSlugs: withInstrument(
      [
      'twinkle-twinkle-little-star',
      'mary-had-a-little-lamb',
      'frere-jacques',
      'jingle-bells',
      'ode-to-joy',
      'happy-birthday-to-you'
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
          'frere-jacques',
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
          'Turn lyrics on when the public page supports them and singing will help phrase entry.',
          'Move to longer songs only after the first easy pages feel automatic.'
        ]
      },
      {
        title: 'Next Songs To Add After The Basics',
        paragraphs: [
          'Once players handle the first nursery set comfortably, shift into holiday and classical melodies that stretch phrase control a little further.'
        ],
        songSlugs: withInstrument(['jingle-bells', 'ode-to-joy', 'silent-night'], 'r8b')
      }
    ],
    faq: [
      {
        question: 'Do these songs only work on recorder?',
        answer:
          'No. The public song pages can switch between the supported instruments, but this guide is written specifically for recorder-focused search intent and beginner use.'
      },
      {
        question: 'Why use a recorder guide instead of the full library?',
        answer:
          'Because search users landing on a recorder-specific page get a clearer answer faster, which is better for both usability and search performance.'
      }
    ],
    relatedGuideSlugs: [
      'how-to-start-recorder-with-letter-notes',
      'easy-recorder-songs-for-beginners',
      'easy-christmas-recorder-songs',
      'songs-with-lyrics'
    ]
  },
  {
    slug: 'tin-whistle-letter-notes',
    kind: 'hub',
    title: 'Tin Whistle Letter Notes',
    description:
      'A focused tin whistle landing page for players who want searchable melody pages with letter notes, familiar folk songs, and an easy path into the main library.',
    heroLabel: 'Instrument Guide',
    intro: [
      'Tin whistle players often search for simple melody pages before they search by tune family. This guide is built to catch that intent and move visitors straight into songs they already recognize.',
      'The best first links here mix familiar beginner melodies with a few slower folk and hymn tunes that reward cleaner breath planning, and every card opens the public page with the whistle view preselected.'
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
        title: 'Easy Tin Whistle Songs To Begin With',
        paragraphs: [
          'The easiest whistle pages on the site are the ones where the melody is already familiar and the phrase structure is easy to hear before you even start playing.'
        ],
        songSlugs: withInstrument(
          ['twinkle-twinkle-little-star', 'ode-to-joy', 'amazing-grace'],
          'w6'
        )
      },
      {
        title: 'When To Move Into Folk Songs',
        paragraphs: [
          'Folk songs are a natural second step because they build musical phrasing without overwhelming the player with long technical passages. They also tend to work well in letter-note form.'
        ],
        songSlugs: withInstrument(
          ['red-river-valley', 'auld-lang-syne', 'scarborough-fair'],
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
          'Yes. Every song card opens the normal public detail page, where the melody page, controls, and instrument switching stay intact.'
      }
    ],
    relatedGuideSlugs: [
      'how-to-start-tin-whistle-with-letter-notes',
      'easy-tin-whistle-songs',
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
      'This guide answers that beginner intent with the same public song pages already on the site. The difference is that it organizes those pages into a cleaner first path, so visitors can start with letter notes, keep the fingering chart visible, and move into longer melodies without leaving the main song route.'
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
          'No. This starter guide is for melody-first practice. It uses the same public song pages with letter notes and fingering support so beginners can start with recognizable tunes first.'
      },
      {
        question: 'Does this guide replace the main ocarina song pages?',
        answer:
          'No. It only organizes the first steps more clearly. Every song card still opens the normal public detail page with the same controls and instrument options.'
      }
    ],
    relatedGuideSlugs: [
      '12-hole-ocarina-letter-notes',
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
      'A practical starter guide for beginners and teachers who want to begin recorder with letter notes, simple songs, and a clear bridge between melody reading and finger patterns.',
    heroLabel: 'Starter Guide',
    intro: [
      'Recorder beginners often search for a simpler way to begin than a full method book or a mixed library page. They want a handful of familiar songs, a readable note layer, and a practice flow that works in short lessons.',
      'This guide uses the same public song pages as the rest of the site, but it organizes them as a clearer first step for recorder players and classroom use.'
    ],
    featuredSongSlugs: withInstrument(
      [
        'twinkle-twinkle-little-star',
        'mary-had-a-little-lamb',
        'frere-jacques',
        'ode-to-joy',
        'jingle-bells',
        'happy-birthday-to-you'
      ],
      'r8b'
    ),
    sections: [
      {
        title: 'Best Recorder Songs For The First Lessons',
        paragraphs: [
          'The strongest first recorder pages are the ones that keep the melody familiar and the reading load light. That lets the student connect note names, finger changes, and breath timing without getting lost in staff-heavy notation or a long tune.',
          'Short nursery songs and birthday melodies are especially useful because the phrase shapes repeat and the tune is already easy to recognize.'
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
        title: 'How To Use These Pages In Class Or Home Practice',
        paragraphs: [
          'Keep the page simple during the first pass. Leave the fingering chart visible, use one familiar tune at a time, and avoid changing settings too often while the melody is still new.',
          'For classroom use, these pages work best when the teacher can point to one clear melody page instead of moving students between screenshots, lyric sites, and separate fingering diagrams.'
        ],
        bullets: [
          'Use one short song as the class warm-up every week.',
          'Keep the fingering chart on until finger changes feel automatic.',
          'Turn lyrics on only when they help students hear phrase timing more clearly.'
        ],
        songSlugs: withInstrument(['jingle-bells', 'ode-to-joy', 'silent-night'], 'r8b')
      },
      {
        title: 'What To Add After The First Easy Songs',
        paragraphs: [
          'Once the first classroom melodies feel steady, move into one seasonal tune and one slightly longer lyrical tune. That adds variety without leaving the same public workflow or forcing beginners into a new notation system.'
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
          'No. They open the same public song route, but the recorder view is preselected so the landing page matches the search intent more closely.'
      }
    ],
    relatedGuideSlugs: [
      'recorder-letter-notes',
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
      'A practical starter guide for new tin whistle players who want easy letter-note songs, visible fingerings, and a familiar first route into folk and beginner melody pages.',
    heroLabel: 'Starter Guide',
    intro: [
      'New tin whistle players often begin by searching for easy songs and clear fingerings, not by searching for ornament-heavy whistle repertoire. They want to know which melodies will actually feel manageable in the first week.',
      'This guide gives that first route using the same public song pages already on the site. It keeps the melody pages simple, recognizable, and closer to the whistle view that beginners expect.'
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
          'No. It only organizes the same public song pages into a clearer beginner path and opens them with the whistle view selected.'
      }
    ],
    relatedGuideSlugs: [
      'tin-whistle-letter-notes',
      'easy-tin-whistle-songs',
      'celtic-tin-whistle-songs',
      'how-to-read-letter-notes'
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
          'If you play 6-hole ocarina, follow the related 6-hole guide next. If you play 12-hole AC ocarina, stay in the default view and use numbered notes only as a backup reading mode.'
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
          'No. It is an ocarina-focused beginner guide built on the same public song pages, and related links can also take you into the 6-hole ocarina view.'
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
      'Each song link can open the same public detail page with the 6-hole fingering view selected, so the landing page matches the practice setup more closely.'
    ],
    featuredSongSlugs: [
      { slug: 'twinkle-twinkle-little-star', instrumentId: 'o6' },
      { slug: 'mary-had-a-little-lamb', instrumentId: 'o6' },
      { slug: 'frere-jacques', instrumentId: 'o6' },
      { slug: 'london-bridge', instrumentId: 'o6' },
      { slug: 'row-row-row-your-boat', instrumentId: 'o6' },
      { slug: 'jingle-bells', instrumentId: 'o6' }
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
          'Use the broader ocarina guides when you want longer tunes without leaving the same public song route.'
        ]
      }
    ],
    faq: [
      {
        question: 'Do I need a different site section for 6-hole songs?',
        answer:
          'No. These are the same public song pages, but this guide groups the most approachable ones and links into the 6-hole instrument view.'
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
      'This guide gives that narrower landing page while keeping the existing public song route, fingering chart, and note-label controls unchanged.'
    ],
    featuredSongSlugs: [
      'jingle-bells',
      'deck-the-halls',
      'silent-night',
      'we-wish-you-a-merry-christmas',
      'jolly-old-saint-nicholas',
      'joy-to-the-world'
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
        songSlugs: ['silent-night', 'joy-to-the-world', 'god-rest-you-merry-gentlemen']
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
          'No. They open the same public song pages. This guide only gives holiday searchers a more direct way into them.'
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
      'A recorder-first beginner guide for familiar songs with letter notes, fingering support, and a cleaner path into the public melody library.',
    heroLabel: 'Instrument Guide',
    intro: [
      'Some searchers are not looking for recorder theory or a full catalog. They want easy recorder songs they can recognize quickly and start reading in letter notes right away.',
      'This page gives that narrower entry point while still routing every click into the same public song pages, now landing in recorder view by default so the first click matches recorder-specific intent more closely.'
    ],
    featuredSongSlugs: withInstrument(
      [
      'mary-had-a-little-lamb',
      'row-row-row-your-boat',
      'frere-jacques',
      'old-macdonald',
      'happy-birthday-to-you',
      'ode-to-joy'
      ],
      'r8b'
    ),
    sections: [
      {
        title: 'Best First Recorder Songs On This Site',
        paragraphs: [
          'The strongest first recorder songs are the ones students already know by ear. That keeps practice focused on finger movement, phrase entry, and steady breathing instead of on trying to remember the tune itself.'
        ],
        songSlugs: withInstrument(
          [
          'mary-had-a-little-lamb',
          'row-row-row-your-boat',
          'frere-jacques',
          'old-macdonald'
          ],
          'r8b'
        )
      },
      {
        title: 'How To Use These Recorder Pages',
        paragraphs: [
          'Start with the shortest nursery songs in the default letter-note layout, then keep the fingering chart visible until the melody feels automatic.',
          'When the page starts to feel busy, use zoom and lyrics controls before switching away from the same public song page.'
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
        songSlugs: withInstrument(['happy-birthday-to-you', 'ode-to-joy', 'jingle-bells'], 'r8b')
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
      'easy-christmas-recorder-songs',
      'nursery-rhyme-letter-notes'
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
      'This guide answers that intent with a small set of public-domain melodies that still open the same public song pages used throughout the site, with the whistle view selected from the first click.'
    ],
    featuredSongSlugs: withInstrument(
      [
      'twinkle-twinkle-little-star',
      'ode-to-joy',
      'amazing-grace',
      'red-river-valley',
      'wellerman',
      'loch-lomond'
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
          ['twinkle-twinkle-little-star', 'ode-to-joy', 'amazing-grace'],
          'w6'
        )
      },
      {
        title: 'When Folk Songs Become The Better Practice Material',
        paragraphs: [
          'After the first easy melodies, folk songs become more useful because they ask for longer breath control and a more vocal line without forcing fast technical execution.'
        ],
        songSlugs: withInstrument(
          ['red-river-valley', 'loch-lomond', 'scarborough-fair'],
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
      'This page gives them that answer while keeping every click on the same public song pages. The difference is that these cards open in recorder view by default, so the landing page matches the holiday recorder query more closely.'
    ],
    featuredSongSlugs: withInstrument(
      [
        'jingle-bells',
        'silent-night',
        'we-wish-you-a-merry-christmas',
        'deck-the-halls',
        'joy-to-the-world',
        'god-rest-you-merry-gentlemen'
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
          'Once the first holiday set feels settled, add one richer carol with longer phrases. That gives recorder players more breath-planning practice without leaving the same public page workflow.'
        ],
        songSlugs: withInstrument(['god-rest-you-merry-gentlemen', 'silent-night', 'joy-to-the-world'], 'r8b')
      }
    ],
    faq: [
      {
        question: 'Do these links open a separate recorder product?',
        answer:
          'No. They open the same public song detail pages already used across the site. This guide simply makes recorder-specific Christmas traffic land closer to the right instrument view.'
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
        'god-rest-you-merry-gentlemen'
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
        songSlugs: withInstrument(['silent-night', 'joy-to-the-world', 'god-rest-you-merry-gentlemen'], 'w6')
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
      'This page gathers the strongest nursery-rhyme-style song pages on the site so parents, teachers, and self-learners can begin with the shortest and most recognizable tunes.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'mary-had-a-little-lamb',
      'frere-jacques',
      'london-bridge',
      'row-row-row-your-boat',
      'old-macdonald'
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
          'row-row-row-your-boat'
        ]
      },
      {
        title: 'How To Move Beyond The Very First Songs',
        paragraphs: [
          'After the first nursery set feels easy, move into one slightly longer beginner song that keeps the same note-reading workflow but asks for steadier phrase control.'
        ],
        songSlugs: ['london-bridge', 'old-macdonald', 'ode-to-joy']
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
      '12-hole-ocarina-letter-notes'
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
      'The best beginner songs on this site are recognizable in one listen, short enough for phrase-by-phrase repetition, and simple to practice inside the letter-note layout.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'mary-had-a-little-lamb',
      'london-bridge',
      'frere-jacques',
      'ode-to-joy',
      'happy-birthday-to-you'
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
        songSlugs: ['ode-to-joy', 'amazing-grace', 'silent-night']
      }
    ],
    faq: [
      {
        question: 'Is this page only for one instrument?',
        answer:
          'No. It is a beginner guide for the site as a whole, and the linked songs keep the same public detail page controls for the supported instrument views.'
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
      'scarborough-fair'
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
          'scarborough-fair'
        ]
      },
      {
        title: 'When To Use A Lyric Page Instead Of A Pure Melody Page',
        paragraphs: [
          'Choose a lyric-enabled page when the words help you hear the tune and remember phrase boundaries. Choose a melody-only page when you want the cleanest possible reading surface for finger work.'
        ],
        songSlugs: ['row-row-row-your-boat', 'happy-new-year']
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
      'easy-songs-for-beginners',
      '12-hole-ocarina-letter-notes',
      'recorder-letter-notes'
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
      'The goal is to answer a broader question about beginner music learning while still giving visitors a clear path into the public song pages.'
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
          'Each song card opens the same public detail page used everywhere else on the site, so the guide becomes a real traffic entry point instead of a dead-end article.'
      }
    ],
    relatedGuideSlugs: [
      'easy-songs-for-beginners',
      '12-hole-ocarina-letter-notes',
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
      'The linked songs still open the normal public song pages, so visitors can keep the fingering chart visible, turn lyrics on when available, and stay inside the same runtime shell.'
    ],
    featuredSongSlugs: [
      'jingle-bells',
      'silent-night',
      'we-wish-you-a-merry-christmas',
      'deck-the-halls',
      'god-rest-you-merry-gentlemen',
      'joy-to-the-world'
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
        songSlugs: ['silent-night', 'jingle-bells', 'we-wish-you-a-merry-christmas']
      },
      {
        title: 'Longer Or Richer Carols To Add Next',
        paragraphs: [
          'After the easiest carols feel comfortable, move into songs with a more lyrical or minor-mode shape. These pages are still approachable, but they ask for steadier breath and cleaner phrase control.'
        ],
        songSlugs: ['god-rest-you-merry-gentlemen', 'silent-night', 'auld-lang-syne']
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
          'No. Every card still opens the same public song detail page used elsewhere on the site, so the seasonal guide is an entry layer rather than a separate product flow.'
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
      'This page gathers the folk-oriented song pages that are easiest to enter through melody recognition, while still giving room for more lyrical breath and phrase work than the shortest nursery songs.'
    ],
    featuredSongSlugs: [
      'red-river-valley',
      'scarborough-fair',
      'greensleeves',
      'auld-lang-syne',
      'down-by-the-salley-gardens',
      'home-on-the-range'
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
          'home-on-the-range'
        ]
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
        songSlugs: ['greensleeves', 'scarborough-fair', 'down-by-the-salley-gardens']
      }
    ],
    faq: [
      {
        question: 'Are these songs only for tin whistle players?',
        answer:
          'No. Folk melodies are a natural fit for tin whistle, but the same public pages also work for recorder and ocarina users who want singable traditional tunes.'
      },
      {
        question: 'Why not just use the main song library?',
        answer:
          'Because a folk-focused guide gives search users a direct answer and a more coherent starting set than a broad mixed catalog page.'
      }
    ],
    relatedGuideSlugs: [
      'tin-whistle-letter-notes',
      'songs-with-lyrics',
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
      'This page gives that narrower entry path while still routing every click into the same public song pages, with the whistle view preselected so the landing experience stays closer to Celtic whistle search intent.'
    ],
    featuredSongSlugs: withInstrument(
      [
      'the-south-wind',
      'lough-leane',
      'irish-morning-wind',
      'irish-blackbird',
      'loch-lomond',
      'scotland-the-brave'
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
          ['the-south-wind', 'lough-leane', 'loch-lomond', 'irish-morning-wind'],
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
        songSlugs: withInstrument(['the-south-wind', 'lough-leane', 'irish-blackbird'], 'w6')
      },
      {
        title: 'What To Add After The First Slow Airs',
        paragraphs: [
          'Once the calmer melodies feel comfortable, add one brighter patriotic or folk-style tune and one familiar sing-along melody. That expands the repertoire without leaving the same whistle-friendly workflow.'
        ],
        songSlugs: withInstrument(['scotland-the-brave', 'auld-lang-syne', 'irish-blackbird'], 'w6')
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
      'tin-whistle-letter-notes'
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
      'This page gives that narrower entry path while keeping every click inside the same public song pages, so the familiar letter-note layout, fingering support, and practice controls do not change.'
    ],
    featuredSongSlugs: [
      'american-patrol',
      'parade-of-the-wooden-soldiers',
      'wedding-march',
      'cavalry-march',
      'toy-march',
      'turkish-march'
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
          'american-patrol'
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
        songSlugs: ['american-patrol', 'cavalry-march', 'grenadiers-march']
      },
      {
        title: 'What To Add After The First Parade Tunes',
        paragraphs: [
          'Once the easiest march pages feel comfortable, add one brighter character piece and one more formal ceremonial melody. That keeps the practice mix interesting without leaving the same rhythm-focused workflow.'
        ],
        songSlugs: ['spanish-bullfighting-tune', 'turkish-march', 'wedding-march-alt']
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
          'No. It is a themed public entry page. Every card still opens the same public song detail page used across the site.'
      }
    ],
    relatedGuideSlugs: [
      'easy-classical-letter-note-songs',
      'music-class-songs-for-beginners',
      'how-to-read-letter-notes'
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
      'This page gathers those public song pages into one focused entry point while keeping the same detail-page workflow, so the letter-note layout, fingering chart support, and normal practice controls stay familiar.'
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
      'easy-songs-for-adult-beginners'
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
      'This page groups those public song pages into one practical entry point while keeping the same letter-note layout, fingering chart support, and normal practice workflow used across the rest of the site.'
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
          'No. The songs vary in length and shape, but this guide is still built as a melody-first entry page. It helps learners find recognisable international tunes without leaving the same public letter-note workflow.'
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
      'easy-songs-for-adult-beginners'
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
      'This guide keeps that entry path simple by sending visitors into the same public song pages, where the melody stays readable, the fingering chart stays available, and the runtime workflow does not change.'
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
        songSlugs: ['air-on-the-g-string', 'moonlight-sonata', 'schubert-serenade']
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
          'No. Every card still opens the same public song detail page used across the site, so this guide improves entry paths without creating a separate product flow.'
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
      'The goal is to connect that broad classroom intent to the same public song pages, so the transition from discovery to practice stays direct and consistent.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'mary-had-a-little-lamb',
      'frere-jacques',
      'jingle-bells',
      'ode-to-joy',
      'happy-birthday-to-you'
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
          'ode-to-joy'
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
        songSlugs: ['happy-birthday-to-you', 'row-row-row-your-boat', 'old-macdonald']
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
          'No. It gives classroom and home-practice visitors a narrower landing page first, then routes them into the same public song pages used by the rest of the site.'
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
      'This page gives them a direct entry point into the same public song pages, where the fingering chart stays available, lyrics can be turned on when supported, and the reading workflow stays simple.'
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
          'No. Every card still opens the same public song detail page used elsewhere on the site, so the hymn guide is an entry layer rather than a separate playback system.'
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
      'The goal is to give returning adults and first-time hobby players a cleaner route into familiar melodies that still open the same public song pages already used across the site.'
    ],
    featuredSongSlugs: [
      'ode-to-joy',
      'amazing-grace',
      'scarborough-fair',
      'auld-lang-syne',
      'canon',
      'happy-birthday-to-you'
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
          'scarborough-fair',
          'auld-lang-syne',
          'canon'
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
        songSlugs: ['happy-birthday-to-you', 'amazing-grace', 'greensleeves']
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
      'This guide answers that intent directly while still sending every click into the same public song detail pages, where the fingering chart, letter notes, and optional numbered-note backup view stay in one stable layout.'
    ],
    featuredSongSlugs: [
      'canon',
      'wedding-march',
      'wedding-march-alt',
      'amazing-grace',
      'air-on-the-g-string',
      'going-home'
    ],
    sections: [
      {
        title: 'Best Ceremony Songs To Open First',
        paragraphs: [
          'The strongest first pages for ceremonies are the ones with immediate recognition and a stable phrase flow. They let players focus on entrance timing, breathing, and confident note changes instead of learning an unfamiliar tune at the same time.',
          'That is why this guide starts with Canon, Wedding March, and Amazing Grace before moving outward into quieter reflective melodies.'
        ],
        songSlugs: ['canon', 'wedding-march', 'amazing-grace']
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
        songSlugs: ['wedding-march-alt', 'going-home', 'air-on-the-g-string']
      },
      {
        title: 'What To Practice Before A Real Event',
        paragraphs: [
          'Ceremony pages should be rehearsed as complete runs, not just as isolated phrases. The goal is a page that feels dependable enough for entrances, pauses, and restarts in a real room.',
          'These songs work best when you practice the exact page flow, keep the layout stable, and resist changing settings at the last minute.'
        ],
        songSlugs: ['canon', 'wedding-march', 'air-on-the-g-string']
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
      'easy-songs-for-adult-beginners'
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
      'This guide answers that intent directly while keeping every click inside the same public song detail pages, so the letter-note layout, fingering chart, and optional numbered-note backup view stay familiar from song to song.'
    ],
    featuredSongSlugs: [
      'amazing-grace',
      'air-on-the-g-string',
      'greensleeves',
      'going-home',
      'lullaby',
      'traumerei'
    ],
    sections: [
      {
        title: 'Best Calm Songs To Open First',
        paragraphs: [
          'The strongest first pages in this group are the ones with an immediately singable line and enough melodic familiarity that the player can focus on tone and breath instead of on decoding a dense tune. That is why Amazing Grace, Greensleeves, and Air on the G String work so well here.',
          'They give slower practice value without forcing the player into long technical passages or large jumps right away.'
        ],
        songSlugs: ['amazing-grace', 'greensleeves', 'air-on-the-g-string', 'going-home']
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
        songSlugs: ['lullaby', 'traumerei', 'schubert-serenade']
      },
      {
        title: 'What To Add After The First Reflective Tunes',
        paragraphs: [
          'Once the calmest pages feel comfortable, add one folk melody and one classical page that still keep a lyrical contour. That broadens the repertoire without leaving the same slower, phrase-first workflow.'
        ],
        songSlugs: ['scarborough-fair', 'sakura-sakura', 'moonlight-sonata']
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
          'No. It is a public entry page only. Every song card still opens the same public detail page with the usual letter notes, fingering chart, and optional numbered-note backup view.'
      }
    ],
    relatedGuideSlugs: [
      'easy-songs-for-adult-beginners',
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
      'This guide answers that intent with a smaller group of calm public song pages, so players can move straight into readable letter notes, keep the fingering chart on, and stay inside the same public song workflow.'
    ],
    featuredSongSlugs: [
      'lullaby',
      'moonlight-sonata',
      'schubert-serenade',
      'traumerei',
      'air-on-the-g-string',
      'moscow-nights'
    ],
    sections: [
      {
        title: 'Best Bedtime Songs To Open First',
        paragraphs: [
          'The best starting pages here are the ones with a gentle contour and enough familiarity that the player can stay focused on breath, tone, and smooth phrase endings. Brahms Lullaby, Traumerei, and Air on the G String are strong first choices for that reason.',
          'They feel calm and readable without pushing the player into fast ornaments, march-like rhythm, or a crowded score.'
        ],
        songSlugs: ['lullaby', 'traumerei', 'air-on-the-g-string', 'schubert-serenade']
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
        songSlugs: ['moonlight-sonata', 'moscow-nights', 'going-home']
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
          'No. This guide only narrows the entry path. Every card still opens the same public song detail page with the usual letter notes, fingering support, and optional numbered-note backup view.'
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
      'This guide gives that entry point while keeping every click on the same public song pages, so players still get the familiar letter-note layout, fingering chart, and optional numbered-note backup view.'
    ],
    featuredSongSlugs: [
      'can-can',
      'habanera',
      'woodpecker-polka',
      'blacksmith-polka',
      'the-hawthorn-tree',
      'turkish-march'
    ],
    sections: [
      {
        title: 'Best Dance Pages To Start With',
        paragraphs: [
          'The easiest first picks in this group are the melodies with a clear repeated pulse and a recognizable hook. Can-Can and Habanera work well because players usually already know the contour, which frees them to focus on articulation and beat placement.',
          'They also make a good contrast with slower lyrical pages, so visitors who want more energy can find a better fit right away.'
        ],
        songSlugs: ['can-can', 'habanera', 'woodpecker-polka', 'blacksmith-polka']
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
        songSlugs: ['dancing-doll-and-teddy-bear', 'swan-lake', 'the-hawthorn-tree']
      },
      {
        title: 'What To Add After The First Polkas And Waltz-Like Tunes',
        paragraphs: [
          'Once the shorter dance pages feel secure, add one broader classical page and one march-like tune. That keeps the brighter energy while expanding the rhythm shapes you can read on the same public workflow.'
        ],
        songSlugs: ['turkish-march', 'american-patrol', 'parade-of-the-wooden-soldiers']
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
      family === 'hymn' ? 'hymns-and-spiritual-letter-note-songs' : null,
      family === 'classical' || family === 'march' ? 'easy-classical-letter-note-songs' : null,
      'easy-songs-for-adult-beginners',
      '12-hole-ocarina-letter-notes',
      'recorder-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (PATRIOTIC_ANTHEM_SONG_SLUGS.has(songSlug)) {
    suggestedSlugs = [
      'patriotic-and-anthem-letter-note-songs',
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
      'easy-songs-for-adult-beginners',
      songCard?.hasPublicLyrics ? 'songs-with-lyrics' : null,
      '12-hole-ocarina-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (CHRISTMAS_OCARINA_SONG_SLUGS.has(songSlug)) {
    suggestedSlugs = [
      'easy-christmas-ocarina-songs',
      'christmas-letter-note-songs',
      'easy-12-hole-ocarina-songs',
      'easy-ocarina-songs-for-beginners',
      songCard?.hasPublicLyrics ? 'songs-with-lyrics' : null,
      '12-hole-ocarina-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (EASY_SIX_HOLE_OCARINA_SONG_SLUGS.has(songSlug)) {
    suggestedSlugs = [
      'easy-6-hole-ocarina-songs',
      '6-hole-ocarina-letter-notes',
      'easy-ocarina-songs-for-beginners',
      family === 'holiday' ? 'easy-christmas-ocarina-songs' : null,
      family === 'nursery' ? 'nursery-rhyme-letter-notes' : null,
      family === 'holiday' ? 'christmas-letter-note-songs' : null,
      '12-hole-ocarina-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (EASY_TWELVE_HOLE_OCARINA_SONG_SLUGS.has(songSlug)) {
    suggestedSlugs = [
      'easy-12-hole-ocarina-songs',
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
      family === 'holiday' ? 'easy-christmas-ocarina-songs' : null,
      family === 'holiday' ? 'christmas-letter-note-songs' : null,
      family === 'hymn' ? 'hymns-and-spiritual-letter-note-songs' : null,
      family === 'classical' ? 'easy-classical-letter-note-songs' : null,
      '12-hole-ocarina-letter-notes',
      '6-hole-ocarina-letter-notes',
      songCard?.hasPublicLyrics ? 'songs-with-lyrics' : null
    ].filter((slug): slug is string => Boolean(slug))
  } else if (family === 'nursery' || family === 'song') {
    suggestedSlugs = [
      family === 'nursery' ? 'nursery-rhyme-letter-notes' : 'easy-recorder-songs-for-beginners',
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
      'easy-ocarina-songs-for-beginners',
      'easy-12-hole-ocarina-songs',
      'music-class-songs-for-beginners',
      'songs-with-lyrics',
      'easy-tin-whistle-songs',
      '12-hole-ocarina-letter-notes',
      'simple-instruments-for-music-education'
    ]
  } else if (family === 'folk' || family === 'hymn') {
    suggestedSlugs = [
      family === 'folk' && CELTIC_TIN_WHISTLE_SONG_SLUGS.has(songSlug)
        ? 'celtic-tin-whistle-songs'
        : null,
      family === 'hymn' ? 'hymns-and-spiritual-letter-note-songs' : null,
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
      'easy-ocarina-songs-for-beginners',
      'easy-songs-for-adult-beginners',
      'how-to-read-letter-notes',
      '12-hole-ocarina-letter-notes',
      'recorder-letter-notes',
      'easy-songs-for-beginners'
    ]
  } else if (family === 'march') {
    suggestedSlugs = [
      'march-and-parade-letter-note-songs',
      'easy-classical-letter-note-songs',
      'music-class-songs-for-beginners',
      'how-to-read-letter-notes',
      'recorder-letter-notes',
      '12-hole-ocarina-letter-notes'
    ]
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
