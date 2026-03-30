'use client'

import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

type HeaderProps = {
  instrument: string
  notationMode?: 'numbered' | 'letter'
  onInstrumentChange?: () => void
}

export default function Header({
  instrument,
  notationMode = 'letter',
  onInstrumentChange
}: HeaderProps) {
  const router = useRouter()
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          onClick={() => router.push('/')}
          className="rounded-full p-1 transition hover:bg-stone-100"
        >
          <ChevronLeft size={20} className="text-stone-900" />
        </button>
        <span className="truncate text-base font-semibold text-stone-900 sm:text-lg">
          Play By Fingering
        </span>
        <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] text-amber-800 sm:text-xs">
          {notationMode === 'letter' ? 'Letter Tabs' : 'Numbered Tabs'}
        </span>
      </div>
      <div className="ml-auto">
        <button
          onClick={onInstrumentChange}
          className="rounded-full border border-stone-200 bg-stone-950 px-3 py-2 text-xs font-medium text-stone-50 transition hover:bg-stone-800 sm:px-4 sm:text-sm"
        >
          {instrument === 'ocarina-12' ? '12-Hole Ocarina' : instrument}
        </button>
      </div>
    </header>
  )
}
