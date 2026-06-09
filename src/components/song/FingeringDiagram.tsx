import type { CSSProperties } from 'react'
import { DICT } from '@/components/InstrumentDicts/ocarina12'
import {
  PUBLIC_O12_FINGERING_VISUAL_SPEC,
  type PublicO12HoleId
} from '@/lib/runtime-core/visual/o12PublicVisualSpec'

type FingeringDiagramProps = {
  midi: number
  muted?: boolean
  className?: string
  bodyFill?: string
  strokeColor?: string
  openFill?: string
  closedFill?: string
  style?: CSSProperties
}

export default function FingeringDiagram({
  midi,
  muted = false,
  className = '',
  bodyFill,
  strokeColor = '#1f1812',
  openFill = '#ffffff',
  closedFill = '#000000',
  style
}: FingeringDiagramProps) {
  const state = DICT[midi]

  if (!state) {
    return (
      <div className="flex h-16 w-20 items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-100 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
        N/A
      </div>
    )
  }

  const fillOpacity = muted ? 0.45 : 1
  const gradientId = `vtabs-native-o12-gradient-${midi}`
  const resolvedBodyFill = bodyFill ?? `url(#${gradientId})`
  const visualSpec = PUBLIC_O12_FINGERING_VISUAL_SPEC

  return (
    <svg
      viewBox={visualSpec.viewBox}
      className={`h-16 w-20 overflow-visible ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <radialGradient
          id={gradientId}
          cx={visualSpec.gradient.cx}
          cy={visualSpec.gradient.cy}
          r={visualSpec.gradient.r}
          fx={visualSpec.gradient.fx}
          fy={visualSpec.gradient.fy}
        >
          {visualSpec.gradient.stops.map(stop => (
            <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </radialGradient>
      </defs>
      <g transform={visualSpec.visualTransform}>
        <path
          d={visualSpec.bodyPath}
          fill={resolvedBodyFill}
          stroke={strokeColor ?? visualSpec.bodyStroke}
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={fillOpacity}
        />
        {visualSpec.holeOrder.map((id, index) => {
          const hole = visualSpec.holes[id as PublicO12HoleId]
          const closed = state[index] === 1
          const style = closed ? visualSpec.closedHole : visualSpec.openHole

          return (
            <circle
              key={id}
              cx={hole.cx}
              cy={hole.cy}
              r={hole.r}
              fill={closed ? closedFill : openFill}
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              opacity={fillOpacity}
            />
          )
        })}
      </g>
    </svg>
  )
}
