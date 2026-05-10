import { defineConfig, devices } from '@playwright/test'

const localWorkers = Number(process.env.PLAYWRIGHT_WORKERS ?? '1')
const localPort = Number(process.env.PLAYWRIGHT_PORT ?? '3101')
const baseURL = `http://127.0.0.1:${localPort}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: process.env.CI ? true : localWorkers > 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : localWorkers,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${localPort}`,
    port: localPort,
    reuseExistingServer: false
  }
})
