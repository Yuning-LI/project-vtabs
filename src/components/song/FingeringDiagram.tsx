import { DICT } from '@/components/InstrumentDicts/ocarina12'

type FingeringDiagramProps = {
  midi: number
  muted?: boolean
  className?: string
  bodyFill?: string
  strokeColor?: string
  openFill?: string
  closedFill?: string
}

const BODY_PATH =
  'M43,97c-5,0,-7,-2,-7,-16c-1,-5,-3,-7,-8,-8c-32,-8,-37,-25,3,-41c18,-7,47,-12,73,-8c16,3,17,9,1,21c-12,9,-32,19,-45,36c-4,7,-5,11,-8,15c-2,3,-7,2,-13,1'

const HOLE_ORDER = ['LB', 'RB', 'L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4', 'LS', 'RS']

const HOLE_COORDS = {
  LB: { cx: 28, cy: 85, r: 4.55 },
  RB: { cx: 68, cy: 85, r: 4.55 },
  L1: { cx: 14.8, cy: 52, r: 4 },
  L2: { cx: 26.8, cy: 48, r: 4 },
  L3: { cx: 38.8, cy: 43, r: 4 },
  L4: { cx: 50.8, cy: 34, r: 4 },
  R1: { cx: 73.8, cy: 56.2, r: 4 },
  R2: { cx: 84.2, cy: 47, r: 4 },
  R3: { cx: 94.2, cy: 39, r: 4 },
  R4: { cx: 105.2, cy: 33.2, r: 4 },
  LS: { cx: 30.8, cy: 60, r: 3.45 },
  RS: { cx: 76.6, cy: 38.2, r: 3.45 }
}

export default function FingeringDiagram({
  midi,
  muted = false,
  className = '',
  bodyFill,
  strokeColor = '#1f1812',
  openFill = '#ffffff',
  closedFill = '#000000'
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

  return (
    <svg
      viewBox="0 0 120 100"
      className={`h-16 w-20 overflow-visible ${className}`.trim()}
      aria-hidden="true"
    >
      <defs>
        <radialGradient
          id={gradientId}
          cx="44%"
          cy="42%"
          r="78%"
          fx="42%"
          fy="38%"
        >
          <stop offset="0%" stopColor="#fde5f6" />
          <stop offset="45%" stopColor="#ebb2df" />
          <stop offset="100%" stopColor="#c978bd" />
        </radialGradient>
      </defs>
      <g transform="translate(60 50) scale(0.94) translate(-60 -50)">
        <path
          d={BODY_PATH}
          fill={resolvedBodyFill}
          stroke={strokeColor}
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={fillOpacity}
        />
        {HOLE_ORDER.map((id, index) => {
          const hole = HOLE_COORDS[id as keyof typeof HOLE_COORDS]
          const closed = state[index] === 1
          return (
            <circle
              key={id}
              cx={hole.cx}
              cy={hole.cy}
              r={hole.r}
              fill={closed ? closedFill : openFill}
              stroke={closed ? '#120d09' : '#17110c'}
              strokeWidth={closed ? '0.55' : '1.15'}
              opacity={fillOpacity}
            />
          )
        })}
      </g>
    </svg>
  )
}
