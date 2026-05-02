import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const repoRoot = process.cwd()
const sourceDir = path.join(repoRoot, 'data', 'kuailepu-runtime')
const outputDir = path.join(repoRoot, 'data', 'kuailepu-runtime-packed')

function packRuntimeSongs() {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Missing runtime source directory: ${sourceDir}`)
  }

  fs.mkdirSync(outputDir, { recursive: true })

  const sourceFiles = fs
    .readdirSync(sourceDir)
    .filter(file => file.endsWith('.json'))
    .sort()
  const expectedOutputFiles = new Set(sourceFiles.map(file => `${file}.gz`))

  let rawBytes = 0
  let packedBytes = 0

  for (const file of sourceFiles) {
    const sourcePath = path.join(sourceDir, file)
    const outputPath = path.join(outputDir, `${file}.gz`)
    const raw = fs.readFileSync(sourcePath)
    const packed = gzipSync(raw, { level: 9 })

    rawBytes += raw.byteLength
    packedBytes += packed.byteLength
    fs.writeFileSync(outputPath, packed)
  }

  for (const file of fs.readdirSync(outputDir)) {
    if (file.endsWith('.json.gz') && !expectedOutputFiles.has(file)) {
      fs.rmSync(path.join(outputDir, file))
    }
  }

  console.log(
    `Packed ${sourceFiles.length} Kuailepu runtime JSON files: ${formatBytes(rawBytes)} raw -> ${formatBytes(packedBytes)} gzip`
  )
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

packRuntimeSongs()
