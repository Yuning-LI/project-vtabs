import Link from 'next/link'

export const metadata = {
  title: 'Ocarina Tabs & Fingering Charts | Free 12-Hole Ocarina Songs',
  description:
    'Free interactive ocarina tabs for 12-hole AC ocarina. Learn to play Zelda songs, anime songs, and classics like Twinkle Twinkle. Visual fingering charts included.'
}

export default function Home() {
  const songs = [
    { id: 'twinkle', title: 'Twinkle, Twinkle, Little Star', key: 'C', tempo: 100 },
    { id: 'ode-to-joy', title: 'Ode to Joy', key: 'C', tempo: 120 },
    { id: 'amazing-grace', title: 'Amazing Grace', key: 'C', tempo: 80 },
    { id: 'mary-lamb', title: 'Mary Had a Little Lamb', key: 'C', tempo: 110 },
    { id: 'jingle-bells', title: 'Jingle Bells', key: 'C', tempo: 130 },
    { id: 'happy-birthday', title: 'Happy Birthday', key: 'C', tempo: 90 },
    { id: 'aura-lea', title: 'Aura Lea', key: 'C', tempo: 100 },
    { id: 'auld-lang-syne', title: 'Auld Lang Syne', key: 'C', tempo: 100 },
    { id: 'scarborough-fair', title: 'Scarborough Fair', key: 'C', tempo: 100 },
    { id: 'greensleeves', title: 'Greensleeves', key: 'C', tempo: 100 },
    { id: 'danny-boy', title: 'Danny Boy', key: 'C', tempo: 100 },
    { id: 'sakura', title: 'Sakura Sakura', key: 'C', tempo: 100 },
    { id: 'when-the-saints', title: 'When the Saints Go Marching In', key: 'C', tempo: 100 },
    { id: 'you-are-my-sunshine', title: 'You Are My Sunshine', key: 'C', tempo: 100 },
    { id: 'over-the-rainbow', title: 'Over the Rainbow', key: 'C', tempo: 100 },
    { id: 'we-wish-you', title: 'We Wish You a Merry Christmas', key: 'C', tempo: 100 }
  ]

  return (
    <main className="min-h-screen bg-bg p-6">
      <h1 className="text-3xl font-bold text-primary mb-6">Song List</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {songs.map(song => (
          <Link
            key={song.id}
            href={`/song/${song.id}`}
            className="block p-4 bg-white rounded-xl shadow-sm border border-wood-dark/10 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold text-primary">{song.title}</h2>
            <p className="text-wood-dark text-sm mt-1">
              Key: {song.key} · ♩ = {song.tempo}
            </p>
          </Link>
        ))}
      </div>
      <section className="mt-12 p-6 bg-white rounded-xl border border-wood-dark/10">
        <h2 className="text-2xl font-bold text-primary mb-4">About OcarinaMaster</h2>
        <p className="text-wood-dark leading-relaxed">
          Welcome to OcarinaMaster, your free source for interactive 12-hole AC ocarina tabs and fingering charts.
          Learn to play your favorite songs – from traditional folk tunes to Zelda classics – with our visual,
          easy-to-follow finger diagrams. No music theory required, just click and play. Perfect for beginners
          and hobbyists.
        </p>
        <p className="text-wood-dark leading-relaxed mt-4">
          Our collection includes popular pieces like Twinkle Twinkle Little Star, Ode to Joy, Amazing Grace,
          and many more. All tabs are free and optimized for mobile devices. Start your ocarina journey today!
        </p>
      </section>
    </main>
  )
}
