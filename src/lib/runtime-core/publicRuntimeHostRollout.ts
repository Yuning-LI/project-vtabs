import type {
  PublicRuntimeHostMode,
  PublicRuntimeHostModeResolution
} from './publicRuntimeHostMode'
import {
  DEFAULT_PUBLIC_RUNTIME_HOST_MODE,
  LEGACY_RUNTIME_IFRAME_SIGNAL,
  PUBLIC_RUNTIME_CONTAINER_HOST_SIGNAL,
  normalizePublicRuntimeHostMode,
  resolvePublicRuntimeEffectiveHostMode
} from './publicRuntimeHostMode'

export type PublicRuntimeHostRolloutSource =
  | 'query'
  | 'environment'
  | 'bot'
  | 'rollout'
  | 'default'

export type PublicRuntimeHostRolloutResolution = PublicRuntimeHostModeResolution & {
  source: PublicRuntimeHostRolloutSource
  rolloutEnabled: boolean
  rolloutPercent: number
  rolloutBucket: number | null
  rolloutKey: string
  isBot: boolean
  reason: string
}

export const PUBLIC_RUNTIME_HOST_ROLLOUT_PERCENT_ENV =
  'NEXT_PUBLIC_RUNTIME_HOST_CONTAINER_ROLLOUT_PERCENT'
export const PUBLIC_RUNTIME_HOST_ROLLOUT_ENABLED_ENV =
  'NEXT_PUBLIC_RUNTIME_HOST_ROLLOUT_ENABLED'
export const PUBLIC_RUNTIME_HOST_ROLLOUT_KEY_QUERY_PARAM = 'runtime_host_rollout_key'
export const LOCAL_PUBLIC_RUNTIME_HOST_DEFAULT_MODE: PublicRuntimeHostMode =
  PUBLIC_RUNTIME_CONTAINER_HOST_SIGNAL

type SearchParamValue = string | string[] | undefined
type SearchParamsLike = Record<string, SearchParamValue> | undefined

