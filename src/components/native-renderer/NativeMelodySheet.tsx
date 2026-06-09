import FingeringDiagram from '@/components/song/FingeringDiagram'
import {
  getNativeRendererInstrumentAdapter,
  type NativeRendererInstrumentAdapter,
  type NativeRendererInstrumentId
} from '@/lib/native-renderer/instruments'
import { buildNativeMelodyLayout } from '@/lib/native-renderer/layout'
import type { NativeMelodyEventLayout } from '@/lib/native-renderer/layout'
import type { SongIrDocument } from '@/lib/native-renderer/songIr'

type NativeMelodySheetProps = {
  song: SongIrDocument
  instrumentId?: NativeRendererInstrumentId
  measureRowSize?: number
  variant?: 'debug' | 'sheet'
}

export default function NativeMelodySheet({
  song,
  instrumentId = 'o12',
  measureRowSize = 4,
  variant = 'debug'
}: NativeMelodySheetProps) {
  const layout = buildNativeMelodyLayout(song, { measureRowSize })
  const instrument = getNativeRendererInstrumentAdapter(instrumentId)

  if (variant === 'sheet') {
    return <NativeSheetView layout={layout} instrument={instrument} title={song.metadata.title} />
  }

  return <NativeDebugView layout={layout} instrument={instrument} title={song.metadata.title} />
}

function NativeDebugView({
  layout,
  instrument,
  title
}: {
  layout: ReturnType<typeof buildNativeMelodyLayout>
  instrument: NativeRendererInstrumentAdapter
  title: string
}) {
  return (
    <section className="rounded-[30px] border border-[rgba(120,86,48,0.18)] bg-[#fffaf1] p-6 shadow-[0_18px_44px_rgba(70,45,24,0.1)]">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-black tracking-[0.18em]">{title}</h2>
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
                    instrument={instrument}
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

function NativeSheetView({
  layout,
  instrument,
  title
}: {
  layout: ReturnType<typeof buildNativeMelodyLayout>
  instrument: NativeRendererInstrumentAdapter
  title: string
}) {
  return (
    <section className="rounded-[18px] bg-[#fff8ee] px-5 py-6 text-[#2f2115] shadow-[0_14px_34px_rgba(70,45,24,0.08)]">
      <h2 className="mb-7 text-center text-[22px] font-black tracking-[0.06em] text-[#21160f]">
        {title}
      </h2>

      <div className="flex flex-col gap-6">
        {layout.rows.map(row => (
          <div key={`sheet-row-${row.rowIndex}`} className="flex flex-wrap items-end gap-y-5">
            {row.measures.map(measureLayout => (
              <div
                key={`sheet-measure-${measureLayout.measure.index}`}
                className="relative flex min-h-[118px] items-end gap-0 border-r border-[#34261b] pr-1 last:border-r-0"
              >
                {measureLayout.chords.map(chordLayout => (
                  <div
                    key={`sheet-chord-${measureLayout.measure.index}-${chordLayout.chord.name}-${chordLayout.chord.eventIndex}`}
                    className="absolute top-0 rounded-full bg-[#f3dfbd] px-1.5 py-0.5 text-[9px] font-black leading-none text-[#5c422c]"
                    style={{ left: `${chordLayout.leftRem}rem` }}
                  >
                    {chordLayout.chord.name}
                  </div>
                ))}
                {measureLayout.events.map(eventLayout => (
                  <SheetEventCell
                    key={`sheet-event-${measureLayout.measure.index}-${eventLayout.eventIndex}`}
                    eventLayout={eventLayout}
                    instrument={instrument}
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

function EventCell({
  eventLayout,
  instrument
}: {
  eventLayout: NativeMelodyEventLayout
  instrument: NativeRendererInstrumentAdapter
}) {
  const { event, widthRem } = eventLayout
  const label = event.kind === 'note' ? instrument.formatMidiLabel(event.midi) : '-'

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

function SheetEventCell({
  eventLayout,
  instrument
}: {
  eventLayout: NativeMelodyEventLayout
  instrument: NativeRendererInstrumentAdapter
}) {
  const { event, widthRem } = eventLayout
  const label = event.kind === 'note' ? instrument.formatMidiLabel(event.midi) : '-'
  const cellWidthRem = Math.max(2.55, widthRem * 0.84)

  return (
    <div className="flex flex-col items-center justify-end" style={{ width: `${cellWidthRem}rem` }}>
      <div className="mb-0.5 flex h-[55px] items-end justify-center">
        {event.kind === 'note' ? (
          <FingeringDiagram midi={event.midi} className="h-[49px] w-[60px]" />
        ) : (
          <div className="h-[49px] w-[60px]" />
        )}
      </div>
      <div className="flex h-7 items-center justify-center text-[17px] font-black leading-none tracking-[0.01em] text-[#1d130c]">
        {label}
      </div>
      <div className="mt-0.5 h-4 max-w-[3.7rem] truncate text-center text-[10px] font-semibold leading-4 text-[#38281b]">
        {event.kind === 'note' ? event.lyric ?? '\u00A0' : '\u00A0'}
      </div>
    </div>
  )
}
