import { allSongCatalog } from '../src/lib/songbook/catalog.ts'
import { validateSong } from '../src/lib/songbook/validator.ts'

const reports = allSongCatalog.map(validateSong)

let errorCount = 0
let warningCount = 0
const gradeBuckets = { A: 0, B: 0, C: 0, D: 0 }

for (const report of reports) {
  gradeBuckets[report.grade] += 1
  console.log(`\n[${report.songId}] ${report.title}  grade=${report.grade} score=${report.score}`)

  if (report.chordSymbols.length > 0) {
    console.log(`  chords: ${report.chordSymbols.join(', ')}`)
  }

  if (report.abcComparison) {
    console.log(
      `  abc-check: manual=${report.abcComparison.manualNoteCount} abc=${report.abcComparison.abcNoteCount} shift=${report.abcComparison.recommendedShift >= 0 ? '+' : ''}${report.abcComparison.recommendedShift} mismatch=${report.abcComparison.mismatchCount}`
    )
  }

  for (const fit of report.instrumentFits) {
    console.log(
      `  fit:${fit.instrumentId} shift=${fit.recommendedShift >= 0 ? '+' : ''}${fit.recommendedShift} out=${fit.outOfRangeCount}`
    )
  }

  if (report.issues.length === 0) {
    console.log('  issues: none')
    continue
  }

  for (const issue of report.issues) {
    console.log(`  ${issue.severity}: [${issue.code}] ${issue.message}`)
    if (issue.severity === 'error') errorCount += 1
    if (issue.severity === 'warning') warningCount += 1
  }
}

console.log(
  `\nSummary: ${reports.length} songs, ${warningCount} warnings, ${errorCount} errors, grades A:${gradeBuckets.A} B:${gradeBuckets.B} C:${gradeBuckets.C} D:${gradeBuckets.D}`
)

if (errorCount > 0) {
  process.exitCode = 1
}
