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
  'm4845,4460c-214,-23 -457,-59 -647,-95c-134,-26 -220,-43 -303,-58c-92,-18 -155,-31 -240,-52c-33,-7 -123,-28 -200,-45c-77,-18 -185,-43 -240,-57c-123,-30 -258,-63 -305,-72c-19,-4 -51,-13 -70,-19c-19,-6 -75,-21 -125,-32c-187,-43 -724,-207 -820,-250c-19,-9 -84,-33 -135,-49c-14,-5 -72,-30 -130,-56c-58,-26 -127,-56 -155,-67c-231,-92 -568,-308 -712,-457c-408,-421 -250,-826 442,-1134c98,-43 292,-111 410,-143c130,-35 163,-48 231,-90c61,-37 78,-54 112,-112l40,-68l6,-274c11,-496 30,-585 135,-622c51,-18 348,-14 394,6c64,26 88,74 147,296c13,47 29,104 37,128c7,23 13,51 13,62c0,10 4,21 9,24c5,3 12,23 16,43c3,21 20,83 36,138c147,488 175,556 274,664c45,49 196,173 265,217c25,16 47,31 50,35c3,3 41,30 85,60c44,30 105,73 135,95c30,22 100,72 155,109c114,78 166,116 331,235c64,47 146,106 183,133c36,26 73,53 81,60c8,7 74,57 145,112c432,331 707,576 920,820c35,40 95,131 95,143c0,6 6,17 13,24c18,18 47,110 47,150c-1,81 -76,150 -202,183c-73,20 -391,29 -523,15z'

const HOLE_ORDER = ['LB', 'RB', 'L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4', 'LS', 'RS']

const HOLE_COORDS = {
  LB: { cx: 1465, cy: 1463, r: 220 },
  RB: { cx: 3194, cy: 1448, r: 220 },
  L1: { cx: 926, cy: 2912, r: 170 },
  L2: { cx: 1505, cy: 3101, r: 170 },
  L3: { cx: 2035, cy: 3320, r: 170 },
  L4: { cx: 2495, cy: 3693, r: 170 },
  R1: { cx: 3433, cy: 2850, r: 170 },
  R2: { cx: 3940, cy: 3200, r: 170 },
  R3: { cx: 4370, cy: 3500, r: 170 },
  R4: { cx: 4816, cy: 3900, r: 170 },
  LS: { cx: 1630, cy: 2700, r: 110 },
  RS: { cx: 3693, cy: 3600, r: 110 }
}

export default function FingeringDiagram({
  midi,
  muted = false,
  className = '',
  bodyFill = '#fbf5ec',
  strokeColor = '#5c4033',
  openFill = '#fffaf2',
  closedFill = '#5c4033'
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

  return (
    <svg
      viewBox="0 0 600 511"
      className={`h-16 w-20 overflow-visible ${className}`.trim()}
      aria-hidden="true"
    >
      <g transform="translate(0, 511) scale(0.1, -0.1)">
        <path
          d={BODY_PATH}
          fill={bodyFill}
          stroke={strokeColor}
          strokeWidth="45"
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
              stroke={strokeColor}
              strokeWidth="35"
              opacity={fillOpacity}
            />
          )
        })}
      </g>
    </svg>
  )
}
