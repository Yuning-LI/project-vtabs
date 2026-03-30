import { getPrimaryPage, launchKuailepuPersistentContext } from './kuailepuAuth.ts'

const queries = process.argv.slice(2)

if (queries.length === 0) {
  console.error(
    'Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/search-kuailepu-song.ts <query> [query...]'
  )
  process.exit(1)
}

const context = await launchKuailepuPersistentContext({ headless: true })

try {
  const page = await getPrimaryPage(context)
  const output: Array<{
    query: string
    found: boolean
    noResult: boolean
    results: Array<{
      title: string
      href: string
    }>
  }> = []

  for (const query of queries) {
    await page.goto('https://www.kuaiyuepu.com/', {
      waitUntil: 'networkidle',
      timeout: 30000
    })
    await page.click('#dummy-search')
    await page.fill('#search', query)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(2200)

    const result = await page.evaluate(() => {
      const results = [...document.querySelectorAll<HTMLAnchorElement>('#search-result-wrapper a')]
        .map(anchor => ({
          title: (anchor.textContent || '').trim().replace(/\s+/g, ' '),
          href: anchor.href
        }))
        .filter(item => item.href.includes('/jianpu/'))

      return {
        noResult: document.body.innerText.includes('曲谱未收录'),
        results
      }
    })

    output.push({
      query,
      found: result.results.length > 0,
      noResult: result.noResult,
      results: result.results
    })
  }

  console.log(JSON.stringify(output, null, 2))
} finally {
  await context.close()
}
