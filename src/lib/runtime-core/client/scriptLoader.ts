'use client'

import type {
  RuntimeExternalScriptEntry,
  RuntimeInlineScriptEntry,
  RuntimeScriptEntry
} from '../runtimeScriptTypes'

export type {
  RuntimeExternalScriptEntry,
  RuntimeInlineScriptEntry,
  RuntimeScriptEntry
} from '../runtimeScriptTypes'

export type RuntimeScriptLoadEvent = {
  index: number
  total: number
  entry: RuntimeScriptEntry
  phase: 'start' | 'loaded' | 'executed' | 'skipped' | 'cancelled' | 'error'
  message?: string
}

export type RuntimeScriptLoadController = {
  cancel: () => void
  done: Promise<void>
}

export type LoadRuntimeScriptsOptions = {
  entries: RuntimeScriptEntry[]
  mount: HTMLElement
  nonce?: string
  log?: (event: RuntimeScriptLoadEvent) => void
}

export function loadRuntimeScriptsInOrder({
  entries,
  mount,
  nonce,
  log
}: LoadRuntimeScriptsOptions): RuntimeScriptLoadController {
  let cancelled = false
  const ownedScripts = new Set<HTMLScriptElement>()
  const total = entries.length

  const done = (async () => {
  for (const [index, entry] of entries.entries()) {
      if (cancelled || !mount.isConnected) {
        emit(log, entry, index, total, 'cancelled')
        break
      }

      try {
        if (entry.mode === 'external') {
          await loadExternalScript({ entry, index, total, mount, nonce, ownedScripts, log })
        } else {
          executeInlineScript({ entry, index, total, mount, nonce, ownedScripts, log })
        }
      } catch (error) {
        emit(log, entry, index, total, 'error', getErrorMessage(error))
        throw error
      }
    }
  })()

  return {
    cancel() {
      cancelled = true
      ownedScripts.forEach(script => {
        script.remove()
      })
      ownedScripts.clear()
    },
    done
  }
}

async function loadExternalScript({
  entry,
  index,
  total,
  mount,
  nonce,
  ownedScripts,
  log
}: {
  entry: RuntimeExternalScriptEntry
  index: number
  total: number
  mount: HTMLElement
  nonce?: string
  ownedScripts: Set<HTMLScriptElement>
  log?: (event: RuntimeScriptLoadEvent) => void
}) {
  emit(log, entry, index, total, 'start', entry.src)

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    applyScriptAttributes(script, entry.attributes)
    script.src = entry.src
    script.async = false
    script.dataset.publicRuntimeScriptOrder = String(entry.order)
    script.dataset.publicRuntimeScriptMode = 'external'
    if (nonce) {
      script.nonce = nonce
    }

    if (!entry.executable) {
      ownedScripts.add(script)
      mount.appendChild(script)
      emit(log, entry, index, total, 'skipped', entry.src)
      resolve()
      return
    }

    script.addEventListener(
      'load',
      () => {
        emit(log, entry, index, total, 'loaded', entry.src)
        resolve()
      },
      { once: true }
    )
    script.addEventListener(
      'error',
      () => {
        reject(new Error(`Failed to load runtime script: ${entry.src}`))
      },
      { once: true }
    )

    ownedScripts.add(script)
    mount.appendChild(script)
  })
}

function executeInlineScript({
  entry,
  index,
  total,
  mount,
  nonce,
  ownedScripts,
  log
}: {
  entry: RuntimeInlineScriptEntry
  index: number
  total: number
  mount: HTMLElement
  nonce?: string
  ownedScripts: Set<HTMLScriptElement>
  log?: (event: RuntimeScriptLoadEvent) => void
}) {
  emit(log, entry, index, total, 'start', 'inline')

  const script = document.createElement('script')
  applyScriptAttributes(script, entry.attributes)
  script.text = entry.content
  script.dataset.publicRuntimeScriptOrder = String(entry.order)
  script.dataset.publicRuntimeScriptMode = 'inline'
  if (nonce) {
    script.nonce = nonce
  }

  ownedScripts.add(script)
  mount.appendChild(script)
  emit(log, entry, index, total, entry.executable ? 'executed' : 'skipped', 'inline')
}

function applyScriptAttributes(script: HTMLScriptElement, attributes: Record<string, string>) {
  Object.entries(attributes).forEach(([name, value]) => {
    if (name === 'src') {
      return
    }
    script.setAttribute(name, value)
  })
}

function emit(
  log: ((event: RuntimeScriptLoadEvent) => void) | undefined,
  entry: RuntimeScriptEntry,
  index: number,
  total: number,
  phase: RuntimeScriptLoadEvent['phase'],
  message?: string
) {
  log?.({ index, total, entry, phase, message })
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
