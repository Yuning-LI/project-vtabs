import { allSongCatalog } from '../src/lib/songbook/catalog.ts'
import { auditLyricAlignment } from '../src/lib/songbook/lyricAudit.ts'

let errorCount = 0

for (const song of allSongCatalog) {
  const lyricLines = song.alignedLyrics ?? song.lyrics
  if (!lyricLines) continue

  const issues = auditLyricAlignment({
    notationLines: song.notation,
    tonicMidi: song.tonicMidi,
    lyricLines
  })

  issues.forEach(issue => {
    console.log(`[${song.id}] ${issue.code}: ${issue.message}`)
    if (issue.severity === 'warning') {
      errorCount += 1
    }
  })
}

if (errorCount === 0) {
  console.log(`Lyric alignment passed for ${allSongCatalog.filter(song => song.alignedLyrics ?? song.lyrics).length} songs.`)
} else {
  process.exitCode = 1
}
