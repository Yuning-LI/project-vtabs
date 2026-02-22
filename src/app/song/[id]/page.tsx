import SongClient from '@/app/song/SongClient'
import { songTitleMap } from '@/app/song/songData'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { id } = params
  const songName = songTitleMap[id] || 'Song'
  return {
    title: `${songName} Ocarina Tabs | 12-Hole AC Ocarina Fingering Chart`,
    description: `Learn to play ${songName} on 12-hole AC ocarina. Interactive tabs with visual fingering diagrams and letter notes. Perfect for beginners.`
  }
}

export default function SongPage() {
  return <SongClient />
}
