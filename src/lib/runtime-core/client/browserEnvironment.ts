export function canUseBrowserDOM() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

export function getBrowserWindow() {
  return typeof window === 'undefined' ? null : window
}

export function getBrowserDocument() {
  return typeof document === 'undefined' ? null : document
}

export function getBrowserPerformanceNow() {
  const runtimeWindow = getBrowserWindow()
  return runtimeWindow?.performance?.now?.() ?? Date.now()
}

export function getAllowedRuntimeHostOrigins() {
  const runtimeWindow = getBrowserWindow()
  const currentOrigin = runtimeWindow?.location?.origin
  const configuredOrigins =
    process.env.NEXT_PUBLIC_RUNTIME_HOST_ALLOWED_ORIGINS?.split(',') ?? []

  return new Set(
    [currentOrigin, ...configuredOrigins.map(origin => origin.trim()).filter(Boolean)].filter(
      (origin): origin is string => Boolean(origin)
    )
  )
}

export function isAllowedRuntimeHostOrigin(origin: string | null | undefined) {
  if (!origin || origin === 'null') {
    return true
  }

  return getAllowedRuntimeHostOrigins().has(origin)
}
