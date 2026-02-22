'use client'

import { Play, Timer, Music, Volume2 } from 'lucide-react'

export default function ControlBar() {
  const buttons = [
    { icon: Play, label: 'Play' },
    { icon: Timer, label: 'Speed 1.0x' },
    { icon: Music, label: 'Key C' },
    { icon: Volume2, label: 'Accompaniment' }
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-wood-light border-t border-wood-dark/30 py-3 px-6 flex justify-around items-center">
      {buttons.map(({ icon: Icon, label }) => (
        <button
          key={label}
          className="flex flex-col items-center gap-1 text-primary opacity-80 hover:opacity-100 transition"
        >
          <Icon size={22} />
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </div>
  )
}
