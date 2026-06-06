import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright-extra'
import type { Browser, BrowserContext, Page } from 'playwright'
import stealthPlugin from 'puppeteer-extra-plugin-stealth'
import { buildKuailepuSongDoc, type KuailepuSongPayload } from '../src/lib/songbook/kuailepuImport.ts'
import {
  getPrimaryPage,
  hasKuailepuProfile,
  launchKuailepuPersistentContext
} from './kuailepuAuth.ts'

chromium.use(stealthPlugin())

type ManagedQueueEntry = {
  priority: number
  status: 'stock-unpublished' | 'queued' | 'live'
  sourceKind: 'stock' | 'queue'
  slug: string
  title: string
  sourcePath: string
  note: string | null
  sourcePriority: number | null
  published: boolean
  detailUrl?: string
  songUuid?: string
  demand?: number
  risk?: number
  sourceFile?: string
}

type QueueFile = {
  entries?: ManagedQueueEntry[]
}

type BrowserMode = 'unauth' | 'profile'

type Session = {
  browser: Browser | null
  context: BrowserContext
  page: Page
}

type SongTarget = Extract<ManagedQueueEntry, { status: 'queued' }>

const DEFAULT_COUNT = 3
const QUEUE_PATH = path.resolve(process.cwd(), 'data/songbook/kuailepu-grey-import-queue.json')
const STOCK_DRAFT_DIR = path.resolve(
  process.cwd(),
  'reference/kuailepu-candidates/publish-drafts'
)
const RUNTIME_DIR = path.resolve(process.cwd(), 'reference/kuailepu-candidates/runtime')
const SONGDOC_DIR = path.resolve(process.cwd(), 'reference/kuailepu-candidates/songdocs')
const REPORT_DIR = path.resolve(process.cwd(), 'reference/kuailepu-candidates/reports')

const options = parseArgs(process.argv.slice(2))
const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8')) as QueueFile
const targets = (queue.entries ?? [])
  .filter((entry): entry is SongTarget => entry.status === 'queued')
  .slice(0, options.count)

if (targets.length < 1) {
  console.error('No queued Kuailepu grey songs were available for stock import.')
  process.exit(1)
}

await fs.promises.mkdir(STOCK_DRAFT_DIR, { recursive: true })
await fs.promises.mkdir(RUNTIME_DIR, { recursive: true })
await fs.promises.mkdir(SONGDOC_DIR, { recursive: true })
await fs.promises.mkdir(REPORT_DIR, { recursive: true })

const batchNumber = resolveNextBatchNumber()
const batchDate = new Date().toISOString().slice(0, 10)
const batchFileName = `grey-stock-ready-${batchDate}-batch-${batchNumber}.json`
const batchPath = path.join(STOCK_DRAFT_DIR, batchFileName)

const batchEntries: Array<Record<string, unknown>> = []
const evidence: Array<{
  slug: string
  title: string
  sourceUrl: string
  mode: BrowserMode
}> = []

let sessionMode: BrowserMode = 'unauth'
let session = await openUnauthenticatedSession()