export function resolvePublicRuntimeHostRollout(input: {
  queryValue?: string | null
  environmentValue?: string | null
  hasQueryFlag?: boolean
  searchParams?: SearchParamsLike
  userAgent?: string | null
  rolloutPercentValue?: string | null
  rolloutEnabledValue?: string | null
  rolloutKey?: string | null
  defaultMode?: PublicRuntimeHostMode
}): PublicRuntimeHostRolloutResolution {
  const queryMode = normalizePublicRuntimeHostMode(input.queryValue ?? null)
  const environmentMode = normalizePublicRuntimeHostMode(
    input.environmentValue ?? process.env.NEXT_PUBLIC_RUNTIME_HOST_DEFAULT ?? null
  )
  const defaultMode = input.defaultMode ?? getPublicRuntimeHostDefaultModeForEnvironment()
  const hasQueryFlag = Boolean(input.hasQueryFlag)
  const isBot = isSearchCrawlerUserAgent(input.userAgent)
  const rolloutPercent = normalizeRolloutPercent(
    input.rolloutPercentValue ?? process.env.NEXT_PUBLIC_RUNTIME_HOST_CONTAINER_ROLLOUT_PERCENT
  )
  const rolloutEnabled = isRuntimeHostRolloutEnabled(
    input.rolloutEnabledValue ?? process.env.NEXT_PUBLIC_RUNTIME_HOST_ROLLOUT_ENABLED,
    rolloutPercent
  )
  const rolloutKey =
    input.rolloutKey ??
    readPublicRuntimeHostRolloutKeySearchParam(input.searchParams) ??
    buildDefaultRolloutKey({
      queryValue: input.queryValue,
      userAgent: input.userAgent
    })

  if (queryMode) {
    return {
      mode: resolvePublicRuntimeEffectiveHostMode(queryMode),
      source: 'query',
      queryMode,
      environmentMode,
      hasQueryFlag,
      rolloutEnabled,
      rolloutPercent,
      rolloutBucket: null,
      rolloutKey,
      isBot,
      reason: 'query override'
    }
  }

  if (isBot) {
    return {
      mode: PUBLIC_RUNTIME_CONTAINER_HOST_SIGNAL,
      source: 'bot',
      queryMode,
      environmentMode,
      hasQueryFlag,
      rolloutEnabled,
      rolloutPercent,
      rolloutBucket: null,
      rolloutKey,
      isBot,
      reason: 'crawler user agent'
    }
  }

  if (environmentMode) {
    return {
      mode: resolvePublicRuntimeEffectiveHostMode(environmentMode),
      source: 'environment',
      queryMode,
      environmentMode,
      hasQueryFlag,
      rolloutEnabled,
      rolloutPercent,
      rolloutBucket: null,
      rolloutKey,
      isBot,
      reason: 'environment default'
    }
  }

  if (rolloutEnabled && rolloutPercent > 0) {
    const rolloutBucket = getDeterministicRolloutBucket(rolloutKey)
    const rolloutMode: PublicRuntimeHostMode =
      rolloutBucket < rolloutPercent
        ? PUBLIC_RUNTIME_CONTAINER_HOST_SIGNAL
        : LEGACY_RUNTIME_IFRAME_SIGNAL
    return {
      mode: resolvePublicRuntimeEffectiveHostMode(rolloutMode),
      source: 'rollout',
      queryMode,
      environmentMode,
      hasQueryFlag,
      rolloutEnabled,
      rolloutPercent,
      rolloutBucket,
      rolloutKey,
      isBot,
      reason: `local rollout bucket ${rolloutBucket}`
    }
  }

  return {
    mode: resolvePublicRuntimeEffectiveHostMode(defaultMode),
    source: 'default',
    queryMode,
    environmentMode,
    hasQueryFlag,
    rolloutEnabled,
    rolloutPercent,
    rolloutBucket: null,
    rolloutKey,
    isBot,
    reason:
      defaultMode === PUBLIC_RUNTIME_CONTAINER_HOST_SIGNAL
        ? 'local default container'
        : 'production/default legacy host signal baseline'
  }
}

export function getPublicRuntimeHostDefaultModeForEnvironment(
  nodeEnv = process.env.NODE_ENV
): PublicRuntimeHostMode {
  return nodeEnv === 'production'
    ? DEFAULT_PUBLIC_RUNTIME_HOST_MODE
    : LOCAL_PUBLIC_RUNTIME_HOST_DEFAULT_MODE
}

export function readPublicRuntimeHostRolloutKeySearchParam(searchParams: SearchParamsLike) {
  const value = searchParams?.[PUBLIC_RUNTIME_HOST_ROLLOUT_KEY_QUERY_PARAM]
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export function normalizeRolloutPercent(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.floor(parsed)))
}

export function isRuntimeHostRolloutEnabled(
  value: string | null | undefined,
  rolloutPercent: number
) {
  const normalized = value?.trim().toLowerCase()
  if (normalized === '1' || normalized === 'true' || normalized === 'on') {
    return true
  }

  if (normalized === '0' || normalized === 'false' || normalized === 'off') {
    return false
  }

  return rolloutPercent > 0 && process.env.NODE_ENV !== 'production'
}

export function getDeterministicRolloutBucket(key: string) {
  let hash = 2166136261
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return Math.abs(hash >>> 0) % 100
}

export function isSearchCrawlerUserAgent(userAgent: string | null | undefined) {
  const normalized = userAgent?.toLowerCase() ?? ''
  if (!normalized) {
    return false
  }

  return /(?:googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider|applebot|twitterbot|linkedinbot|pinterestbot)/i.test(
    normalized
  )
}

function buildDefaultRolloutKey(input: {
  queryValue?: string | null
  userAgent?: string | null
}) {
  return [input.queryValue ?? 'no-query', input.userAgent ?? 'no-user-agent'].join(':')
}
