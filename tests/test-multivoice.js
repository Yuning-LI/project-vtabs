const abcjs = require('abcjs')

const multiVoiceAbc = `X:1
M:4/4
L:1/4
K:C
V:1
C D E F |
V:2
G G G G |`

function extractMidiFromVisual(visualObj) {
  const midiSequence = []
  visualObj[0]?.lines?.forEach(line => {
    const staffs = line.staff
    if (!staffs || staffs.length === 0) return
    const staff = staffs[0]
    if (staff.voices && staff.voices.length > 0) {
      const mainVoice = staff.voices[0]
      mainVoice.forEach(elem => {
        if (elem.el_type === 'note' && !elem.grace && elem.pitches?.length > 0) {
          const rawPitch = elem.pitches[0].pitch
          const diatonic = [60, 62, 64, 65, 67, 69, 71]
          const octave = Math.floor(rawPitch / 7)
          const noteIndex = rawPitch % 7
          const midi = diatonic[noteIndex] + octave * 12
          midiSequence.push(midi)
        }
      })
    }
  })
  return midiSequence
}

const visualObj = abcjs.parseOnly(multiVoiceAbc, { add_classes: true })
const midiSeq = extractMidiFromVisual(visualObj)
console.log('提取的MIDI序列:', midiSeq)

if (
  midiSeq.length === 4 &&
  midiSeq[0] === 60 &&
  midiSeq[1] === 62 &&
  midiSeq[2] === 64 &&
  midiSeq[3] === 65
) {
  console.log('✅ 多声部锁定测试通过：只提取了第一个声部')
} else {
  console.error('❌ 多声部锁定测试失败：实际', midiSeq)
  process.exitCode = 1
}
