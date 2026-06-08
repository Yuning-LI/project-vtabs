import { MIDI_TO_NAME } from '@/components/InstrumentDicts/ocarina12'
import type { SongIrDocument, SongIrEvent } from '@/lib/native-renderer/songIr'

type NativeSongIrPreviewProps = {
  song: SongIrDocument
}

export default function NativeSongIrPreview({ song }: NativeSongIrPreviewProps) {
  return (
    <div className="min-h-screen bg-[#eee0c5] px-4 py-6 text-[#2d2118]">
      <main className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="rounded-[30px] border border-[rgba(120,86,48,0.22)] bg-[rgba(255,250,241,0.92)] p-6 shadow-[0_24px_54px_rgba(70,45,24,0.12)]">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-[#806246]">
            Internal Native Renderer Preview
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight">{song.metadata.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6d5743]">
            This page renders from SongIR v0, not from the archived runtime iframe. It is an internal
            preview and is not wired to the public song page.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#604a36]">
            <Badge>{song.metadata.keynote}</Badge>
            <Badge>{song.metadata.meter ?? 'Unknown meter'}</Badge>
            <Badge>{song.stats.measureCount} measures</Badge>
            <Badge>{song.stats.noteCount} notes</Badge>
            <Badge>{song.stats.restCount} rests</Badge>
            <Badge>{song.stats.chordCount} chords</Badge>
          </div>
          {song.unsupported.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Unsupported syntax: {song.unsupported.join(', ')}
            </div>
          ) : null}
        </section>

        <section className="rounded-[30px] border border-[rgba(120,86,48,0.18)] bg-[#fffaf1] p-6 shadow-[0_18px_44px_rgba(70,45,24,0.1)]">
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-black tracking-[0.18em]">{song.metadata.title}</h2>
            <div className="mt-2 text-sm font-semibold text-[#806246]">
              SongIR v0 basic melody layout
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-x-3 gap-y-6">
            {song.measures.map(measure => (
              <div
                key={measure.index}
                className="relative flex min-h-[92px] items-end gap-1 border-r border-[#9b8062] pr-3"
              >
                <div className="absolute -top-4 left-0 text-[10px] font-bold text-[#b09675]">
                  {measure.index + 1}
                </div>
                {measure.chords.map(chord => (
                  <div
                    key={`${measure.index}-${chord.name}-${chord.eventIndex}`}
                    className="absolute -top-1 rounded-full bg-[#ead8b8] px-2 py-0.5 text-[10px] font-black text-[#5c422c]"
                    style={{ left: `${Math.max(0, chord.eventIndex) * 2.5}rem` }}
                  >
                    {chord.name}
                  </div>
                ))}
                {measure.events.map((event, index) => (
                  <EventCell key={`${measure.index}-${index}`} event={event} />
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function EventCell({ event }: { event: SongIrEvent }) {
  const width = Math.max(2.1, Math.min(4.8, event.slotCount * 0.7))
  const label = event.kind === 'note' ? formatMidiLabel(event.midi) : '—'

  return (
    <div className="flex flex-col items-center justify-end" style={{ width: `${width}rem` }}>
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
  return `${value.letter}${value.octave}`
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[rgba(120,86,48,0.2)] bg-white/70 px-3 py-1.5">
      {children}
    </span>
  )
}
