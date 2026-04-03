import type { KuailepuRuntimePayload, KuailepuRuntimeState } from '../kuailepu/runtime'
import { translateKuailepuGraphName } from './kuailepuEnglish'
import type { PublicSongInstrumentId } from './publicInstruments'

export type PublicRuntimeControlOption = {
  value: string
  label: string
}

export type PublicRuntimeControlConfig = {
  graphOptions: PublicRuntimeControlOption[]
  scaleOptions: PublicRuntimeControlOption[]
  activeGraphVisibility: 'on' | 'off'
  activeGraphValue: string | null
  activeShowLyric: 'on' | 'off'
  activeShowMeasureNum: 'on' | 'off'
  activeMeasureLayout: 'compact' | 'mono'
  activeSheetScale: string
}

export function getPublicRuntimeGraphOptions(
  payload: Pick<KuailepuRuntimePayload, 'instrumentFingerings'>,
  instrumentId: PublicSongInstrumentId
) {
  const instrument = (payload.instrumentFingerings ?? []).find(
    option => option.instrument === instrumentId
  )

  return (instrument?.graphList ?? [])
    .filter(option => option.value?.trim())
    .map(option => ({
      value: option.value!.trim(),
      label:
        translateGraphOptionLabel(option.name?.trim() ?? '') ??
        option.name?.trim() ??
        option.value!.trim()
    }))
}

export function buildPublicRuntimeControlConfig(
  payload: Pick<KuailepuRuntimePayload, 'instrumentFingerings' | 'sheetScaleList'>,
  instrumentId: PublicSongInstrumentId,
  state: Pick<
    KuailepuRuntimeState,
    'show_graph' | 'show_lyric' | 'show_measure_num' | 'measure_layout' | 'sheet_scale'
  >
): PublicRuntimeControlConfig {
  const graphOptions = getPublicRuntimeGraphOptions(payload, instrumentId)
  const fallbackGraphValue = graphOptions[0]?.value ?? null
  const activeGraphValue =
    graphOptions.find(option => option.value === state.show_graph)?.value ?? fallbackGraphValue

  return {
    graphOptions,
    scaleOptions: buildSheetScaleOptions(payload.sheetScaleList),
    activeGraphVisibility: state.show_graph === 'off' ? 'off' : 'on',
    activeGraphValue,
    activeShowLyric: state.show_lyric === 'off' ? 'off' : 'on',
    activeShowMeasureNum: state.show_measure_num === 'on' ? 'on' : 'off',
    activeMeasureLayout: state.measure_layout === 'mono' ? 'mono' : 'compact',
    activeSheetScale: String(state.sheet_scale ?? 10)
  }
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
