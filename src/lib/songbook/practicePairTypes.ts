export type PracticePairCard = {
  slug: string
  href: string
  title: string
  familyLabel: string
  difficultyLabel: string
  keyLabel: string
  meterLabel: string
  hasPublicLyrics: boolean
  supportedInstrumentIds: string[]
  reason: string
}

export type PracticePairSuggestions = {
  items: PracticePairCard[]
}

export type PracticePairSeed = {
  slug: string
  reason: string
}

export type AutoPracticePairSeed = {
  slug: string
  reason: string
  score: number
}

export type PracticePairLinkState = {
  instrumentId: 'o12' | 'o6' | 'r8b' | 'r8g' | 'w6' | null
  noteLabelMode: string | null
}

export const SONG_PAGE_LINK_STATE_EVENT = 'vtabs-song-page-link-state-change'
