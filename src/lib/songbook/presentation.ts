import { resolvePublicSongFamily } from './publicManifest.ts'
import { getSongSeoProfileEntry, type SongSeoProfile } from './seoProfiles.ts'
import type { PublicSongFamily, SongDoc } from './types'

export type SongPresentation = {
  title: string
  aliases: string[]
  metaTitle: string | null
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
  const aliases = profile.aliases ?? []
  const lyricsAvailable =
    typeof options?.publicLyricsAvailable === 'boolean'
      ? options.publicLyricsAvailable
      : hasLyrics(song)

  const metaDescriptionBase = lyricsAvailable
    ? `Play ${title} with letter notes, a switchable fingering chart, optional numbered notes, and visible lyrics where this public page supports them. Built for players searching for ${profile.searchTerms[0]} and related recorder or tin whistle note views.`
    : `Play ${title} with letter notes, a switchable fingering chart, and optional numbered notes. Built for players searching for ${profile.searchTerms[0]} and related recorder or tin whistle note views.`
  const metaDescription = [
    metaDescriptionBase,
    aliases.length > 0 ? `Also known as ${formatAliasList(aliases)}.` : ''
  ]
    .filter(Boolean)
    .join(' ')

  const overview = [
    `Play ${title} with letter notes, a visual fingering chart, and an optional numbered-notes view across the supported ocarina, recorder, and tin whistle variants on this page.`,
    aliases.length > 0 ? `${title} is also commonly searched as ${formatAliasList(aliases)}.` : '',
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
    },
    ...(aliases.length > 0
      ? [
          {
            question: `Is ${title} also known as ${formatAliasList(aliases)}?`,
            answer: `Yes. Players often search for this melody under ${formatAliasList(aliases)}, but this page keeps the same tune under the title ${title} while preserving the same letter-note, numbered-note, and fingering support layout.`
          }
        ]
      : [])
  ]

  return {
    title,
    aliases,
    metaTitle: profile.metaTitle ?? null,
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

function formatAliasList(aliases: string[]) {
  if (aliases.length <= 1) {
    return aliases[0] ?? ''
  }

  if (aliases.length === 2) {
    return `${aliases[0]} and ${aliases[1]}`
  }

  return `${aliases.slice(0, -1).join(', ')}, and ${aliases[aliases.length - 1]}`
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
  const profile = getSongSeoProfileEntry(slug)
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
    aliases: [],
    metaTitle: null,
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
