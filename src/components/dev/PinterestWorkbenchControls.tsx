'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { useTransition } from 'react'
import type { PublicRuntimeControlOption } from '@/lib/songbook/publicRuntimeControls'
import type { PublicSongInstrument } from '@/lib/songbook/publicInstruments'

type PinterestWorkbenchControlsProps = {
  songTitle: string
  publicSongHref: string
  supportedInstruments: PublicSongInstrument[]
  activeInstrumentId: string
  graphOptions: PublicRuntimeControlOption[]
  activeGraphValue: string | null
  noteLabelMode: 'letter' | 'number'
  showLyric: 'on' | 'off'
  showMeasureNum: 'on' | 'off'
  measureLayout: 'compact' | 'mono'
  scaleOptions: PublicRuntimeControlOption[]
  activeSheetScale: string
  watermark: 'on' | 'off'
  lyricToggleAvailable: boolean
}

export default function PinterestWorkbenchControls({
  songTitle,
  publicSongHref,
  supportedInstruments,
  activeInstrumentId,
  graphOptions,
  activeGraphValue,
  noteLabelMode,
  showLyric,
  showMeasureNum,
  measureLayout,
  scaleOptions,
  activeSheetScale,
  watermark,
  lyricToggleAvailable
}: PinterestWorkbenchControlsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function replaceSearchParam(name: string, value: string | null) {
    const next = new URLSearchParams(searchParams?.toString() ?? '')

    if (!value) {
      next.delete(name)
    } else {
      next.set(name, value)
    }

    const query = next.toString()
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white/96 p-4 shadow-[0_24px_60px_rgba(49,34,20,0.16)] md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Internal Pinterest Workbench
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-900">
            {songTitle}
          </h1>
          <p className="mt-2 text-sm leading-7 text-stone-600">
            Resize the browser window until the chart feels right, then screenshot only the canvas below.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dev/pinterest"
            className="rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700"
          >
            Back to Picker
          </Link>
          <Link
            href={publicSongHref}
            className="rounded-full border border-stone-900 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-50"
          >
            Open Public Page
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ControlField label="Instrument">
          <select
            value={activeInstrumentId}
            onChange={event => replaceSearchParam('instrument', event.target.value === 'o12' ? null : event.target.value)}
            className="workbench-select"
          >
            {supportedInstruments.map(instrument => (
              <option key={instrument.id} value={instrument.id}>
                {instrument.label}
              </option>
            ))}
          </select>
        </ControlField>

        <ControlField label="Note View">
          <select
            value={noteLabelMode}
            onChange={event => replaceSearchParam('note_label_mode', event.target.value === 'letter' ? null : event.target.value)}
            className="workbench-select"
          >
            <option value="letter">Letter Notes</option>
            <option value="number">Numbered Notes</option>
          </select>
        </ControlField>

        <ControlField label="Fingering Chart">
          <select
            value={activeGraphValue ?? 'off'}
            onChange={event => replaceSearchParam('show_graph', event.target.value)}
            className="workbench-select"
          >
            <option value="off">Chart Off</option>
            {graphOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ControlField>

        <ControlField label="Zoom">
          <select
            value={activeSheetScale}
            onChange={event => replaceSearchParam('sheet_scale', event.target.value)}
            className="workbench-select"
          >
            {scaleOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ControlField>

        <ControlField label="Lyrics">
          <select
            value={showLyric}
            onChange={event => replaceSearchParam('show_lyric', lyricToggleAvailable ? event.target.value : 'off')}
            className="workbench-select"
            disabled={!lyricToggleAvailable}
          >
            <option value="off">Off</option>
            <option value="on">On</option>
          </select>
        </ControlField>

        <ControlField label="Measure Numbers">
          <select
            value={showMeasureNum}
            onChange={event => replaceSearchParam('show_measure_num', event.target.value === 'off' ? null : event.target.value)}
            className="workbench-select"
          >
            <option value="off">Off</option>
            <option value="on">On</option>
          </select>
        </ControlField>

        <ControlField label="Layout">
          <select
            value={measureLayout}
            onChange={event => replaceSearchParam('measure_layout', event.target.value === 'compact' ? null : event.target.value)}
            className="workbench-select"
          >
            <option value="compact">Compact</option>
            <option value="mono">Equal Width</option>
          </select>
        </ControlField>

        <ControlField label="Watermark">
          <select
            value={watermark}
            onChange={event => replaceSearchParam('watermark', event.target.value === 'on' ? null : event.target.value)}
            className="workbench-select"
          >
            <option value="on">On</option>
            <option value="off">Off</option>
          </select>
        </ControlField>
      </div>

      <style jsx>{`
        .workbench-select {
          width: 100%;
          min-height: 2.9rem;
          border-radius: 1rem;
          border: 1px solid rgba(214, 211, 209, 1);
          background: rgba(255, 251, 246, 0.96);
          padding: 0.72rem 0.95rem;
          color: rgb(28 25 23);
          outline: none;
        }
      `}</style>

      {isPending ? (
        <div className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
          Updating preview
        </div>
      ) : null}
    </section>
  )
}

function ControlField({
  label,
  children
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
        {label}
      </span>
      {children}
    </label>
  )
}
