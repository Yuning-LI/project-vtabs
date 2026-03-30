import type { SongDoc } from '@/lib/songbook/types'
import { importedSongCatalog } from './importedCatalog.ts'

/**
 * 曲库主数据文件。
 *
 * 这是当前项目最重要的业务数据入口，交接时需要明确几点：
 *
 * 1. 当前前台稳定真相源是 `notation`
 * - 详情页现在默认渲染字母谱 + 指法图 + 歌词
 * - 这些最终都建立在 notation -> MIDI 这条链路上
 *
 * 2. `abc` 目前是“未来真相源候选”
 * - 不是所有歌曲都有
 * - 有 `abc` 也不代表前台正在直接使用它
 * - 当前它主要用于校验、导入试点、未来迁移准备
 *
 * 3. `lyrics` 必须和当前 notation 的可唱音符槽位严格对齐
 * - 一个真正发声的音符消耗一个歌词 token
 * - hold `-` 不消耗歌词
 * - 这就是为什么歌词不能随便写成自然语言整句后指望前端自动猜
 *
 * 4. 这个文件现在分成两层：
 * - `allSongCatalog`: 仓库内保留的全量候选曲库
 * - `songCatalog`: 当前公开发布的子集
 *
 * 之所以这么做，是因为之前审校后发现有不少歌是片段 / excerpt / opening phrase，
 * 不适合继续公开发布成“完整曲谱”，所以先下线但保留数据，待后续补完整再恢复。
 *
 * 5. 公开曲库顺序仍然具有业务意义
 * - 它不只是数据库导出结果
 * - 首页展示会按手工策展顺序做“高认知/高搜索优先”
 *
 * 6. source 字段当前主要用于内部审计
 * - 前台不展示外链来源
 * - 但项目内部仍保留出处和 rights，方便后续版权自查
 */
