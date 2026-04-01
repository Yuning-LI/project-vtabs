import fs from 'node:fs'
import path from 'node:path'

const trackedRuntimeArchivePath = path.resolve(
  process.cwd(),
  'vendor',
  'kuailepu-runtime',
  'kuaiyuepu-runtime-archive.txt'
)
const localReferenceArchivePath = path.resolve(process.cwd(), 'reference', '快乐谱代码.txt')

export function resolveKuailepuRuntimeArchivePath() {
  return [trackedRuntimeArchivePath, localReferenceArchivePath].find(candidate =>
    fs.existsSync(candidate)
  ) ?? null
}
