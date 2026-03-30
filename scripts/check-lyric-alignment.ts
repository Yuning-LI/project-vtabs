import { allSongCatalog } from '../src/lib/songbook/catalog.ts'
import { countSingableSlots, parseNotation, tokenizeLyricLine } from '../src/lib/songbook/jianpu.ts'

let errorCount = 0

for (const song of allSongCatalog) {
  const lyricLines = song.alignedLyrics ?? song.lyrics
  if (!lyricLines) continue

  const parsedLines = parseNotation(song.notation, song.tonicMidi)

  if (lyricLines.length !== parsedLines.length) {
    console.log(
      `[${song.id}] line-count mismatch: lyrics=${lyricLines.length} notation=${parsedLines.length}`
    )
    errorCount += 1
    continue
  }

  lyricLines.forEach((line, index) => {
    const lyricSlots = tokenizeLyricLine(line).length
    const noteSlots = countSingableSlots(parsedLines[index])

    if (lyricSlots !== noteSlots) {
      console.log(
        `[${song.id}] line ${index + 1} slot mismatch: lyrics=${lyricSlots} notes=${noteSlots}`
      )
      console.log(`  lyrics: ${line}`)
      console.log(`  notes:  ${song.notation[index]}`)
      errorCount += 1
    }
  })
}

if (errorCount === 0) {
  console.log(`Lyric alignment passed for ${allSongCatalog.filter(song => song.alignedLyrics ?? song.lyrics).length} songs.`)
} else {
  process.exitCode = 1
}
