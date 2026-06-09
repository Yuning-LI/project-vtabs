import fs from 'node:fs'
import path from 'node:path'
import { buildSongIrFromMusicXmlDraft } from './fromMusicXmlDraft.ts'
import { buildSongIrFromRuntimePayload } from './fromRuntimeNotation.ts'
import type { SongIrDocument } from './songIr.ts'
import type { SongIngestDraft } from '../songbook/songIngestDraft.ts'
import { loadPublicRuntimePayloadArchive } from '../runtime-core/server/payload/runtimePayload.ts'

const DEFAULT_DRAFT_DIR = 'reference/song-publish-candidates/drafts'

export function loadNativeSongIrFromDraft(slug: string): SongIrDocument | null {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, '')
  if (!safeSlug) {
    return null
  }

  const draftPath = path.resolve(process.cwd(), DEFAULT_DRAFT_DIR, `${safeSlug}.json`)
  if (!fs.existsSync(draftPath)) {
    return null
  }

  const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8')) as SongIngestDraft
  return buildSongIrFromMusicXmlDraft(draft)
}

export function loadNativeSongIrFromRuntimePayload(slug: string): SongIrDocument | null {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, '')
  if (!safeSlug) {
    return null
  }

  const payload = loadPublicRuntimePayloadArchive(safeSlug)
  if (!payload) {
    return null
  }

  return buildSongIrFromRuntimePayload(safeSlug, payload)
}