try {
  for (const target of targets) {
    const sourceUrl = target.detailUrl ?? target.sourcePath
    const result = await readTargetPayload(target, sourceUrl, sessionMode, session)
    session = result.session
    sessionMode = result.mode

    const payload = result.payload
    const runtimePath = path.join(RUNTIME_DIR, `${target.slug}.json`)
    const songDocPath = path.join(SONGDOC_DIR, `${target.slug}.json`)
    const importedOn = batchDate

    await fs.promises.writeFile(runtimePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

    const songDoc = buildKuailepuSongDoc(payload, {
      id: target.slug,
      slug: target.slug,
      title: target.title,
      published: false,
      sourceUrl,
      importedOn
    })
    await fs.promises.writeFile(songDocPath, `${JSON.stringify(songDoc, null, 2)}\n`, 'utf8')

    const entry = buildBatchEntry(target, sourceUrl, payload, batchDate, batchNumber, sessionMode)
    batchEntries.push(entry)
    evidence.push({
      slug: target.slug,
      title: target.title,
      sourceUrl,
      mode: sessionMode
    })

    await sleep(randomBetween(2200, 5200))
  }
} finally {
  await closeSession(session)
}

await fs.promises.writeFile(
  batchPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note:
        'Local grey-song stock import batch. The unauthenticated session is tried first, then the saved login profile if needed. Import-only state is recorded here; public promotion still needs the usual tracked validation path.',
      featuredRankPlan: {
        currentTrackedMax: 278,
        strategy: 'assign next consecutive featuredRank values at promotion time, in the order chosen for publication'
      },
      evidence,
      entries: batchEntries
    },
    null,
    2
  )}\n`,
  'utf8'
)

execFileSync(
  'npm',
  ['run', 'build:kuailepu-grey-import-queue', '--', '--out=data/songbook/kuailepu-grey-import-queue.json'],
  {
    cwd: process.cwd(),
    stdio: 'inherit'
  }
)

console.log(
  JSON.stringify(
    {
      ok: true,
      batchPath: path.relative(process.cwd(), batchPath),
      imported: targets.map(target => ({
        slug: target.slug,
        title: target.title
      })),
      mode: sessionMode,
      nextUnpublishedCount: countUnpublishedInQueue()
    },
    null,
    2
  )
)

async function openUnauthenticatedSession(): Promise<Session> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ locale: 'zh-CN' })
  const page = await context.newPage()
  return { browser, context, page }
}

async function openProfileSession(): Promise<Session> {
  const context = await launchKuailepuPersistentContext({ headless: true })
  const page = await getPrimaryPage(context)
  return { browser: null, context, page }
}

async function closeSession(session: Session) {
  await session.context.close().catch(() => undefined)
  if (session.browser) {
    await session.browser.close().catch(() => undefined)
  }
}

async function readTargetPayload(
  target: SongTarget,
  sourceUrl: string,
  mode: BrowserMode,
  session: Session
) {
  const attempt = await readPayloadFromSession(target.slug, sourceUrl, session)
  if (attempt.payload) {
    return {
      ...attempt,
      session,
      mode
    }
  }

  if (attempt.stopError) {
    throw attempt.stopError
  }

  if (mode === 'unauth') {
    if (!(await hasKuailepuProfile())) {
      throw new Error(`Unable to read Kuailepu context for ${target.slug} without a saved login profile.`)
    }

    await closeSession(session)
    const profileSession = await openProfileSession()
    const secondAttempt = await readPayloadFromSession(target.slug, sourceUrl, profileSession)

    if (secondAttempt.stopError) {
      throw secondAttempt.stopError
    }
    if (!secondAttempt.payload) {
      const embedded = await fetchEmbeddedContextFromHtml(sourceUrl)
      if (!embedded) {
        throw new Error(`Unable to read Kuailepu context for ${target.slug} from the saved login profile.`)
      }

      return {
        payload: embedded,
        session: profileSession,
        mode: 'profile' as const
      }
    }

    return {
      ...secondAttempt,
      session: profileSession,
      mode: 'profile' as const
    }
  }

  const fallback = await fetchEmbeddedContextFromHtml(sourceUrl)
  if (!fallback) {
    throw new Error(`Unable to decode embedded Kuailepu context for ${target.slug}`)
  }

  return {
    payload: fallback,
    session,
    mode
  }
}

async function readPayloadFromSession(slug: string, sourceUrl: string, session: Session) {
  const page = session.page
  let response: Awaited<ReturnType<Page['goto']>> | null = null
  try {
    response = await page.goto(sourceUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })
  } catch (error) {
    if (isNavigationTimeout(error)) {
      return { payload: null, stopError: null }
    }
    throw error
  }

  const status = response?.status() ?? 0
  const bodyText = await page.locator('body').textContent().catch(() => '')
  if (isLoginWall(page.url(), bodyText)) {
    return { payload: null, stopError: null }
  }
  if (status === 403 || status === 502 || isStopPage(bodyText)) {
    await captureBlockedEvidence(slug, sourceUrl, page, status, bodyText)
    return {
      payload: null,
      stopError: new KuailepuStopError(
        `Kuailepu returned a blocked page while reading ${sourceUrl}. status=${status || 'unknown'}`
      )
    }
  }

  await sleep(randomBetween(1200, 2400))
  await dismissOverlay(page)

  const payload = await readContextFromPage(page)
  if (!payload) {
    return { payload: null, stopError: null }
  }

  return { payload, stopError: null }
}

async function readContextFromPage(page: Page) {
  try {
    await page.waitForFunction(() => {
      const context = globalThis.Kit?.context?.getContext?.()
      return Boolean(
        context &&
          typeof context === 'object' &&
          (context.song_name || context.song_uuid || context.notation)
      )
    }, undefined, { timeout: 15000 })
  } catch {
    return null
  }

  const payload = await page.evaluate(() => globalThis.Kit?.context?.getContext?.() ?? null)
  if (
    !payload ||
    typeof payload !== 'object' ||
    (!payload.song_name && !payload.song_uuid && !payload.notation)
  ) {
    return null
  }

  return payload as KuailepuSongPayload
}

async function fetchEmbeddedContextFromHtml(sourceUrl: string) {
  const html = await fetchText(sourceUrl)
  const encodedContext = extractEncodedContext(html)
  const kitJsUrl = extractKitJsUrl(html)
  const kitJs = await fetchText(kitJsUrl)
  const Kit = loadKitFromSource(kitJs)
  const payload = Kit?.lzobject?.str2obj?.(encodedContext)

  if (
    !payload ||
    typeof payload !== 'object' ||
    (!payload.song_name && !payload.song_uuid && !payload.notation)
  ) {
    return null
  }

  return payload as KuailepuSongPayload
}

function buildBatchEntry(
  target: SongTarget,
  sourceUrl: string,
  payload: KuailepuSongPayload,
  batchDate: string,
  batchNumber: number,
  mode: BrowserMode
) {
  const family = inferFamily(target.title)
  return {
    slug: target.slug,
    title: target.title,
    songUuid: payload.song_uuid ?? target.songUuid ?? null,
    priority: target.priority,
    demand: target.demand ?? null,
    risk: target.risk ?? null,
    detailUrl: sourceUrl,
    localCandidate: {
      runtime: `reference/kuailepu-candidates/runtime/${target.slug}.json`,
      songdoc: `reference/kuailepu-candidates/songdocs/${target.slug}.json`
    },
    status: 'stock-unpublished',
    checks: {
      loginCheck: mode === 'profile' ? 'profile-fallback-passed' : 'free-session-passed',
      doctorSong: 'pending',
      preflightCompare: 'pending',
      compareScope: 'live Kuailepu parity across supported public instruments',
      runtimeOrSongdocChangedAfterCompare: false,
      trackedLayerValidationNeededAtPromotion: ['validate:content', 'validate:songbook', 'build']
    },
    manifestDraft: {
      id: target.slug,
      slug: target.slug,
      family,
      featuredRank: 'assign-next-at-promotion-time',
      published: false
    },
    seoProfileDraft: {
      aliases: [`${target.title} song`, `${target.title} melody`, `${target.title} notes`],
      metaTitle: `${target.title} Letter Notes and Fingering Chart`,
      overview: `This ${target.title} page keeps the melody in a clean letter-note layout for easy wind practice.`,
      searchTerms: [
        `${target.title} letter notes`,
        `${target.title} recorder notes`,
        `${target.title} ocarina tabs`
      ],
      background: 'A recognizable grey-song title that works naturally as a melody-first page.',
      practice:
        'Useful for phrase memory, steady breath, and a single-line melody that is easy to revisit on beginner wind instruments.',
      metaDescription: `Play ${target.title} with letter notes, recorder notes, ocarina tabs, and fingering chart support. A clean melody page for practice.`,
      extraFaqs: [
        {
          question: 'What kind of page is this?',
          answer: 'It is a melody-first page prepared for beginner wind instruments.'
        },
        {
          question: 'Why keep it in the stock pool?',
          answer: 'Because it was imported from the Kuailepu detail page and is waiting for later promotion.'
        }
      ]
    },
    learnGuideDraft: {
      suggestedGuideSlugs: [
        'easy-songs-for-adult-beginners',
        'first-performance-letter-note-songs',
        '12-hole-ocarina-letter-notes'
      ],
      rationale:
        'Best used on broad beginner hubs because the title already has grey-song stock value and a simple melody-first layout.'
    },
    greyRolloutDraft: {
      slug: target.slug,
      title: target.title,
      status: 'imported-local-stock-pool',
      batch: `stock-${batchDate}-${batchNumber}`,
      group: inferGroup(target.title),
      addedOn: batchDate,
      sourceUrl,
      notes:
        'Imported into the local grey-song stock pool from a Kuailepu detail page. Review and promotion validation remain pending.'
    },
    releaseChecklist: [
      'Promote runtime JSON into data/kuailepu-runtime/<slug>.json',
      'Promote compact songdoc into data/kuailepu/<slug>.json',
      'Append manifestDraft into data/songbook/public-song-manifest.json with the next featuredRank',
      'Merge seoProfileDraft into data/songbook/song-seo-profiles.json',
      'Append greyRolloutDraft into data/songbook/grey-song-rollout.json',
      'Apply learnGuideDraft suggestions to the tracked learn/hub content layer if those placements are still wanted',
      'Run validate:content, validate:songbook, and build before push'
    ]
  }
}

function inferFamily(title: string) {
  if (/ico|undertale|dyna/i.test(title)) return 'game'
  return 'media'
}

function inferGroup(title: string) {
  if (/ico|undertale|dyna/i.test(title)) return 'game'
  return 'song'
}

async function dismissOverlay(page: Page) {
  const loginVisible = await page.locator('text=邮箱登录').first().isVisible().catch(() => false)
  if (!loginVisible) return

  await page.keyboard.press('Escape').catch(() => undefined)
  await page.mouse.click(20, 20).catch(() => undefined)
  await page.waitForTimeout(300)
}

function parseArgs(args: string[]) {
  let count = DEFAULT_COUNT

  for (const arg of args) {
    if (arg.startsWith('--count=')) {
      const value = Number(arg.slice('--count='.length))
      if (Number.isFinite(value) && value > 0) {
        count = Math.floor(value)
      }
    }
  }

  return { count }
}

function resolveNextBatchNumber() {
  const files = fs
    .readdirSync(STOCK_DRAFT_DIR)
    .filter(file => /^grey-stock-ready-\d{4}-\d{2}-\d{2}-batch-(\d+)\.json$/.test(file))

  const numbers = files
    .map(file => Number(file.match(/batch-(\d+)\.json$/)?.[1] ?? '0'))
    .filter(value => Number.isFinite(value) && value > 0)

  return (numbers.length > 0 ? Math.max(...numbers) : 8) + 1
}

function countUnpublishedInQueue() {
  const raw = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8')) as {
    entries?: Array<{ status: string }>
  }
  return (raw.entries ?? []).filter(entry => entry.status === 'stock-unpublished').length
}

function isStopPage(bodyText: string) {
  return /验证码|403 Forbidden|502 Bad Gateway|Forbidden|Bad Gateway/i.test(bodyText)
}

function isLoginWall(url: string, bodyText: string) {
  return (
    /\/web\/user\.php\?action=login/i.test(url) ||
    /邮箱登录|忘记密码|发送验证码/.test(bodyText)
  )
}

function isNavigationTimeout(error: unknown) {
  return (
    error instanceof Error &&
    /Timeout .* exceeded|page\.goto: Timeout/i.test(error.message)
  )
}

function randomBetween(min: number, max: number) {
  const lower = Math.min(min, max)
  const upper = Math.max(min, max)
  return Math.floor(lower + Math.random() * (upper - lower + 1))
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function captureBlockedEvidence(
  slug: string,
  sourceUrl: string,
  page: Page,
  status: number,
  bodyText: string
) {
  const stamp = Date.now()
  const baseName = `${slug}-blocked-${stamp}`
  const screenshotPath = path.join(REPORT_DIR, `${baseName}.png`)
  const textPath = path.join(REPORT_DIR, `${baseName}.txt`)

  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined)
  await fs.promises.writeFile(
    textPath,
    [
      `slug: ${slug}`,
      `sourceUrl: ${sourceUrl}`,
      `status: ${status}`,
      `url: ${page.url()}`,
      `body: ${bodyText.slice(0, 4000)}`
    ].join('\n'),
    'utf8'
  )
}

function extractEncodedContext(html: string) {
  const match = html.match(/Kit\.context\.setContext\("([^"]+)"\)/)
  if (!match?.[1]) {
    throw new Error('Unable to locate embedded Kuailepu context in page HTML')
  }
  return match[1]
}

function extractKitJsUrl(html: string) {
  const match = html.match(/<script\s+src="([^"]*kit_[^"]+\.js)"/i)
  if (!match?.[1]) {
    throw new Error('Unable to locate Kuailepu kit.js in page HTML')
  }
  return new URL(match[1], 'https://www.kuaiyuepu.com').toString()
}

async function fetchText(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return response.text()
}

function loadKitFromSource(source: string) {
  const sandbox = {
    module: { exports: {} as Record<string, unknown> },
    exports: {} as Record<string, unknown>,
    console
  }

  vm.runInNewContext(source, sandbox, { filename: 'kit.js' })
  return (sandbox.module.exports as Record<string, unknown>).Kit as
    | {
        lzobject?: {
          str2obj?: (input: string) => unknown
        }
      }
    | undefined
}
