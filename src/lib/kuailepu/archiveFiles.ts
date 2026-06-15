import fs from 'node:fs'
import path from 'node:path'

type PublicRuntimeArchiveSource = {
  label: string
  pathSegments: readonly string[]
}

const PUBLIC_RUNTIME_ARCHIVE_SOURCES: readonly PublicRuntimeArchiveSource[] = [
  {
    label: 'deployable runtime archive',
    pathSegments: ['vendor', 'kuailepu-runtime', 'kuaiyuepu-runtime-archive.txt']
  },
  {
    label: 'local reference fallback',
    pathSegments: ['reference', '快乐谱代码.txt']
  }
] as const

function resolveArchiveSourcePath(source: PublicRuntimeArchiveSource) {
  return path.resolve(process.cwd(), ...source.pathSegments)
}

export function listPublicRuntimeArchiveCandidatePaths() {
  return PUBLIC_RUNTIME_ARCHIVE_SOURCES.map(resolveArchiveSourcePath)
}

export function describePublicRuntimeArchiveCandidates() {
  return PUBLIC_RUNTIME_ARCHIVE_SOURCES.map(source =>
    `${source.label}: ${source.pathSegments.join('/')}`
  ).join(', ')
}

export function resolvePublicRuntimeArchivePath() {
  return listPublicRuntimeArchiveCandidatePaths().find(candidate => fs.existsSync(candidate)) ?? null
}

export const resolveKuailepuRuntimeArchivePath = resolvePublicRuntimeArchivePath
