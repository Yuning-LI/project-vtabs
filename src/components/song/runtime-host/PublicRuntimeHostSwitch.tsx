'use client'

import Link from 'next/link'
import {
  buildSongPageHref,
  type PublicSongPageQueryState
} from '@/lib/songbook/publicInstruments'
import type {
  PublicRuntimeHostMode,
  PublicRuntimeHostModeSource
} from '@/lib/runtime-core/publicRuntimeHostMode'

type PublicRuntimeHostSwitchProps = {
  songId: string
  activeMode: PublicRuntimeHostMode
  queryState: PublicSongPageQueryState
  pageBasePath?: string
  source: PublicRuntimeHostModeSource
  isVisible: boolean
}

const HOST_OPTIONS: Array<{
  mode: PublicRuntimeHostMode
  label: string
}> = [
  {
    mode: 'iframe',
    label: 'Legacy Signal'
  },
  {
    mode: 'container',
    label: 'Container'
  }
]

export default function PublicRuntimeHostSwitch({
  songId,
  activeMode,
  queryState,
  pageBasePath = '/song',
  source,
  isVisible
}: PublicRuntimeHostSwitchProps) {
  if (!isVisible) {
    return null
  }

  return (
    <nav
      className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-stone-700"
      aria-label="Runtime host"
      data-public-runtime-host-switch="true"
      data-public-runtime-host-source={source}
    >
      <span className="uppercase text-stone-500">Runtime Host</span>
      <div className="inline-flex rounded-full border border-[rgba(61,47,34,0.16)] bg-white/80 p-1 shadow-[0_8px_18px_rgba(61,47,34,0.08)]">
        {HOST_OPTIONS.map(option => {
          const isActive = option.mode === activeMode
          return (
            <Link
              key={option.mode}
              href={buildSongPageHref({
                songId,
                basePath: pageBasePath,
                ...queryState,
                runtimeHost: option.mode
              })}
              aria-current={isActive ? 'page' : undefined}
              className={
                isActive
                  ? 'rounded-full bg-stone-900 px-3 py-1.5 text-stone-50'
                  : 'rounded-full px-3 py-1.5 text-stone-700 transition hover:bg-stone-100'
              }
            >
              {option.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
