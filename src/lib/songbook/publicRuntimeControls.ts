import type { KuailepuRuntimePayload, KuailepuRuntimeState } from '../kuailepu/runtime'
import {
  extractKuailepuEnglishText,
  translateKuailepuFingeringName,
  translateKuailepuGraphName
} from './kuailepuEnglish'
import type { PublicSongInstrumentId } from './publicInstruments'

export type PublicRuntimeControlOption = {
  value: string
  label: string
}

export type PublicRuntimeControlConfig = {
  fingeringOptions: PublicRuntimeControlOption[]
  graphOptions: PublicRuntimeControlOption[]
  scaleOptions: PublicRuntimeControlOption[]
  activeFingeringIndex: string | null
  activeGraphVisibility: 'on' | 'off'
  activeGraphValue: string | null
  activeShowLyric: 'on' | 'off'
  activeShowNoteRange: 'on' | 'off'
  activeShowMeasureNum: 'on' | 'off'
  activeMeasureLayout: 'compact' | 'mono'
  activeSheetScale: string
}

type RuntimeFingeringSet = Array<{
  fingering?: string
  fingeringName?: string
  tonalityName?: string
}>

const TONALITY_LABELS: Record<string, string> = {
  AC: 'Alto C',
  AF: 'Alto F',
  AG: 'Alto G',
  BC: 'Bass C',
  SC: 'Soprano C',
  SF: 'Soprano F',
  SG: 'Soprano G'
}

const KEY_LABELS: Record<string, string> = {
  bA: 'Ab',
  bB: 'Bb',
  bD: 'Db',
  bE: 'Eb',
  bG: 'Gb',
  Ab: 'Ab',
  Bb: 'Bb',
  Db: 'Db',
  Eb: 'Eb',
  Gb: 'Gb',
  BB: 'Bb',
  EB: 'Eb',
  AB: 'Ab',
  DB: 'Db',
  GB: 'Gb'
}

const RECORDER_RANGE_LABELS = new Set(['Sopranino', 'Soprano', 'Alto', 'Tenor', 'Bass'])

export function getPublicRuntimeFingeringControlLabel(instrumentId: PublicSongInstrumentId) {
  if (instrumentId === 'o12' || instrumentId === 'o6') {
    return 'Ocarina Key'
  }

  if (instrumentId === 'r8b' || instrumentId === 'r8g') {
    return 'Recorder Setup'
  }

  if (instrumentId === 'w6') {
    return 'Whistle Key'
  }

  return 'Fingering'
}

export function getPublicRuntimeGraphOptions(
  payload: Pick<KuailepuRuntimePayload, 'instrumentFingerings'>,
  instrumentId: PublicSongInstrumentId
) {
  const instrument = (payload.instrumentFingerings ?? []).find(
    option => option.instrument === instrumentId
  )

  const orderedOptions = prioritizeDefaultGraphDirection(
    instrumentId,
    (instrument?.graphList ?? []).filter(option => option.value?.trim())
  )

  return orderedOptions
    .map(option => ({
      value: option.value!.trim(),
      label:
        translateGraphOptionLabel(option.name?.trim() ?? '') ??
        option.name?.trim() ??
        option.value!.trim()
    }))
}

export function getPublicRuntimeFingeringOptions(
  payload: Pick<KuailepuRuntimePayload, 'instrumentFingerings'>,
  instrumentId: PublicSongInstrumentId
) {
  const instrument = (payload.instrumentFingerings ?? []).find(
    option => option.instrument === instrumentId
  )
  const fingeringSets = instrument?.fingeringSetList ?? instrument?.fingeringsList ?? []

  const options = fingeringSets
    .map((group, index) => ({
      value: String(index),
      label: buildFingeringSetLabel(group, instrumentId)
    }))
    .filter(option => option.label.trim().length > 0)

  return disambiguateRepeatedFingeringLabels(options)
}

export function normalizePublicRuntimeFingeringIndex(
  value: string | number | null | undefined,
  options: PublicRuntimeControlOption[]
) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const normalized = String(value)
  return options.some(option => option.value === normalized) ? normalized : null
}

export function buildPublicRuntimeControlConfig(
  payload: Pick<KuailepuRuntimePayload, 'instrumentFingerings' | 'sheetScaleList'>,
  instrumentId: PublicSongInstrumentId,
  state: Pick<
    KuailepuRuntimeState,
    | 'fingering_index'
    | 'show_graph'
    | 'show_lyric'
    | 'show_note_range'
    | 'show_measure_num'
    | 'measure_layout'
    | 'sheet_scale'
  >
): PublicRuntimeControlConfig {
  const fingeringOptions = getPublicRuntimeFingeringOptions(payload, instrumentId)
  const graphOptions = getPublicRuntimeGraphOptions(payload, instrumentId)
  const activeFingeringIndex =
    normalizePublicRuntimeFingeringIndex(state.fingering_index, fingeringOptions) ??
    fingeringOptions[0]?.value ??
    null
  const fallbackGraphValue = graphOptions[0]?.value ?? null
  const activeGraphValue =
    graphOptions.find(option => option.value === state.show_graph)?.value ?? fallbackGraphValue

  return {
    fingeringOptions,
    graphOptions,
    scaleOptions: buildSheetScaleOptions(payload.sheetScaleList),
    activeFingeringIndex,
    activeGraphVisibility: state.show_graph === 'off' ? 'off' : 'on',
    activeGraphValue,
    activeShowLyric: state.show_lyric === 'off' ? 'off' : 'on',
    activeShowNoteRange: state.show_note_range === 'on' ? 'on' : 'off',
    activeShowMeasureNum: state.show_measure_num === 'on' ? 'on' : 'off',
    activeMeasureLayout: state.measure_layout === 'mono' ? 'mono' : 'compact',
    activeSheetScale: String(state.sheet_scale ?? 10)
  }
}

