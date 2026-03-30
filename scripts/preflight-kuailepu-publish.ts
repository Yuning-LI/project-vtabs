import net from 'node:net'
import { spawn, type ChildProcess } from 'node:child_process'

const preferredPort = Number(process.env.PORT || 3000)
const slugArgs = process.argv.slice(2)
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const port = await findAvailablePort(preferredPort, preferredPort + 20)
const baseUrl = `http://127.0.0.1:${port}`
let devServer: ChildProcess | null = null
let devServerLog = ''

try {
  const loginStatus = await runLoginCheck()
  if (!loginStatus.loggedIn || !loginStatus.canReadContext) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          stage: 'check:kuailepu-login',
          message:
            'Kuailepu login is not valid. Ask the user to run `npm run login:kuailepu` manually, then rerun this preflight.',
          login: loginStatus
        },
        null,
        2
      )
    )
    process.exit(1)
  }

  devServer = startDevServer(port, chunk => {
    devServerLog += chunk
    if (devServerLog.length > 12000) {
      devServerLog = devServerLog.slice(-12000)
    }
  })

  await waitForServer(baseUrl, 45000)
  await runCompare(baseUrl, slugArgs)

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        preferredPort,
        selectedPort: port,
        comparedSlugs: slugArgs
      },
      null,
      2
    )
  )
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        baseUrl,
        preferredPort,
        selectedPort: port,
        comparedSlugs: slugArgs,
        error: error instanceof Error ? error.message : String(error),
        devServerLog: devServerLog.trim() || null
      },
      null,
      2
    )
  )
  process.exitCode = 1
} finally {
  await stopDevServer(devServer)
}

async function runLoginCheck() {
  const output = await runCommand([
    'run',
    'check:kuailepu-login'
  ])
  const parsed = safeJsonParse(output.stdout)

  return {
    loggedIn: Boolean(parsed?.loggedIn),
    canReadContext: Boolean(parsed?.canReadContext),
    sourceUrl: parsed?.sourceUrl ?? null,
    songUuid: parsed?.songUuid ?? null,
    songName: parsed?.songName ?? null
  }
}

async function runCompare(baseUrl: string, slugs: string[]) {
  const args = ['run', 'compare:kuailepu-runtime', '--', baseUrl, ...slugs]
  const output = await runCommand(args)
  process.stdout.write(output.stdout)
  if (output.stderr.trim()) {
    process.stderr.write(output.stderr)
  }
}

function startDevServer(
  port: number,
  onChunk: (chunk: string) => void
) {
  const child = spawn(
    npmCommand,
    ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(port)],
    {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true
    }
  )

  child.stdout?.on('data', chunk => onChunk(String(chunk)))
  child.stderr?.on('data', chunk => onChunk(String(chunk)))
  child.on('error', error => onChunk(String(error)))

  return child
}

async function stopDevServer(child: ChildProcess | null) {
  if (!child?.pid) {
    return
  }

  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    return
  }

  await new Promise(resolve => setTimeout(resolve, 500))
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

function runCommand(args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', chunk => {
      stdout += String(chunk)
    })
    child.stderr?.on('data', chunk => {
      stderr += String(chunk)
    })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }

      reject(
        new Error(
          `Command failed with exit code ${code}: ${npmCommand} ${args.join(' ')}\n${stderr || stdout}`
        )
      )
    })
  })
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return null
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
