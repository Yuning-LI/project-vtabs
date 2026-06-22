'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  bootstrapPublicRuntimeContainer,
  installPublicRuntimeContextLoadGuard,
  type PublicRuntimeContainerBootstrapController
} from '@/lib/runtime-core/client/containerBootstrap'
import {
  canUseBrowserDOM,
  getBrowserWindow
} from '@/lib/runtime-core/client/browserEnvironment'
import { useBrowserLayoutEffect } from '@/lib/runtime-core/client/useBrowserLayoutEffect'
import {
  PUBLIC_RUNTIME_PLAYBACK_OPEN_MESSAGE
} from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'
import {
  loadRuntimeScriptsInOrder,
  type RuntimeScriptEntry,
  type RuntimeScriptLoadEvent
} from '@/lib/runtime-core/client/scriptLoader'

type RuntimeScriptLoaderProps = {
  entries: RuntimeScriptEntry[]
  runtimeRoot: HTMLElement | null
  bodyHtml?: string
  enabled?: boolean
  label?: string
  showDiagnostics?: boolean
  logEvents?: boolean
  onRuntimeReady?: () => void
  onDiagnosticsChange?: (diagnostics: RuntimeScriptLoaderDiagnostics) => void
}

export type RuntimeScriptLoaderStatus = 'disabled' | 'idle' | 'loading' | 'loaded' | 'error'

export type RuntimeScriptLoaderDiagnostics = {
  status: RuntimeScriptLoaderStatus
  loadedCount: number
  totalCount: number
  capturedGlobalNames: string[]
  readyChecks: RuntimeGlobalReadyCheck[]
  errorMessage: string | null
}

type RuntimeGlobalReadyCheck = {
  name: 'Kit' | 'Song' | 'MidiPlayer'
  ready: boolean
  required: boolean
}

const RUNTIME_READY_TIMEOUT_MS = 15000

