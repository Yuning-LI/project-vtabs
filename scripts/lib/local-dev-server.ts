import net from 'node:net'
import { spawn, type ChildProcess } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

export type ManagedDevServer = {
  baseUrl: string
  port: number
  child: ChildProcess
}

export async function ensureBaseUrlReachable(baseUrl: string, timeoutMs = 5000) {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(baseUrl, {
        signal: AbortSignal.timeout(2000)
      })
      if (response.ok || response.status < 500) {
        return
      }
    } catch {
      // Retry until timeout.
    }

    await sleep(300)
  }

  throw new Error(`Timed out waiting for existing dev server at ${baseUrl}`)
}

export async function startManagedDevServer(preferredPort = Number(process.env.PORT || 3000)) {
  const port = await findAvailablePort(preferredPort, preferredPort + 20)
  const baseUrl = `http://127.0.0.1:${port}`

  const child = spawn(
    npmCommand,
    ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(port)],
    {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true
    }
  )

  let recentLog = ''
  const appendLog = (chunk: string) => {
    recentLog += chunk
    if (recentLog.length > 12000) {
      recentLog = recentLog.slice(-12000)
    }
  }

  child.stdout?.on('data', chunk => appendLog(String(chunk)))
  child.stderr?.on('data', chunk => appendLog(String(chunk)))
  child.on('error', error => appendLog(String(error)))

  try {
    await waitForServer(baseUrl, 45000)
  } catch (error) {
    await stopManagedDevServer({ baseUrl, port, child })
    throw new Error(
      [
        `Failed to start managed dev server at ${baseUrl}.`,
        error instanceof Error ? error.message : String(error),
        recentLog.trim() || '(no dev server log)'
      ].join('\n')
    )
  }

  return {
    baseUrl,
    port,
    child
  } satisfies ManagedDevServer
}

export async function stopManagedDevServer(server: ManagedDevServer | null) {
  if (!server?.child?.pid) {
    return
  }

  try {
    process.kill(-server.child.pid, 'SIGTERM')
  } catch {
    return
  }

  await sleep(500)
}

async function waitForServer(baseUrl: string, timeoutMs: number) {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(baseUrl, {
        signal: AbortSignal.timeout(2000)
      })
      if (response.ok || response.status < 500) {
        return
      }
    } catch {
      // Retry until timeout.
    }

    await sleep(500)
  }

  throw new Error(`Timed out waiting for dev server at ${baseUrl}`)
}

async function findAvailablePort(start: number, end: number) {
  for (let port = start; port <= end; port += 1) {
    if (await isPortFree(port)) {
      return port
    }
  }

  throw new Error(`No free port found in range ${start}-${end}`)
}

function isPortFree(port: number) {
  return new Promise<boolean>(resolve => {
    const server = net.createServer()

    server.once('error', () => {
      resolve(false)
    })

    server.once('listening', () => {
      server.close(() => resolve(true))
    })

    server.listen(port, '127.0.0.1')
  })
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
