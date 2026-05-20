import { execFileSync } from 'node:child_process'

const stagedFiles = getStagedFiles()

if (stagedFiles.length === 0) {
  console.log('precommit: no staged files')
  process.exit(0)
}

const needsTypecheck = stagedFiles.some(file => /\.(js|jsx|ts|tsx)$/.test(file))
const needsContentValidation = stagedFiles.some(file => isContentSensitivePath(file))

console.log(
  JSON.stringify(
    {
      stagedFileCount: stagedFiles.length,
      needsTypecheck,
      needsContentValidation
    },
    null,
    2
  )
)

if (needsTypecheck) {
  runNpmCommand(['run', 'typecheck'])
}

if (needsContentValidation) {
  runNpmCommand(['run', 'validate:content'])
  runNpmCommand(['run', 'validate:songbook'])
}

function getStagedFiles() {
  const output = execFileSync(
    'git',
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
    {
      cwd: process.cwd(),
      encoding: 'utf8'
    }
  )

  return output
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

function isContentSensitivePath(file) {
  return (
    file.startsWith('data/songbook/') ||
    file.startsWith('data/kuailepu/') ||
    file.startsWith('data/kuailepu-runtime/') ||
    file.startsWith('src/lib/learn/content.ts') ||
    file.startsWith('src/lib/songbook/') ||
    file.startsWith('src/lib/kuailepu/')
  )
}

function runNpmCommand(args) {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  execFileSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit'
  })
}