export default function RuntimeScriptLoader({
  entries,
  runtimeRoot,
  bodyHtml = '',
  enabled = false,
  label = 'runtime-host',
  showDiagnostics = true,
  logEvents = showDiagnostics,
  onRuntimeReady,
  onDiagnosticsChange
}: RuntimeScriptLoaderProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const sessionRef = useRef(0)
  const onRuntimeReadyRef = useRef(onRuntimeReady)
  const componentId = useId()
  const [status, setStatus] = useState<RuntimeScriptLoaderStatus>(
    enabled ? 'idle' : 'disabled'
  )
  const [loadedCount, setLoadedCount] = useState(0)
  const [capturedGlobalNames, setCapturedGlobalNames] = useState<string[]>([])
  const [readyChecks, setReadyChecks] = useState<RuntimeGlobalReadyCheck[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isDevelopmentRuntime = process.env.NODE_ENV === 'development'
  const diagnostics = useMemo<RuntimeScriptLoaderDiagnostics>(
    () => ({
      status,
      loadedCount,
      totalCount: entries.length,
      capturedGlobalNames,
      readyChecks,
      errorMessage
    }),
    [capturedGlobalNames, entries.length, errorMessage, loadedCount, readyChecks, status]
  )

  useEffect(() => {
    onRuntimeReadyRef.current = onRuntimeReady
  }, [onRuntimeReady])

  useEffect(() => {
    onDiagnosticsChange?.(diagnostics)
  }, [diagnostics, onDiagnosticsChange])
  useBrowserLayoutEffect(() => {
    const mount = mountRef.current
    const session = sessionRef.current + 1
    sessionRef.current = session

    if (!mount || !runtimeRoot || !enabled || !canUseBrowserDOM()) {
      setStatus(enabled ? 'idle' : 'disabled')
      setLoadedCount(0)
      setCapturedGlobalNames([])
      setReadyChecks([])
      setErrorMessage(null)
      return
    }
    const runtimeWindow = getBrowserWindow()
    if (!runtimeWindow) {
      return
    }

    setStatus('loading')
    setLoadedCount(0)
    setCapturedGlobalNames([])
    setReadyChecks([])
    setErrorMessage(null)
    let bootstrapController: PublicRuntimeContainerBootstrapController | null = null
    let controller: ReturnType<typeof loadRuntimeScriptsInOrder> | null = null
    let loadTimeoutId: number | null = null
    let globalReadyGate: RuntimeGlobalReadyGate | null = null

    const startTimer = runtimeWindow.setTimeout(() => {
      if (sessionRef.current !== session) {
        return
      }

      runtimeRoot.replaceChildren()
      if (bodyHtml) {
        bootstrapController = bootstrapPublicRuntimeContainer({
          root: runtimeRoot,
          bodyHtml
        })
      }
      const scriptMount = bootstrapController?.mountElement ?? mount
      if (!bootstrapController) {
        scriptMount.replaceChildren()
      }

      controller = loadRuntimeScriptsInOrder({
        entries,
        mount: scriptMount,
        loadingMode: isDevelopmentRuntime ? 'development-hmr-cache' : 'production-preload',
        isCancelled() {
          return sessionRef.current !== session
        },
        log(event) {
          if (sessionRef.current !== session) {
            return
          }
          if (logEvents) {
            logRuntimeScriptEvent(label, event)
          }
          if (event.phase === 'loaded' || event.phase === 'executed') {
            setLoadedCount(current => Math.max(current, event.index + 1))
          }
          if (bootstrapController && runtimeWindow) {
            installPublicRuntimeContextLoadGuard(
              bootstrapController.mountElement,
              runtimeWindow
            )
          }
          if (event.phase === 'globals-captured' && controller) {
            setCapturedGlobalNames(Object.keys(controller.registry.globals).sort())
          }
        }
      })

      loadTimeoutId = runtimeWindow.setTimeout(() => {
        if (sessionRef.current !== session) {
          return
        }

        const message = `Runtime scripts timed out after ${Math.round(
          RUNTIME_READY_TIMEOUT_MS / 1000
        )}s`
        controller?.cancel()
        setReadyChecks(getRuntimeGlobalReadyChecks(entries))
        setErrorMessage(message)
        setStatus('error')
        console.error(`[${label}] ${message}`)
      }, RUNTIME_READY_TIMEOUT_MS)

      controller.done
        .then(async () => {
          if (sessionRef.current === session) {
            if (loadTimeoutId !== null) {
              runtimeWindow.clearTimeout(loadTimeoutId)
              loadTimeoutId = null
            }
            const checks = getRuntimeGlobalReadyChecks(entries)
            setReadyChecks(checks)
            globalReadyGate = waitForRuntimeGlobalReady({
              entries,
              timeoutMs: RUNTIME_READY_TIMEOUT_MS,
              isCancelled() {
                return sessionRef.current !== session
              },
              onCheck(nextChecks) {
                setReadyChecks(nextChecks)
              }
            })

            const readyResult = await globalReadyGate.promise
            if (!readyResult.ready) {
              throw new Error(
                `Runtime globals not ready: ${readyResult.missing.join(', ')}`
              )
            }
            bootstrapController?.ensureStarted()
            onRuntimeReadyRef.current?.()
            setStatus(current => (current === 'error' ? current : 'loaded'))
          }
        })
        .catch(error => {
          if (sessionRef.current === session) {
            if (loadTimeoutId !== null) {
              runtimeWindow.clearTimeout(loadTimeoutId)
              loadTimeoutId = null
            }
            console.error(`[${label}] runtime script loader failed`, error)
            setReadyChecks(getRuntimeGlobalReadyChecks(entries))
            setErrorMessage(getErrorMessage(error))
            setStatus('error')
          }
        })
    }, 0)

    return () => {
      runtimeWindow.clearTimeout(startTimer)
      if (loadTimeoutId !== null) {
        runtimeWindow.clearTimeout(loadTimeoutId)
      }
      globalReadyGate?.cancel()
      controller?.cancel()
      bootstrapController?.dispose()
      setCapturedGlobalNames([])
      setReadyChecks([])
      setErrorMessage(null)
    }
  }, [bodyHtml, enabled, entries, isDevelopmentRuntime, label, logEvents, runtimeRoot])

  return (
    <div
      aria-live="polite"
      className={
        showDiagnostics
          ? 'mt-4 rounded-2xl border border-stone-200 bg-white/75 px-4 py-3 text-left text-xs font-semibold text-stone-700'
          : undefined
      }
      data-public-runtime-script-loader={componentId}
      style={showDiagnostics || status === 'error' ? undefined : { display: 'none' }}
    >
      {showDiagnostics ? (
        <>
          <div>
            Runtime JS: {status}
            {enabled ? ` (${loadedCount}/${entries.length})` : ''}
          </div>
          {enabled ? (
            <div className="mt-1 text-stone-500">
              Captured globals: {capturedGlobalNames.length > 0 ? capturedGlobalNames.join(', ') : 'none yet'}
            </div>
          ) : null}
          {enabled && readyChecks.length > 0 ? (
            <div className="mt-1 text-stone-500">
              Ready checks: {readyChecks.map(check => `${check.name}:${check.ready ? 'yes' : check.required ? 'missing' : 'optional'}`).join(', ')}
            </div>
          ) : null}
        </>
      ) : null}
      {status === 'error' ? (
        <div
          className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-white/95 px-6 text-center text-stone-900"
          role="alert"
          data-public-runtime-script-error="true"
        >
          <div className="max-w-sm rounded-xl border border-red-200 bg-red-50 px-5 py-4 shadow-lg">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-red-900">
              Sheet runtime failed
            </p>
            <p className="mt-2 text-sm leading-6 text-red-800">
              {errorMessage ?? 'The notation engine did not finish loading.'}
            </p>
          </div>
        </div>
      ) : null}
      <div
        ref={mountRef}
        aria-hidden="true"
        data-public-runtime-script-mount
        style={{ display: 'none' }}
      />
    </div>
  )
}

function getRuntimeGlobalReadyChecks(entries: RuntimeScriptEntry[]): RuntimeGlobalReadyCheck[] {
  const runtimeWindow = getBrowserWindow() as
    | (Window & {
    Kit?: unknown
    Song?: unknown
    MidiPlayer?: unknown
  })
    | null
  const requiresMidiPlayer = entries.some(entry =>
    entry.mode === 'external'
      ? /midi[_-]?player|song(?:_builder)?|midi[_-]?context/i.test(entry.src)
      : entry.content.includes(PUBLIC_RUNTIME_PLAYBACK_OPEN_MESSAGE)
  )

  return [
    {
      name: 'Kit',
      ready: isReadyObject(runtimeWindow?.Kit),
      required: true
    },
    {
      name: 'Song',
      ready: isReadyObject(runtimeWindow?.Song),
      required: true
    },
    {
      name: 'MidiPlayer',
      ready:
        typeof runtimeWindow?.MidiPlayer === 'function' ||
        isReadyObject(runtimeWindow?.MidiPlayer),
      required: requiresMidiPlayer
    }
  ]
}

type RuntimeGlobalReadyGate = {
  promise: Promise<{ ready: true } | { ready: false; missing: string[] }>
  cancel: () => void
}

function waitForRuntimeGlobalReady({
  entries,
  timeoutMs,
  isCancelled,
  onCheck
}: {
  entries: RuntimeScriptEntry[]
  timeoutMs: number
  isCancelled: () => boolean
  onCheck: (checks: RuntimeGlobalReadyCheck[]) => void
}): RuntimeGlobalReadyGate {
  const startedAt = Date.now()
  const retryDelays = [0, 40, 90, 160, 260, 420]
  let retryIndex = 0
  let cancelled = false
  let timeoutId: number | null = null

  const promise = new Promise<{ ready: true } | { ready: false; missing: string[] }>(
    resolve => {
      const check = () => {
        if (cancelled || isCancelled()) {
          resolve({ ready: false, missing: ['cancelled'] })
          return
        }

        const checks = getRuntimeGlobalReadyChecks(entries)
        onCheck(checks)
        const missing = checks
          .filter(item => item.required && !item.ready)
          .map(item => item.name)

        if (missing.length === 0) {
          resolve({ ready: true })
          return
        }

        if (Date.now() - startedAt >= timeoutMs) {
          resolve({ ready: false, missing })
          return
        }

        const delay = retryDelays[Math.min(retryIndex, retryDelays.length - 1)] ?? 420
        retryIndex += 1
        const runtimeWindow = getBrowserWindow()
        if (!runtimeWindow) {
          resolve({ ready: false, missing })
          return
        }
        timeoutId = runtimeWindow.setTimeout(check, delay)
      }

      check()
    }
  )

  return {
    promise,
    cancel() {
      cancelled = true
      if (timeoutId !== null) {
        getBrowserWindow()?.clearTimeout(timeoutId)
      }
    }
  }
}

function isReadyObject(value: unknown) {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function logRuntimeScriptEvent(label: string, event: RuntimeScriptLoadEvent) {
  const prefix = `[${label}] runtime script ${event.index + 1}/${event.total}`
  const mode = event.entry.mode === 'external' ? event.entry.src : 'inline'
  const message = event.message ? ` - ${event.message}` : ''
  if (event.phase === 'globals-captured' || event.phase === 'globals-restored') {
    console.info(`[${label}] runtime ${event.phase}${message}`)
    return
  }
  console.info(`${prefix} ${event.phase}: ${mode}${message}`)
}
