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
      'Happy Birthday ocarina tabs for 12-hole AC ocarina. Celebrate with easy-to-read fingering charts. Free and interactive.',
    'aura-lea':
      'Learn to play Aura Lea on 12-hole ocarina. Free interactive tabs with visual fingering charts. The melody of "Love Me Tender" – perfect for beginners.',
    'auld-lang-syne':
      'Free Auld Lang Syne ocarina tabs for 12-hole AC ocarina. Easy-to-follow fingering diagrams. Perfect for New Year’s Eve and beginner practice.',
    'scarborough-fair':
      'Learn Scarborough Fair on ocarina with our free interactive tabs. Visual fingering charts for 12-hole AC ocarina. Traditional English folk song.',
    'greensleeves':
      'Free Greensleeves ocarina tabs for 12-hole AC ocarina. Easy-to-read visual fingering diagrams. A must-learn classic for all ocarina players.',
    'danny-boy':
      'Free Danny Boy ocarina tabs with visual fingering charts. Learn this beautiful Irish melody on 12-hole AC ocarina. Perfect for beginners.',
    'sakura':
      'Free Sakura Sakura ocarina tabs for 12-hole AC ocarina. Learn this iconic Japanese folk song with our interactive fingering charts.',
    'when-the-saints':
      'Free When the Saints Go Marching In ocarina tabs for 12-hole AC ocarina. Easy traditional gospel song with visual fingering diagrams.',
    'you-are-my-sunshine':
      'Free You Are My Sunshine ocarina tabs for 12-hole AC ocarina. Learn this beloved American folk song with our interactive fingering charts.',
    'over-the-rainbow':
      'Free Over the Rainbow ocarina tabs for 12-hole AC ocarina. Learn this Wizard of Oz classic with visual fingering diagrams. 1939 public domain.',
    'we-wish-you':
      'Free We Wish You a Merry Christmas ocarina tabs for 12-hole AC ocarina. Easy Christmas song with visual fingering charts. Perfect for holiday practice.'
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
