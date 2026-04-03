import { resolvePublicSongFamily } from './publicManifest.ts'
import type { PublicSongFamily, SongDoc } from './types'

export type SongPresentation = {
  title: string
  subtitle: string
  metaDescription: string
  overview: string
  background: string
  practiceNotes: string
  includes: string[]
  faqs: Array<{
    question: string
    answer: string
  }>
  keyLabel: string
  meterLabel: string
  tempoLabel: string
  familyLabel: string
  difficultyLabel: string
}

/**
 * 这一层只负责“对外展示文案”，不负责任何谱面真相。
 *
 * 交接时要分清：
 * - 真正决定 song page 谱面的是 `reference/songs/*.json + runtime`
 * - 这里决定的是标题、meta description、详情页 SEO 文案、FAQ 文案
 *
 * 当前站点面向 Google / western 用户，因此这里的输出必须满足：
 * - 全英文
 * - 对人类可读，不写明显机器堆词
 * - 但要覆盖高价值搜索意图，例如 `ocarina tabs`、`ocarina notes`、`recorder notes`
 *
 * 同时，前台禁止出现：
 * - “参考了快乐谱”
 * - “source is Kuailepu”
 * - 任何把第三方来源直接暴露给搜索用户的措辞
 */
const TITLE_OVERRIDES: Record<string, string> = {
  'american-patrol': 'American Patrol',
  'auld-lang-syne-english': 'Auld Lang Syne (English Lyrics Version)',
  'going-home': 'Going Home',
  'harvest-song': 'Harvest Song',
  'lightly-row': 'Lightly Row',
  'little-bee': 'Little Bee',
  'song-of-parting': 'Song of Parting',
  'the-trout': 'The Trout',
  'twinkle-variations': 'Twinkle, Twinkle, Little Star Variations',
  'wedding-march-alt': 'Wedding March (Alternate Setting)'
}

const FAMILY_LABELS: Record<PublicSongFamily, string> = {
  nursery: 'Nursery Rhyme',
  folk: 'Folk Song',
  classical: 'Classical Melody',
  holiday: 'Holiday Song',
  hymn: 'Hymn or Spiritual',
  march: 'March or Parade Tune',
  dance: 'Dance Melody',
  song: 'Popular Song Melody'
}

type SongSeoProfile = {
  searchTerms: string[]
  background: string
  practice: string
}

