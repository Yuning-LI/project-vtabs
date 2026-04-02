import { expect, test } from '@playwright/test'

const publicSongs = [
  { slug: 'ode-to-joy', title: 'Ode to Joy' },
  { slug: 'jasmine-flower', title: 'Jasmine Flower' },
  { slug: 'arirang', title: 'Arirang' }
] as const

async function expectRuntimeSheet(page: Parameters<typeof test>[0]['page'], slug: string) {
  const frame = page.locator(`iframe[src*="/api/kuailepu-runtime/${slug}"]`)
  await expect(frame).toBeVisible()

  const runtime = page.frameLocator(`iframe[src*="/api/kuailepu-runtime/${slug}"]`)
  await expect(runtime.locator('svg.sheet-svg')).toBeVisible({ timeout: 20000 })
}

test.describe('runtime-backed song pages', () => {
  test('homepage shows English song cards for public songs', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Play By Fingering/)
    await expect(page.getByRole('heading', { name: 'Ocarina Letter Tabs' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Browse Ocarina Songs' })).toBeVisible()
    await expect(page.getByText('Kuailepu source')).toHaveCount(0)
    await expect(page.getByText('reference source')).toHaveCount(0)

    for (const song of publicSongs) {
      const card = page.locator(`a[href="/song/${song.slug}"]`)
      await expect(card).toHaveCount(1)
      await expect(card).toHaveText(song.title)
    }
  })

  test('homepage search matches accentless and short-name queries', async ({ page }) => {
    await page.goto('/')

    const search = page.getByRole('searchbox', { name: 'Search song titles' })

    await search.fill('fur elise')
    await expect(page.locator('a[href="/song/fur-elise"]')).toHaveCount(1)
    await expect(page.locator('a[href="/song/scarborough-fair"]')).toHaveCount(0)

    await search.fill('twinkle')
    await expect(page.locator('a[href="/song/twinkle-twinkle-little-star"]')).toHaveCount(1)

    await search.fill('scarborough')
    await expect(page.locator('a[href="/song/scarborough-fair"]')).toHaveCount(1)
  })

  test('song page renders the English shell around the runtime iframe', async ({ page }) => {
    const requestedAssets = new Set<string>()
    const pageErrors: string[] = []
    page.on('requestfinished', request => {
      const url = request.url()
      if (!url.includes('/k-static/')) {
        return
      }
      requestedAssets.add(new URL(url).pathname)
    })
    page.on('pageerror', error => {
      pageErrors.push(error.message)
    })

    await page.goto('/song/ode-to-joy')

    await expect(page.getByRole('link', { name: 'Back to Song Library' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Ode to Joy' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Letter Notes' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Numbered Notes' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'About Ode to Joy' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'FAQ' })).toBeVisible()
    await expect(page.getByText('Kuailepu source')).toHaveCount(0)
    await expect(page.getByText('reference source')).toHaveCount(0)

    const frame = page.locator('iframe[title="Ode to Joy Kuailepu runtime"]')
    await expect(frame).toHaveAttribute(
      'src',
      '/api/kuailepu-runtime/ode-to-joy?runtime_text_mode=english'
    )

    await expectRuntimeSheet(page, 'ode-to-joy')
    expect(requestedAssets.has('/k-static/cdn/js/dist/hc.min_02d898293e.js')).toBe(true)
    expect(requestedAssets.has('/k-static/cdn/js/song_1f2ad3c3ba.js')).toBe(true)
    expect(requestedAssets.has('/k-static/cdn/js/countdown_852b2933cb.js')).toBe(false)
    expect(requestedAssets.has('/k-static/cdn/js/midi_soundfont_fb98b7a74c.js')).toBe(false)
    expect(requestedAssets.has('/k-static/lib/materialize/0.97.5/js/materialize.min.js')).toBe(
      false
    )
    expect(requestedAssets.has('/k-static/cdn/js/midi_player_62c3ad29f7.js')).toBe(false)
    expect(pageErrors).toEqual([])
  })

  test('number mode keeps the runtime route and renders the original sheet view', async ({
    page
  }) => {
    await page.goto('/song/ode-to-joy?note_label_mode=number')

    const frame = page.locator('iframe[title="Ode to Joy Kuailepu runtime"]')
    await expect(frame).toHaveAttribute(
      'src',
      '/api/kuailepu-runtime/ode-to-joy?runtime_text_mode=english&note_label_mode=number'
    )

    await expect(page.getByRole('link', { name: 'Numbered Notes' })).toBeVisible()
    await expectRuntimeSheet(page, 'ode-to-joy')
  })
})
