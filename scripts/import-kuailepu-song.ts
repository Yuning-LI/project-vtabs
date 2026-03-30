import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { chromium } from 'playwright'
import {
  buildKuailepuSongDoc,
  type KuailepuSongPayload
} from '../src/lib/songbook/kuailepuImport.ts'
import {
  getPrimaryPage,
  hasKuailepuProfile,
  launchKuailepuPersistentContext,
  readKuailepuContextFromPage
} from './kuailepuAuth.ts'

type CliOptions = {
  input: string
  slug?: string
  id?: string
  title?: string
  publish: boolean
}

const usage =
  'Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/import-kuailepu-song.ts <detail-url-or-song-uuid-or-local-json> [--slug=my-song] [--id=my-song] [--title="My Song"] [--publish]'

/**
 * 导入侧当前有一条很重要的选源规则，不能只靠人脑临时记忆：
 *
 * - 如果快乐谱同时收录了英文歌词版和中文歌词版，优先英文歌词版
 * - 搜索不要只做一轮站内关键词；英文名、中文名、别名、标题变体都要试
 * - 例如 `Twinkle, Twinkle, Little Star` 最终找到的英文歌词版并不是最先命中的
 *   `7kPyp1FBk`，而是 `IgFEa125F`
 * - 如果只找得到中文歌词版，也可以先导入 raw JSON
 * - 但如果多轮搜索后仍不确定是否存在英文版，要明确告诉用户当前没找到，
 *   让用户人工再找一轮，而不是武断认定“快乐谱只有中文版”
 * - 但当前英文站默认会在 runtime 层把“纯中文歌词轨”关闭
 *
 * 这样做的目标是：
 * - 先保证谱面和指法图 parity
 * - 再尽量保证歌词语言符合当前站点受众
 * - 不把“中文歌词默认直出到英文站”当成正常默认行为
 */

const options = parseArgs(process.argv.slice(2))

if (!options) {
  console.error(usage)
  process.exit(1)
}

const rawDir = path.resolve(process.cwd(), 'reference', 'songs')
const compactDir = path.resolve(process.cwd(), 'data', 'kuailepu')

await fs.promises.mkdir(rawDir, { recursive: true })
await fs.promises.mkdir(compactDir, { recursive: true })

const inputSource = await resolveInputSource(options.input)
const payload =
  inputSource.kind === 'local'
    ? JSON.parse(await fs.promises.readFile(inputSource.filePath, 'utf8'))
    : await fetchKuailepuContext(inputSource.sourceUrl)
const songDoc = buildKuailepuSongDoc(payload, {
  id: options.id,
  slug: options.slug,
  title: options.title,
  published: options.publish,
  sourceUrl: inputSource.kind === 'local' ? undefined : inputSource.sourceUrl,
  importedOn: new Date().toISOString().slice(0, 10)
})

const rawPath = path.join(rawDir, `${songDoc.slug}.json`)
const compactPath = path.join(compactDir, `${songDoc.slug}.json`)

await fs.promises.writeFile(rawPath, JSON.stringify(payload, null, 2) + '\n', 'utf8')
await fs.promises.writeFile(compactPath, JSON.stringify(songDoc, null, 2) + '\n', 'utf8')

console.log(`Imported ${songDoc.title}`)
if (inputSource.kind === 'local') {
  console.log(`  input: ${path.relative(process.cwd(), inputSource.filePath)}`)
} else {
  console.log(`  detail: ${inputSource.sourceUrl}`)
}
console.log(`  raw: ${path.relative(process.cwd(), rawPath)}`)
console.log(`  compact: ${path.relative(process.cwd(), compactPath)}`)
console.log(`  published: ${songDoc.published === false ? 'false' : 'true'}`)

function parseArgs(args: string[]): CliOptions | null {
  if (args.length === 0) return null

  const positional: string[] = []
  const options: Omit<CliOptions, 'input'> = {
    publish: false
  }

  args.forEach(arg => {
    if (arg === '--publish') {
      options.publish = true
      return
    }

    if (arg.startsWith('--slug=')) {
      options.slug = arg.slice('--slug='.length)
      return
    }

    if (arg.startsWith('--id=')) {
      options.id = arg.slice('--id='.length)
      return
    }

    if (arg.startsWith('--title=')) {
      options.title = arg.slice('--title='.length)
      return
    }

    positional.push(arg)
  })

  const input = positional[0]
  if (!input) return null

  return {
    input,
    ...options
  }
}

function resolveSongUrl(input: string) {
  if (/^https?:\/\//i.test(input)) {
    return input
  }

  const songUuid = input.replace(/\.html$/i, '')
  return `https://www.kuaiyuepu.com/jianpu/${songUuid}.html`
}

async function resolveInputSource(input: string) {
  const filePath = path.resolve(process.cwd(), input)

  if (input.toLowerCase().endsWith('.json')) {
    const stats = await fs.promises.stat(filePath).catch(() => null)
    if (!stats?.isFile()) {
      throw new Error(`Local JSON file not found: ${input}`)
    }

    return {
      kind: 'local' as const,
      filePath
    }
  }

  return {
    kind: 'remote' as const,
    sourceUrl: resolveSongUrl(input)
  }
}

async function fetchKuailepuContext(sourceUrl: string) {
  const payloadFromProfile = await fetchKuailepuContextWithSavedLogin(sourceUrl)
  if (payloadFromProfile) {
    return payloadFromProfile
  }

  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage()
    try {
      const payload = await readKuailepuContextFromPage(page, sourceUrl, {
        timeoutMs: 15000
      })

      if (payload) {
        return payload as KuailepuSongPayload
      }
    } catch {
      // Fall through to the embedded-context decoder below.
    }
  } finally {
    await browser.close()
  }

  return fetchEmbeddedContextFromHtml(sourceUrl)
}

async function fetchKuailepuContextWithSavedLogin(sourceUrl: string) {
  if (!(await hasKuailepuProfile())) {
    return null
  }

  const context = await launchKuailepuPersistentContext({ headless: true })

  try {
    const page = await getPrimaryPage(context)
    return await readKuailepuContextFromPage(page, sourceUrl, {
      timeoutMs: 20000
    })
  } catch {
    return null
  } finally {
    await context.close()
  }
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
    throw new Error('Unable to decode embedded Kuailepu context from page HTML')
  }

  return payload as KuailepuSongPayload
}

async function fetchText(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  return response.text()
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

function loadKitFromSource(source: string) {
  const sandbox = {
    module: { exports: {} as Record<string, unknown> },
    exports: {} as Record<string, unknown>,
    console
  }

  vm.runInNewContext(source, sandbox)
  return sandbox.module.exports.Kit as
    | {
        lzobject?: {
          str2obj?: (input: string) => unknown
        }
      }
    | undefined
}
