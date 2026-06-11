'use client'

import { useCallback, useEffect, useRef } from 'react'
import type {
  ContainerRuntimeHostProps,
  PublicRuntimeHostController
} from './types'
import RuntimeStyleInjector from './RuntimeStyleInjector'

/**
 * Dev-only native DOM host skeleton.
 *
 * This phase intentionally mounts static diagnostic markup only. It must not
 * load runtime CSS, inject runtime HTML, or execute any runtime JavaScript.
 */
export default function ContainerRuntimeHost({
  songId,
  title,
  styleAssets = [],
  className,
  onHostControllerChange
}: ContainerRuntimeHostProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const controllerRef = useRef<PublicRuntimeHostController | null>(null)
  const assignRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node

      controllerRef.current?.destroy()
      controllerRef.current = node ? createContainerRuntimeHostController(node) : null
      onHostControllerChange?.(controllerRef.current)
    },
    [onHostControllerChange]
  )

  useEffect(() => {
    return () => {
      controllerRef.current?.destroy()
      controllerRef.current = null
      onHostControllerChange?.(null)
    }
  }, [onHostControllerChange])

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
      <div className="flex min-h-[520px] flex-col items-center justify-center px-6 py-10 text-center">
        <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-900">
          Container Host Skeleton
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-stone-900">
          {title}
        </h2>
        <p className="mt-3 max-w-xl text-sm font-semibold leading-7 text-stone-600">
          This panel is a React-owned DOM container. Runtime scripts are intentionally not loaded in
          this phase, so no sheet should render here yet.
        </p>
        <dl className="mt-6 grid gap-3 text-left text-sm md:grid-cols-3">
          <RuntimeHostFact label="Host mode" value="container skeleton" />
          <RuntimeHostFact label="Runtime JS" value="disabled" />
          <RuntimeHostFact label="Runtime CSS" value={styleAssets.length > 0 ? 'scoped' : 'disabled'} />
          <RuntimeHostFact label="Song" value={songId} />
        </dl>
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
      root.replaceChildren()
    },
    postMessage() {
      return false
    }
  }
}
