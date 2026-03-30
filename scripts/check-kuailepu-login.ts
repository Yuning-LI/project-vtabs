import {
  getPrimaryPage,
  launchKuailepuPersistentContext,
  looksLoggedIn,
  readKuailepuContextFromPage
} from './kuailepuAuth.ts'

const sourceUrl =
  process.argv[2] || 'https://www.kuaiyuepu.com/jianpu/jyz9m1QbT.html'

const context = await launchKuailepuPersistentContext({ headless: true })

try {
  const page = await getPrimaryPage(context)

  await page.goto('https://www.kuaiyuepu.com/', {
    waitUntil: 'networkidle',
    timeout: 30000
  })

  const loggedIn = await looksLoggedIn(page)
  const payload = await readKuailepuContextFromPage(page, sourceUrl, {
    timeoutMs: 20000
  }).catch(() => null)

  console.log(
    JSON.stringify(
      {
        sourceUrl,
        loggedIn,
        canReadContext: Boolean(payload?.song_uuid || payload?.notation),
        songUuid: payload?.song_uuid ?? null,
        songName: payload?.song_name ?? null,
        notationLength: payload?.notation ? String(payload.notation).length : 0
      },
      null,
      2
    )
  )
} finally {
  await context.close()
}
