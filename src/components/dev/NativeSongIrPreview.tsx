import NativeMelodySheet from '@/components/native-renderer/NativeMelodySheet'
import type { SongIrDocument } from '@/lib/native-renderer/songIr'

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

        <NativeMelodySheet song={song} />
      </main>
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[rgba(120,86,48,0.2)] bg-white/70 px-3 py-1.5">
      {children}
    </span>
  )
}
