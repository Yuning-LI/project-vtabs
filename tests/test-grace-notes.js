const abcjs = require('abcjs')

const abc = `X:1
M:4/4
L:1/4
K:C
C {D} E |`

const visualObj = abcjs.parseOnly(abc, { add_classes: true })

const extractMidi = visualObjInput => {
  const midiSequence = []
  visualObjInput[0]?.lines?.forEach(line => {
    line.staff?.forEach(staff => {
      staff.voices?.forEach(voice => {
        voice.forEach(elem => {
          if (elem.el_type === 'note' && !elem.grace && elem.pitches?.length > 0) {
            const rawPitch = elem.pitches[0].pitch
            const diatonic = [60, 62, 64, 65, 67, 69, 71]
            const octave = Math.floor(rawPitch / 7)
            const noteIndex = rawPitch % 7
            const midi = diatonic[noteIndex] + octave * 12
            midiSequence.push(midi)
          }
        })
      })
    })
  })
  return midiSequence
}

const midiSequence = extractMidi(visualObj)
console.log('提取的MIDI序列:', midiSequence)

if (midiSequence.length === 2 && midiSequence[0] === 60 && midiSequence[1] === 64) {
  console.log('✅ 装饰音测试通过：装饰音被正确跳过')
} else {
  console.error('❌ 装饰音测试失败：预期 [60, 64]，实际', midiSequence)
  process.exitCode = 1
}
