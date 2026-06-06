import type {
  PublicRuntimePayload,
  PublicRuntimeState
} from '../runtimeTypes.ts'

type KuailepuInstrumentFingeringOption = NonNullable<
  PublicRuntimePayload['instrumentFingerings']
>[number]

export function resolvePublicRuntimeState(
  payload: PublicRuntimePayload,
  state: PublicRuntimeState | null
) {
  const resolved = applyRuntimeDefaults(payload, state)

  return {
    instrument: resolved.instrument ?? null,
    fingering: resolved.fingering ?? null,
    fingering_index: resolved.fingering_index ?? null,
    show_graph: resolved.show_graph ?? null,
    show_lyric: resolved.show_lyric ?? null,
    show_note_range: resolved.show_note_range ?? null,
    show_measure_num: resolved.show_measure_num ?? null,
    measure_layout: resolved.measure_layout ?? null,
    sheet_scale: resolved.sheet_scale ?? null,
    note_label_mode: state?.note_label_mode ?? null
  } satisfies PublicRuntimeState
}

export function applyRuntimeDefaults(
  payload: PublicRuntimePayload,
  state: PublicRuntimeState | null
) {
  const next: PublicRuntimePayload & PublicRuntimeState = {
    ...payload
  }

  const {
    hasExplicitInstrumentOverride,
    selectedInstrument,
    selectedFingeringIndex,
    selectedFingering
  } = resolveRuntimeInstrumentSelection(payload, state)

  next.instrument = state?.instrument ?? payload.instrument
  if (!next.instrument || next.instrument === 'none') {
    next.instrument = selectedInstrument?.instrument ?? 'none'
  }

  next.fingering = selectedFingering
  next.fingering_index = selectedFingeringIndex
  const selectedGraphValue = getPreferredPublicGraphValue(
    selectedInstrument?.instrument ?? null,
    selectedInstrument?.graphList
  )
  next.show_graph = hasExplicitInstrumentOverride
    ? state?.show_graph ?? selectedGraphValue ?? normalizeToggle(undefined, payload.show_graph, '1')
    : normalizeToggle(state?.show_graph, payload.show_graph, '1')
  next.show_lyric =
    state?.show_lyric !== undefined && state?.show_lyric !== null && state?.show_lyric !== ''
      ? state.show_lyric
      : shouldHideLyricTrackByDefault(payload)
        ? 'off'
        : normalizeToggle(undefined, payload.show_lyric, 'on')
  next.show_note_range = normalizeToggle(state?.show_note_range, payload.show_note_range, 'off')
  next.show_measure_num = normalizeToggle(state?.show_measure_num, undefined, 'off')
  next.measure_layout = state?.measure_layout ?? payload.measure_layout ?? 'compact'
  next.no_check_href = true
  next.no_preference_instrument = true
  next.preference_instrument = next.instrument
  next.sheet_scale =
    state?.sheet_scale ??
    payload.sheet_scale ??
    (Array.isArray(payload.sheetScaleList) && payload.sheetScaleList.includes(10)
      ? 10
      : payload.sheetScaleList?.[payload.sheetScaleList.length - 1] ?? 10)

  return next
}

