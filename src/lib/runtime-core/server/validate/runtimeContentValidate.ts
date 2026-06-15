import {
  PUBLIC_RUNTIME_ASSET_PROFILE_NAMES,
  PUBLIC_RUNTIME_PUBLIC_FEATURES,
  PUBLIC_RUNTIME_TEXT_MODES,
  type PublicRuntimeAssetProfileName,
  type PublicRuntimePayload,
  type PublicRuntimePublicFeature,
  type PublicRuntimeState,
  type PublicRuntimeTextMode
} from '../../runtimeTypes.ts'
import { buildRuntimeContentLabel } from '../helper/runtimePathHelper.ts'

export type RuntimeContentValidationSeverity = 'error' | 'warning'

export type RuntimeContentValidationIssue = {
  code: string
  severity: RuntimeContentValidationSeverity
  message: string
  path?: string
}

export type RuntimeContentValidationResult = {
  valid: boolean
  issues: RuntimeContentValidationIssue[]
}

export type PublicRuntimeContentValidationInput = {
  payload?: PublicRuntimePayload | null
  state?: PublicRuntimeState | null
  textMode?: PublicRuntimeTextMode | string | null
  assetProfile?: PublicRuntimeAssetProfileName | string | null
  publicFeatures?: readonly (PublicRuntimePublicFeature | string)[] | null
  songId?: string | number | null
  filePath?: string | null
}

export function validatePublicRuntimeContent(
  input: PublicRuntimeContentValidationInput
): RuntimeContentValidationResult {
  const issues: RuntimeContentValidationIssue[] = []
  const label = buildRuntimeContentLabel({
    songId: input.songId,
    filePath: input.filePath
  })

  validatePayloadShape(input.payload, label, issues)
  validateRuntimeStateShape(input.state, label, issues)
  validateOptionalEnum({
    value: input.textMode,
    values: PUBLIC_RUNTIME_TEXT_MODES,
    label,
    path: 'textMode',
    code: 'invalid-runtime-text-mode',
    issues
  })
  validateOptionalEnum({
    value: input.assetProfile,
    values: PUBLIC_RUNTIME_ASSET_PROFILE_NAMES,
    label,
    path: 'assetProfile',
    code: 'invalid-runtime-asset-profile',
    issues
  })
  validatePublicFeatures(input.publicFeatures, label, issues)

  return {
    valid: issues.every(issue => issue.severity !== 'error'),
    issues
  }
}

export const validateRuntimeContent = validatePublicRuntimeContent

export function hasRuntimeContentValidationErrors(result: RuntimeContentValidationResult) {
  return result.issues.some(issue => issue.severity === 'error')
}

export function formatRuntimeContentValidationIssues(
  result: RuntimeContentValidationResult
) {
  return result.issues.map(issue => {
    const location = issue.path ? ` ${issue.path}` : ''
    return `[${issue.severity}] ${issue.code}${location}: ${issue.message}`
  })
}

function validatePayloadShape(
  payload: PublicRuntimePayload | null | undefined,
  label: string,
  issues: RuntimeContentValidationIssue[]
) {
  if (!isPlainRuntimeObject(payload)) {
    issues.push({
      code: 'missing-runtime-payload',
      severity: 'error',
      message: `${label} is missing a runtime payload.`
    })
    return
  }

  if (hasValue(payload.song_name) && typeof payload.song_name !== 'string') {
    issues.push({
      code: 'invalid-runtime-title',
      severity: 'warning',
      path: 'payload.song_name',
      message: `${label} has a non-string song title.`
    })
  }

  if (hasValue(payload.instrumentFingerings) && !Array.isArray(payload.instrumentFingerings)) {
    issues.push({
      code: 'invalid-runtime-instrument-fingerings',
      severity: 'warning',
      path: 'payload.instrumentFingerings',
      message: `${label} has non-array instrument fingering metadata.`
    })
  }

  if (hasValue(payload.sheetScaleList) && !isNumberArray(payload.sheetScaleList)) {
    issues.push({
      code: 'invalid-runtime-sheet-scale-list',
      severity: 'warning',
      path: 'payload.sheetScaleList',
      message: `${label} has a non-numeric sheet scale list.`
    })
  }
}

function validateRuntimeStateShape(
  state: PublicRuntimeState | null | undefined,
  label: string,
  issues: RuntimeContentValidationIssue[]
) {
  if (!hasValue(state)) {
    return
  }
  if (!isPlainRuntimeObject(state)) {
    issues.push({
      code: 'invalid-runtime-state',
      severity: 'warning',
      message: `${label} has a non-object runtime state.`
    })
  }
}

function validatePublicFeatures(
  publicFeatures: readonly (PublicRuntimePublicFeature | string)[] | null | undefined,
  label: string,
  issues: RuntimeContentValidationIssue[]
) {
  if (!hasValue(publicFeatures)) {
    return
  }
  if (!Array.isArray(publicFeatures)) {
    issues.push({
      code: 'invalid-runtime-public-features',
      severity: 'warning',
      path: 'publicFeatures',
      message: `${label} has non-array public feature flags.`
    })
    return
  }

  publicFeatures.forEach((feature, index) => {
    if (!isStringMember(PUBLIC_RUNTIME_PUBLIC_FEATURES, feature)) {
      issues.push({
        code: 'invalid-runtime-public-feature',
        severity: 'warning',
        path: `publicFeatures.${index}`,
        message: `${label} has an unsupported public feature: ${String(feature)}.`
      })
    }
  })
}

function validateOptionalEnum<T extends readonly string[]>(input: {
  value: T[number] | string | null | undefined
  values: T
  label: string
  path: string
  code: string
  issues: RuntimeContentValidationIssue[]
}) {
  if (!hasValue(input.value)) {
    return
  }
  if (!isStringMember(input.values, input.value)) {
    input.issues.push({
      code: input.code,
      severity: 'warning',
      path: input.path,
      message: `${input.label} has unsupported ${input.path}: ${String(input.value)}.`
    })
  }
}

function isStringMember<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value)
}

function isPlainRuntimeObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(item => typeof item === 'number' && Number.isFinite(item))
}

function hasValue<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}
