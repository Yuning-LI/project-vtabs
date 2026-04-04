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
  test.describe.configure({ timeout: 60000 })

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
    await expect(page.getByText('Search: fur elise')).toBeVisible()
    await expect(page.getByText(/Showing 1 of \d+ songs/)).toBeVisible()
    await expect(page.locator('a[href="/song/fur-elise"]')).toHaveCount(1)

    await search.fill('twinkle')
    await expect(page.getByText('Search: twinkle')).toBeVisible()
    await expect(page.locator('a[href="/song/twinkle-twinkle-little-star"]')).toHaveCount(1)

    await search.fill('scarborough')
    await expect(page.getByText('Search: scarborough')).toBeVisible()
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

    await page.goto('/song/ode-to-joy', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('link', { name: 'Back to Song Library' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Ode to Joy' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Function Zone' })).toBeVisible()
    await expect(page.getByText('Function Zone')).toHaveCount(0)
    await expect(page.getByText('Quick Setup')).toHaveCount(0)
    await expect(page.getByRole('combobox', { name: 'Instrument' })).toHaveValue('o12')
    await expect(page.getByRole('combobox', { name: 'Fingering Chart' })).toHaveValue('1d')
    await expect(page.getByRole('combobox', { name: 'Layout' })).toHaveValue('compact')
    await expect(page.getByRole('combobox', { name: 'Zoom' })).toHaveValue('10')
    await expect(page.getByRole('combobox', { name: 'Practice Tool' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Note View: Letter Notes' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    await expect(page.getByRole('link', { name: 'Note View: Numbered Notes' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Metronome: Off' })).toHaveAttribute(
      'aria-current',
      'page'
    )
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

  test('instrument mode keeps the runtime route and shell copy aligned', async ({ page }) => {
    await page.goto('/song/ode-to-joy?instrument=r8b', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('English 8-Hole Recorder', { exact: true })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Instrument' })).toHaveValue('r8b')
    await expect(page.getByRole('link', { name: 'Note View: Numbered Notes' })).toBeVisible()
    await expect(
      page.getByText(
        'Play Ode to Joy with letter notes, a visual fingering chart, and an optional numbered-notes view'
      )
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Can I play Ode to Joy on this page?' })).toBeVisible()

    const frame = page.locator('iframe[title="Ode to Joy Kuailepu runtime"]')
    await expect(frame).toHaveAttribute(
      'src',
      '/api/kuailepu-runtime/ode-to-joy?runtime_text_mode=english&instrument=r8b'
    )

    await expectRuntimeSheet(page, 'ode-to-joy')
  })

  test('tin whistle mode keeps the runtime route and shell copy aligned', async ({ page }) => {
    await page.goto('/song/ode-to-joy?instrument=w6', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Irish Tin Whistle', { exact: true })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Instrument' })).toHaveValue('w6')
    await expect(page.getByRole('link', { name: 'Note View: Numbered Notes' })).toBeVisible()
    await expect(
      page.getByText(
        'Play Ode to Joy with letter notes, a visual fingering chart, and an optional numbered-notes view'
      )
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Can I play Ode to Joy on this page?' })).toBeVisible()

    const frame = page.locator('iframe[title="Ode to Joy Kuailepu runtime"]')
    await expect(frame).toHaveAttribute(
      'src',
      '/api/kuailepu-runtime/ode-to-joy?runtime_text_mode=english&instrument=w6'
    )

    await expectRuntimeSheet(page, 'ode-to-joy')

    const runtime = page.frameLocator(`iframe[src*="/api/kuailepu-runtime/ode-to-joy"]`)
    const visibleText = await runtime.locator('body').innerText()
    expect(visibleText).not.toMatch(/[\u3400-\u9fff]/)
  })

  test('display controls keep runtime state and links aligned', async ({ page }) => {
    await page.goto(
      '/song/row-row-row-your-boat?instrument=r8b&show_graph=1d&show_lyric=off&show_measure_num=on&measure_layout=mono&sheet_scale=12',
      { waitUntil: 'domcontentloaded' }
    )

    const frame = page.locator('iframe[title="Row, Row, Row Your Boat Kuailepu runtime"]')
    await expect(frame).toHaveAttribute(
      'src',
      '/api/kuailepu-runtime/row-row-row-your-boat?runtime_text_mode=english&instrument=r8b&show_graph=1d&show_lyric=off&show_measure_num=on&measure_layout=mono&sheet_scale=12'
    )

    await expect(page.getByRole('combobox', { name: 'Fingering Chart' })).toHaveValue('1d')
    await expect(page.getByRole('combobox', { name: 'Layout' })).toHaveValue('mono')
    await expect(page.getByRole('combobox', { name: 'Zoom' })).toHaveValue('12')
    await expect(page.getByRole('link', { name: 'Lyrics: Off' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    await expect(page.getByRole('link', { name: 'Measure Numbers: On' })).toHaveAttribute(
      'aria-current',
      'page'
    )

    await page.getByRole('link', { name: 'Lyrics: On' }).click()
    await expect(page).toHaveURL(
      'http://127.0.0.1:3000/song/row-row-row-your-boat?instrument=r8b&show_graph=1d&show_lyric=on&show_measure_num=on&measure_layout=mono&sheet_scale=12'
    )

    await page.goto(
      '/song/row-row-row-your-boat?instrument=r8b&show_graph=1d&show_lyric=off&show_measure_num=on&measure_layout=mono&sheet_scale=12',
      { waitUntil: 'domcontentloaded' }
    )
    await expect(page.getByRole('combobox', { name: 'Layout' })).toHaveValue('mono')
    await expect(page.getByRole('combobox', { name: 'Fingering Chart' })).toHaveValue('1d')

    await expectRuntimeSheet(page, 'row-row-row-your-boat')
  })

  test('metronome mode keeps the same song page and shows a docked English metronome panel', async ({
    page
  }) => {
    const requestedAssets = new Set<string>()
    page.on('requestfinished', request => {
      const url = request.url()
      if (!url.includes('/k-static/')) {
        return
      }
      requestedAssets.add(new URL(url).pathname)
    })

    await page.goto('/song/ode-to-joy?practice_tool=metronome', {
      waitUntil: 'domcontentloaded'
    })

    await expect(page.getByRole('combobox', { name: 'Practice Tool' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Metronome: On' })).toHaveAttribute(
      'aria-current',
      'page'
    )

    const frame = page.locator('iframe[title="Ode to Joy Kuailepu runtime"]')
    await expect(frame).toHaveAttribute(
      'src',
      '/api/kuailepu-runtime/ode-to-joy?runtime_text_mode=english&public_feature=metronome'
    )

    await expectRuntimeSheet(page, 'ode-to-joy')
    expect(requestedAssets.has('/k-static/lib/materialize/0.97.5/js/materialize.min.js')).toBe(
      true
    )
    expect(requestedAssets.has('/k-static/cdn/js/metronome_7124fad0b0.js')).toBe(true)

    const runtime = page.frameLocator(`iframe[src*="/api/kuailepu-runtime/ode-to-joy"]`)
    await expect(runtime.locator('#metronome-modal')).toBeVisible()
    await expect(runtime.locator('#metronome-play')).toBeVisible()
    await expect(runtime.getByText('Metronome')).toBeVisible()
    await expect(runtime.getByText('Time Signature')).toBeVisible()
    await expect(runtime.getByText('BPM')).toBeVisible()
    await expect(runtime.locator('#metronome-play')).toHaveText('Start')
    await expect(
      runtime.locator('#metronome-bpm option').filter({ hasText: '40 Grave' })
    ).toHaveCount(1)
    await expect(
      runtime.locator('#metronome-bpm option').filter({ hasText: '60 Larghetto' })
    ).toHaveCount(1)
    await expect(
      runtime.locator('#metronome-bpm option').filter({ hasText: '184 Presto' })
    ).toHaveCount(1)

    const metronomeDoesNotCoverSheet = await runtime.locator('body').evaluate(() => {
      const modal = document.getElementById('metronome-modal');
      const sheet = document.getElementById('sheet');
      if (!modal || !sheet) {
        return false;
      }
      const modalRect = modal.getBoundingClientRect();
      const sheetRect = sheet.getBoundingClientRect();
      return modalRect.bottom <= sheetRect.top + 1;
    })
    expect(metronomeDoesNotCoverSheet).toBe(true)

    const visibleText = await runtime.locator('body').innerText()
    expect(visibleText).not.toMatch(/[\u3400-\u9fff]/)
  })

  test('pure Chinese runtime lyrics stay hidden and do not expose a public lyrics toggle', async ({
    page
  }) => {
    await page.goto('/song/happy-birthday-to-you?show_lyric=on', {
      waitUntil: 'domcontentloaded'
    })

    await expect(page.getByRole('link', { name: /Lyrics:/ })).toHaveCount(0)

    const frame = page.locator('iframe[title="Happy Birthday to You Kuailepu runtime"]')
    await expect(frame).toHaveAttribute(
      'src',
      '/api/kuailepu-runtime/happy-birthday-to-you?runtime_text_mode=english'
    )

    await expectRuntimeSheet(page, 'happy-birthday-to-you')
    const runtime = page.frameLocator(`iframe[src*="/api/kuailepu-runtime/happy-birthday-to-you"]`)
    const visibleText = await runtime.locator('body').innerText()
    expect(visibleText).not.toContain('祝你生日快乐')
  })

  test('empty runtime lyric arrays do not expose a public lyrics toggle', async ({ page }) => {
    await page.goto('/song/spring-song?show_lyric=on', {
      waitUntil: 'domcontentloaded'
    })

    await expect(page.getByRole('link', { name: /Lyrics:/ })).toHaveCount(0)

    const frame = page.locator('iframe[title="Spring Song Kuailepu runtime"]')
    await expect(frame).toHaveAttribute(
      'src',
      '/api/kuailepu-runtime/spring-song?runtime_text_mode=english'
    )

    await expectRuntimeSheet(page, 'spring-song')
  })

  test('number mode keeps the runtime route and renders the original sheet view', async ({
    page
  }) => {
    await page.goto('/song/ode-to-joy?note_label_mode=number', { waitUntil: 'domcontentloaded' })

    const frame = page.locator('iframe[title="Ode to Joy Kuailepu runtime"]')
    await expect(frame).toHaveAttribute(
      'src',
      '/api/kuailepu-runtime/ode-to-joy?runtime_text_mode=english&note_label_mode=number'
    )

    await expect(page.getByRole('link', { name: 'Note View: Numbered Notes' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    await expectRuntimeSheet(page, 'ode-to-joy')
  })

  test('instrument and number mode can be combined on the same public song page', async ({
    page
  }) => {
    await page.goto('/song/ode-to-joy?instrument=r8b&note_label_mode=number', {
      waitUntil: 'domcontentloaded'
    })

    const frame = page.locator('iframe[title="Ode to Joy Kuailepu runtime"]')
    await expect(frame).toHaveAttribute(
      'src',
      '/api/kuailepu-runtime/ode-to-joy?runtime_text_mode=english&instrument=r8b&note_label_mode=number'
    )

    await expect(page.getByRole('combobox', { name: 'Instrument' })).toHaveValue('r8b')
    await expect(page.getByRole('link', { name: 'Note View: Numbered Notes' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    await expectRuntimeSheet(page, 'ode-to-joy')
  })
})
