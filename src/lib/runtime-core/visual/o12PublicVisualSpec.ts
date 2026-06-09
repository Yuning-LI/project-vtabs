export const PUBLIC_O12_FINGERING_VISUAL_SPEC = {
  viewBox: '0 0 120 100',
  bodyPath:
    'M43,97c-5,0,-7,-2,-7,-16c-1,-5,-3,-7,-8,-8c-32,-8,-37,-25,3,-41c18,-7,47,-12,73,-8c16,3,17,9,1,21c-12,9,-32,19,-45,36c-4,7,-5,11,-8,15c-2,3,-7,2,-13,1',
  visualTransform: 'translate(60 50) scale(0.94) translate(-60 -50)',
  bodyStroke: '#1f1812',
  openHole: {
    fill: '#ffffff',
    stroke: '#17110c',
    strokeWidth: 1.15
  },
  closedHole: {
    fill: '#000000',
    stroke: '#120d09',
    strokeWidth: 0.55
  },
  gradient: {
    cx: '44%',
    cy: '42%',
    r: '78%',
    fx: '42%',
    fy: '38%',
    stops: [
      { offset: '0%', color: '#fde5f6' },
      { offset: '45%', color: '#ebb2df' },
      { offset: '100%', color: '#c978bd' }
    ]
  },
  holeOrder: ['LB', 'RB', 'L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4', 'LS', 'RS'],
  holes: {
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
} as const

export type PublicO12HoleId = keyof typeof PUBLIC_O12_FINGERING_VISUAL_SPEC.holes
