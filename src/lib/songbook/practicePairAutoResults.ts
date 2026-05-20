import fs from 'node:fs'
import path from 'node:path'
import type { AutoPracticePairSeed } from './practicePairTypes.ts'

const autoResultsPath = path.resolve(
  process.cwd(),
  'data',
  'songbook',
  'practice-pair-auto.json'
)

let cachedAutoResults: Record<string, AutoPracticePairSeed[]> | null = null

export function loadPracticePairAutoResults() {
  if (cachedAutoResults) {
    return cachedAutoResults
  }

  if (!fs.existsSync(autoResultsPath)) {
    cachedAutoResults = {}
    return cachedAutoResults
  }

  const parsed = JSON.parse(fs.readFileSync(autoResultsPath, 'utf8')) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Practice pair auto results must be an object keyed by slug.')
  }

  cachedAutoResults = Object.fromEntries(
    Object.entries(parsed).map(([slug, value]) => [
      slug,
      Array.isArray(value)
        ? value
            .map(item => normalizeAutoPracticePairSeed(slug, item))
            .filter((item): item is AutoPracticePairSeed => Boolean(item))
        : []
    ])
  )

  return cachedAutoResults
}

function normalizeAutoPracticePairSeed(
  slug: string,
  value: unknown
): AutoPracticePairSeed | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const candidate = value as Partial<AutoPracticePairSeed>
  if (typeof candidate.slug !== 'string' || candidate.slug.trim().length < 1) {
    throw new Error(`Practice pair auto result "${slug}" has an invalid candidate slug.`)
  }
  if (typeof candidate.reason !== 'string' || candidate.reason.trim().length < 1) {
    throw new Error(`Practice pair auto result "${slug}" -> "${candidate.slug}" is missing reason.`)
  }
  if (typeof candidate.score !== 'number' || !Number.isFinite(candidate.score)) {
    throw new Error(`Practice pair auto result "${slug}" -> "${candidate.slug}" is missing score.`)
  }

  return {
    slug: candidate.slug.trim(),
    reason: candidate.reason.trim(),
    score: candidate.score
  }
}
