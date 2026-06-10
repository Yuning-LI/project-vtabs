// Stable compatibility boundary: keep the current runtime route path unchanged
// until we intentionally migrate the public runtime host contract.
export const PUBLIC_RUNTIME_API_BASE_PATH = '/api/kuailepu-runtime'

export function buildPublicRuntimeUrl(
  songId: string,
  options: {
    basePath?: string
    params?: URLSearchParams | string | null
  } = {}
) {
  const basePath = options.basePath ?? PUBLIC_RUNTIME_API_BASE_PATH
  const query = options.params?.toString() ?? ''
  const path = `${basePath.replace(/\/$/, '')}/${encodeURIComponent(songId)}`
  return query ? `${path}?${query}` : path
}