function buildFingeringSetLabel(group: RuntimeFingeringSet, instrumentId: PublicSongInstrumentId) {
  const label = group
    .map(item => formatFingeringSetItem(item, instrumentId))
    .filter(Boolean)
    .join(' + ')
    .trim()

  return label || 'Default fingering'
}

function formatFingeringSetItem(item: {
  fingering?: string
  fingeringName?: string
  tonalityName?: string
}, instrumentId: PublicSongInstrumentId) {
  const rawName = item.fingeringName?.trim() || item.fingering?.trim() || ''
  if (!rawName) {
    return ''
  }

  const keyLabel = resolveFingeringKeyLabel(item) ?? 'Default'
  const tonalityName = normalizeTonalityName(item.tonalityName)

  if (instrumentId === 'w6') {
    return `${keyLabel} whistle`
  }

  if (instrumentId === 'o12' || instrumentId === 'o6') {
    return tonalityName ? `${keyLabel} fingering - ${tonalityName}` : `${keyLabel} fingering`
  }

  if (instrumentId === 'r8b' || instrumentId === 'r8g') {
    if (tonalityName && RECORDER_RANGE_LABELS.has(tonalityName)) {
      return `${keyLabel} fingering - ${tonalityName}`
    }
    return tonalityName ? `${keyLabel} fingering - ${tonalityName} recorder` : `${keyLabel} fingering`
  }

  const translatedName = translateKuailepuFingeringName(rawName)?.trim() || rawName
  return tonalityName ? `${translatedName} (${tonalityName})` : translatedName
}

function resolveFingeringKeyLabel(item: {
  fingering?: string
  fingeringName?: string
}) {
  return (
    extractKeyLabel(item.fingeringName) ??
    extractKeyLabel(translateKuailepuFingeringName(item.fingeringName)) ??
    extractKeyLabel(item.fingering)
  )
}

function extractKeyLabel(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalized = value.trim()
  const directMatch = normalized.match(/^([bB]?[A-G])\d*$/)
  const namedMatch =
    normalized.match(/([bB]?[A-G])调指法/) ??
    normalized.match(/([bB]?[A-G]|Bb|Eb|Ab|Db|Gb)\s*fingering/i)
  const key = directMatch?.[1] ?? namedMatch?.[1]

  return key ? normalizeKeyLabel(key) : null
}

function normalizeKeyLabel(value: string) {
  const normalized = value.trim()
  return KEY_LABELS[normalized] ?? normalized.toUpperCase()
}

function normalizeTonalityName(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  return TONALITY_LABELS[normalized] ?? extractKuailepuEnglishText(normalized) ?? normalized
}

function disambiguateRepeatedFingeringLabels(options: PublicRuntimeControlOption[]) {
  const totals = options.reduce((map, option) => {
    map.set(option.label, (map.get(option.label) ?? 0) + 1)
    return map
  }, new Map<string, number>())
  const seen = new Map<string, number>()

  return options.map(option => {
    const total = totals.get(option.label) ?? 0
    if (total <= 1) {
      return option
    }

    const count = seen.get(option.label) ?? 0
    seen.set(option.label, count + 1)
    if (count === 0) {
      return option
    }

    const suffix = count === 1 ? 'alt.' : `alt. ${count + 1}`
    return {
      ...option,
      label: `${option.label} (${suffix})`
    }
  })
}

function buildSheetScaleOptions(sheetScaleList: number[] | undefined) {
  const values =
    Array.isArray(sheetScaleList) && sheetScaleList.length > 0
      ? sheetScaleList
      : [8, 9, 10, 11, 12]

  return values.map(value => ({
    value: String(value),
    label: `${value}0%`
  }))
}

function prioritizeDefaultGraphDirection(
  instrumentId: PublicSongInstrumentId,
  options: Array<{ name?: string; value?: string }>
) {
  if (instrumentId !== 'r8b' && instrumentId !== 'r8g' && instrumentId !== 'w6') {
    return options
  }

  const upwardOptions = options.filter(option => isUpwardGraphOption(option.name))
  if (upwardOptions.length === 0) {
    return options
  }

  const upwardValues = new Set(upwardOptions.map(option => option.value))
  return [
    ...upwardOptions,
    ...options.filter(option => !upwardValues.has(option.value))
  ]
}

function isUpwardGraphOption(value: string | null | undefined) {
  if (!value) {
    return false
  }

  const normalized = value.replace(/\s+/g, '')
  return normalized.includes('吹口在上') || /mouthpiece\s*up/i.test(value)
}

function translateGraphOptionLabel(value: string) {
  if (!value) {
    return null
  }

  const normalized = value.replace(/\s+/g, '')
  const direct = translateKuailepuGraphName(normalized)
  if (direct && direct !== normalized) {
    return direct
  }

  return translateKuailepuGraphName(value) ?? value
}
