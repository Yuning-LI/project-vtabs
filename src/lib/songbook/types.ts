export type SongSource = {
  title: string
  url: string
  rights: string
  note: string
}

export type SongMeta = {
  key: string
  tempo: number
  meter: string
}

export type SongReview = {
  status: 'verified' | 'pending'
  checkedOn: string
  note: string
}

export type SongDoc = {
  id: string
  slug: string
  title: string
  description: string
  published?: boolean
  lyrics?: string[]
  alignedLyrics?: string[]
  extraLyrics?: string[]
  abc?: string
  source: SongSource
  meta: SongMeta
  review?: SongReview
  tonicMidi: number
  notation: string[]
}

export type ParsedToken =
  | {
      kind: 'note'
      token: string
      degree: number
      accidental: -1 | 0 | 1
      octaveShift: number
      midi: number
    }
  | {
      kind: 'rest' | 'hold' | 'bar'
      token: string
    }
