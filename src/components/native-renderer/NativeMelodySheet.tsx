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
import type { SongIrDocument, SongIrMeasure, SongIrMeasureMarker } from '@/lib/native-renderer/songIr'

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
            data-native-row-width-rem={row.widthRem.toFixed(2)}
          >
            {row.measures.map(measureLayout => (
              <div
                key={measureLayout.measure.index}
                className={getDebugMeasureClassName(measureLayout.measure)}
                data-native-measure-width-rem={measureLayout.widthRem.toFixed(2)}
                data-native-measure-raw-width-rem={measureLayout.rawWidthRem.toFixed(2)}
                data-native-measure-compression-ratio={measureLayout.compressionRatio.toFixed(3)}
                data-native-measure-compressed={measureLayout.compressionRatio < 0.999}
                data-native-repeat-start={hasMeasureMarker(measureLayout.measure, 'repeat-start')}
                data-native-repeat-end={hasMeasureMarker(measureLayout.measure, 'repeat-end')}
                data-native-ending-start={getEndingStartLabel(measureLayout.measure) ?? undefined}
              >
                <NativeMeasureMarkers measure={measureLayout.measure} variant="debug" />
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
          <div
            key={`sheet-row-${row.rowIndex}`}
            className="flex items-end gap-y-5"
            data-native-row-width-rem={row.widthRem.toFixed(2)}
          >
            {row.measures.map(measureLayout => (
              <div
                key={`sheet-measure-${measureLayout.measure.index}`}
                className={getSheetMeasureClassName(measureLayout.measure)}
                data-native-measure-width-rem={measureLayout.widthRem.toFixed(2)}
                data-native-measure-raw-width-rem={measureLayout.rawWidthRem.toFixed(2)}
                data-native-measure-compression-ratio={measureLayout.compressionRatio.toFixed(3)}
                data-native-measure-compressed={measureLayout.compressionRatio < 0.999}
                data-native-repeat-start={hasMeasureMarker(measureLayout.measure, 'repeat-start')}
                data-native-repeat-end={hasMeasureMarker(measureLayout.measure, 'repeat-end')}
                data-native-ending-start={getEndingStartLabel(measureLayout.measure) ?? undefined}
                style={{ minHeight: `${118 * sheetScaleFactor}px` }}
              >
                <NativeMeasureMarkers
                  measure={measureLayout.measure}
                  sheetScaleFactor={sheetScaleFactor}
                  variant="sheet"
                />
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

function NativeMeasureMarkers({
  measure,
  sheetScaleFactor = 1,
  variant
}: {
  measure: SongIrMeasure
  sheetScaleFactor?: number
  variant: 'debug' | 'sheet'
}) {
  const endingLabel = getEndingStartLabel(measure)
  const repeatStart = hasMeasureMarker(measure, 'repeat-start')
  const repeatEnd = hasMeasureMarker(measure, 'repeat-end')
  const lineColor = variant === 'sheet' ? '#2a1d12' : '#7f6548'
  const dotSize = Math.max(3, 3.5 * sheetScaleFactor)
  const repeatTop = variant === 'sheet' ? 36 * sheetScaleFactor : 48
  const repeatHeight = variant === 'sheet' ? 58 * sheetScaleFactor : 70

  return (
    <>
      {endingLabel ? (
        <div
          className="absolute left-0 right-1 top-0 border-l border-t font-black leading-none text-[#5f472f]"
          data-native-ending-bracket="true"
          style={{
            borderColor: lineColor,
            fontSize: `${Math.max(9, 9 * sheetScaleFactor)}px`,
            height: `${Math.max(12, 13 * sheetScaleFactor)}px`,
            paddingLeft: `${Math.max(3, 3 * sheetScaleFactor)}px`,
            transform: 'translateY(-2px)'
          }}
        >
          {endingLabel}.
        </div>
      ) : null}
      {repeatStart ? (
        <NativeRepeatSign
          dotSize={dotSize}
          lineColor={lineColor}
          position="start"
          top={repeatTop}
          height={repeatHeight}
        />
      ) : null}
      {repeatEnd ? (
        <NativeRepeatSign
          dotSize={dotSize}
          lineColor={lineColor}
          position="end"
          top={repeatTop}
          height={repeatHeight}
        />
      ) : null}
    </>
  )
}

function NativeRepeatSign({
  dotSize,
  lineColor,
  position,
  top,
  height
}: {
  dotSize: number
  lineColor: string
  position: 'start' | 'end'
  top: number
  height: number
}) {
  const sideClass = position === 'start' ? 'left-0' : 'right-0'
  const dotSideClass = position === 'start' ? 'left-[7px]' : 'right-[7px]'

  return (
    <div
      className={`pointer-events-none absolute ${sideClass}`}
      data-native-repeat-sign={position}
      style={{ top: `${top}px`, height: `${height}px`, color: lineColor }}
    >
      <span
        className="absolute bottom-0 top-0 w-[2px] bg-current"
        style={{ [position === 'start' ? 'left' : 'right']: 0 }}
      />
      <span
        className="absolute bottom-0 top-0 w-px bg-current opacity-80"
        style={{ [position === 'start' ? 'left' : 'right']: 4 }}
      />
      <span
        className={`absolute ${dotSideClass} top-[36%] rounded-full bg-current`}
        style={{ height: `${dotSize}px`, width: `${dotSize}px` }}
      />
      <span
        className={`absolute ${dotSideClass} top-[56%] rounded-full bg-current`}
        style={{ height: `${dotSize}px`, width: `${dotSize}px` }}
      />
    </div>
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
  const notation = buildNativeEventNotation(event, instrument)
  const visualScale = eventLayout.visualScale

  return (
    <div
      className="flex flex-col items-center justify-end"
      data-native-event-width-rem={widthRem.toFixed(2)}
      data-native-event-visual-scale={visualScale.toFixed(3)}
      style={{ width: `${widthRem}rem` }}
    >
      <div className="mb-1 flex h-[56px] items-end justify-center">
        {event.kind === 'note' ? (
          <FingeringDiagram
            midi={event.midi}
            className=""
            style={{ height: `${50 * visualScale}px`, width: `${62 * visualScale}px` }}
          />
        ) : (
          <div style={{ height: `${50 * visualScale}px`, width: `${62 * visualScale}px` }} />
        )}
      </div>
      <div
        className={
          event.kind === 'note'
            ? 'flex h-10 min-w-10 items-center justify-center rounded-full border border-[#d2b98d] bg-[#fff6df] px-2 text-sm font-black shadow-[0_3px_8px_rgba(70,45,24,0.08)]'
            : 'flex h-10 min-w-8 items-center justify-center text-sm font-black text-[#aa9174]'
        }
      >
        <NativeEventNotationInline notation={notation} />
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
  const notation = buildNativeEventNotation(event, instrument)
  const visualScale = eventLayout.visualScale
  const cellWidthRem = Math.max(1.85, widthRem * 0.84) * sheetScaleFactor
  const diagramHeight = 49 * sheetScaleFactor * visualScale
  const diagramWidth = 60 * sheetScaleFactor * visualScale
  const noteHeight = 28 * sheetScaleFactor
  const lyricHeight = 16 * sheetScaleFactor

  return (
    <div
      className="flex flex-col items-center justify-end"
      data-native-event-width-rem={widthRem.toFixed(2)}
      data-native-event-visual-scale={visualScale.toFixed(3)}
      style={{ width: `${cellWidthRem}rem` }}
    >
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
        style={{
          fontSize: `${17 * sheetScaleFactor * Math.max(0.82, visualScale)}px`,
          height: `${noteHeight}px`
        }}
      >
        <NativeEventNotationInline
          notation={notation}
          dashScale={sheetScaleFactor * Math.max(0.82, visualScale)}
        />
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

function NativeEventNotationInline({
  notation,
  dashScale = 1
}: {
  notation: NativeEventNotation
  dashScale?: number
}) {
  return (
    <span
      className="inline-flex items-center justify-center gap-[0.16em] whitespace-nowrap"
      data-native-event-notation="true"
      data-native-group-open={notation.openParenCount}
      data-native-group-close={notation.closeParenCount}
      data-native-hold-count={notation.holdDashCount}
    >
      {notation.openParenCount > 0 ? (
        <span className="tracking-[-0.08em]">{'('.repeat(notation.openParenCount)}</span>
      ) : null}
      <span>{notation.label}</span>
      {Array.from({ length: notation.holdDashCount }).map((_, index) => (
        <span
          key={`${notation.label}-hold-${index}`}
          aria-label="hold"
          className="inline-block rounded-full bg-current align-middle"
          style={{
            height: `${Math.max(1.5, 2 * dashScale)}px`,
            width: `${Math.max(9, 11 * dashScale)}px`,
            transform: `translateY(${Math.max(1, 1.4 * dashScale)}px)`
          }}
        />
      ))}
      {notation.closeParenCount > 0 ? (
        <span className="tracking-[-0.08em]">{')'.repeat(notation.closeParenCount)}</span>
      ) : null}
    </span>
  )
}

type NativeEventNotation = {
  label: string
  holdDashCount: number
  openParenCount: number
  closeParenCount: number
}

function buildNativeEventNotation(
  event: NativeMelodyEventLayout['event'],
  instrument: NativeRendererInstrumentAdapter
): NativeEventNotation {
  return {
    label: event.kind === 'note' ? instrument.formatMidiLabel(event.midi) : 'R',
    holdDashCount: countHoldDashes(event.token),
    openParenCount: countGroupEdges(event.groups, 'open'),
    closeParenCount: countGroupEdges(event.groups, 'close')
  }
}

function countHoldDashes(token: string) {
  return token.match(/-+$/)?.[0]?.length ?? 0
}

function countGroupEdges(
  groups: NativeMelodyEventLayout['event']['groups'] | undefined,
  edge: 'open' | 'close'
) {
  if (!groups) {
    return 0
  }

  return groups.filter(group =>
    edge === 'open'
      ? group.position === 'start' || group.position === 'single'
      : group.position === 'end' || group.position === 'single'
  ).length
}

function getDebugMeasureClassName(measure: SongIrMeasure) {
  return [
    'relative flex min-h-[138px] items-end gap-1 border-r border-[#9b8062] pr-3',
    hasMeasureMarker(measure, 'repeat-start') ? 'border-l-4 border-l-[#7f6548] pl-3' : '',
    hasMeasureMarker(measure, 'repeat-end') ? 'border-r-4 border-r-[#7f6548]' : ''
  ]
    .filter(Boolean)
    .join(' ')
}

function getSheetMeasureClassName(measure: SongIrMeasure) {
  return [
    'relative flex items-end gap-0 border-r border-[#34261b] pr-1 last:border-r-0',
    hasMeasureMarker(measure, 'repeat-start') ? 'border-l-4 border-l-[#2a1d12] pl-1' : '',
    hasMeasureMarker(measure, 'repeat-end') ? 'border-r-4 border-r-[#2a1d12]' : ''
  ]
    .filter(Boolean)
    .join(' ')
}

function hasMeasureMarker(measure: SongIrMeasure, kind: SongIrMeasureMarker['kind']) {
  return measure.markers?.some(marker => marker.kind === kind) ?? false
}

function getEndingStartLabel(measure: SongIrMeasure) {
  const marker = measure.markers?.find(isEndingStartMarker)
  if (!marker) {
    return null
  }

  return marker.number ? String(marker.number) : ''
}

function isEndingStartMarker(
  marker: SongIrMeasureMarker
): marker is Extract<SongIrMeasureMarker, { kind: 'ending-start' }> {
  return marker.kind === 'ending-start'
}
