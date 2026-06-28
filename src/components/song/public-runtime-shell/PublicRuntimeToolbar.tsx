import Link from 'next/link'
import type { PublicSongPageQueryState } from '@/lib/songbook/publicInstruments'
import type {
  PublicRuntimeHostMode,
  PublicRuntimeHostModeSource
} from '@/lib/runtime-core/publicRuntimeHostMode'
import PublicRuntimeHostSwitch from '../runtime-host/PublicRuntimeHostSwitch'
import SongPageFunctionZone, {
  type SongPageFunctionZoneActionControl,
  type SongPageFunctionZoneSelectControl,
  type SongPageFunctionZoneToggleControl
} from '../SongPageFunctionZone'

export function PublicRuntimeToolbar({
  backHref,
  backLabel,
  title,
  subtitle,
  seoSummary,
  selects,
  toggles,
  actions,
  onNavigate,
  songId,
  runtimeHostMode,
  normalizedQueryState,
  pageBasePath,
  runtimeHostModeSource,
  runtimeHostQueryFlag
}: {
  backHref: string
  backLabel: string
  title: string
  subtitle: string | null | undefined
  seoSummary?: string | null
  selects: SongPageFunctionZoneSelectControl[]
  toggles: SongPageFunctionZoneToggleControl[]
  actions: SongPageFunctionZoneActionControl[]
  onNavigate: (href: string) => void
  songId: string
  runtimeHostMode: PublicRuntimeHostMode
  normalizedQueryState: PublicSongPageQueryState
  pageBasePath: string
  runtimeHostModeSource: PublicRuntimeHostModeSource
  runtimeHostQueryFlag: boolean
}) {
  const summary = seoSummary || subtitle

  return (
    <section className="page-warm-hero mb-2 px-4 py-3 md:mb-3 md:px-7 md:py-[1.125rem]">
      <Link
        href={backHref}
        className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[rgba(61,47,34,0.16)] bg-[rgba(255,251,245,0.88)] px-3 py-1.5 text-[0.8rem] font-semibold text-stone-700 shadow-[0_10px_22px_rgba(61,47,34,0.08)] transition hover:-translate-y-0.5 hover:bg-white md:mb-3 md:gap-2 md:border-stone-900 md:bg-stone-900 md:px-4 md:py-2.5 md:text-sm md:text-stone-50 md:shadow-[0_14px_30px_rgba(61,47,34,0.18)] md:hover:bg-stone-800 md:hover:shadow-[0_18px_36px_rgba(61,47,34,0.24)]"
      >
        <span aria-hidden="true" className="text-[0.95rem] leading-none md:text-base">
          ←
        </span>
        <span>{backLabel}</span>
      </Link>
      <h1 className="mt-1.5 text-[1.7rem] font-black leading-tight tracking-tight text-stone-900 md:mt-2 md:text-[3.05rem]">
        {title}
      </h1>
      {summary ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 md:text-[0.95rem] md:leading-7">
          {summary}
        </p>
      ) : null}
      <div className="mt-2 border-t border-[rgba(154,126,91,0.18)] pt-2 md:mt-3 md:pt-3">
        <SongPageFunctionZone
          selects={selects}
          toggles={toggles}
          actions={actions}
          onNavigate={onNavigate}
        />
        <PublicRuntimeHostSwitch
          songId={songId}
          activeMode={runtimeHostMode}
          queryState={normalizedQueryState}
          pageBasePath={pageBasePath}
          source={runtimeHostModeSource}
          isVisible={runtimeHostQueryFlag}
        />
      </div>
    </section>
  )
}
