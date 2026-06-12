export type PublicRuntimeHostMode = 'iframe' | 'container'

export type PublicRuntimeHostModeSource = 'query' | 'environment' | 'default'

export type PublicRuntimeHostModeResolution = {
  mode: PublicRuntimeHostMode
  source: PublicRuntimeHostModeSource
  queryMode: PublicRuntimeHostMode | null
  environmentMode: PublicRuntimeHostMode | null
  hasQueryFlag: boolean
}

export const PUBLIC_RUNTIME_HOST_QUERY_PARAM = 'runtime_host'
export const PUBLIC_RUNTIME_HOST_DEFAULT_ENV = 'NEXT_PUBLIC_RUNTIME_HOST_DEFAULT'
export const DEFAULT_PUBLIC_RUNTIME_HOST_MODE: PublicRuntimeHostMode = 'iframe'

type SearchParamValue = string | string[] | undefined
type SearchParamsLike = Record<string, SearchParamValue> | undefined

export function normalizePublicRuntimeHostMode(
  value: string | null | undefined
): PublicRuntimeHostMode | null {
  const normalized = value?.trim().toLowerCase()

  if (normalized === 'iframe' || normalized === 'container') {
    return normalized
  }

  return null
}

export function readPublicRuntimeHostModeSearchParam(searchParams: SearchParamsLike) {
  const value = searchParams?.[PUBLIC_RUNTIME_HOST_QUERY_PARAM]
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export function hasPublicRuntimeHostQueryFlag(searchParams: SearchParamsLike) {
  return Object.prototype.hasOwnProperty.call(searchParams ?? {}, PUBLIC_RUNTIME_HOST_QUERY_PARAM)
}

export function getPublicRuntimeHostDefaultFromEnv() {
  return normalizePublicRuntimeHostMode(process.env.NEXT_PUBLIC_RUNTIME_HOST_DEFAULT)
}

export function resolvePublicRuntimeHostMode(input?: {
  queryValue?: string | null
  environmentValue?: string | null
  hasQueryFlag?: boolean
}): PublicRuntimeHostModeResolution {
  const queryMode = normalizePublicRuntimeHostMode(input?.queryValue ?? null)
  const environmentMode = normalizePublicRuntimeHostMode(
    input?.environmentValue ?? process.env.NEXT_PUBLIC_RUNTIME_HOST_DEFAULT ?? null
  )

  if (queryMode) {
    return {
      mode: queryMode,
      source: 'query',
      queryMode,
      environmentMode,
      hasQueryFlag: Boolean(input?.hasQueryFlag)
    }
  }

  if (environmentMode) {
    return {
      mode: environmentMode,
      source: 'environment',
      queryMode,
      environmentMode,
      hasQueryFlag: Boolean(input?.hasQueryFlag)
    }
  }

  return {
    mode: DEFAULT_PUBLIC_RUNTIME_HOST_MODE,
    source: 'default',
    queryMode,
    environmentMode,
    hasQueryFlag: Boolean(input?.hasQueryFlag)
  }
}

export function shouldNoindexPublicRuntimeHostExperiment(searchParams: SearchParamsLike) {
  return hasPublicRuntimeHostQueryFlag(searchParams)
}