export function resolveRuntimeInstrumentSelection(
  payload: PublicRuntimePayload,
  state: PublicRuntimeState | null
) {
  const instrumentOptions = (payload.instrumentFingerings ?? []).filter(
    (option): option is KuailepuInstrumentFingeringOption =>
      Boolean(option.instrument) && option.instrument !== 'none'
  )
  const hasExplicitInstrumentOverride =
    Boolean(state?.instrument) &&
    state?.instrument !== 'none' &&
    state?.instrument !== payload.instrument
  const selectedInstrument =
    instrumentOptions.find(option => option.instrument === state?.instrument) ??
    instrumentOptions.find(option => option.instrument === payload.instrument) ??
    instrumentOptions.find(option => option.instrument === 'o12') ??
    instrumentOptions.find(option => option.instrument === 'o6') ??
    instrumentOptions[0]
  const requestedFingeringIndex = Number(
    hasExplicitInstrumentOverride
      ? state?.fingering_index ?? 0
      : state?.fingering_index ?? payload.fingering_index ?? 0
  )
  const maxFingeringIndex = Math.max(
    0,
    (selectedInstrument?.fingeringSetList?.length ?? selectedInstrument?.fingeringsList?.length ?? 1) -
      1
  )
  const selectedFingeringIndex = Number.isFinite(requestedFingeringIndex)
    ? Math.min(Math.max(requestedFingeringIndex, 0), maxFingeringIndex)
    : 0
  const selectedFingeringSet = selectedInstrument?.fingeringSetList?.[selectedFingeringIndex]

  const hasExplicitFingeringOverride =
    state?.fingering_index !== null &&
    state?.fingering_index !== undefined &&
    state?.fingering_index !== ''

  const selectedFingeringCandidates =
    hasExplicitInstrumentOverride || hasExplicitFingeringOverride
      ? [
          state?.fingering,
          selectedFingeringSet?.map(option => option.fingering).join('+'),
          selectedInstrument?.fingeringSetList?.[0]?.[0]?.fingering,
          selectedInstrument?.fingeringSetList?.flat()[0]?.fingering,
          payload.fingering
        ]
      : [
          state?.fingering,
          payload.fingering,
          selectedFingeringSet?.map(option => option.fingering).join('+'),
          selectedInstrument?.fingeringSetList?.[0]?.[0]?.fingering,
          selectedInstrument?.fingeringSetList?.flat()[0]?.fingering
        ]
  const selectedFingering =
    selectedFingeringCandidates.find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0
    ) ?? ''

  return {
    instrumentOptions,
    hasExplicitInstrumentOverride,
    selectedInstrument,
    selectedFingeringIndex,
    selectedFingeringSet,
    selectedFingering
  }
}

function getPreferredPublicGraphValue(
  instrumentId: string | null | undefined,
  graphList:
    | Array<{
        name?: string
        value?: string
      }>
    | null
    | undefined
) {
  const available = (graphList ?? []).filter(
    (item): item is { name?: string; value: string } =>
      typeof item.value === 'string' && item.value.trim().length > 0
  )
  if (available.length === 0) {
    return null
  }

  if (instrumentId !== 'r8b' && instrumentId !== 'r8g' && instrumentId !== 'w6') {
    return available[0]!.value.trim()
  }

  const upward = available.find(item => {
    const normalizedName = item.name?.replace(/\s+/g, '') ?? ''
    return normalizedName.includes('吹口在上') || /mouthpiece\s*up/i.test(item.name ?? '')
  })

  return upward?.value.trim() ?? available[0]!.value.trim()
}

function normalizeToggle(
  preferred: string | null | undefined,
  fallback: string | null | undefined,
  defaultValue: string
) {
  const candidate = preferred ?? fallback
  if (candidate === null || candidate === undefined || candidate === '') {
    return defaultValue
  }

  const normalized = String(candidate).toLowerCase()
  if (normalized === '0' || normalized === 'off' || normalized === 'false' || normalized === 'none') {
    return 'off'
  }

  return '1'
}

export function shouldHideLyricTrackByDefault(payload: PublicRuntimePayload) {
  const lyricText = extractPayloadLyricText(payload)
  if (!lyricText) {
    return false
  }

  const hasLatin = /[A-Za-z]/.test(lyricText)
  const hasCjk = /[\u3400-\u9fff]/.test(lyricText)
  return hasCjk && !hasLatin
}

export function extractPayloadLyricText(
  payload: Pick<PublicRuntimePayload, 'lyric' | 'lyric_text'>
) {
  const candidates = [payload.lyric_text, payload.lyric]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      const normalized = normalizeLyricCandidate(candidate)
      if (normalized) {
        return normalized
      }
    }

    if (Array.isArray(candidate)) {
      const text = candidate
        .map(item => (typeof item === 'string' ? item : ''))
        .join('\n')
        .trim()
      if (text) {
        return text
      }
    }
  }

  return ''
}

function normalizeLyricCandidate(candidate: string) {
  const trimmed = candidate.trim()
  if (!trimmed) {
    return ''
  }

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .join('\n')
          .trim()
      }
    } catch {
      // Fall back to the original string when the lyric field is not valid JSON text.
    }
  }

  return trimmed
}
