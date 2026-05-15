import fs from 'node:fs'
import path from 'node:path'

export type SongIngestReviewStatus = 'pending' | 'hold' | 'verified'

export type SongIngestReviewLogEntry = {
  slug: string
  status: SongIngestReviewStatus
  approvedForPublication: boolean
  checkedOn: string
  references: string[]
  summary: string
  titleMatch?: 'exact' | 'variant' | 'unknown'
  openingLyricsMatch?: 'exact' | 'variant' | 'no-lyrics' | 'unknown'
  openingMelodyMatch?: 'exact' | 'approximate' | 'unknown'
  startsAtMainTune?: 'yes' | 'no' | 'unknown'
  issues?: string[]
}

export type SongIngestReviewLog = {
  version: 1
  updatedAt: string
  entries: Record<string, SongIngestReviewLogEntry>
}

export const SONG_INGEST_REVIEW_LOG_PATH =
  'reference/song-publish-candidates/review-log.json'

export function readSongIngestReviewLog() {
  const absolutePath = path.resolve(process.cwd(), SONG_INGEST_REVIEW_LOG_PATH)
  if (!fs.existsSync(absolutePath)) {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      entries: {}
    } satisfies SongIngestReviewLog
  }

  return JSON.parse(fs.readFileSync(absolutePath, 'utf8')) as SongIngestReviewLog
}

export function writeSongIngestReviewLog(log: SongIngestReviewLog) {
  const absolutePath = path.resolve(process.cwd(), SONG_INGEST_REVIEW_LOG_PATH)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.writeFileSync(absolutePath, `${JSON.stringify(log, null, 2)}\n`, 'utf8')
}

export function getSongIngestReviewLogEntry(slug: string) {
  return readSongIngestReviewLog().entries[slug] ?? null
}

export function summarizeSongIngestReviewLogClearance(slug: string) {
  const entry = getSongIngestReviewLogEntry(slug)
  if (!entry) {
    return {
      ok: false,
      entry: null,
      reason: null
    }
  }

  if (entry.status !== 'verified') {
    return {
      ok: false,
      entry,
      reason: `Review log exists but status is ${entry.status}: ${SONG_INGEST_REVIEW_LOG_PATH}`
    }
  }

  if (!entry.approvedForPublication) {
    return {
      ok: false,
      entry,
      reason: `Review log exists but approvedForPublication=false: ${SONG_INGEST_REVIEW_LOG_PATH}`
    }
  }

  return {
    ok: true,
    entry,
    reason: null
  }
}
