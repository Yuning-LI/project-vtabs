import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import {
  KUAILEPU_PROFILE_DIR,
  getPrimaryPage,
  launchKuailepuPersistentContext,
  looksLoggedIn,
  readKuailepuContextFromPage
} from './kuailepuAuth.ts'

const HOME_URL = 'https://www.kuaiyuepu.com/'
const VERIFY_URL = 'https://www.kuaiyuepu.com/jianpu/jyz9m1QbT.html'

const context = await launchKuailepuPersistentContext({ headless: false })

try {
  const page = await getPrimaryPage(context)
  await page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })

  console.log('Kuailepu login browser opened.')
  console.log(`Profile dir: ${KUAILEPU_PROFILE_DIR}`)
  console.log('Please complete the email verification login in the opened browser window.')
  console.log('After login is complete, return here and press Enter.')

  const rl = createInterface({ input, output })
  await rl.question('Press Enter after you finish logging in...')
  rl.close()

  await page.goto(HOME_URL, { waitUntil: 'networkidle', timeout: 30000 })
  const loggedIn = await looksLoggedIn(page)

  if (!loggedIn) {
    console.error('Login could not be confirmed from the browser session.')
    console.error('You can re-run this script and try again.')
    process.exitCode = 1
  } else {
    console.log('Login state looks active. Verifying Kuailepu detail-page context access...')

    const payload = await readKuailepuContextFromPage(page, VERIFY_URL, {
      timeoutMs: 20000
    }).catch(() => null)

    if (payload?.song_uuid || payload?.notation) {
      console.log(`Verified detail-page access for: ${payload.song_name ?? payload.song_uuid}`)
      console.log('Persistent login is ready for import scripts.')
    } else {
      console.log('Login appears saved, but detail-page verification did not fully succeed yet.')
      console.log('The profile was still kept; import scripts can test it on the next run.')
    }
  }
} finally {
  await context.close()
}