const SONG_SEO_PROFILES: Record<string, SongSeoProfile> = {
  'twinkle-twinkle-little-star': {
    searchTerms: [
      'Twinkle Twinkle Little Star ocarina tabs',
      'Twinkle Twinkle Little Star recorder notes'
    ],
    background: 'Twinkle, Twinkle, Little Star is one of the most familiar beginner melodies in the world, so players often look for a version that is easy to scan, easy to memorize, and practical on ocarina or recorder.',
    practice: 'Its repeating phrase pattern makes it useful for first-note reading, clean finger changes, and steady beginner breath control.'
  },
  'ode-to-joy': {
    searchTerms: ['Ode to Joy ocarina tabs', 'Ode to Joy recorder notes'],
    background: 'Ode to Joy is the well-known theme from Beethoven\'s Ninth Symphony, and it remains one of the most searched classical melodies for players who want a readable fingering-first version across simple melody instruments.',
    practice: 'The balanced phrase structure makes it useful for tone consistency, moderate finger movement, and phrase-based practice.'
  },
  'amazing-grace': {
    searchTerms: ['Amazing Grace ocarina tabs', 'Amazing Grace recorder notes'],
    background: 'Amazing Grace is a hymn tune that players often search for as an expressive slow melody, especially when they want a simple note-label version instead of staff notation.',
    practice: 'It works especially well for breath support, legato playing, and shaping longer lyrical phrases on ocarina.'
  },
  'mary-had-a-little-lamb': {
    searchTerms: ['Mary Had a Little Lamb ocarina tabs', 'Mary Had a Little Lamb letter notes'],
    background: 'Mary Had a Little Lamb is a classic classroom song and one of the most common first tunes for simple melody instruments.',
    practice: 'The short range and repeated note shapes make it effective for absolute beginners building note recognition.'
  },
  'happy-birthday-to-you': {
    searchTerms: ['Happy Birthday to You ocarina tabs', 'Happy Birthday recorder notes'],
    background: 'Happy Birthday to You is one of the most recognisable songs on the internet, so players often want a clean melody page they can use immediately on ocarina, recorder, or tin whistle for parties and quick requests.',
    practice: 'This melody is useful for everyday performance practice because it combines familiar phrasing with a few larger note moves.'
  },
  'jingle-bells': {
    searchTerms: ['Jingle Bells ocarina tabs', 'Jingle Bells recorder notes'],
    background: 'Jingle Bells is one of the highest-demand Christmas melodies for beginner-friendly letter tabs, fast holiday practice, and family sing-along playing across ocarina, recorder, and tin whistle.',
    practice: 'The rhythm stays lively without becoming too dense, which makes it useful for holiday practice and confident pulse control.'
  },
  'scarborough-fair': {
    searchTerms: ['Scarborough Fair ocarina tabs', 'Scarborough Fair ocarina notes'],
    background: 'Scarborough Fair is a traditional English ballad melody that players often want in a gentle, singable format with readable note labels instead of staff notation.',
    practice: 'Its lyrical contour is especially useful for phrasing, breath planning, and quiet tone control.'
  },
  'auld-lang-syne': {
    searchTerms: ['Auld Lang Syne ocarina tabs', 'Auld Lang Syne recorder notes'],
    background: 'Auld Lang Syne is a traditional song strongly associated with New Year celebrations, so it draws steady seasonal search traffic from players who want a quick melody page for countdown and group sing-along use.',
    practice: 'The tune is friendly for group sing-along use and works well for smooth phrase connection.'
  },
  'silent-night': {
    searchTerms: ['Silent Night ocarina tabs', 'Silent Night recorder notes'],
    background: 'Silent Night is one of the best-known Christmas carols, and players often search for a calm, readable melody version with clear phrasing support for church, school, or home performance.',
    practice: 'Its slower pace makes it effective for breath control, tone warmth, and gentle legato playing.'
  },
  'fur-elise': {
    searchTerms: ['Fur Elise ocarina tabs', 'Fur Elise ocarina letter notes'],
    background: 'Für Elise is one of the most recognisable piano themes ever written, which makes it a strong classical search term for players looking for melody-first tabs they can read quickly.',
    practice: 'The melody gives useful work in phrase contrast, pitch awareness, and cleaner transitions than a simple nursery song.'
  },
  'home-sweet-home': {
    searchTerms: ['Home Sweet Home ocarina tabs', 'Home Sweet Home ocarina notes'],
    background: 'Home Sweet Home is a widely known 19th-century song melody that still works well as a lyrical tune for players looking for a calm, old-fashioned melody page.',
    practice: 'This page supports expressive tone, sustained phrases, and moderate breath planning.'
  },
  'yankee-doodle': {
    searchTerms: ['Yankee Doodle ocarina tabs', 'Yankee Doodle ocarina notes'],
    background: 'Yankee Doodle remains a familiar American tune with simple melodic shapes, making it a natural fit for players searching for beginner-friendly note labels and quick patriotic repertoire.',
    practice: 'It is useful for beginner articulation practice and steady rhythmic reading.'
  },
  'can-can': {
    searchTerms: ['Can-Can ocarina tabs', 'Can-Can letter notes'],
    background: 'Can-Can is a famous dance theme that players often search for when they want something more energetic than a basic beginner melody.',
    practice: 'It rewards stronger rhythm, sharper articulation, and more confident finger timing.'
  },
  'air-on-the-g-string': {
    searchTerms: ['Air on the G String ocarina tabs', 'Bach Air on the G String ocarina notes'],
    background: 'Air on the G String is one of Bach\'s most searched lyrical themes, especially for players who want a calm classical melody in a non-staff, slow-reading format.',
    practice: 'It is well suited to long breath lines, smooth attacks, and even tone color.'
  },
  'american-patrol': {
    searchTerms: ['American Patrol ocarina tabs', 'American Patrol letter notes'],
    background: 'American Patrol is a march melody with a clear parade character, which makes it useful for players who want a brighter rhythmic feel than a lullaby or folk tune.',
    practice: 'It supports pulse control, confident articulation, and more active note changes.'
  },
  arirang: {
    searchTerms: ['Arirang ocarina tabs', 'Arirang ocarina notes'],
    background: 'Arirang is one of the best-known Korean folk melodies, so it works well as a lyrical world-folk page for players searching beyond the usual nursery repertoire and western holiday tunes.',
    practice: 'It is especially useful for breath planning, legato phrasing, and a more vocal melodic shape.'
  },
  'auld-lang-syne-english': {
    searchTerms: ['Auld Lang Syne ocarina tabs', 'Auld Lang Syne English lyrics ocarina'],
    background: 'This version keeps Auld Lang Syne in a format that works well for players who specifically want the familiar English sing-along wording on the page.',
    practice: 'It is especially practical for seasonal sing-along playing and phrase-based repetition.'
  },
  canon: {
    searchTerms: ['Canon in D ocarina tabs', 'Canon in D ocarina notes'],
    background: 'Canon in D is one of the most searched classical wedding melodies online, so a melody-first fingering page is especially useful for players preparing ceremony-friendly music.',
    practice: 'The steady phrase flow makes it useful for measured breath control and clean melodic connection.'
  },
  'deck-the-halls': {
    searchTerms: ['Deck the Halls ocarina tabs', 'Deck the Halls recorder notes'],
    background: 'Deck the Halls is a seasonal favorite with strong holiday search demand for easy melody tabs, quick December practice, and familiar carol playing.',
    practice: 'The tune gives helpful practice in quick but manageable phrase movement and cheerful rhythmic flow.'
  },
  'do-your-ears-hang-low': {
    searchTerms: ['Do Your Ears Hang Low ocarina tabs', 'Do Your Ears Hang Low letter notes'],
    background: 'Do Your Ears Hang Low is a familiar children\'s song with clear repeated contours that make it easy to scan on a melody page.',
    practice: 'It works well for new players who want repetition without a narrow one-note exercise feel.'
  },
  'down-by-the-salley-gardens': {
    searchTerms: ['Down By the Salley Gardens ocarina tabs', 'Down By the Salley Gardens letter notes'],
    background: 'Down By the Salley Gardens is a lyrical folk melody that players often want in a simpler melody-first format for expressive practice.',
    practice: 'This tune is especially useful for breath timing, softer dynamics, and connected phrasing.'
  },
  'jasmine-flower': {
    searchTerms: ['Jasmine Flower ocarina tabs', 'Mo Li Hua ocarina letter notes'],
    background: 'Jasmine Flower is one of the most widely recognised Chinese folk melodies, and it fits well as a clear melody-first page for players exploring global traditional tunes with a familiar concert or recital profile.',
    practice: 'It supports gentle phrasing, breath control, and a singing tone rather than fast technical playing.'
  },
  'flight-of-the-bumblebee': {
    searchTerms: ['Flight of the Bumblebee ocarina tabs', 'Flight of the Bumblebee letter notes'],
    background: 'Flight of the Bumblebee is one of the most searched fast classical themes, even when players only want the recognisable melodic line rather than a full virtuosic transcription.',
    practice: 'It gives stronger finger-speed demands and is better suited to players already comfortable with faster note reading.'
  },
  'frere-jacques': {
    searchTerms: ['Frere Jacques ocarina tabs', 'Frere Jacques letter notes'],
    background: 'Frere Jacques is a classic French nursery round and one of the easiest melody pages to recognise and memorize quickly.',
    practice: 'Its repeated section design makes it ideal for beginners practicing note recall and phrase repetition.'
  },
  'god-rest-you-merry-gentlemen': {
    searchTerms: ['God Rest You Merry Gentlemen ocarina tabs', 'God Rest You Merry Gentlemen ocarina notes'],
    background: 'God Rest You Merry, Gentlemen is a traditional English Christmas carol with steady seasonal search interest from melody players who want a darker minor-mode holiday tune.',
    practice: 'The line gives useful practice in phrase weight, minor-mode feeling, and controlled breath placement.'
  },
  'going-home': {
    searchTerms: ['Going Home ocarina tabs', 'Going Home letter notes'],
    background: 'Going Home is the melody commonly associated with the New World Symphony tradition, so many players search for it as a lyrical instrumental theme.',
    practice: 'It works well for expressive shaping and longer-breath melodic playing.'
  },
  greensleeves: {
    searchTerms: ['Greensleeves ocarina tabs', 'Greensleeves recorder notes'],
    background: 'Greensleeves is one of the best-known English folk melodies, making it a strong evergreen search term for players who want a lyrical tune with clear note labels.',
    practice: 'Its flowing contour supports breath control, legato playing, and a more expressive folk-song feel.'
  },
  habanera: {
    searchTerms: ['Habanera ocarina tabs', 'Habanera Carmen letter notes'],
    background: 'Habanera from Carmen is a high-recognition opera melody, and players often search for the theme itself rather than for a full vocal score.',
    practice: 'This melody is useful for rhythmic character, accent control, and confident phrase timing.'
  },
  'harvest-song': {
    searchTerms: ['Harvest Song ocarina tabs', 'Harvest Song letter notes'],
    background: 'Harvest Song works well as a compact folk melody page for players who want a simple singable line rather than a dense technical arrangement.',
    practice: 'It is especially approachable for steady tone, simple phrase grouping, and relaxed melody practice.'
  },
  humoresque: {
    searchTerms: ['Humoresque ocarina tabs', 'Dvorak Humoresque letter notes'],
    background: 'Humoresque is a widely recognised Dvorak melody and a common search target for players who want a lighter classical tune.',
    practice: 'It offers moderate phrasing detail without the density of faster virtuoso themes.'
  },
  'lightly-row': {
    searchTerms: ['Lightly Row ocarina tabs', 'Lightly Row letter notes'],
    background: 'Lightly Row is a common beginner teaching tune with a clean melodic shape that translates well to basic ocarina reading.',
    practice: 'Its simple contours make it suitable for first-step rhythm reading and note-location practice.'
  },
  'little-bee': {
    searchTerms: ['Little Bee ocarina tabs', 'Little Bee letter notes'],
    background: 'Little Bee is a compact children\'s melody with an easy-to-follow contour, which makes it useful for early beginner browsing and practice.',
    practice: 'It supports short practice sessions focused on note recognition and steady phrase flow.'
  },
  'london-bridge': {
    searchTerms: ['London Bridge Is Falling Down ocarina tabs', 'London Bridge letter notes'],
    background: 'London Bridge Is Falling Down is one of the most familiar English nursery songs, so it fits beginner letter-tab search intent very well.',
    practice: 'The melody is approachable for first songs while still giving enough motion to feel musical.'
  },
  'londonderry-air': {
    searchTerms: ['Londonderry Air ocarina tabs', 'Danny Boy melody ocarina notes'],
    background: 'Londonderry Air is the melody most players recognise from Danny Boy, making it a strong lyric-style search term for players who want a slow singable tune with clear fingering support.',
    practice: 'It is especially useful for singing tone, long breath lines, and expressive phrase ends.'
  },
  'long-long-ago': {
    searchTerms: ['Long Long Ago ocarina tabs', 'Long Long Ago letter notes'],
    background: 'Long Long Ago remains a familiar melody in beginner song collections and works well as a gentle lyrical tune for ocarina.',
    practice: 'It supports phrasing, tone stability, and easy melodic memorization.'
  },
  lullaby: {
    searchTerms: ['Lullaby ocarina tabs', 'Lullaby letter notes'],
    background: 'This lullaby page is aimed at players searching for a calm, gentle melody they can practice without fast rhythmic pressure.',
    practice: 'It is well suited to quiet tone control, relaxed breathing, and smooth note connection.'
  },
  'minuet-bach': {
    searchTerms: ['Bach Minuet ocarina tabs', 'Minuet letter notes'],
    background: 'This short Minuet page gives players a compact baroque-style melody without requiring full staff notation reading.',
    practice: 'It is useful for phrase balance, moderate articulation, and cleaner classical note shaping.'
  },
  'minuet-in-g': {
    searchTerms: ['Minuet in G ocarina tabs', 'Minuet in G ocarina notes'],
    background: 'Minuet in G is one of the most searched beginner classical melodies, especially for players moving from simple songs into baroque-style phrasing and cleaner articulation.',
    practice: 'The tune gives manageable classical phrasing without becoming too technically dense.'
  },
  'moonlight-sonata': {
    searchTerms: ['Moonlight Sonata ocarina tabs', 'Moonlight Sonata ocarina notes'],
    background: 'Moonlight Sonata is one of Beethoven\'s most recognisable themes, so a clean melody-first page is valuable for searchers who want the theme in a slow, readable format on ocarina.',
    practice: 'It is most useful for sustained tone, patient breath timing, and phrase control.'
  },
  'old-folks-at-home': {
    searchTerms: ['Old Folks at Home ocarina tabs', 'Swanee River ocarina letter notes'],
    background: 'Old Folks at Home, also known as Swanee River, is a familiar American song melody that fits well for players looking for a gentle lyrical page with an easy vocal contour.',
    practice: 'It is useful for melody shaping, moderate range movement, and even tone across phrases.'
  },
  'old-macdonald': {
    searchTerms: ['Old MacDonald Had a Farm ocarina tabs', 'Old MacDonald letter notes'],
    background: 'Old MacDonald Had a Farm is one of the highest-recognition children\'s songs and a natural fit for beginner ocarina letter tabs.',
    practice: 'The tune stays easy to memorize while still giving enough motion for useful finger repetition.'
  },
  'on-wings-of-song': {
    searchTerms: ['On Wings of Song ocarina tabs', 'Mendelssohn On Wings of Song letter notes'],
    background: 'On Wings of Song is a lyrical Mendelssohn melody that players often want in a simplified, melody-first practice format.',
    practice: 'It supports expressive breathing, smoother connection between notes, and a controlled singing tone.'
  },
  'sakura-sakura': {
    searchTerms: ['Sakura Sakura ocarina tabs', 'Sakura Sakura ocarina notes'],
    background: 'Sakura Sakura is a traditional Japanese melody with steady interest from players looking for recognisable world-folk repertoire and a calm pentatonic tune on ocarina.',
    practice: 'It is useful for phrase shape, controlled breath release, and a calm lyrical tone.'
  },
  'red-river-valley': {
    searchTerms: ['Red River Valley ocarina tabs', 'Red River Valley ocarina notes'],
    background: 'Red River Valley is a well-known folk and cowboy-style melody with steady search demand from players who want an easy lyrical tune for casual practice and sing-through playing.',
    practice: 'It works well for legato practice and relaxed phrasing over a familiar song shape.'
  },
  'santa-lucia': {
    searchTerms: ['Santa Lucia ocarina tabs', 'Santa Lucia ocarina notes'],
    background: 'Santa Lucia is a widely recognised song melody that sits well in a lyrical melody-first format for players who want a warm, flowing tune they can sing through internally while playing.',
    practice: 'This page supports smooth phrasing, breath control, and a rounded vocal-like tone.'
  },
  'schubert-serenade': {
    searchTerms: ['Schubert Serenade ocarina tabs', 'Schubert Serenade ocarina notes'],
    background: 'Schubert Serenade is a popular search target among players looking for a lyrical classical melody rather than a dense score excerpt, especially in a singable note-label format.',
    practice: 'It is especially suited to expressive line shaping and patient breath support.'
  },
  'scotland-the-brave': {
    searchTerms: ['Scotland the Brave ocarina tabs', 'Scotland the Brave ocarina notes'],
    background: 'Scotland the Brave is a bold traditional melody that players often search for as a recognizable patriotic or folk-style theme.',
    practice: 'It encourages stronger pulse, cleaner attacks, and confident melodic projection.'
  },
  'song-of-parting': {
    searchTerms: ['Song of Parting ocarina tabs', 'Song of Parting letter notes'],
    background: 'Song of Parting works well as a farewell-style folk melody with a clear vocal contour and strong singable phrasing.',
    practice: 'It is friendly to newer players while still giving room for expressive breath placement.'
  },
  'swan-lake': {
    searchTerms: ['Swan Lake ocarina tabs', 'Swan Lake theme letter notes'],
    background: 'Swan Lake is one of the most recognisable ballet themes, so it consistently attracts players who want a simplified classical melody page.',
    practice: 'It supports graceful phrasing, tone control, and moderate expressive shaping.'
  },
  'the-trout': {
    searchTerms: ['The Trout ocarina tabs', 'Schubert The Trout letter notes'],
    background: 'The Trout is a lively Schubert melody that players often search for as a more melodic classical song theme.',
    practice: 'It gives useful work in light articulation, phrase motion, and moderate classical-style movement.'
  },
  traumerei: {
    searchTerms: ['Traumerei ocarina tabs', 'Traumerei letter notes'],
    background: 'Träumerei is a lyrical Schumann theme with strong search value among players looking for calm, expressive classical melodies.',
    practice: 'It is especially good for tone shaping, quiet dynamics, and longer phrase control.'
  },
  'turkish-march': {
    searchTerms: ['Turkish March ocarina tabs', 'Mozart Turkish March letter notes'],
    background: 'Turkish March is one of Mozart\'s most searched fast themes, making it a strong keyword target for melody-first classical ocarina pages.',
    practice: 'This tune is better suited to players who want crisp rhythm, active finger work, and more energy than a slow lyrical melody.'
  },
  'toy-march': {
    searchTerms: ['Toy March ocarina tabs', 'Toy March letter notes'],
    background: 'Toy March is a compact parade-style melody that works well for players who want something brighter and more rhythmic than a slow folk tune.',
    practice: 'It supports articulation, pulse control, and quicker note changes in a short format.'
  },
  'cavalry-march': {
    searchTerms: ['Cavalry March ocarina tabs', 'Cavalry March letter notes'],
    background: 'Cavalry March is a lively public-domain march tune that fits players searching for upbeat parade-style ocarina music.',
    practice: 'It gives useful work in rhythmic drive, finger timing, and clean attack patterns.'
  },
  'twinkle-variations': {
    searchTerms: ['Twinkle Twinkle Little Star variations ocarina tabs', 'Twinkle variations letter notes'],
    background: 'This variation-style version of the Twinkle melody attracts players who already know the basic tune and want a more advanced melodic reading challenge.',
    practice: 'It gives extra phrase variety and stronger note-reading demands than the base beginner version.'
  },
  'we-wish-you-a-merry-christmas': {
    searchTerms: ['We Wish You a Merry Christmas ocarina tabs', 'We Wish You a Merry Christmas ocarina notes'],
    background: 'We Wish You a Merry Christmas is a high-demand seasonal song for school, family, and holiday group playing, especially when players want a tune they can bring into rehearsal quickly.',
    practice: 'It works well for festive rhythm, familiar sing-along phrasing, and practical December practice sessions.'
  },
  'wedding-march-alt': {
    searchTerms: ['Wedding March ocarina tabs', 'Wedding March letter notes'],
    background: 'This alternate Wedding March setting gives players another readable option for a melody that is frequently searched for ceremonies and celebratory performance use.',
    practice: 'It emphasizes ceremonial pulse, phrase control, and clear note transitions.'
  },
  'wedding-march': {
    searchTerms: ['Wedding March ocarina tabs', 'Mendelssohn Wedding March ocarina notes'],
    background: 'Wedding March is one of the most recognisable ceremonial melodies, so players often search for a quick melody page they can practice for weddings, recitals, and event-style performance.',
    practice: 'It is useful for steady rhythm, phrase confidence, and performance-oriented repetition.'
  },
  'were-you-there': {
    searchTerms: ['Were You There ocarina tabs', 'Were You There ocarina notes'],
    background: 'Were You There is a spiritual melody that players often want in a simple lyrical format for reflective practice, church-style playing, or slower devotional repertoire.',
    practice: 'It is well suited to slow phrasing, breath support, and a more vocal style of tone.'
  },
  'wild-rose': {
    searchTerms: ['Wild Rose ocarina tabs', 'Wild Rose letter notes'],
    background: 'Wild Rose is presented here as a lyrical song melody for players looking for a singable tune rather than a fast technical showpiece.',
    practice: 'It supports expressive phrasing, even tone, and comfortable melodic reading.'
  }
}

