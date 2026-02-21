// 音符的 L2 数据（一个发音事件）
export type NotePayload = {
  midi: number
  skip: boolean
  pitchClass?: string
  octave?: number
  rawPitch?: number
}

// 指法状态数组，元素为 0 或 1（半孔暂不支持）
export type FingeringState = (0 | 1)[]

// 乐器定义接口
export type InstrumentDefinition = {
  id: string
  name: string
  holeCount: number
  range: [minMidi: number, maxMidi: number]
  dictionary: Record<number, FingeringState>
  draw: (state: FingeringState) => RenderResult
}

// 绘图函数返回结果
export type RenderResult = {
  element: SVGElement
  width: number
  height: number
}

// 坐标信息
export type NotePosition = {
  systemIndex: number
  x: number
  systemBottomY: number
}
