import type { PublicSongInstrumentId, PublicSongPageQueryState } from './publicInstruments'

/**
 * 公开 song page 与内部打印页现在共用同一套 query-state 归一化。
 *
 * 这里的职责只限于：
 * - 解析 URL 可见参数
 * - 丢弃不在当前公开边界内的值
 *
 * 它不负责给 runtime 填默认值；默认值仍应由页面层结合 payload 决定，
 * 这样公开详情页和内部打印页才能分别保留自己的默认策略。
 */
export function normalizeInstrumentId(value: string | null | undefined) {
  if (value === 'o12' || value === 'o6' || value === 'r8b' || value === 'r8g' || value === 'w6') {
    return value
  }

  return null
}

export function normalizeExplicitNoteLabelMode(value: string | null | undefined) {
  // `graph` 仍保留给内部兼容，但不再作为公开 UI 模式暴露。
  if (value === 'number' || value === 'graph') {
    return value
  }

  return null
}

export function normalizeToggleParam(value: string | null | undefined) {
  if (value === 'on' || value === 'off') {
    return value
  }

  return null
}

export function normalizeMeasureLayout(value: string | null | undefined) {
  if (value === 'compact' || value === 'mono') {
    return value
  }

  return null
}

export function normalizeSheetScale(
  value: string | null | undefined,
  sheetScaleList?: number[] | undefined
) {
  if (!value) {
    return null
  }

  const available = new Set((sheetScaleList ?? []).map(item => String(item)))
  if (available.size > 0) {
    return available.has(value) ? value : null
  }

  return /^\d+$/.test(value) ? value : null
}

export function normalizePracticeTool(value: string | null | undefined) {
  if (value === 'metronome') {
    return value
  }

  return null
}

export function parseSongPageQueryState(url: URL): PublicSongPageQueryState {
  return {
    instrumentId: normalizeInstrumentId(url.searchParams.get('instrument')) as PublicSongInstrumentId | null,
    noteLabelMode: normalizeExplicitNoteLabelMode(url.searchParams.get('note_label_mode')),
    showGraph: url.searchParams.get('show_graph'),
    showLyric: normalizeToggleParam(url.searchParams.get('show_lyric')),
    showNoteRange: normalizeToggleParam(url.searchParams.get('show_note_range')),
    showMeasureNum: normalizeToggleParam(url.searchParams.get('show_measure_num')),
    measureLayout: normalizeMeasureLayout(url.searchParams.get('measure_layout')),
    sheetScale: normalizeSheetScale(url.searchParams.get('sheet_scale')),
    practiceTool: normalizePracticeTool(url.searchParams.get('practice_tool'))
  }
}
