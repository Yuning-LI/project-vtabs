import { execFileSync } from 'node:child_process'

const slugs = process.argv.slice(2).filter(arg => !arg.startsWith('--'))

if (slugs.length < 1) {
  console.error('Usage: npm run publish:song-ingest-candidate -- <slug...>')
  process.exit(1)
}

runNodeScript('scripts/promote-song-ingest-candidate.ts', slugs)
runNpmCommand(['run', 'pack:kuailepu-runtime'])
runNodeScript('scripts/doctor-song-ingest.ts', slugs)
runNpmCommand(['run', 'validate:content'])
runNpmCommand(['run', 'validate:songbook'])

for (const slug of slugs) {
  runNpmCommand(['run', 'doctor:song', '--', slug])
}

runNodeScript('scripts/preflight-kuailepu-publish.ts', slugs)

console.log(
  JSON.stringify(
    {
      ok: true,
      publishedCandidates: slugs
    },
    null,
    2
  )
)

function runNodeScript(scriptPath: string, args: string[]) {
  execFileSync(
    'node',
    [
      '--experimental-strip-types',
      '--experimental-specifier-resolution=node',
      scriptPath,
      ...args
    ],
    {
      cwd: process.cwd(),
      stdio: 'inherit'
    }
  )
}

function runNpmCommand(args: string[]) {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  execFileSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit'
  })
}
