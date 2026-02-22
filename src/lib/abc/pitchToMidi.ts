/**
 * 将 abcjs 的视觉 pitch 值转换为标准 MIDI 编号
 *
 * 转换原理：C4 在 abcjs 中 pitch 为 0，D4 为 1，以此类推，每增加 7 升一个八度。
 * 基准数组 [60,62,64,65,67,69,71] 对应 C4 到 B4 的 MIDI 值。
 *
 * @param pitch - abcjs 音符对象的 pitch 属性（例如 0 表示 C4）
 * @returns MIDI 编号（例如 60 表示 C4）
 * @example visualPitchToMidi(0) => 60
 */
export function visualPitchToMidi(pitch: number): number {
  const DIATONIC_MIDI = [60, 62, 64, 65, 67, 69, 71] // C D E F G A B 在第四八度的 MIDI 值
  const noteIndex = pitch % 7 // 当前八度内的音级索引（0~6）
  const octaveShift = Math.floor(pitch / 7) // 相对于 C4 的八度偏移量
  return DIATONIC_MIDI[noteIndex] + octaveShift * 12
}
