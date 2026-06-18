import fs from 'node:fs'
import path from 'node:path'

const deployableRuntimeArchivePath = path.resolve(
  process.cwd(),
  'vendor',
  'kuailepu-runtime',
  'kuaiyuepu-runtime-archive.txt'
)
const localReferenceArchivePath = path.resolve(process.cwd(), 'reference', '快乐谱代码.txt')

type PublicRuntimeArchiveSource = {
  label: string
  pathLabel: string
  filePath: string
}

const PUBLIC_RUNTIME_ARCHIVE_SOURCES: readonly PublicRuntimeArchiveSource[] = [
  {
    label: 'deployable runtime archive',
    pathLabel: 'vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt',
    filePath: deployableRuntimeArchivePath
  },
  {
    label: 'local reference fallback',
    pathLabel: 'reference/快乐谱代码.txt',
    filePath: localReferenceArchivePath
  }
] as const

function resolveArchiveSourcePath(source: PublicRuntimeArchiveSource) {
  return source.filePath
}

export function listPublicRuntimeArchiveCandidatePaths() {
  return PUBLIC_RUNTIME_ARCHIVE_SOURCES.map(resolveArchiveSourcePath)
}

export function describePublicRuntimeArchiveCandidates() {
  return PUBLIC_RUNTIME_ARCHIVE_SOURCES.map(source =>
    `${source.label}: ${source.pathLabel}`
  ).join(', ')
}

export function resolvePublicRuntimeArchivePath() {
  return listPublicRuntimeArchiveCandidatePaths().find(candidate => fs.existsSync(candidate)) ?? null
}

export const resolveKuailepuRuntimeArchivePath = resolvePublicRuntimeArchivePath