export function getSongPresentation(
  song: SongDoc,
  options?: {
    publicLyricsAvailable?: boolean | null
  }
): SongPresentation {
  const title = getDisplaySongTitle(song)
  const family = getSongFamily(song.slug)
  const familyLabel = FAMILY_LABELS[family]
  const profile = getSongSeoProfile(song.slug, title, family)
  const keyLabel = formatKey(song.meta.key)
  const meterLabel = song.meta.meter.trim()
  const tempoLabel = `${song.meta.tempo} BPM`
  const difficultyLabel = getDifficultyLabel(song)
  const lyricsAvailable =
    typeof options?.publicLyricsAvailable === 'boolean'
      ? options.publicLyricsAvailable
      : hasLyrics(song)

  const metaDescription = lyricsAvailable
    ? `Play ${title} with letter notes, a switchable fingering chart, optional numbered notes, and visible lyrics where this public page supports them. Built for players searching for ${profile.searchTerms[0]} and related recorder or tin whistle note views.`
    : `Play ${title} with letter notes, a switchable fingering chart, and optional numbered notes. Built for players searching for ${profile.searchTerms[0]} and related recorder or tin whistle note views.`

  const overview = [
    `Play ${title} with letter notes, a visual fingering chart, and an optional numbered-notes view across the supported ocarina, recorder, and tin whistle variants on this page.`,
    buildSearchIntentSentence({
      familyLabel,
      difficultyLabel,
      searchTerms: profile.searchTerms
    })
  ].join(' ')

  const background = [
    profile.background,
    buildLayoutSentence({
      family,
      lyricsAvailable
    })
  ].join(' ')

  const practiceNotes = [
    `The page is laid out in ${meterLabel} with a reference tempo around ${tempoLabel} and a key center of ${keyLabel}.`,
    getDifficultySentence(difficultyLabel),
    profile.practice,
    buildPracticeSupportSentence({
      family,
      lyricsAvailable,
      difficultyLabel
    })
  ].join(' ')

  /**
   * 首页卡片已经按用户要求收敛为“只显示歌名”，
   * 但详情页仍然需要这批说明文案承担 SEO landing-page 作用。
   *
   * 这里的设计目标不是写乐理长文，而是：
   * - 让每首歌都有一段贴合曲目的英文落地页文案
   * - 让 title / description / 正文能自然覆盖搜索词
   * - 同时保留对练习者真正有用的句子
   */
  const includes = [
    'Letter notes shown by default for fast melody reading',
    'A numbered-notes backup view for cross-checking the same tune',
    'Switchable ocarina, recorder, and tin whistle views on supported songs without leaving the page',
    `Key ${keyLabel} and ${meterLabel} reference points for phrase planning and breath control`,
    lyricsAvailable
      ? 'Aligned lyrics to support sing-through timing and phrase entry'
      : `A clean ${familyLabel.toLowerCase()} layout that stays focused on fingering and tone`
  ]

  const faqs = [
    {
      question: `Can I play ${title} on this page?`,
      answer:
        `Yes. This ${title} page keeps the fingering chart, ${meterLabel} phrase layout, and ${keyLabel} note center easy to follow while letting you switch between the supported ocarina, recorder, and tin whistle views.`
    },
    {
      question: `Which note view should I use for ${title}?`,
      answer: buildNoteViewFaqAnswer({
        family,
        lyricsAvailable,
        difficultyLabel
      })
    },
    {
      question: `What should I focus on when practicing ${title}?`,
      answer: buildPracticeFaqAnswer({
        difficultyLabel,
        lyricsAvailable,
        practice: profile.practice
      })
    }
  ]

  return {
    title,
    subtitle: `${familyLabel} presented in a melody-first layout with letter notes, fingering support, optional numbered notes, and switchable ocarina, recorder, and tin whistle views.`,
    metaDescription,
    overview,
    background,
    practiceNotes,
    includes,
    faqs,
    keyLabel,
    meterLabel,
    tempoLabel,
    familyLabel,
    difficultyLabel
  }
}

