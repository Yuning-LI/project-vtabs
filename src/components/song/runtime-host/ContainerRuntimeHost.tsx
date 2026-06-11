'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ContainerRuntimeHostProps,
  PublicRuntimeHostController
} from './types'
import RuntimeScriptLoader from './RuntimeScriptLoader'
import RuntimeStyleInjector from './RuntimeStyleInjector'
import { dispatchContainerRuntimeCommand } from './containerRuntimeTransport'
import { PUBLIC_RUNTIME_READY_MESSAGE } from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'

/**
 * Dev-only native DOM host skeleton.
 *
 * This phase intentionally mounts static diagnostic markup only. It must not
 * load runtime CSS, inject runtime HTML, or execute any runtime JavaScript.
 */
export default function ContainerRuntimeHost({
  songId,
  title,
  bodyHtml = '',
  styleAssets = [],
  scriptEntries = [],
  enableScriptLoader = false,
  className,
  onHostControllerChange,
  onRuntimeReady
}: ContainerRuntimeHostProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [runtimeDomRoot, setRuntimeDomRoot] = useState<HTMLDivElement | null>(null)
  const controllerRef = useRef<PublicRuntimeHostController | null>(null)
  const onHostControllerChangeRef = useRef(onHostControllerChange)

  useEffect(() => {
    onHostControllerChangeRef.current = onHostControllerChange
  }, [onHostControllerChange])

  const assignRootRef = useCallback((node: HTMLDivElement | null) => {
    rootRef.current = node

    controllerRef.current?.destroy()
    controllerRef.current = node ? createContainerRuntimeHostController(node) : null
    onHostControllerChangeRef.current?.(controllerRef.current)
  }, [])

  useEffect(() => {
    return () => {
      controllerRef.current?.destroy()
      controllerRef.current = null
      onHostControllerChangeRef.current?.(null)
    }
  }, [])

  const dispatchRuntimeReady = useCallback(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: PUBLIC_RUNTIME_READY_MESSAGE,
          songId
        },
        origin: window.location.origin,
        source: window
      })
    )
    onRuntimeReady?.()
  }, [onRuntimeReady, songId])

  return (
    <div
      ref={assignRootRef}
      className={
        className ??
        'min-h-[520px] rounded-[24px] border border-dashed border-[rgba(120,86,48,0.34)] bg-[#fffaf1]'
      }
      data-public-runtime-container-host="skeleton"
      data-public-runtime-root
      data-song-id={songId}
      role="region"
      aria-label={`${title} container runtime skeleton`}
    >
      <RuntimeStyleInjector assets={styleAssets} />
      <div
        ref={setRuntimeDomRoot}
        data-public-runtime-dom-root
        className="min-h-[520px]"
      />
      <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-10 text-center">
        <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-900">
          Container Runtime Host
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-stone-900">
          {title}
        </h2>
        <p className="mt-3 max-w-xl text-sm font-semibold leading-7 text-stone-600">
          This panel is a React-owned DOM container. Runtime scripts and the original startup flow
          now render into the container-local sheet area.
        </p>
        <dl className="mt-6 grid gap-3 text-left text-sm md:grid-cols-3">
          <RuntimeHostFact label="Host mode" value="container skeleton" />
          <RuntimeHostFact
            label="Runtime JS"
            value={enableScriptLoader ? `${scriptEntries.length} ordered entries` : 'disabled'}
          />
          <RuntimeHostFact label="Runtime CSS" value={styleAssets.length > 0 ? 'scoped' : 'disabled'} />
          <RuntimeHostFact label="Song" value={songId} />
        </dl>
        <RuntimeScriptLoader
          entries={scriptEntries}
          runtimeRoot={runtimeDomRoot}
          bodyHtml={bodyHtml}
          enabled={enableScriptLoader}
          label={`runtime-host:${songId}`}
          onRuntimeReady={dispatchRuntimeReady}
        />
      </div>
    </div>
  )
}

function RuntimeHostFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 shadow-[0_10px_22px_rgba(80,53,25,0.06)]">
      <dt className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-stone-500">
        {label}
      </dt>
      <dd className="mt-1 font-bold text-stone-900">{value}</dd>
    </div>
  )
}

function createContainerRuntimeHostController(
  root: HTMLElement
): PublicRuntimeHostController {
  return {
    hostElement: root,
    containsEventTarget(target) {
      return target instanceof Node && root.contains(target)
    },
    destroy() {
      /**
       * This skeleton host is fully React-owned. Do not mutate its children from
       * the controller; React may still need to unmount or reconcile them.
       */
    },
    postMessage(message) {
      return dispatchContainerRuntimeCommand(message)
    }
  }
}
