'use client'

import { useEffect, useId, useRef, useState } from 'react'
import {
  bootstrapPublicRuntimeContainer,
  type PublicRuntimeContainerBootstrapController
} from '@/lib/runtime-core/client/containerBootstrap'
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
  onRuntimeReady?: () => void
}

export default function RuntimeScriptLoader({
  entries,
  runtimeRoot,
  bodyHtml = '',
  enabled = false,
  label = 'runtime-host',
  onRuntimeReady
}: RuntimeScriptLoaderProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const sessionRef = useRef(0)
  const onRuntimeReadyRef = useRef(onRuntimeReady)
  const componentId = useId()
  const [status, setStatus] = useState<'disabled' | 'idle' | 'loading' | 'loaded' | 'error'>(
    enabled ? 'idle' : 'disabled'
  )
  const [loadedCount, setLoadedCount] = useState(0)
  const [capturedGlobalNames, setCapturedGlobalNames] = useState<string[]>([])

  useEffect(() => {
    onRuntimeReadyRef.current = onRuntimeReady
  }, [onRuntimeReady])

  useEffect(() => {
    const mount = mountRef.current
    const session = sessionRef.current + 1
    sessionRef.current = session

    if (!mount || !runtimeRoot || !enabled) {
      setStatus(enabled ? 'idle' : 'disabled')
      setLoadedCount(0)
      setCapturedGlobalNames([])
      return
    }

    setStatus('loading')
    setLoadedCount(0)
    setCapturedGlobalNames([])
    let bootstrapController: PublicRuntimeContainerBootstrapController | null = null
    let controller: ReturnType<typeof loadRuntimeScriptsInOrder> | null = null

    const startTimer = window.setTimeout(() => {
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
        isCancelled() {
          return sessionRef.current !== session
        },
        log(event) {
          if (sessionRef.current !== session) {
            return
          }
          logRuntimeScriptEvent(label, event)
          if (event.phase === 'loaded' || event.phase === 'executed') {
            setLoadedCount(current => Math.max(current, event.index + 1))
          }
          if (event.phase === 'globals-captured' && controller) {
            setCapturedGlobalNames(Object.keys(controller.registry.globals).sort())
          }
        }
      })

      controller.done
        .then(() => {
          if (sessionRef.current === session) {
            bootstrapController?.ensureStarted()
            onRuntimeReadyRef.current?.()
            setStatus('loaded')
          }
        })
        .catch(error => {
          if (sessionRef.current === session) {
            console.error(`[${label}] runtime script loader failed`, error)
            setStatus('error')
          }
        })
    }, 0)

    return () => {
      window.clearTimeout(startTimer)
      controller?.cancel()
      bootstrapController?.dispose()
      setCapturedGlobalNames([])
    }
  }, [bodyHtml, enabled, entries, label, runtimeRoot])

  return (
    <div
      aria-live="polite"
      className="mt-4 rounded-2xl border border-stone-200 bg-white/75 px-4 py-3 text-left text-xs font-semibold text-stone-700"
      data-public-runtime-script-loader={componentId}
    >
      <div>
        Runtime JS: {status}
        {enabled ? ` (${loadedCount}/${entries.length})` : ''}
      </div>
      {enabled ? (
        <div className="mt-1 text-stone-500">
          Captured globals: {capturedGlobalNames.length > 0 ? capturedGlobalNames.join(', ') : 'none yet'}
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