function buildSearchIntentSentence(input: {
  familyLabel: string
  difficultyLabel: string
  searchTerms: string[]
}) {
  const familyLabel = input.familyLabel.toLowerCase()
  const difficultyLabel = input.difficultyLabel.toLowerCase()

  return `It is aimed at players searching for ${input.searchTerms[0]} or ${input.searchTerms[1]}, while still keeping a ${difficultyLabel} reading flow for this ${familyLabel} melody.`
}

function buildLayoutSentence(input: {
  family: PublicSongFamily
  lyricsAvailable: boolean
}) {
  if (input.lyricsAvailable) {
    switch (input.family) {
      case 'holiday':
      case 'hymn':
        return 'The layout leaves room for the lyric line while keeping longer sung phrases and fingering changes easy to track on the page.'
      case 'folk':
        return 'The layout leaves room for the lyric line while keeping the melody shape and fingering flow easy to follow across each phrase.'
      default:
        return 'The layout leaves room for the lyric line while keeping the melody shape and fingering flow easy to follow on the page.'
    }
  }

  switch (input.family) {
    case 'classical':
      return 'The layout keeps the melody readable without crowding the phrase shape, so the tune still feels practical to scan away from staff notation.'
    case 'march':
    case 'dance':
      return 'The layout keeps the note groups readable while preserving the rhythmic outline and fingering flow needed for steadier pulse work.'
    default:
      return 'The layout keeps the melody readable while preserving phrase shape and fingering flow for practice without staff notation.'
  }
}

