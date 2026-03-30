import fs from 'node:fs'
import path from 'node:path'
import { chromium, type BrowserContext, type Page } from 'playwright'
import type { KuailepuSongPayload } from '../src/lib/songbook/kuailepuImport.ts'

export const KUAILEPU_PROFILE_DIR = path.resolve(
  process.cwd(),
  'reference',
  'auth',
  'kuailepu-profile'
)

export async function ensureKuailepuProfileDir() {
  await fs.promises.mkdir(KUAILEPU_PROFILE_DIR, { recursive: true })
}

export async function hasKuailepuProfile() {
  const stats = await fs.promises.stat(KUAILEPU_PROFILE_DIR).catch(() => null)
  if (!stats?.isDirectory()) {
    return false
  }

  const entries = await fs.promises.readdir(KUAILEPU_PROFILE_DIR).catch(() => [])
  return entries.length > 0
}

export async function launchKuailepuPersistentContext(options?: {
  headless?: boolean
}) {
  await ensureKuailepuProfileDir()

  return chromium.launchPersistentContext(KUAILEPU_PROFILE_DIR, {
    headless: options?.headless ?? false,
    viewport: { width: 1440, height: 1080 },
    locale: 'zh-CN'
  })
}

export async function getPrimaryPage(context: BrowserContext) {
  return context.pages()[0] ?? context.newPage()
}

export async function dismissKuailepuLoginOverlay(page: Page) {
  const loginVisible = await page.locator('text=邮箱登录').first().isVisible().catch(() => false)

  if (!loginVisible) {
    return
  }

  await page.keyboard.press('Escape').catch(() => undefined)
  await page.mouse.click(20, 20).catch(() => undefined)
  await page.waitForTimeout(300)

  const stillVisible = await page.locator('text=邮箱登录').first().isVisible().catch(() => false)
  if (!stillVisible) {
    return
  }

  await page.evaluate(() => {
    const allNodes = Array.from(document.querySelectorAll<HTMLElement>('body *'))
    const overlayNodes = allNodes.filter(node => {
      const text = node.innerText || ''
      const className = typeof node.className === 'string' ? node.className : ''
      const id = node.id || ''
      const style = window.getComputedStyle(node)

      return (
        text.includes('邮箱登录') ||
        className.includes('login') ||
        className.includes('modal') ||
        id.includes('login') ||
        style.position === 'fixed'
      )
    })

    overlayNodes.forEach(node => {
      node.style.display = 'none'
      node.remove()
    })
  })
}

export async function readKuailepuContextFromPage(
  page: Page,
  sourceUrl: string,
  options?: {
    timeoutMs?: number
  }
) {
  await page.goto(sourceUrl, {
    waitUntil: 'networkidle',
    timeout: options?.timeoutMs ?? 30000
  })
  await dismissKuailepuLoginOverlay(page)

  await page.waitForFunction(() => {
    const context = globalThis.Kit?.context?.getContext?.()
    return Boolean(
      context &&
        typeof context === 'object' &&
        (context.song_name || context.song_uuid || context.notation)
    )
  }, undefined, { timeout: options?.timeoutMs ?? 15000 })

  const payload = await page.evaluate(() => {
    return globalThis.Kit?.context?.getContext?.() ?? null
  })

  if (
    !payload ||
    typeof payload !== 'object' ||
    (!payload.song_name && !payload.song_uuid && !payload.notation)
  ) {
    return null
  }

  return payload as KuailepuSongPayload
}

export async function looksLoggedIn(page: Page) {
  const loginVisible = await page.locator('text=邮箱登录').first().isVisible().catch(() => false)
  if (loginVisible) {
    return false
  }

  const pageText = await page.locator('body').textContent().catch(() => '')
  if (pageText?.includes('邮箱登录')) {
    return false
  }

  return true
}
