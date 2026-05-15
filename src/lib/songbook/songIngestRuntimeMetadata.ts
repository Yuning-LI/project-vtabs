import type { KuailepuRuntimePayload } from '../kuailepu/runtime.ts'

export const SONG_INGEST_RUNTIME_FINGERING_RULES_VERSION =
  '2026-05-15-public-instrument-selection-v1'

export type SongIngestRuntimeFingeringAuditStatus = 'pending' | 'optimized'

export type SongIngestRuntimeFingeringAudit = {
  status: SongIngestRuntimeFingeringAuditStatus
  rulesVersion: string
  optimizedAt?: string | null
  baseUrl?: string | null
  instrumentCount?: number | null
}

export type SongIngestRuntimeTempoResolutionSource =
  | 'manual'
  | 'musicxml'
  | 'template'
  | 'family-fallback'

export type SongIngestRuntimeTempoResolution = {
  bpm: number
  source: SongIngestRuntimeTempoResolutionSource
  family?: string | null
  heuristic?: string | null
}

export type SongIngestRuntimeMetadata = {
  sourceKind?: 'musicxml'
  graceMode?: 'source-only' | 'payload-metadata'
  graceAttachments?: unknown[]
  runtimeFingeringAudit?: SongIngestRuntimeFingeringAudit
  tempoResolution?: SongIngestRuntimeTempoResolution
}

export function readSongIngestRuntimeMetadata(payload: KuailepuRuntimePayload) {
  const raw = payload.vtabs_import
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }

  return raw as SongIngestRuntimeMetadata
}

export function mergeSongIngestRuntimeMetadata(
  payload: KuailepuRuntimePayload,
  updates: Partial<SongIngestRuntimeMetadata>
) {
  const current = readSongIngestRuntimeMetadata(payload)
  const next: SongIngestRuntimeMetadata = {
    ...current,
    ...updates,
    runtimeFingeringAudit:
      updates.runtimeFingeringAudit === undefined
        ? current.runtimeFingeringAudit
        : {
            ...(current.runtimeFingeringAudit ?? {}),
            ...updates.runtimeFingeringAudit
          },
    tempoResolution:
      updates.tempoResolution === undefined
        ? current.tempoResolution
        : {
            ...(current.tempoResolution ?? {}),
            ...updates.tempoResolution
          }
  }

  ;(payload as Record<string, unknown>).vtabs_import = next
  return next
}

export function hasResolvedRuntimeBpmDirective(payload: KuailepuRuntimePayload) {
  return /\{bpm\s*:\s*\d+\}/i.test(String(payload.notation ?? ''))
}

export function readResolvedRuntimeBpm(payload: KuailepuRuntimePayload) {
  const match = String(payload.notation ?? '').match(/\{bpm\s*:\s*(\d+)\}/i)
  if (match) {
    const bpm = Number(match[1])
    if (Number.isFinite(bpm) && bpm > 0) {
      return Math.round(bpm)
    }
  }

  const payloadBpm = Number(payload.bpm)
  if (Number.isFinite(payloadBpm) && payloadBpm > 0) {
    return Math.round(payloadBpm)
  }

  return null
}