function buildPracticeSupportSentence(input: {
  family: PublicSongFamily
  lyricsAvailable: boolean
  difficultyLabel: string
}) {
  if (input.lyricsAvailable) {
    return 'When lyrics are visible, they stay close to the melody so phrase entry, breath timing, and sing-through practice remain easy to track.'
  }

  if (input.family === 'march' || input.family === 'dance') {
    return 'The melody-first layout keeps attention on pulse, articulation, and clean finger timing.'
  }

  if (input.difficultyLabel === 'Intermediate to advanced') {
    return 'The melody-first layout helps keep technical attention on finger changes, timing, and tone instead of page clutter.'
  }

  return 'The melody-first layout keeps attention on finger changes, timing, and tone.'
}

function buildNoteViewFaqAnswer(input: {
  family: PublicSongFamily
  lyricsAvailable: boolean
  difficultyLabel: string
}) {
  if (input.lyricsAvailable) {
    return 'Letter notes are the default view for faster reading, and numbered notes stay available as a backup option without losing the aligned lyric line.'
  }

  if (input.family === 'classical') {
    return 'Letter notes are usually the faster default for melody reading here, while numbered notes give you a backup check if you want a more number-based reference for the same phrase shapes.'
  }

  if (input.family === 'march' || input.family === 'dance') {
    return 'Letter notes are usually the faster default for pulse-based practice, while numbered notes stay available whenever you want a more familiar number reference.'
  }

  if (input.difficultyLabel === 'Beginner to easy') {
    return 'Letter notes are the quickest way to read the page, while numbered notes stay available as a backup if you learned the tune from number-based materials.'
  }

  return 'Letter notes are the default view for faster reading, and numbered notes stay available as a backup option whenever you want a quick number-based cross-check.'
}

