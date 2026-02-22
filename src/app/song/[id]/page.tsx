import SongClient from '@/app/song/SongClient'
import { songTitleMap } from '@/app/song/songData'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { id } = params
  const songName = songTitleMap[id] || 'Song'
  const descriptions: Record<string, string> = {
    'twinkle':
      'Learn to play Twinkle Twinkle Little Star on 12-hole ocarina with interactive tabs and visual fingering diagrams. Perfect for beginners.',
    'ode-to-joy':
      'Ode to Joy ocarina notes and tabs for 12-hole AC ocarina. Includes easy-to-follow fingering charts. Free and interactive.',
    'amazing-grace':
      'Amazing Grace ocarina tabs with visual fingering. Play this classic hymn on your 12-hole ocarina with our free interactive sheet.',
    'mary-lamb':
      'Mary Had a Little Lamb ocarina tabs for 12-hole ocarina. Simple and fun song for beginners. Interactive fingering charts included.',
    'jingle-bells':
      'Jingle Bells ocarina tabs – play this Christmas classic on 12-hole ocarina. Free interactive tabs with visual fingerings.',
    'happy-birthday':
      'Happy Birthday ocarina tabs for 12-hole AC ocarina. Celebrate with easy-to-read fingering charts. Free and interactive.'
  }
  const description =
    descriptions[id] ||
    `Learn to play ${songName} on 12-hole ocarina with our interactive tabs and visual fingering diagrams. Perfect for beginners.`
  return {
    title: `${songName} Ocarina Tabs | 12-Hole AC Ocarina Fingering Chart`,
    description
  }
}

export default function SongPage() {
  return <SongClient />
}
