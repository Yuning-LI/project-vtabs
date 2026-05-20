export type PracticePairCard = {
  slug: string
  href: string
  title: string
  familyLabel: string
  difficultyLabel: string
  keyLabel: string
  meterLabel: string
  hasPublicLyrics: boolean
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