function buildPracticeFaqAnswer(input: {
  difficultyLabel: string
  lyricsAvailable: boolean
  practice: string
}) {
  const lead =
    input.difficultyLabel === 'Beginner to easy'
      ? 'Start by keeping the note labels and fingering chart in view while you settle the phrase shape.'
      : 'Start by locking in the phrase shape before pushing tempo or larger note changes.'
  const ending = input.lyricsAvailable
    ? 'If the lyric line is visible, use it to check phrase entry and breathing points.'
    : 'Use the cleaner melody-only layout to stay focused on timing, fingering, and tone.'

  return `${lead} ${input.practice} ${ending}`
}

function getDisplaySongTitle(song: SongDoc) {
  const override = TITLE_OVERRIDES[song.slug]
  if (override) {
    return override
  }

  if (containsCjk(song.title)) {
    return humanizeSlug(song.slug)
  }

  return song.title
}

function getSongFamily(slug: string): PublicSongFamily {
  const manifestFamily = resolvePublicSongFamily(slug)
  if (manifestFamily) {
    return manifestFamily
  }

  return getLegacySongFamily(slug)
}

function getLegacySongFamily(slug: string): PublicSongFamily {
  if (
    [
      'twinkle-twinkle-little-star',
      'mary-had-a-little-lamb',
      'frere-jacques',
      'london-bridge',
      'old-macdonald',
      'do-your-ears-hang-low',
      'lightly-row',
      'little-bee'
    ].includes(slug)
  ) {
    return 'nursery'
  }

  if (
    [
      'jingle-bells',
      'deck-the-halls',
      'silent-night',
      'we-wish-you-a-merry-christmas',
      'god-rest-you-merry-gentlemen'
    ].includes(slug)
  ) {
    return 'holiday'
  }

  if (
    [
      'amazing-grace',
      'were-you-there'
    ].includes(slug)
  ) {
    return 'hymn'
  }

  if (
    [
      'american-patrol',
      'cavalry-march',
      'toy-march',
      'wedding-march',
      'wedding-march-alt',
      'turkish-march'
    ].includes(slug)
  ) {
    return 'march'
  }

  if (
    [
      'can-can',
      'habanera'
    ].includes(slug)
  ) {
    return 'dance'
  }

  if (
    [
      'ode-to-joy',
      'fur-elise',
      'air-on-the-g-string',
      'canon',
      'flight-of-the-bumblebee',
      'humoresque',
      'minuet-bach',
      'minuet-in-g',
      'moonlight-sonata',
      'on-wings-of-song',
      'schubert-serenade',
      'swan-lake',
      'the-trout',
      'traumerei',
      'twinkle-variations'
    ].includes(slug)
  ) {
    return 'classical'
  }

  if (
    [
      'auld-lang-syne',
      'auld-lang-syne-english',
      'arirang',
      'scarborough-fair',
      'down-by-the-salley-gardens',
      'greensleeves',
      'jasmine-flower',
      'red-river-valley',
      'londonderry-air',
      'long-long-ago',
      'sakura-sakura',
      'santa-lucia',
      'scotland-the-brave',
      'harvest-song',
      'wild-rose',
      'song-of-parting'
    ].includes(slug)
  ) {
    return 'folk'
  }

  return 'song'
}

