import fs from 'node:fs'
import path from 'node:path'
import { computeAutoPracticePairSeeds } from '../src/lib/songbook/practicePairAuto.ts'
import { songCatalog } from '../src/lib/songbook/catalog.ts'

const outputPath = path.resolve(
  process.cwd(),
  'data',
  'songbook',
  'practice-pair-auto.json'
)

const results = Object.fromEntries(
  songCatalog.map(song => [
    song.slug,
    computeAutoPracticePairSeeds(song.slug, null, 6)
  ])
)

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8')

console.log(`Generated practice pair auto results at ${outputPath}`)