export const manualSongCatalog: SongDoc[] = [
  {
    id: 'twinkle',
    slug: 'twinkle-twinkle-little-star',
    title: 'Twinkle, Twinkle, Little Star',
    description:
      'Public-domain melody based on the French air "Ah! vous dirai-je, maman". Beginner-friendly for 12-hole AC ocarina.',
    lyrics: [
      'Twin kle Twin kle lit tle star How I won der what you are',
      'Up a bove the world so high Like a dia mond in the sky',
      'Twin kle Twin kle lit tle star How I won der what you are'
    ],
    source: {
      title: 'Public-domain theme documented in IMSLP variation sources',
      url: 'https://imslp.org/wiki/Ah_vous_dirai_je%2C_maman_%28Cardon%2C_Jean-Baptiste%29',
      rights: 'Public domain source noted by IMSLP',
      note: 'Underlying French air is public-domain; this site uses a fresh lead-melody transcription.'
    },
    meta: {
      key: '1 = C',
      tempo: 100,
      meter: '4/4'
    },
    review: {
      status: 'verified',
      checkedOn: '2026-03-26',
      note: 'Rechecked against the common C-major nursery-rhyme melody.'
    },
    abc: `X:1
T:Twinkle, Twinkle, Little Star
M:4/4
L:1/4
K:C
C C G G | A A G2 | F F E E | D D C2 |
w: Twin kle Twin kle lit tle star _
G G F F | E E D2 | G G F F | E E D2 |
w: How I won der what you are _
C C G G | A A G2 | F F E E | D D C2 |
w: Up a bove the world so high _`,
    tonicMidi: 60,
    notation: [
      '1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 -',
      '5 5 4 4 | 3 3 2 - | 5 5 4 4 | 3 3 2 -',
      '1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 -'
    ]
  },
  {
    id: 'ode-to-joy',
    slug: 'ode-to-joy',
    title: 'Ode to Joy',
    description:
      'Lead melody from Beethoven’s Symphony No. 9, expanded from the Kuailepu reference set into a fuller lightweight instrumental letter-tab page.',
    source: {
      title: 'Beethoven, Symphony No. 9',
      url: 'https://imslp.org/wiki/Symphony_No.9%2C_Op.125_%28Beethoven%2C_Ludwig_van%29',
      rights: 'Public domain work',
      note: 'Current production page is a lightweight adaptation of the Kuailepu reference JSON for the principal melody only.'
    },
    meta: {
      key: '1 = C',
      tempo: 120,
      meter: '4/4'
    },
    review: {
      status: 'verified',
      checkedOn: '2026-03-28',
      note: 'User manually rechecked this fuller Kuailepu-derived page and approved it as correct for launch.'
    },
    tonicMidi: 60,
    notation: [
      '3 3 4 5 5 4 3 2 1 1 2 3 3 2 2',
      '3 3 4 5 5 4 3 2 1 1 2 3 2 1 1',
      '2 2 3 1 2 3 4 3 1 2 3 4 3 2',
      '1 2 5, 3 3 3 4 5 5 4 3 4 2',
      '1 1 2 3 2 1 1'
    ]
  },
  {
    id: 'amazing-grace',
    slug: 'amazing-grace',
    title: 'Amazing Grace',
    description:
      'Traditional hymn melody "New Britain", expanded from the Kuailepu reference set into a fuller instrumental practice page.',
    source: {
      title: 'Amazing Grace (Anonymous) on IMSLP',
      url: 'https://imslp.org/wiki/Amazing_Grace_%28Anonymous%29',
      rights: 'Public domain source listed by IMSLP',
      note: 'Current production page is a lightweight adaptation of the Kuailepu reference JSON and is currently surfaced as an instrumental melody page.'
    },
    meta: {
      key: '1 = F',
      tempo: 80,
      meter: '3/4'
    },
    review: {
      status: 'verified',
      checkedOn: '2026-03-28',
      note: 'User manually rechecked this Kuailepu-derived instrumental page and confirmed the melody is correct for launch.'
    },
    tonicMidi: 65,
    notation: [
      '1 4',
      '4 6 5 4',
      '6 5',
      '4 2',
      '1 1 4',
      '4 6 5 4',
      '6 5 6',
      '1\'',
      '1\' 6 1\'',
      '1\' 6 5 4',
      '6 5',
      '4 2',
      '1 1 4',
      '4 6 5 4',
      '6 5',
      '4',
      '4'
    ]
  },
  {
    id: 'mary-lamb',
    slug: 'mary-had-a-little-lamb',
    title: 'Mary Had a Little Lamb',
    description:
      'Classic nursery melody in a very compact numbered format, suitable for first-time players.',
    lyrics: [
      'Ma ry had a lit tle lamb lit tle lamb lit tle lamb',
      'Ma ry had a lit tle lamb its fleece was white as snow'
    ],
    abc: `X:1
T:Mary Had a Little Lamb
M:4/4
L:1/4
K:C
E D C D | E E E2 | D D D2 | E G G2 |
w: Ma ry had a lit tle lamb _ _ _
E D C D | E E E E | D D E D | C4 |
w: Ma ry had a lit tle lamb its fleece was white as snow`,
    source: {
      title: 'Public-domain nursery rhyme tradition',
      url: 'https://www.loc.gov/item/2016766456/',
      rights: 'Historical Library of Congress music record',
      note: 'This site uses a fresh lead-melody transcription rather than the scanned score edition.'
    },
    meta: {
      key: '1 = C',
      tempo: 110,
      meter: '4/4'
    },
    review: {
      status: 'verified',
      checkedOn: '2026-03-26',
      note: 'Rechecked against the standard American classroom melody.'
    },
    tonicMidi: 60,
    notation: [
      '3 2 1 2 | 3 3 3 - | 2 2 2 - | 3 5 5 -',
      '3 2 1 2 | 3 3 3 3 | 2 2 3 2 | 1 - - -'
    ]
  },
  {
    id: 'happy-birthday',
    slug: 'happy-birthday-to-you',
    title: 'Happy Birthday to You',
    description:
      'A globally recognized celebratory melody, kept here as a melody-first public-domain lead line with lyrics.',
    lyrics: [
      'Hap py birth day to you Hap py birth day to you',
      'Hap py birth day dear friend _ Hap py birth day to you'
    ],
    abc: `X:1
T:Happy Birthday to You
M:3/4
L:1/4
K:C
G G A G c B | G G A G d c |
w: Hap py birth day to you Hap py birth day to you
G G g e c B A | f f e c d c |
w: Hap py birth day dear friend _ Hap py birth day to you`,
    source: {
      title: 'Happy Birthday legal status as public domain in the United States',
      url: 'https://en.wikipedia.org/wiki/Happy_Birthday_to_You',
      rights: 'Public domain in the United States',
      note: 'Stored internally for rights audit only.'
    },
    meta: {
      key: '1 = C',
      tempo: 90,
      meter: '3/4'
    },
    review: {
      status: 'verified',
      checkedOn: '2026-03-26',
      note: 'Corrected and rechecked against the standard public-domain melody.'
    },
    tonicMidi: 60,
    notation: [
      '5 5 6 5 1\' 7 | 5 5 6 5 2\' 1\'',
      '5 5 5\' 3\' 1\' 7 6 | 4\' 4\' 3\' 1\' 2\' 1\''
    ]
  },
  {
    id: 'jingle-bells',
    slug: 'jingle-bells',
    title: 'Jingle Bells',
    description:
      'James Pierpont’s public-domain holiday standard, expanded from the Kuailepu reference JSON so the production detail page shows the fuller melody instead of the short excerpt.',
    alignedLyrics: [
      "Dash ing through the snow In a one horse o pen sleigh O'er the fields we go",
      'Laug hing all the way _ Bells on bob tails ring Mak ing spir its bright What',
      'fun it is to laugh and sing A sleig hing song to night jin gle bells, jin gle bells',
      'Jin gle all the way Oh, what fun it is to ride In a one horse o pen sleigh _',
      'Jin gle bells, jin gle bells Jin gle all the way Oh, what fun it is to ride In a',
      'one horse o pen sleigh'
    ],
    extraLyrics: [
      "A day or two ago, I thought I'd take a ride, and soon Miss Fanny Bright was seated by my side; the horse was lean and lank, misfortune seemed his lot, we got into a drifted bank, and then we got upsot."
    ],
    source: {
      title: 'Jingle Bells at the Library of Congress',
      url: 'https://www.loc.gov/item/2023838067/',
      rights: 'Library of Congress public domain item',
      note: 'Current production page is a lightweight adaptation of the Kuailepu reference JSON so the fuller verse-and-chorus page can be shown without copying engraved notation.'
    },
    meta: {
      key: '1 = F',
      tempo: 126,
      meter: '4/4'
    },
    review: {
      status: 'verified',
      checkedOn: '2026-03-28',
      note: 'User rechecked this fuller Kuailepu-derived page and confirmed the melody is correct.'
    },
    tonicMidi: 65,
    notation: [
      '5, 3 2 1 5, 5, 5, 5, 3 2 1 6, 6, 4 3 2 7,',
      '5 5 4 2 3 1 5, 3 2 1 5, 5, 3 2 1 6, 6,',
      '6, 4 3 2 5 5 5 5 6 5 4 2 1 3 3 3 3 3 3',
      '3 5 1 2 3 4 4 4 4 4 3 3 3 3 3 2 2 1 2 5',
      '3 3 3 3 3 3 3 5 1 2 3 4 4 4 4 4 3 3 3 3',
      '5 5 4 2 1'
    ]
  },
  {
    id: 'aura-lea',
    slug: 'aura-lea',
    title: 'Aura Lea',
    published: false,
    description:
      '1861 ballad melody by George R. Poulton, reduced to a clean numbered lead sheet for ocarina practice.',
    lyrics: [
      'When the black bird in the spring on the wil low tree',
      'Sat and rocked I heard him sing ing Au ra Lea'
    ],
    source: {
      title: 'Aura Lea (Poulton, George R.) on IMSLP',
      url: 'https://imslp.org/wiki/Aura_Lea_%28Poulton%2C_George_R.%29',
      rights: 'Public-domain historical sources listed on IMSLP',
      note: 'This version keeps only the lead melody and re-encodes it into site-native notation.'
    },
    meta: {
      key: '1 = C',
      tempo: 96,
      meter: '4/4'
    },
    tonicMidi: 60,
    notation: [
      '1 1 2 3 | 4 - - 4 | 3 3 4 5 | 6 - - 6',
      '5 5 6 7 | 1\' - - 1\' | 7 6 5 4 | 3 - - -'
    ]
  },
  {
    id: 'scarborough-fair',
    slug: 'scarborough-fair',
    title: 'Scarborough Fair',
    description:
      'Traditional English ballad melody imported from the Kuailepu reference set and simplified into the current lightweight letter-tab format for review.',
    alignedLyrics: [
      'Are you going _ _ to scar bo rough fair _',
      'Par sley sage rose ma ry and thyme _',
      'Re mem ber me to one who lives there _ _',
      'She once was a true love of mine _'
    ],
    source: {
      title: 'Scarborough Fair',
      url: 'https://en.wikipedia.org/wiki/Scarborough_Fair',
      rights: 'Traditional English ballad; public-domain melody tradition',
      note: 'Current catalog entry is a lightweight production adaptation derived from the Kuailepu reference JSON and still awaits final melody confirmation.'
    },
    meta: {
      key: '1 = F',
      tempo: 84,
      meter: '3/4'
    },
    review: {
      status: 'verified',
      checkedOn: '2026-03-28',
      note: 'User manually rechecked this Kuailepu-derived page and approved it as correct for launch.'
    },
    tonicMidi: 65,
    notation: [
      '6, 6, | 3 3 3 3 | 7, 1 7, | 6, | 6,',
      '3 5 | 6 5 | 3 #4 2 | 3 | 3',
      '6 | 6 6 | 5 3 | 3 2 1 | 7, 5, 5,',
      '6, 3 | 2 1 | 7, 6, 5, | 6, | 6,'
    ]
  },
  {
    id: 'auld-lang-syne',
    slug: 'auld-lang-syne',
    title: 'Auld Lang Syne',
    description:
      'Traditional Scottish tune refreshed against the Kuailepu reference melody while keeping the site-native lightweight letter-tab presentation.',
    alignedLyrics: [
      'Should old ac quaint ance be for got, and',
      'nev er brought to mind? Should _ old ac quaint ance',
      'be for got, and days of auld lang syne? For auld _ lang _',
      "syne, my dear, for auld _ lang _ syne, we'll take a cup of",
      'kind ness yet, for auld _ lang _ syne.'
    ],
    source: {
      title: 'Auld lang syne (Folk Songs, Scottish) on IMSLP',
      url: 'https://imslp.org/wiki/Auld_lang_syne_%28Folk_Songs%2C_Scottish%29',
      rights: 'Traditional tune with public-domain publication history',
      note: 'Current production melody was rechecked against the Kuailepu reference JSON, then simplified back into the site-native lightweight token format.'
    },
    meta: {
      key: '1 = F',
      tempo: 100,
      meter: '2/4'
    },
    review: {
      status: 'verified',
      checkedOn: '2026-03-28',
      note: 'Meter corrected to 2/4 and melody refreshed against the Kuailepu reference while keeping punctuation-safe aligned lyrics.'
    },
    tonicMidi: 65,
    notation: [
      '5, | 1 1 1 3 | 2 1 2 3',
      '1 1 3 5 | 6 6 6 | 5 3 3 1',
      '2 1 2 3 | 1 6, 6, 5, | 1 6 | 5 3 3 1',
      '2 1 2 6 | 5 3 3 5 | 6 1\' | 5 3 3 1',
      '2 1 2 3 | 1 6, 6, 5, | 1'
    ]
  },
  {
    id: 'sakura',
    slug: 'sakura-sakura',
    title: 'Sakura Sakura',
    published: false,
    description:
      'Traditional Japanese folk song, presented here as numbered notation and mapped fingering for 12-hole AC ocarina.',
    source: {
      title: 'Sakura Sakura (Folk Songs, Japanese) on IMSLP',
      url: 'https://imslp.org/wiki/Sakura_Sakura_%28Folk_Songs%2C_Japanese%29',
      rights: 'Traditional melody noted by IMSLP',
      note: 'This site uses a fresh melody-only transcription; modern engraved arrangements are not reused.'
    },
    meta: {
      key: '1 = C',
      tempo: 88,
      meter: '3/4'
    },
    review: {
      status: 'pending',
      checkedOn: '2026-03-26',
      note: 'Current notation does not yet match the traditional Sakura in-scale melody closely enough.'
    },
    tonicMidi: 60,
    notation: [
      '1 1 2 3 | 2 1 2 | 3 4 5 | 4 - -',
      '3 4 5 | 6 5 6 | 7 1\' 2\' | 1\' - -',
      '1\' 7 1\' | 6 5 4 | 3 5 3 | 2 - -'
    ]
  },
  {
    id: 'silent-night',
    slug: 'silent-night',
    title: 'Silent Night',
    description:
      'One of the most widely recognized Christmas melodies in the English-speaking world, kept here as a clean melody line for quick practice.',
    lyrics: [
      'Silent night, holy night',
      'All is calm, all is bright',
      'Round yon Virgin, mother and child',
      'Holy infant so tender and mild',
      'Sleep in heavenly peace',
      'Sleep in heavenly peace'
    ],
    alignedLyrics: [
      'Si _ lent night ho _ ly night',
      'all is calm all is bright',
      'Round yon vir gin mo ther and child _',
      'Ho ly in fant so ten der and mild',
      'Sleep _ in hea ven ly peace',
      'Sleep _ in hea ven ly peace'
    ],
    source: {
      title: 'Stille Nacht, heilige Nacht, H.145 (Gruber, Franz Xaver) on IMSLP',
      url: 'https://imslp.org/wiki/Stille_Nacht%2C_heilige_Nacht_%28Gruber%2C_Franz_Xaver%29',
      rights: 'Public domain source listed by IMSLP',
      note: 'Public-domain carol; stored internally for rights audit only.'
    },
    meta: {
      key: '1 = F',
      tempo: 76,
      meter: '6/8'
    },
    review: {
      status: 'verified',
      checkedOn: '2026-03-26',
      note: 'Melody and lyric placement rechecked against the common contemporary version; tonic stays at F.'
    },
    tonicMidi: 65,
    notation: [
      '5 6 5 3 | 5 6 5 3',
      '2\' 2\' 7 | 1\' 1\' 5 -',
      '6 6 1\' 7 | 6 5 6 5 3',
      '6 6 1\' 7 | 6 5 6 5 3',
      '2\' 2\' 4\' 2\' | 7 1\' 3\' -',
      '1\' 5 3 5 | 4 2 1 -'
    ]
  },
  {
    id: 'brahms-lullaby',
    slug: 'brahms-lullaby',
    title: "Brahms' Lullaby",
    published: false,
    description:
      'A high-recognition lullaby melody from Brahms, simplified to a melody-first lead line suitable for 12-hole AC ocarina.',
    lyrics: [
      'Lul la by and good night with ro ses bed of white _',
      'With lil ies o er spread is ba bys wee bed _'
    ],
    source: {
      title: '5 Lieder, Op.49 (Brahms, Johannes) on IMSLP',
      url: 'https://imslp.org/wiki/5_Lieder%2C_Op.49_%28Brahms%2C_Johannes%29',
      rights: 'Public domain source listed by IMSLP',
      note: 'Public-domain melody; stored internally for rights audit only.'
    },
    meta: {
      key: '1 = C',
      tempo: 72,
      meter: '3/4'
    },
    review: {
      status: 'pending',
      checkedOn: '2026-03-28',
      note: 'User flagged this melody as incorrect; keep it out of the verified group until the Kuailepu reference version is imported and rechecked.'
    },
    tonicMidi: 60,
    notation: [
      '5 5 6 5 | 1\' 7 5 - | 5 5 6 5 | 2\' 1\' - -',
      '5 5 5 3 | 5 4 3 - | 2 2 4 2 | 1 - - -'
    ]
  },
  {
    id: 'fur-elise',
    slug: 'fur-elise',
    title: 'Für Elise',
    published: false,
    description:
      'Beethoven’s iconic piano theme, reduced to its best-known opening phrase so it remains playable and recognizable on ocarina.',
    source: {
      title: 'Für Elise, WoO 59 (Beethoven, Ludwig van) on IMSLP',
      url: 'https://imslp.org/wiki/F%C3%BCr_Elise%2C_WoO_59_%28Beethoven%2C_Ludwig_van%29',
      rights: 'Public domain work',
      note: 'Public-domain theme; stored internally for rights audit only.'
    },
    meta: {
      key: '1 = C',
      tempo: 108,
      meter: '3/8'
    },
    tonicMidi: 60,
    notation: [
      '3 #2 3 #2 3 7 2 1 | 6, - 0 1 3 6 7 -',
      '3 #2 3 #2 3 7 2 1 | 6, - 0 1 2 7 6 -'
    ]
  },
  {
    id: 'blue-danube',
    slug: 'the-blue-danube',
    title: 'The Blue Danube',
    published: false,
    description:
      'The best-known Strauss waltz theme, trimmed to a compact melodic excerpt for a lightweight launch catalog.',
    source: {
      title: 'The Blue Danube, Op.314 (Strauss Jr., Johann) on IMSLP',
      url: 'https://imslp.org/wiki/The_Blue_Danube%2C_Op.314_%28Strauss_Jr.%2C_Johann%29',
      rights: 'Public domain work',
      note: 'Public-domain theme; stored internally for rights audit only.'
    },
    meta: {
      key: '1 = C',
      tempo: 120,
      meter: '3/4'
    },
    tonicMidi: 60,
    notation: [
      '5 5 3 1 | 1 2 3 - | 5 5 3 1 | 2 3 4 -',
      '5 6 7 1\' | 7 6 5 - | 4 5 6 4 | 3 2 1 -'
    ]
  },
  {
    id: 'home-sweet-home',
    slug: 'home-sweet-home',
    title: 'Home! Sweet Home!',
    published: false,
    description:
      'A 19th-century melody that remains highly recognizable in English-speaking music culture and works well as an ocarina lead line.',
    source: {
      title: 'Home Sweet Home, Op.103 (Terschak, Adolf) on IMSLP',
      url: 'https://imslp.org/wiki/Home_Sweet_Home%2C_Op.103_%28Terschak%2C_Adolf%29',
      rights: 'Public domain source listed by IMSLP',
      note: 'Underlying melody is public-domain; stored internally for rights audit only.'
    },
    meta: {
      key: '1 = C',
      tempo: 92,
      meter: '4/4'
    },
    tonicMidi: 60,
    notation: [
      '5 3 2 1 | 1 2 3 - | 5 3 2 1 | 2 1 - -',
      '3 4 5 6 | 5 4 3 - | 5 3 2 1 | 2 1 - -'
    ]
  },
  {
    id: 'yankee-doodle',
    slug: 'yankee-doodle',
    title: 'Yankee Doodle',
    published: false,
    description:
      'A standard American traditional tune with strong recognition and a melody shape that fits beginner ocarina nicely.',
    source: {
      title: 'Yankee Doodle (Krogulski, Józef Władysław) on IMSLP',
      url: 'https://imslp.org/wiki/Yankee_Doodle_%28Krogulski%2C_J%C3%B3zef_W%C5%82adys%C5%82aw%29',
      rights: 'Traditional/public-domain source listed by IMSLP',
      note: 'Traditional tune; stored internally for rights audit only.'
    },
    meta: {
      key: '1 = C',
      tempo: 116,
      meter: '4/4'
    },
    tonicMidi: 60,
    notation: [
      '5 5 6 1\' | 5 1\' 6 5 | 3 5 5 4 | 3 2 1 -',
      '5 5 6 1\' | 5 1\' 6 5 | 3 4 3 2 | 1 - - -'
    ]
  },
  {
    id: 'can-can',
    slug: 'can-can',
    title: 'Can-Can',
    published: false,
    description:
      'The Galop infernal theme from Offenbach’s Orphée aux enfers, reduced to a punchy melody line that is instantly recognizable.',
    source: {
      title: 'Orphée aux enfers (Offenbach, Jacques) on IMSLP',
      url: 'https://imslp.org/wiki/Orph%C3%A9e_aux_enfers_%28Offenbach%2C_Jacques%29',
      rights: 'Public domain work and public-domain selections listed by IMSLP',
      note: 'Public-domain theme; stored internally for rights audit only.'
    },
    meta: {
      key: '1 = C',
      tempo: 152,
      meter: '2/4'
    },
    tonicMidi: 60,
    notation: [
      '5 5 5 6 | 5 4 3 2 | 1 1 1 2 | 3 - - -',
      '5 5 5 6 | 5 4 3 2 | 5 4 3 2 | 1 - - -'
    ]
  },
  {
    id: 'la-donna-e-mobile',
    slug: 'la-donna-e-mobile',
    title: 'La donna è mobile',
    published: false,
    description:
      'One of opera’s most recognizable melodies, included here as a melody-only public-domain excerpt for launch breadth.',
    source: {
      title: 'Rigoletto (Verdi, Giuseppe) on IMSLP',
      url: 'https://imslp.org/wiki/Rigoletto_%28Verdi%2C_Giuseppe%29',
      rights: 'Public domain work; public-domain aria score listed by IMSLP',
      note: 'Public-domain aria theme; stored internally for rights audit only.'
    },
    meta: {
      key: '1 = C',
      tempo: 126,
      meter: '3/8'
    },
    tonicMidi: 60,
    notation: [
      '5 5 6 5 | 4 3 2 - | 5 5 6 5 | 4 3 2 -',
      '3 3 4 5 | 6 5 4 - | 5 4 3 2 | 1 - - -'
    ]
  },
  {
    id: 'joy-to-the-world',
    slug: 'joy-to-the-world',
    title: 'Joy to the World',
    published: false,
    description:
      'A major English-language Christmas standard with broad seasonal search demand, encoded here as a melody-only public-domain tune.',
    lyrics: [
      'Joy to the world the Lord is come let earth receive her King',
      'And hea ven and na ture sing _ _ _ _'
    ],
    source: {
      title: 'Joy to the World (Mason, Lowell) on IMSLP',
      url: 'https://imslp.org/wiki/Joy_to_the_World_%28Mason%2C_Lowell%29',
      rights: 'First publication 1839; public-domain work',
      note: 'Public-domain carol; stored internally for rights audit only.'
    },
    meta: {
      key: '1 = C',
      tempo: 112,
      meter: '4/4'
    },
    tonicMidi: 60,
    notation: [
      '5 4 3 2 | 1 - - - | 6 7 1\' 1\' | 1\' 7 6 5',
      '5 4 3 2 | 1 - - - | 5 5 4 3 | 2 - 1 -'
    ]
  },
  {
    id: 'battle-hymn',
    slug: 'battle-hymn-of-the-republic',
    title: 'Battle Hymn of the Republic',
    published: false,
    description:
      'A very recognizable American hymn tune with strong cultural familiarity, included as a public-domain melody excerpt.',
    source: {
      title: 'Battle Hymn of the Republic (Howe, Julia Ward) on IMSLP',
      url: 'https://imslp.org/wiki/Battle_Hymn_of_the_Republic_%28Howe%2C_Julia_Ward%29',
      rights: '1898 public-domain score listed by IMSLP',
      note: 'Public-domain hymn tune; stored internally for rights audit only.'
    },
    meta: {
      key: '1 = C',
      tempo: 104,
      meter: '4/4'
    },
    tonicMidi: 60,
    notation: [
      '5 - 5 5 | 6 5 4 - | 3 - 4 5 | 6 - - -',
      '5 - 5 5 | 6 5 4 - | 3 4 3 2 | 1 - - -'
    ]
  },
  {
    id: 'camptown-races',
    slug: 'camptown-races',
    title: 'Camptown Races',
    published: false,
    description:
      'A Stephen Foster standard with durable recognition in the US and a melody contour that works well for quick ocarina practice.',
    source: {
      title: 'De Camptown Races (Foster, Stephen) on IMSLP',
      url: 'https://imslp.org/wiki/De_Camptown_Races_%28Foster%2C_Stephen%29',
      rights: '1850 public-domain score listed by IMSLP',
      note: 'Public-domain song; stored internally for rights audit only.'
    },
    meta: {
      key: '1 = C',
      tempo: 124,
      meter: '4/4'
    },
    tonicMidi: 60,
    notation: [
      '5 5 5 3 | 5 6 5 3 | 5 5 6 5 | 3 2 1 -',
      '3 3 4 5 | 6 5 4 3 | 5 5 6 5 | 3 2 1 -'
    ]
  }
]

