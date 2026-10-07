type PlanetOrbProps = {
  visual: string
  size?: 'normal' | 'large' | 'tiny'
}

export default function PlanetOrb({ visual, size = 'normal' }: PlanetOrbProps) {
  return <div className={`planet-orb planet-${visual} orb-${size}`} aria-hidden="true"><i /><b /><span /></div>
}
