import type { ResourceKey } from '../game/types'

type ResourceIconProps = {
  resource: ResourceKey
  size?: number
}

const COLORS: Record<ResourceKey, { top: string; face: string; side: string; shine: string; stroke: string }> = {
  iron: { top: '#e0e8ef', face: '#a8bbc9', side: '#718796', shine: '#f5f8fb', stroke: '#405565' },
  copper: { top: '#ffd0a1', face: '#e9955d', side: '#ae5f3e', shine: '#ffe0bc', stroke: '#693b32' },
  nickel: { top: '#e2ebd1', face: '#b5c79c', side: '#788b68', shine: '#f1f5df', stroke: '#4e5d4c' },
  silicon: { top: '#e0cbff', face: '#a47add', side: '#67489d', shine: '#f0e5ff', stroke: '#463260' },
}

export default function ResourceIcon({ resource, size = 26 }: ResourceIconProps) {
  const color = COLORS[resource]

  if (resource === 'silicon') {
    return <svg className="resource-ingot resource-crystal" width={size} height={size} viewBox="0 0 40 36" aria-hidden="true">
      <path d="M5 16 12 5l7 4 4-6 12 13-5 16H11z" fill={color.face} stroke={color.stroke} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m5 16 8 1 6-8-7-4z" fill={color.top} />
      <path d="m19 9 4-6 4 12-8 13z" fill={color.shine} opacity=".88" />
      <path d="m19 28 8-13 8 1-5 16H11z" fill={color.side} opacity=".72" />
      <path d="m12 5 7 4m4-6 4 12" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.2" />
    </svg>
  }

  return <svg className={`resource-ingot resource-${resource}`} width={size} height={size} viewBox="0 0 40 36" aria-hidden="true">
    <path d="m6 11 5-6h18l5 6-3 18H9z" fill={color.face} stroke={color.stroke} strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M6 11h28l-5 5H11z" fill={color.top} />
    <path d="m11 16 18 0-2 13H9z" fill={color.face} />
    <path d="m29 16 5-5-3 18-4 0z" fill={color.side} />
    <path d="m11 16 18 0-2 3H12z" fill={color.shine} opacity=".8" />
    <path d="m10 25 1-7m-1-7 4-4h14" fill="none" stroke="#fff" strokeOpacity=".54" strokeWidth="1.15" strokeLinecap="round" />
  </svg>
}