export const allSongCatalog: SongDoc[] = dedupeSongCatalog([
  ...manualSongCatalog,
  ...importedSongCatalog
])

export const songCatalog: SongDoc[] = allSongCatalog.filter(song => song.published !== false)
export const songCatalogMap = Object.fromEntries(songCatalog.map(song => [song.id, song]))
export const songCatalogBySlug = Object.fromEntries(songCatalog.map(song => [song.slug, song]))

function dedupeSongCatalog(songs: SongDoc[]) {
  const byKey = new Map<string, SongDoc>()
  const order: string[] = []

  songs.forEach(song => {
    const key = `${song.id}::${song.slug}`
    const existing = byKey.get(key)

    if (!existing) {
      byKey.set(key, song)
      order.push(key)
      return
    }

    const existingPublished = existing.published !== false
    const nextPublished = song.published !== false

    /**
     * 允许后出现的公开版本覆盖前面的未发布占位版本。
     *
     * 当前最典型的场景是：
     * - catalog.ts 里保留了一个老的手工候选，`published: false`
     * - 后面又从快乐谱详情页导入了同 id / slug 的正式候选，并准备公开
     *
     * 如果仍然简单“先到先得”，新的快乐谱版本会被旧占位条目挡住，
     * 用户就会看到“明明导入成功，但页面没有上线”的假象。
     */
    if (!existingPublished && nextPublished) {
      byKey.set(key, song)
    }
  })

  return order.map(key => byKey.get(key)).filter((song): song is SongDoc => Boolean(song))
}