function getSongSeoProfile(slug: string, title: string, family: PublicSongFamily): SongSeoProfile {
  const profile = SONG_SEO_PROFILES[slug]
  if (profile) {
    return profile
  }

  // 新歌如果暂时没有单独 profile，也不能让页面退化成空泛模板。
  // 这里提供一层按曲目类型生成的兜底 SEO copy，至少保证：
  // - 文案是英文
  // - 搜索词可用
  // - 页面不会因为漏配 profile 而出现中文或业务无关内容
  return {
    searchTerms: [`${title} ocarina tabs`, `${title} letter notes`],
    background: getFallbackBackgroundSentence(family, title),
    practice: getFallbackPracticeSentence(family)
  }
}

function getFallbackBackgroundSentence(family: PublicSongFamily, title: string) {
  switch (family) {
    case 'nursery':
      return `${title} is a familiar nursery song with repeated shapes, so it works naturally as an easy beginner melody page for letter-note reading.`
    case 'holiday':
      return `${title} is a popular holiday melody with strong seasonal search demand for readable melody pages and sing-along note support.`
    case 'hymn':
      return `${title} is commonly played as a lyrical hymn-style melody, which makes it a strong fit for players searching for slower expressive melody reading.`
    case 'march':
      return `${title} has a brighter rhythmic feel than a simple beginner tune, making it useful for players who want a more energetic melody page.`
    case 'dance':
      return `${title} is a dance-driven melody, so players often search for a version that keeps the tune readable without needing staff notation.`
    case 'classical':
      return `${title} is presented as a melody-first classical theme for players who want a clearer route into a famous tune without relying on staff notation.`
    case 'folk':
      return `${title} is a singable folk-style melody that works well for players searching for lyrical melody notes and readable note labels.`
    default:
      return `${title} fits well on a melody-first page for players who want note labels and fingering support in one place.`
  }
}

