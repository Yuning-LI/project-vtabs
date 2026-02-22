import { test, expect } from '@playwright/test'

const songs = [
  { id: 'twinkle', title: 'Twinkle, Twinkle, Little Star' },
  { id: 'ode-to-joy', title: 'Ode to Joy' },
  { id: 'amazing-grace', title: 'Amazing Grace' },
  { id: 'mary-lamb', title: 'Mary Had a Little Lamb' },
  { id: 'jingle-bells', title: 'Jingle Bells' },
  { id: 'happy-birthday', title: 'Happy Birthday' },
  { id: 'aura-lea', title: 'Aura Lea' },
  { id: 'auld-lang-syne', title: 'Auld Lang Syne' },
  { id: 'scarborough-fair', title: 'Scarborough Fair' },
  { id: 'greensleeves', title: 'Greensleeves' },
  { id: 'danny-boy', title: 'Danny Boy' },
  { id: 'sakura', title: 'Sakura Sakura' },
  { id: 'when-the-saints', title: 'When the Saints Go Marching In' },
  { id: 'you-are-my-sunshine', title: 'You Are My Sunshine' },
  { id: 'over-the-rainbow', title: 'Over the Rainbow' },
  { id: 'we-wish-you', title: 'We Wish You a Merry Christmas' }
]

test.describe('核心产品逻辑测试', () => {
  test('首页应显示所有曲目链接', async ({ page }) => {
    await page.goto('/')
    for (const song of songs) {
      await expect(page.locator(`a[href="/song/${song.id}"]`)).toHaveCount(1)
    }
  })

  for (const song of songs) {
    test(`${song.title} 详情页应正常加载且指法图数量正确`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', err => errors.push(err.message))

      await page.goto(`/song/${song.id}`)
      await expect(page.locator('.ocarina-widget').first()).toBeVisible({ timeout: 10000 })

      const noteCount = await page.locator('.abcjs-note').count()
      const widgetCount = await page.locator('.ocarina-widget').count()
      expect(widgetCount).toBe(noteCount)
      expect(errors).toEqual([])
    })
  }

  test('小星星第一个C4指法应为C4', async ({ page }) => {
    await page.goto('/song/twinkle')
    const firstWidget = page.locator('.ocarina-widget').first()
    await expect(firstWidget).toBeVisible()

    const letter = firstWidget.locator('.text-primary')
    await expect(letter).toHaveText(/C4/)

    const firstHole = firstWidget.locator('circle').first()
    const fillColor = await firstHole.getAttribute('fill')
    expect(fillColor).toBe('#3E2723')
  })
})
