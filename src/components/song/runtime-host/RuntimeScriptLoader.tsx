'use client'

import { useEffect, useId, useRef, useState } from 'react'
import {
  loadRuntimeScriptsInOrder,
  type RuntimeScriptEntry,
  type RuntimeScriptLoadEvent
} from '@/lib/runtime-core/client/scriptLoader'

type RuntimeScriptLoaderProps = {
  entries: RuntimeScriptEntry[]
  enabled?: boolean
  label?: string
}

export default function RuntimeScriptLoader({
  entries,
  enabled = false,
  label = 'runtime-host'
}: RuntimeScriptLoaderProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const sessionRef = useRef(0)
  const componentId = useId()
  const [status, setStatus] = useState<'disabled' | 'idle' | 'loading' | 'loaded' | 'error'>(
    enabled ? 'idle' : 'disabled'
  )
  const [loadedCount, setLoadedCount] = useState(0)

  useEffect(() => {
    const mount = mountRef.current
    const session = sessionRef.current + 1
    sessionRef.current = session

    if (!mount || !enabled) {
      setStatus(enabled ? 'idle' : 'disabled')
      setLoadedCount(0)
      return
    }

    mount.replaceChildren()
    setStatus('loading')
    setLoadedCount(0)

    const controller = loadRuntimeScriptsInOrder({
      entries,
      mount,
      log(event) {
        if (sessionRef.current !== session) {
          return
        }
        logRuntimeScriptEvent(label, event)
        if (event.phase === 'loaded' || event.phase === 'executed') {
          setLoadedCount(current => Math.max(current, event.index + 1))
        }
      }
    })

    controller.done
      .then(() => {
        if (sessionRef.current === session) {
          setStatus('loaded')
        }
      })
      .catch(error => {
        if (sessionRef.current === session) {
          console.error(`[${label}] runtime script loader failed`, error)
          setStatus('error')
        }
      })

    return () => {
      controller.cancel()
      mount.replaceChildren()
    }
  }, [enabled, entries, label])

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
      <div ref={mountRef} data-public-runtime-script-mount hidden />
    </div>
  )
}

function logRuntimeScriptEvent(label: string, event: RuntimeScriptLoadEvent) {
  const prefix = `[${label}] runtime script ${event.index + 1}/${event.total}`
  const mode = event.entry.mode === 'external' ? event.entry.src : 'inline'
  const message = event.message ? ` - ${event.message}` : ''
  console.info(`${prefix} ${event.phase}: ${mode}${message}`)
}
