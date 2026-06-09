import FingeringDiagram from '@/components/song/FingeringDiagram'
import {
  getNativeRendererInstrumentAdapter,
  type NativeRendererInstrumentAdapter,
  type NativeRendererInstrumentId
} from '@/lib/native-renderer/instruments'
import { buildNativeMelodyLayout } from '@/lib/native-renderer/layout'
import type {
  NativeMelodyEventLayout,
  NativeMelodyMeasureLayoutMode
} from '@/lib/native-renderer/layout'
import { getNativeSheetScaleFactor } from '@/lib/native-renderer/layout'
import type { SongIrDocument } from '@/lib/native-renderer/songIr'

type NativeMelodySheetProps = {
  song: SongIrDocument
  instrumentId?: NativeRendererInstrumentId
  measureLayout?: NativeMelodyMeasureLayoutMode
  measureRowSize?: number
  showGraph?: 'on' | 'off'
  showLyric?: 'on' | 'off'
  showMeasureNum?: 'on' | 'off'
  sheetScale?: string | number
  variant?: 'debug' | 'sheet'
}

export default function NativeMelodySheet({
  song,
  instrumentId = 'o12',
  measureLayout = 'compact',
  measureRowSize = 4,
  showGraph = 'on',
  showLyric = 'on',
  showMeasureNum = 'off',
  sheetScale = 10,
  variant = 'debug'
}: NativeMelodySheetProps) {
  const layout = buildNativeMelodyLayout(song, { measureLayout, measureRowSize })
  const instrument = getNativeRendererInstrumentAdapter(instrumentId)
  const sheetScaleFactor = getNativeSheetScaleFactor(sheetScale)

  if (variant === 'sheet') {
    return (
      <NativeSheetView
        layout={layout}
        instrument={instrument}
        showGraph={showGraph}
        showLyric={showLyric}
        showMeasureNum={showMeasureNum}
        sheetScaleFactor={sheetScaleFactor}
        title={song.metadata.title}
      />
    )
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
  showGraph,
  showLyric,
  showMeasureNum,
  sheetScaleFactor,
  title
}: {
  layout: ReturnType<typeof buildNativeMelodyLayout>
  instrument: NativeRendererInstrumentAdapter
  showGraph: 'on' | 'off'
  showLyric: 'on' | 'off'
  showMeasureNum: 'on' | 'off'
  sheetScaleFactor: number
  title: string
}) {
  const titleFontSize = 22 * sheetScaleFactor
  const rowGapRem = 1.5 * sheetScaleFactor

  return (
    <section className="rounded-[18px] bg-[#fff8ee] px-5 py-6 text-[#2f2115] shadow-[0_14px_34px_rgba(70,45,24,0.08)]">
      <h2
        className="mb-7 text-center font-black tracking-[0.06em] text-[#21160f]"
        style={{ fontSize: `${titleFontSize}px` }}
      >
        {title}
      </h2>

      <div className="flex flex-col" style={{ gap: `${rowGapRem}rem` }}>
        {layout.rows.map(row => (
          <div key={`sheet-row-${row.rowIndex}`} className="flex flex-wrap items-end gap-y-5">
            {row.measures.map(measureLayout => (
              <div
                key={`sheet-measure-${measureLayout.measure.index}`}
                className="relative flex items-end gap-0 border-r border-[#34261b] pr-1 last:border-r-0"
                style={{ minHeight: `${118 * sheetScaleFactor}px` }}
              >
                {showMeasureNum === 'on' ? (
                  <div
                    className="absolute left-0 top-0 font-black leading-none text-[#8c6f50]"
                    data-native-measure-number="true"
                    style={{ fontSize: `${9 * sheetScaleFactor}px` }}
                  >
                    {measureLayout.measure.index + 1}
                  </div>
                ) : null}
                {measureLayout.chords.map(chordLayout => (
                  <div
                    key={`sheet-chord-${measureLayout.measure.index}-${chordLayout.chord.name}-${chordLayout.chord.eventIndex}`}
                    className="absolute top-0 rounded-full bg-[#f3dfbd] px-1.5 py-0.5 font-black leading-none text-[#5c422c]"
                    style={{
                      fontSize: `${9 * sheetScaleFactor}px`,
                      left: `${chordLayout.leftRem * 0.84 * sheetScaleFactor}rem`
                    }}
                  >
                    {chordLayout.chord.name}
                  </div>
                ))}
                {measureLayout.events.map(eventLayout => (
                  <SheetEventCell
                    key={`sheet-event-${measureLayout.measure.index}-${eventLayout.eventIndex}`}
                    eventLayout={eventLayout}
                    instrument={instrument}
                    showGraph={showGraph}
                    showLyric={showLyric}
                    sheetScaleFactor={sheetScaleFactor}
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
  instrument,
  showGraph,
  showLyric,
  sheetScaleFactor
}: {
  eventLayout: NativeMelodyEventLayout
  instrument: NativeRendererInstrumentAdapter
  showGraph: 'on' | 'off'
  showLyric: 'on' | 'off'
  sheetScaleFactor: number
}) {
  const { event, widthRem } = eventLayout
  const label = event.kind === 'note' ? instrument.formatMidiLabel(event.midi) : '-'
  const cellWidthRem = Math.max(2.55, widthRem * 0.84) * sheetScaleFactor
  const diagramHeight = 49 * sheetScaleFactor
  const diagramWidth = 60 * sheetScaleFactor
  const noteHeight = 28 * sheetScaleFactor
  const lyricHeight = 16 * sheetScaleFactor

  return (
    <div className="flex flex-col items-center justify-end" style={{ width: `${cellWidthRem}rem` }}>
      {showGraph === 'on' ? (
        <div
          className="mb-0.5 flex items-end justify-center"
          style={{ height: `${55 * sheetScaleFactor}px` }}
        >
          {event.kind === 'note' ? (
            <FingeringDiagram
              midi={event.midi}
              className=""
              style={{ height: `${diagramHeight}px`, width: `${diagramWidth}px` }}
            />
          ) : (
            <div style={{ height: `${diagramHeight}px`, width: `${diagramWidth}px` }} />
          )}
        </div>
      ) : null}
      <div
        className="flex items-center justify-center font-black leading-none tracking-[0.01em] text-[#1d130c]"
        style={{ fontSize: `${17 * sheetScaleFactor}px`, height: `${noteHeight}px` }}
      >
        {label}
      </div>
      {showLyric === 'on' ? (
        <div
          className="mt-0.5 truncate text-center font-semibold text-[#38281b]"
          style={{
            fontSize: `${10 * sheetScaleFactor}px`,
            height: `${lyricHeight}px`,
            lineHeight: `${lyricHeight}px`,
            maxWidth: `${3.7 * sheetScaleFactor}rem`
          }}
        >
          {event.kind === 'note' ? event.lyric ?? '\u00A0' : '\u00A0'}
        </div>
      ) : null}
    </div>
  )
}
