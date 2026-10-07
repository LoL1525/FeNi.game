import { CelestialStarShape } from './CelestialStar'

export default function GalaxyMark({ variant = 0 }: { variant?: number }) {
  const tilt = (variant % 5) * 18 - 36
  const colors = ['#79c5ff', '#91a9ff', '#7be0d1', '#d0a0f5', '#86bcff']
  const color = colors[variant % colors.length]
  return <svg className="galaxy-mark" viewBox="0 0 56 56" aria-hidden="true">
    <circle className="galaxy-halo" cx="28" cy="28" r="23" style={{ color }} />
    <ellipse className="galaxy-arm galaxy-arm-a" cx="28" cy="28" rx="19" ry="8" transform={`rotate(${tilt} 28 28)`} />
    <ellipse className="galaxy-arm galaxy-arm-b" cx="28" cy="28" rx="17" ry="7" transform={`rotate(${tilt + 64} 28 28)`} />
    <circle className="galaxy-core" cx="28" cy="28" r="5" />
    <g className="galaxy-star celestial-star" data-tone="ice" transform="translate(4 9) scale(.38)"><CelestialStarShape /></g>
    <g className="galaxy-star celestial-star" data-tone="violet" transform="translate(38 9) scale(.28)"><CelestialStarShape /></g>
    <g className="galaxy-star celestial-star" data-tone="violet" transform="translate(37 37) scale(.34)"><CelestialStarShape /></g>
  </svg>
}
