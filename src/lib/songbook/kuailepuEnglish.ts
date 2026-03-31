import type { KuailepuSongPayload } from './kuailepuImport'

const SONG_TITLE_OVERRIDES: Record<string, { title: string; subtitle?: string }> = {
  jyz9m1QbT: { title: 'Wedding March', subtitle: 'Wagner version' },
  XhcVa141a: { title: 'Wedding March' },
  MQ31c1qft: { title: 'Greensleeves', subtitle: 'Green Sleeves' },
  NGp2r1Esl: { title: 'Amazing Grace' },
  nLqmn131u: { title: 'Moonlight Sonata' },
  leoVi11R5: { title: 'Minuet in G' },
  QYh5k1zWp: { title: 'Habanera' },
  eyXcb1YDq: { title: 'Humoresque' },
  vvR5j1vMJ: { title: 'Träumerei' },
  yvjbe1gkl: { title: 'Flight of the Bumblebee' },
  '234Vk16sK': { title: 'Swan Lake' },
  mnV7k1in4: { title: 'Wild Rose' },
  Gjs5c1R36: { title: 'Minuet' },
  '43XNs17ST': { title: 'Santa Lucia' },
  '7eFrk1orh': { title: 'Silent Night', subtitle: 'English lyrics version' },
  VEFrk1UfL: { title: 'Jingle Bells', subtitle: 'English lyrics version' },
  '6UpWn1VdH': { title: 'Auld Lang Syne', subtitle: 'English lyrics version' },
  XegMl1jUW: { title: 'Old Folks at Home' },
  Nc4Dm1XGe: { title: 'On Wings of Song' },
  EUgXg1ts6: { title: 'Scotland the Brave' },
  wa6qi1un1: { title: 'Home Sweet Home' },
  au1xe1clc: { title: 'Long Long Ago' },
  HJczl1Q9t: { title: 'Air on the G String' },
  xvGha1N7l: { title: 'Down By the Salley Gardens' },
  DtfPo1qgX: { title: 'Were You There' },
  T1Zpa1JnI: { title: 'God Rest You Merry, Gentlemen' }
}

const SONG_PINYIN_TITLE_OVERRIDES: Record<string, { title: string; subtitle?: string }> = {
  hunlijinxingqu: { title: 'Wedding March', subtitle: 'Wagner version' },
  lvxiuzi: { title: 'Greensleeves' },
  huanlesong: { title: 'Ode to Joy' },
  turqijinxingqu: { title: 'Turkish March' },
  yueguangzoumingqu: { title: 'Moonlight Sonata' },
  gdadiaoxiaobuwuqu: { title: 'Minuet in G' },
  habanielawuqu: { title: 'Habanera' },
  youmoqu: { title: 'Humoresque' },
  menghuanqu: { title: 'Träumerei' },
  yefengfeiwu: { title: 'Flight of the Bumblebee' },
  tianehu: { title: 'Swan Lake' },
  yemeigui: { title: 'Wild Rose' },
  xiaobuwuqu: { title: 'Minuet' },
  guxiangdeqinren: { title: 'Old Folks at Home' },
  chengzhegeshengdechibang: { title: 'On Wings of Song' },
  silentnightholynight: { title: 'Silent Night', subtitle: 'English lyrics version' },
  sugelanyongshi: { title: 'Scotland the Brave' },
  keaidejia: { title: 'Home Sweet Home' },
  duonianyiqian: { title: 'Long Long Ago' },
  gxianshangdeyongtandiao: { title: 'Air on the G String' },
  aierlanhuameishalihuayuan: { title: 'Down By the Salley Gardens' },
  wereyouthere: { title: 'Were You There' },
  tiancihuanle: { title: 'God Rest You Merry, Gentlemen' }
}

