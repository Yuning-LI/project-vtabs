'use client'

import {
  createPublicRuntimeGlobalRegistry,
  type PublicRuntimeGlobalRegistry
} from './globalRegistry'
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
  phase:
    | 'start'
    | 'loaded'
    | 'executed'
    | 'skipped'
    | 'cancelled'
    | 'globals-captured'
    | 'globals-restored'
    | 'error'
  message?: string
}

export type RuntimeScriptLoadController = {
  cancel: () => void
  done: Promise<void>
  registry: PublicRuntimeGlobalRegistry
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
  const registry = createPublicRuntimeGlobalRegistry({ runtimeWindow: window })
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

    registry.captureRuntimeGlobals()
    emitGlobalRegistryEvent(log, entries, total, 'globals-captured', registry)
  })()

  return {
    cancel() {
      if (cancelled) {
        return
      }
      cancelled = true
      registry.dispose()
      emitGlobalRegistryEvent(log, entries, total, 'globals-restored', registry)
      ownedScripts.forEach(script => {
        script.remove()
      })
      ownedScripts.clear()
    },
    done,
    registry
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

function emitGlobalRegistryEvent(
  log: ((event: RuntimeScriptLoadEvent) => void) | undefined,
  entries: RuntimeScriptEntry[],
  total: number,
  phase: 'globals-captured' | 'globals-restored',
  registry: PublicRuntimeGlobalRegistry
) {
  const lastEntry = entries[entries.length - 1]
  if (!lastEntry) {
    return
  }

  emit(
    log,
    lastEntry,
    Math.max(total - 1, 0),
    total,
    phase,
    `${Object.keys(registry.globals).sort().join(', ') || 'none'}; listeners=${registry.getTrackedEventListenerCount()}`
  )
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
