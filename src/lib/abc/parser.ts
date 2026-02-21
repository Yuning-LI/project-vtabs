import * as abcjs from 'abcjs'
import { visualPitchToMidi } from './pitchToMidi'
import { NotePayload } from '@/lib/types'

export function extractPayload(abcString: string): NotePayload[] {
  const { parseOnly } = abcjs
  const tunes = parseOnly(abcString) as any[]
  const ast = tunes[0]
  const payload: NotePayload[] = []

  ast?.lines?.forEach((line: any) => {
    line.staff?.forEach((staff: any) => {
      staff.voices?.forEach((voice: any) => {
        voice.forEach((elem: any) => {
          if (elem.el_type === 'note') {
            if (elem.pitches && elem.pitches.length > 0) {
              const pitch = elem.pitches[0].pitch
              const midi = visualPitchToMidi(pitch)
              payload.push({ midi, skip: false })
            } else {
              payload.push({ midi: 0, skip: true })
            }
          } else {
            payload.push({ midi: 0, skip: true })
          }
        })
      })
    })
  })

  return payload
}