const PERSON_NAME_OVERRIDES: Record<string, string> = {
  瓦格纳: 'Richard Wagner',
  贝多芬: 'Ludwig van Beethoven',
  舒伯特: 'Franz Schubert',
  '【奥】舒伯特': 'Franz Schubert',
  门德尔松: 'Felix Mendelssohn',
  莫扎特: 'Wolfgang Amadeus Mozart',
  '【德】巴赫': 'Johann Sebastian Bach',
  巴赫: 'Johann Sebastian Bach',
  帕赫贝尔: 'Johann Pachelbel',
  舒曼: 'Robert Schumann',
  可可老师: 'Keke Studio',
  'Antonin Dvork': 'Antonín Dvořák'
}

const INSTRUMENT_NAME_OVERRIDES: Record<string, string> = {
  '简谱(无图谱)': 'Numbered notation only',
  六孔陶笛: '6-hole ocarina',
  十二孔陶笛: '12-hole ocarina',
  三管陶笛: 'Triple ocarina',
  六筒陶笛APP: '6-tube ocarina app',
  英式八孔竖笛: 'English 8-hole recorder',
  德式八孔竖笛: 'German 8-hole recorder',
  八孔埙: '8-hole xun',
  十孔埙: '10-hole xun',
  合埙: 'He-xun',
  八孔箫: '8-hole xiao',
  七孔葫芦丝: '7-hole hulusi',
  九孔葫芦丝: '9-hole hulusi'
}

const GRAPH_NAME_OVERRIDES: Record<string, string> = {
  '吹口在下（推荐）': 'Mouthpiece down (Recommended)',
  '吹口在上（推荐）': 'Mouthpiece up (Recommended)'
}

const FINGERING_NAME_OVERRIDES: Record<string, string> = {
  F调指法: 'F fingering',
  G调指法: 'G fingering',
  C调指法: 'C fingering',
  D调指法: 'D fingering',
  bB调指法: 'Bb fingering',
  bE调指法: 'Eb fingering'
}

export function getKuailepuEnglishTitle(payload: Pick<KuailepuSongPayload, 'song_uuid' | 'song_pinyin' | 'song_name' | 'alias_name'>) {
  const byUuid = payload.song_uuid ? SONG_TITLE_OVERRIDES[payload.song_uuid] : undefined
  if (byUuid) return byUuid

  const byPinyin = payload.song_pinyin ? SONG_PINYIN_TITLE_OVERRIDES[payload.song_pinyin] : undefined
  if (byPinyin) return byPinyin

  const songName = pickEnglishCandidate(payload.song_name, payload.alias_name)
  const aliasName = pickEnglishCandidate(payload.alias_name)

  return {
    title: songName || payload.song_name || 'Untitled Song',
    subtitle: aliasName && aliasName !== songName ? aliasName : undefined
  }
}

export function translateKuailepuPersonName(value: string | null | undefined) {
  if (!value) return null
  return PERSON_NAME_OVERRIDES[value] ?? value
}

export function translateKuailepuInstrumentName(value: string | null | undefined) {
  if (!value) return null
  return INSTRUMENT_NAME_OVERRIDES[value] ?? value
}

export function translateKuailepuGraphName(value: string | null | undefined) {
  if (!value) return null
  return GRAPH_NAME_OVERRIDES[value] ?? value
}

export function translateKuailepuFingeringName(value: string | null | undefined) {
  if (!value) return null
  return FINGERING_NAME_OVERRIDES[value] ?? value
}

export function englishEditorialNoteFromComment(commentText: string) {
  if (!commentText.trim()) {
    return 'No English editorial note has been added for this song yet.'
  }

  if (containsCjk(commentText)) {
    return 'Reference notes exist in the captured Kuailepu raw JSON. An English editorial summary has not been written yet.'
  }

  return commentText
}

function pickEnglishCandidate(...values: Array<string | null | undefined>) {
  return values
    .map(value => value?.trim() ?? '')
    .find(value => value.length > 0 && /[A-Za-z]/.test(value))
}

function containsCjk(value: string) {
  return /[\u3400-\u9fff]/.test(value)
}
