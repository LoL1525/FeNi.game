type StarTone = 'violet' | 'ice'

export function CelestialStarShape() {
  return <path className="celestial-star-outline" d="M18 1.5 22.1 13.9 34.5 18 22.1 22.1 18 34.5 13.9 22.1 1.5 18 13.9 13.9Z" />
}

export default function CelestialStar({ className = '', tone = 'violet' }: { className?: string; tone?: StarTone }) {
  return <svg className={'celestial-star ' + className} data-tone={tone} viewBox="0 0 38 38" aria-hidden="true"><CelestialStarShape /></svg>
}