function getFallbackPracticeSentence(family: PublicSongFamily) {
  switch (family) {
    case 'nursery':
      return 'It is especially friendly for first-note reading, repetition drills, and easy breath changes.'
    case 'holiday':
      return 'It works well for seasonal play-throughs, familiar phrase repetition, and quick rehearsal sessions.'
    case 'hymn':
      return 'It is especially useful for breath support, smooth phrasing, and warm sustained tone.'
    case 'march':
      return 'It gives useful work in pulse, articulation, and confident finger timing.'
    case 'dance':
      return 'It supports stronger rhythm, clearer accents, and more character in the melody line.'
    case 'classical':
      return 'It gives useful practice in phrase control, melodic shaping, and cleaner note transitions.'
    case 'folk':
      return 'It is useful for legato playing, breath planning, and a more vocal melodic style.'
    default:
      return 'It supports practical day-to-day melody practice with readable note labels and fingering support.'
  }
}

function getDifficultyLabel(song: SongDoc) {
  const notationText = song.notation.join(' ')
  const noteCount = (notationText.match(/[1-7]/g) ?? []).length
  const accidentalCount = (notationText.match(/[#b]/g) ?? []).length
  const octaveShiftCount = (notationText.match(/[',]/g) ?? []).length

  // 这是一个面向 SEO 外壳的启发式标签，不是严格演奏考级。
  // 当前规则刻意收紧了 `Intermediate to advanced`：
  // - “篇幅长”不再单独等于 advanced
  // - 需要更明显的速度、升降号密度，或“篇幅 + 技术负担”组合才会进最高档
  const advancedByTempo = song.meta.tempo >= 138
  const advancedByChromaticism = accidentalCount >= 6
  const advancedByDenseFastPassage =
    song.meta.tempo >= 126 && (noteCount >= 110 || octaveShiftCount >= 20)
  const advancedByLongChromaticPiece = noteCount >= 145 && accidentalCount >= 3

  if (
    advancedByTempo ||
    advancedByChromaticism ||
    advancedByDenseFastPassage ||
    advancedByLongChromaticPiece
  ) {
    return 'Intermediate to advanced'
  }

  if (song.meta.tempo >= 116 || noteCount >= 80 || accidentalCount >= 2 || octaveShiftCount >= 16) {
    return 'Intermediate'
  }

  return 'Beginner to easy'
}

function getDifficultySentence(difficultyLabel: string) {
  switch (difficultyLabel) {
    case 'Intermediate to advanced':
      return 'This arrangement asks for steadier breath support, quicker finger changes, or more active note movement than a basic beginner melody.'
    case 'Intermediate':
      return 'This arrangement stays approachable, but it still gives useful practice in phrasing, breath control, and cleaner note changes.'
    default:
      return 'This arrangement is friendly to newer players thanks to its manageable phrase lengths and easy-to-read note flow.'
  }
}

function hasLyrics(song: SongDoc) {
  return Boolean(song.alignedLyrics?.length || song.lyrics?.length)
}

function formatKey(rawKey: string) {
  const normalized = rawKey.replace(/\s+/g, '')
  const match = normalized.match(/1=([#b]?)([A-G])/i)
  if (!match) {
    return rawKey.trim()
  }

  const accidental = match[1] === '#' ? '#' : match[1] === 'b' ? 'b' : ''
  const letter = match[2]!.toUpperCase()
  return `${letter}${accidental}`
}

function humanizeSlug(slug: string) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function containsCjk(value: string) {
  return /[\u3400-\u9fff]/.test(value)
}
