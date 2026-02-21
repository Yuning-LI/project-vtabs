import Link from 'next/link'

export default function Home() {
  const songs = [
    { id: 'twinkle', title: 'Twinkle, Twinkle, Little Star', key: 'C', tempo: 100 },
    { id: 'ode-to-joy', title: 'Ode to Joy', key: 'C', tempo: 120 },
    { id: 'amazing-grace', title: 'Amazing Grace', key: 'C', tempo: 80 }
  ]

  return (
    <main className="min-h-screen bg-bg p-6">
      <h1 className="text-3xl font-bold text-primary mb-6">曲目列表</h1>
      <div className="grid gap-4">
        {songs.map(song => (
          <Link
            key={song.id}
            href={`/song/${song.id}`}
            className="block p-4 bg-white rounded-xl shadow-sm border border-wood-dark/10 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold text-primary">{song.title}</h2>
            <p className="text-wood-dark text-sm mt-1">
              {song.key}大调 · ♩ = {song.tempo}
            </p>
          </Link>
        ))}
      </div>
    </main>
  )
}
