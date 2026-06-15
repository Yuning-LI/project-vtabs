import path from 'node:path'

export type RuntimePathSegment = string | number | null | undefined

export const PUBLIC_RUNTIME_STATIC_BASE_PATH = '/k-static'
export const PUBLIC_RUNTIME_RAW_PAYLOAD_EXTENSION = '.json'
export const PUBLIC_RUNTIME_PACKED_PAYLOAD_EXTENSION = '.json.gz'

export function normalizeRuntimePathText(value: string) {
  return value.trim().replace(/\\/g, '/')
}

export function stripRuntimePathSlashes(value: string) {
  return normalizeRuntimePathText(value).replace(/^\/+|\/+$/g, '')
}

export function joinRuntimePathSegments(...segments: readonly RuntimePathSegment[]) {
  return segments
    .map(segment => (segment === null || segment === undefined ? '' : stripRuntimePathSlashes(String(segment))))
    .filter(segment => segment.length > 0)
    .join('/')
}

export function buildPublicRuntimeStaticAssetPath(assetPath: string | readonly RuntimePathSegment[]) {
  const normalizedAssetPath =
    typeof assetPath === 'string'
      ? stripRuntimePathSlashes(assetPath)
      : joinRuntimePathSegments(...assetPath)

  return normalizedAssetPath
    ? `${PUBLIC_RUNTIME_STATIC_BASE_PATH}/${normalizedAssetPath}`
    : PUBLIC_RUNTIME_STATIC_BASE_PATH
}

export function normalizeRuntimeFileStem(value: string | number) {
  const fileStem = normalizeRuntimePathText(String(value)).trim()
  if (!fileStem) {
    throw new Error('Runtime file stem cannot be empty.')
  }
  if (fileStem.includes('/')) {
    throw new Error(`Runtime file stem must not contain path separators: ${fileStem}`)
  }
  return fileStem
}

export function buildPublicRuntimeRawPayloadFilename(songId: string | number) {
  return `${normalizeRuntimeFileStem(songId)}${PUBLIC_RUNTIME_RAW_PAYLOAD_EXTENSION}`
}

export function buildPublicRuntimePackedPayloadFilename(songId: string | number) {
  return `${normalizeRuntimeFileStem(songId)}${PUBLIC_RUNTIME_PACKED_PAYLOAD_EXTENSION}`
}

export function resolveRuntimeWorkspacePath(...segments: readonly RuntimePathSegment[]) {
  const normalized = joinRuntimePathSegments(...segments)
  return normalized ? path.resolve(process.cwd(), normalized) : process.cwd()
}

export function toRuntimeWorkspaceRelativePath(filePath: string) {
  return stripRuntimePathSlashes(path.relative(process.cwd(), filePath))
}

export function buildRuntimeContentLabel(input: {
  songId?: string | number | null
  filePath?: string | null
}) {
  const parts = [
    input.songId === null || input.songId === undefined ? null : String(input.songId).trim(),
    input.filePath ? toRuntimeWorkspaceRelativePath(input.filePath) : null
  ].filter((part): part is string => Boolean(part))

  return parts.length > 0 ? parts.join(' @ ') : 'public runtime content'
}
