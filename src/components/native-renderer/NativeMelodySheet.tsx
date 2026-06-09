import { MIDI_TO_NAME } from '@/components/InstrumentDicts/ocarina12'
import FingeringDiagram from '@/components/song/FingeringDiagram'
import { buildNativeMelodyLayout } from '@/lib/native-renderer/layout'
import type { NativeMelodyEventLayout } from '@/lib/native-renderer/layout'
import type { SongIrDocument } from '@/lib/native-renderer/songIr'

type NativeMelodySheetProps = {
  song: SongIrDocument
  measureRowSize?: number
}

export default function NativeMelodySheet({ song, measureRowSize = 4 }: NativeMelodySheetProps) {
  const layout = buildNativeMelodyLayout(song, { measureRowSize })

  return (
    <section className="rounded-[30px] border border-[rgba(120,86,48,0.18)] bg-[#fffaf1] p-6 shadow-[0_18px_44px_rgba(70,45,24,0.1)]">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-black tracking-[0.18em]">{song.metadata.title}</h2>
        <div className="mt-2 text-sm font-semibold text-[#806246]">
          SongIR v0 basic melody layout
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {layout.rows.map(row => (
          <div
            key={`row-${row.rowIndex}`}
            className="flex flex-wrap items-start gap-x-4 gap-y-5 border-b border-dashed border-[#ead8b8] pb-5 last:border-b-0 last:pb-0"
          >
            {row.measures.map(measureLayout => (
              <div
                key={measureLayout.measure.index}
                className="relative flex min-h-[138px] items-end gap-1 border-r border-[#9b8062] pr-3"
              >
                <div className="absolute -top-4 left-0 text-[10px] font-bold text-[#b09675]">
                  {measureLayout.measure.index + 1}
                </div>
                {measureLayout.chords.map(chordLayout => (
                  <div
                    key={`${measureLayout.measure.index}-${chordLayout.chord.name}-${chordLayout.chord.eventIndex}`}
                    className="absolute top-1 rounded-full bg-[#ead8b8] px-2 py-0.5 text-[10px] font-black text-[#5c422c]"
                    style={{ left: `${chordLayout.leftRem}rem` }}
                  >
                    {chordLayout.chord.name}
                  </div>
                ))}
                {measureLayout.events.map(eventLayout => (
                  <EventCell
                    key={`${measureLayout.measure.index}-${eventLayout.eventIndex}`}
                    eventLayout={eventLayout}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

function EventCell({ eventLayout }: { eventLayout: NativeMelodyEventLayout }) {
  const { event, widthRem } = eventLayout
  const label = event.kind === 'note' ? formatMidiLabel(event.midi) : '-'

  return (
    <div className="flex flex-col items-center justify-end" style={{ width: `${widthRem}rem` }}>
      <div className="mb-1 flex h-[56px] items-end justify-center">
        {event.kind === 'note' ? (
          <FingeringDiagram midi={event.midi} className="h-[50px] w-[62px]" />
        ) : (
          <div className="h-[50px] w-[62px]" />
        )}
      </div>
      <div
        className={
          event.kind === 'note'
            ? 'flex h-10 min-w-10 items-center justify-center rounded-full border border-[#d2b98d] bg-[#fff6df] px-2 text-sm font-black shadow-[0_3px_8px_rgba(70,45,24,0.08)]'
            : 'flex h-10 min-w-8 items-center justify-center text-sm font-black text-[#aa9174]'
        }
      >
        {label}
      </div>
      <div className="mt-1 h-4 text-[10px] font-semibold text-[#9b8062]">
        {event.kind === 'note' ? event.lyric ?? '\u00A0' : '\u00A0'}
      </div>
      <div className="mt-0.5 text-[9px] font-bold text-[#b09675]">{event.slotCount}</div>
    </div>
  )
}

function formatMidiLabel(midi: number) {
  const value = MIDI_TO_NAME[midi]
  if (!value) {
    return String(midi)
  }
  if (typeof value === 'string') {
    return value
  }
  // Public runtime letter labels use fingering-scale display octaves: C fingering starts at C5.
  return `${value.letter}${value.octave + 1}`
}
