'use client'

import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

type HeaderProps = {
  instrument: string
  onInstrumentChange?: () => void
}

export default function Header({
  instrument,
  onInstrumentChange
}: HeaderProps) {
  const router = useRouter()
  return (
    <header className="flex justify-between items-center py-3 px-4 bg-white border-b border-wood-dark/20">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/')}
          className="p-1 hover:bg-wood-light rounded-full transition"
        >
          <ChevronLeft size={20} className="text-primary" />
        </button>
        <span className="text-lg font-semibold text-primary">Play By Fingering</span>
        <span className="text-xs bg-wood-light text-primary px-2 py-1 rounded-full">
          Learn Ocarina
        </span>
      </div>
      <div>
        <button
          onClick={onInstrumentChange}
          className="bg-primary text-wood-light px-4 py-2 rounded-full text-sm font-medium border border-wood-dark hover:bg-opacity-90 transition"
        >
          🌿 {instrument === 'ocarina-12' ? '12-Hole Ocarina' : instrument}
        </button>
      </div>
    </header>
  )
}
