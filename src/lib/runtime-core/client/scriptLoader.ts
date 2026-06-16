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
import {
  canUseBrowserDOM,
  getBrowserDocument,
  getBrowserWindow
} from './browserEnvironment'

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
    | 'resource-cached'
    | 'resource-deferred'
    | 'resource-preloaded'
    | 'resource-wait'
    | 'globals-captured'
    | 'globals-restored'
    | 'side-effect-capture-sealed'
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
  loadingMode?: RuntimeScriptLoadingMode
  isCancelled?: () => boolean
  log?: (event: RuntimeScriptLoadEvent) => void
}

export type RuntimeScriptLoadingMode = 'development-hmr-cache' | 'production-preload'

type RuntimeScriptResourceCacheEntry = {
  status: 'loading' | 'loaded' | 'error'
  promise: Promise<void>
  error?: unknown
}

const runtimeScriptResourceCache = new Map<string, RuntimeScriptResourceCacheEntry>()
const RUNTIME_DEFERRED_PRELOAD_ASSET_PATTERN =
  /(?:soundmanager2|web-audio-scheduler|metronome|microphone|midi_|countdown|diaohao|cangqiang|chip_tag|media_)/i

export function loadRuntimeScriptsInOrder({
  entries,
  mount,
  nonce,
  loadingMode = process.env.NODE_ENV === 'development'
    ? 'development-hmr-cache'
    : 'production-preload',
  isCancelled,
  log
}: LoadRuntimeScriptsOptions): RuntimeScriptLoadController {
  const runtimeWindow = getBrowserWindow()
  if (!runtimeWindow) {
    return {
      cancel() {},
      done: Promise.reject(new Error('Runtime script loading requires a browser window')),
      registry: createNoopRuntimeGlobalRegistry()
    }
  }

  let cancelled = false
  const ownedScripts = new Set<HTMLScriptElement>()
  const registry = createPublicRuntimeGlobalRegistry({ runtimeWindow })
  const total = entries.length

  const done = (async () => {
    primeRuntimeScriptResourceCache(entries, loadingMode)

    for (const [index, entry] of entries.entries()) {
      if (cancelled || isCancelled?.() || !mount.isConnected) {
        emit(log, entry, index, total, 'cancelled')
        break
      }

      try {
        if (entry.mode === 'external') {
          await loadExternalScript({
            entry,
            index,
            total,
            mount,
            nonce,
            ownedScripts,
            loadingMode,
            isCancelled: () => cancelled || Boolean(isCancelled?.()),
            log
          })
        } else {
          executeInlineScript({ entry, index, total, mount, nonce, ownedScripts, log })
        }
      } catch (error) {
        emit(log, entry, index, total, 'error', getErrorMessage(error))
        throw error
      }
    }

    if (!cancelled && !isCancelled?.()) {
      registry.captureRuntimeGlobals()
      emitGlobalRegistryEvent(log, entries, total, 'globals-captured', registry)
      registry.sealRuntimeSideEffectCapture()
      emitGlobalRegistryEvent(log, entries, total, 'side-effect-capture-sealed', registry)
    }
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

function createNoopRuntimeGlobalRegistry(): PublicRuntimeGlobalRegistry {
  return {
    runtimeWindow: globalThis as unknown as Window,
    globals: {},
    captureRuntimeGlobals: () => ({}),
    sealRuntimeSideEffectCapture() {},
    getTrackedEventListenerCount: () => 0,
    getTrackedTimerCount: () => 0,
    restoreShellGlobals() {},
    dispose() {}
  }
}

async function loadExternalScript({
  entry,
  index,
  total,
  mount,
  nonce,
  ownedScripts,
  loadingMode,
  isCancelled,
  log
}: {
  entry: RuntimeExternalScriptEntry
  index: number
  total: number
  mount: HTMLElement
  nonce?: string
  ownedScripts: Set<HTMLScriptElement>
  loadingMode: RuntimeScriptLoadingMode
  isCancelled: () => boolean
  log?: (event: RuntimeScriptLoadEvent) => void
}) {
  emit(log, entry, index, total, 'start', entry.src)

  await waitForPrimedRuntimeScriptResource({
    entry,
    index,
    total,
    loadingMode,
    isCancelled,
    log
  })

  await new Promise<void>((resolve, reject) => {
    const runtimeDocument = getBrowserDocument()
    if (!runtimeDocument) {
      reject(new Error('Runtime script loader requires a browser document'))
      return
    }

    const script = runtimeDocument.createElement('script')
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
        if (isCancelled()) {
          emit(log, entry, index, total, 'cancelled', entry.src)
          resolve()
          return
        }
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

  const runtimeDocument = getBrowserDocument()
  if (!runtimeDocument) {
    throw new Error('Runtime inline script execution requires a browser document')
  }

  const script = runtimeDocument.createElement('script')
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

function primeRuntimeScriptResourceCache(
  entries: RuntimeScriptEntry[],
  loadingMode: RuntimeScriptLoadingMode
) {
  if (!canUseBrowserDOM()) {
    return
  }

  entries.forEach(entry => {
    if (entry.mode !== 'external' || !entry.executable) {
      return
    }

    if (shouldDeferRuntimeScriptPreload(entry.src, loadingMode)) {
      return
    }

    ensureRuntimeScriptResource(entry.src, loadingMode)
  })
}

async function waitForPrimedRuntimeScriptResource({
  entry,
  index,
  total,
  loadingMode,
  isCancelled,
  log
}: {
  entry: RuntimeExternalScriptEntry
  index: number
  total: number
  loadingMode: RuntimeScriptLoadingMode
  isCancelled: () => boolean
  log?: (event: RuntimeScriptLoadEvent) => void
}) {
  if (!entry.executable) {
    return
  }

  if (shouldDeferRuntimeScriptPreload(entry.src, loadingMode)) {
    emit(log, entry, index, total, 'resource-deferred', entry.src)
    return
  }

  const cacheEntry = ensureRuntimeScriptResource(entry.src, loadingMode)
  if (!cacheEntry) {
    return
  }

  if (cacheEntry.status === 'loaded') {
    emit(log, entry, index, total, 'resource-cached', entry.src)
    return
  }

  emit(log, entry, index, total, 'resource-wait', entry.src)
  cacheEntry.promise
    .then(() => {
      if (!isCancelled()) {
        emit(log, entry, index, total, 'resource-preloaded', entry.src)
      }
    })
    .catch(() => {
      /**
       * Preload failure is not terminal here. The ordered script tag below still
       * performs the authoritative load and emits a hard error if it fails.
       */
    })
}

function shouldDeferRuntimeScriptPreload(src: string, loadingMode: RuntimeScriptLoadingMode) {
  return loadingMode === 'production-preload' && RUNTIME_DEFERRED_PRELOAD_ASSET_PATTERN.test(src)
}

function ensureRuntimeScriptResource(
  src: string,
  loadingMode: RuntimeScriptLoadingMode
) {
  const cached = runtimeScriptResourceCache.get(src)
  if (cached) {
    return cached
  }

  const runtimeDocument = getBrowserDocument()
  if (!runtimeDocument?.head) {
    return null
  }

  const promise = new Promise<void>((resolve, reject) => {
    const runtimeWindow = getBrowserWindow()
    if (!runtimeWindow) {
      resolve()
      return
    }

    const preload = runtimeDocument.createElement('link')
    let settled = false
    const timeoutId = runtimeWindow.setTimeout(() => {
      if (settled) {
        return
      }
      settled = true
      resolve()
    }, 8000)
    const settle = (callback: () => void) => {
      if (settled) {
        return
      }
      settled = true
      runtimeWindow.clearTimeout(timeoutId)
      callback()
    }

    preload.rel = 'preload'
    preload.as = 'script'
    preload.href = src
    preload.dataset.publicRuntimeScriptResourceMode = loadingMode
    preload.addEventListener('load', () => settle(resolve), { once: true })
    preload.addEventListener(
      'error',
      () => settle(() => reject(new Error(`Failed to preload runtime script: ${src}`))),
      { once: true }
    )
    runtimeDocument.head.appendChild(preload)
  })

  const cacheEntry: RuntimeScriptResourceCacheEntry = {
    status: 'loading',
    promise
  }
  runtimeScriptResourceCache.set(src, cacheEntry)

  promise
    .then(() => {
      cacheEntry.status = 'loaded'
    })
    .catch(error => {
      cacheEntry.status = 'error'
      cacheEntry.error = error
      if (loadingMode === 'production-preload') {
        runtimeScriptResourceCache.delete(src)
      }
    })

  return cacheEntry
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
  phase: 'globals-captured' | 'globals-restored' | 'side-effect-capture-sealed',
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
    `${Object.keys(registry.globals).sort().join(', ') || 'none'}; listeners=${registry.getTrackedEventListenerCount()}; timers=${registry.getTrackedTimerCount()}`
  )
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
