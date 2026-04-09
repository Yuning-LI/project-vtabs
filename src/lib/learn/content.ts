import { hasPublicKuailepuLyricToggle, loadKuailepuSongPayload } from '@/lib/kuailepu/runtime'
import { siteUrl } from '@/lib/site'
import { songCatalogBySlug } from '@/lib/songbook/catalog'
import { getSongPresentation } from '@/lib/songbook/presentation'
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

type LearnGuideSection = {
  title: string
  paragraphs: string[]
  bullets?: string[]
  songSlugs?: string[]
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
  featuredSongSlugs: string[]
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
  'recorder-letter-notes',
  'tin-whistle-letter-notes',
  'easy-recorder-songs-for-beginners',
  'easy-tin-whistle-songs',
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
  'march-and-parade-letter-note-songs'
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

const learnGuideDefinitions: LearnGuideDefinition[] = [
  {
    slug: '12-hole-ocarina-letter-notes',
    kind: 'hub',
    title: '12-Hole Ocarina Letter Notes',
    description:
      'A public hub for players who want easy-to-read ocarina letter-note songs with fingering charts, switchable numbered notes, and beginner-friendly starting points.',
    heroLabel: 'Instrument Hub',
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
          'That is why this hub starts with nursery and folk standards before moving on to longer hymn or classical melodies.'
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
        question: 'Who is this hub for?',
        answer:
          'It is for players who search directly for 12-hole ocarina letter notes and need a cleaner starting point than a full mixed library page.'
      }
    ],
    relatedGuideSlugs: [
      'easy-songs-for-beginners',
      'songs-with-lyrics',
      'simple-instruments-for-music-education'
    ]
  },
  {
    slug: 'recorder-letter-notes',
    kind: 'hub',
    title: 'Recorder Letter Notes',
    description:
      'A themed recorder entry page for searchable melody pages with letter notes, fingering support, and practical songs for classroom or beginner practice.',
    heroLabel: 'Instrument Hub',
    intro: [
      'This hub is aimed at players and teachers searching for recorder letter notes instead of a full mixed song catalog. It gives them a narrower page with clearer next steps.',
      'The linked songs still use the same public runtime page, so visitors can keep the fingering chart visible and move through familiar melodies without leaving the site.'
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
        title: 'Best Recorder Songs For First Reading Practice',
        paragraphs: [
          'Short classroom melodies work best here because they let new readers connect the letter-note line to finger movement before rhythm and phrase length become the bigger problem.'
        ],
        songSlugs: [
          'twinkle-twinkle-little-star',
          'mary-had-a-little-lamb',
          'frere-jacques',
          'happy-birthday-to-you'
        ]
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
        songSlugs: ['jingle-bells', 'ode-to-joy', 'silent-night']
      }
    ],
    faq: [
      {
        question: 'Do these songs only work on recorder?',
        answer:
          'No. The public song pages can switch between the supported instruments, but this hub is written specifically for recorder-focused search intent and beginner use.'
      },
      {
        question: 'Why use a recorder hub instead of the full library?',
        answer:
          'Because search users landing on a recorder-specific page get a clearer answer faster, which is better for both usability and search performance.'
      }
    ],
    relatedGuideSlugs: [
      'easy-songs-for-beginners',
      'songs-with-lyrics',
      '12-hole-ocarina-letter-notes'
    ]
  },
  {
    slug: 'tin-whistle-letter-notes',
    kind: 'hub',
    title: 'Tin Whistle Letter Notes',
    description:
      'A focused tin whistle landing page for players who want searchable melody pages with letter notes, familiar folk songs, and an easy path into the main library.',
    heroLabel: 'Instrument Hub',
    intro: [
      'Tin whistle players often search for simple melody pages before they search by tune family. This hub is built to catch that intent and move visitors straight into songs they already recognize.',
      'The best first links here mix familiar beginner melodies with a few slower folk and hymn tunes that reward cleaner breath planning.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'ode-to-joy',
      'amazing-grace',
      'red-river-valley',
      'auld-lang-syne',
      'scarborough-fair'
    ],
    sections: [
      {
        title: 'Easy Tin Whistle Songs To Begin With',
        paragraphs: [
          'The easiest whistle pages on the site are the ones where the melody is already familiar and the phrase structure is easy to hear before you even start playing.'
        ],
        songSlugs: ['twinkle-twinkle-little-star', 'ode-to-joy', 'amazing-grace']
      },
      {
        title: 'When To Move Into Folk Songs',
        paragraphs: [
          'Folk songs are a natural second step because they build musical phrasing without overwhelming the player with long technical passages. They also tend to work well in letter-note form.'
        ],
        songSlugs: ['red-river-valley', 'auld-lang-syne', 'scarborough-fair']
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
        question: 'Why does a tin whistle hub matter if the songs are already in the library?',
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
      'easy-songs-for-beginners',
      'songs-with-lyrics',
      'simple-instruments-for-music-education'
    ]
  },
  {
    slug: 'easy-recorder-songs-for-beginners',
    kind: 'hub',
    title: 'Easy Recorder Songs for Beginners',
    description:
      'A recorder-first beginner hub for familiar songs with letter notes, fingering support, and a cleaner path into the public melody library.',
    heroLabel: 'Instrument Hub',
    intro: [
      'Some searchers are not looking for recorder theory or a full catalog. They want easy recorder songs they can recognize quickly and start reading in letter notes right away.',
      'This page gives that narrower entry point while still routing every click into the same public song pages, where fingering charts, zoom controls, and the default letter-note layout already exist.'
    ],
    featuredSongSlugs: [
      'mary-had-a-little-lamb',
      'row-row-row-your-boat',
      'frere-jacques',
      'old-macdonald',
      'happy-birthday-to-you',
      'ode-to-joy'
    ],
    sections: [
      {
        title: 'Best First Recorder Songs On This Site',
        paragraphs: [
          'The strongest first recorder songs are the ones students already know by ear. That keeps practice focused on finger movement, phrase entry, and steady breathing instead of on trying to remember the tune itself.'
        ],
        songSlugs: [
          'mary-had-a-little-lamb',
          'row-row-row-your-boat',
          'frere-jacques',
          'old-macdonald'
        ]
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
        songSlugs: ['happy-birthday-to-you', 'ode-to-joy', 'jingle-bells']
      }
    ],
    faq: [
      {
        question: 'Are these songs recorder-only?',
        answer:
          'No. The linked song pages still support the site-wide instrument views, but this hub is written to match recorder-specific beginner search intent.'
      },
      {
        question: 'Why is this different from the main recorder hub?',
        answer:
          'The main recorder hub balances broader recorder intent, while this page focuses tightly on easy beginner songs and the shortest first-step melodies.'
      }
    ],
    relatedGuideSlugs: [
      'recorder-letter-notes',
      'easy-songs-for-beginners',
      'nursery-rhyme-letter-notes'
    ]
  },
  {
    slug: 'easy-tin-whistle-songs',
    kind: 'hub',
    title: 'Easy Tin Whistle Songs',
    description:
      'A beginner tin whistle landing page for easy songs with letter notes, folk-friendly phrase shapes, and quick links into the public melody pages.',
    heroLabel: 'Instrument Hub',
    intro: [
      'Tin whistle searchers often start with easy songs, not with theory terms. They want tunes they already know, readable note labels, and a page that feels useful before they commit to learning ornamented traditional notation.',
      'This hub answers that intent with a small set of public-domain melodies that still open the same public song pages used throughout the site.'
    ],
    featuredSongSlugs: [
      'twinkle-twinkle-little-star',
      'ode-to-joy',
      'amazing-grace',
      'red-river-valley',
      'wellerman',
      'loch-lomond'
    ],
    sections: [
      {
        title: 'Easy Tin Whistle Songs To Start With',
        paragraphs: [
          'The easiest whistle pages are the ones where phrase direction is obvious before you play. Familiar nursery and hymn-style melodies make the first reading pass much easier than dense dance tunes or highly ornamented session material.'
        ],
        songSlugs: ['twinkle-twinkle-little-star', 'ode-to-joy', 'amazing-grace']
      },
      {
        title: 'When Folk Songs Become The Better Practice Material',
        paragraphs: [
          'After the first easy melodies, folk songs become more useful because they ask for longer breath control and a more vocal line without forcing fast technical execution.'
        ],
        songSlugs: ['red-river-valley', 'loch-lomond', 'scarborough-fair']
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
        question: 'Does this page replace the tin whistle hub?',
        answer:
          'No. It is a narrower beginner landing page built around easy-song search intent, while the broader tin whistle hub still covers a wider mix of song types.'
      },
      {
        question: 'Can these songs still work for recorder or ocarina?',
        answer:
          'Yes. The public song pages stay instrument-flexible, but this entry page is written for visitors who explicitly search for easy tin whistle songs.'
      }
    ],
    relatedGuideSlugs: [
      'tin-whistle-letter-notes',
      'folk-songs-for-beginners',
      'easy-songs-for-beginners'
    ]
  },
  {
    slug: 'nursery-rhyme-letter-notes',
    kind: 'hub',
    title: 'Nursery Rhyme Letter Notes',
    description:
      'A nursery-rhyme hub for familiar beginner songs with letter notes, lyrics when available, and short phrase shapes that work well for first-week practice.',
    heroLabel: 'Beginner Hub',
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
          'No. Every card still opens the normal public song detail page, so the hub is an entry layer rather than a separate experience.'
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
      'A beginner-first hub that groups the shortest and most recognizable melody pages for new ocarina, recorder, and tin whistle players.',
    heroLabel: 'Beginner Hub',
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
          'No. It is a beginner hub for the site as a whole, and the linked songs keep the same public detail page controls for the supported instrument views.'
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
      'A lyric-focused hub that collects the public melody pages where lyrics are already supported, so players can sing through the phrase shape while learning the notes.',
    heroLabel: 'Lyric Hub',
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
          'No. This hub only lists the public pages where lyrics are already available in the current runtime, which makes it a better landing page for lyric-related searches.'
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
    heroLabel: 'Seasonal Hub',
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
          'No. It is a seasonal hub, but many visitors rehearse Christmas songs well before December for school, church, and performance planning.'
      },
      {
        question: 'Do these songs open a different player?',
        answer:
          'No. Every card still opens the same public song detail page used elsewhere on the site, so the seasonal hub is an entry layer rather than a separate product flow.'
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
      'A public hub for familiar folk and traditional melodies with letter notes, singable phrase shapes, and approachable practice pages for ocarina, recorder, and tin whistle.',
    heroLabel: 'Folk Hub',
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
          'Because a folk-focused hub gives search users a direct answer and a more coherent starting set than a broad mixed catalog page.'
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
      'A focused whistle hub for Celtic and Irish-style melodies with letter notes, singable phrase shapes, and direct paths into the public melody pages.',
    heroLabel: 'Whistle Hub',
    intro: [
      'Some visitors are not just looking for any beginner song. They are searching specifically for Celtic or Irish-style whistle melodies that feel closer to the tunes they already hear in sessions, school groups, or home practice.',
      'This page gives that narrower entry path while still routing every click into the same public song pages, where the default letter-note layout, fingering support, and stable practice controls stay intact.'
    ],
    featuredSongSlugs: [
      'the-south-wind',
      'lough-leane',
      'irish-morning-wind',
      'irish-blackbird',
      'loch-lomond',
      'scotland-the-brave'
    ],
    sections: [
      {
        title: 'Best Celtic Whistle Songs To Start With',
        paragraphs: [
          'The best first Celtic-style pages are the ones with a strong vocal line and enough melodic familiarity that the player can hear the phrase before trying to decorate it. That makes them more useful than very fast dance tunes for early practice.',
          'Start with slower lyrical melodies first, then add brighter tunes once the basic phrase shape feels stable in plain, ornament-free playing.'
        ],
        songSlugs: ['the-south-wind', 'lough-leane', 'loch-lomond', 'irish-morning-wind']
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
        songSlugs: ['the-south-wind', 'lough-leane', 'irish-blackbird']
      },
      {
        title: 'What To Add After The First Slow Airs',
        paragraphs: [
          'Once the calmer melodies feel comfortable, add one brighter patriotic or folk-style tune and one familiar sing-along melody. That expands the repertoire without leaving the same whistle-friendly workflow.'
        ],
        songSlugs: ['scotland-the-brave', 'auld-lang-syne', 'irish-blackbird']
      }
    ],
    faq: [
      {
        question: 'Does this page replace the main tin whistle hub?',
        answer:
          'No. It is a narrower landing page built for Celtic and Irish-style whistle search intent, while the broader tin whistle hub still covers a wider beginner mix.'
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
      'A public hub for march and parade-style melodies with letter notes, fingering charts, and readable ceremonial or processional tunes for ocarina, recorder, and tin whistle.',
    heroLabel: 'March Hub',
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
        question: 'Does this hub use a different song player?',
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
      'A public hub for approachable classical melodies with letter notes, fingering charts, and practical first themes for ocarina, recorder, and tin whistle players.',
    heroLabel: 'Classical Hub',
    intro: [
      'Many search visitors do not want a full classical catalog first. They want one page that gathers the best-known themes they can recognize quickly and start reading without staff-heavy notation.',
      'This hub keeps that entry path simple by sending visitors into the same public song pages, where the melody stays readable, the fingering chart stays available, and the runtime workflow does not change.'
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
          'No. Every card still opens the same public song detail page used across the site, so this hub improves entry paths without creating a separate product flow.'
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
      'A public hymn and spiritual hub for players who want reflective melodies with letter notes, lyric-friendly pages, and calm practice material for ocarina, recorder, and tin whistle.',
    heroLabel: 'Hymn Hub',
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
          'No. Every card still opens the same public song detail page used elsewhere on the site, so the hymn hub is an entry layer rather than a separate playback system.'
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

  if (family === 'nursery' || family === 'song') {
    suggestedSlugs = [
      family === 'nursery' ? 'nursery-rhyme-letter-notes' : 'easy-recorder-songs-for-beginners',
      'easy-songs-for-beginners',
      '12-hole-ocarina-letter-notes',
      'music-class-songs-for-beginners',
      songCard?.hasPublicLyrics ? 'songs-with-lyrics' : null,
      'simple-instruments-for-music-education'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (family === 'holiday') {
    suggestedSlugs = [
      'christmas-letter-note-songs',
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
      'easy-tin-whistle-songs',
      'tin-whistle-letter-notes',
      songCard?.hasPublicLyrics ? 'songs-with-lyrics' : null,
      '12-hole-ocarina-letter-notes'
    ].filter((slug): slug is string => Boolean(slug))
  } else if (family === 'classical') {
    suggestedSlugs = [
      'easy-classical-letter-note-songs',
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

function getLearnSongCard(slug: string) {
  if (learnSongCardCache.has(slug)) {
    return learnSongCardCache.get(slug) ?? null
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
  return card
}

function resolveLearnSongCards(slugs: string[]) {
  return slugs
    .map(slug => getLearnSongCard(slug))
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

function hasEnglishDisplayTitle(value: string) {
  return /[A-Za-z]/.test(value)
}
