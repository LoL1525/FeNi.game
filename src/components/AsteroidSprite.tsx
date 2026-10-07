import type { AsteroidKind } from '../game/types'
import type { ReactNode } from 'react'

export default function AsteroidSprite({ kind }: { kind: AsteroidKind }) {
  const details: Record<AsteroidKind, ReactNode> = {
    common: <><path className="rock-main" d="M20 57 34 27 65 16 94 30 105 59 88 91 54 99 24 83Z"/><path className="rock-shade" d="m54 99 5-26 29-17 17 3-17 32Z"/><path className="rock-light" d="m34 27 31-11 14 12-20 10-31 6Z"/><ellipse className="rock-crater" cx="47" cy="53" rx="9" ry="6"/><ellipse className="rock-crater" cx="78" cy="72" rx="7" ry="5"/><circle className="rock-glint" cx="67" cy="38" r="3"/></>,
    metallic: <><path className="rock-main" d="M18 51 39 20 75 17 103 42 96 78 69 98 32 86Z"/><path className="rock-shade" d="m69 98 6-34 28-22-7 36Z"/><path className="rock-light" d="m39 20 36-3 11 19-30 11-38 4Z"/><path className="ore-vein" d="m31 69 24-15 13 6 21-15"/><path className="ore-vein thin" d="m45 83 11-20 12-3"/><circle className="rock-crater" cx="77" cy="39" r="5"/></>,
    rare: <><path className="rare-main" d="m19 55 13-26 20 7 13-22 18 22 22-2 1 29-18 8-9 25-25 4-14-17-24 1Z"/><path className="rare-facet" d="m52 36 13-22 4 49-25 20-14-28Z"/><path className="rare-glint" d="m65 14 18 22-14 27Z"/><path className="rare-vein" d="m33 36 15 18-6 12m45-30-13 15 13 10M54 78l17-15-1 23"/></>,
    anomalous: <><path className="anomaly-main" d="m21 56 12-29 29-13 31 18 10 33-25 31-36-5Z"/><path className="anomaly-core" d="m49 38 18-9 16 12-5 23-20 10-15-15Z"/><path className="anomaly-rune" d="m61 22 7 15-8 12 17 7-13 19m26-43-10 13 13 10-14 10"/><circle className="anomaly-dot" cx="38" cy="70" r="3"/><circle className="anomaly-dot" cx="85" cy="80" r="2"/></>,
    crystal: <><path className="crystal-main" d="m19 75 13-38 13 9 7-28 18 28 13-19 19 43-24 22-30-9Z"/><path className="crystal-face" d="m52 18 7 44-26 31-14-18Z"/><path className="crystal-shine" d="m52 18 18 28-11 16Z"/><path className="crystal-edge" d="m32 37 20-19m18 28 13-19m-24 35 30 31"/></>,
    volcanic: <><path className="lava-main" d="M22 54 39 23 69 16 97 35 104 63 87 93 55 101 27 83Z"/><path className="lava-shade" d="m55 101 8-32 24-8 17 2-17 30Z"/><path className="lava-crack" d="m40 29 10 17-9 12 15 12-4 27m17-81-7 20 11 11-8 14 16 11m-2-55-4 17 12 8"/><circle className="lava-core" cx="50" cy="57" r="4"/><circle className="lava-core" cx="82" cy="80" r="3"/></>,
    ice: <><path className="ice-main" d="m19 55 17-29 27-12 29 16 13 31-18 31-37 7-29-20Z"/><path className="ice-shade" d="m58 99 7-36 27-33 13 31-18 31Z"/><path className="ice-light" d="m36 26 27-12 15 11-19 22-23 1Z"/><path className="ice-crack" d="m37 29 14 26-9 14 21 10-5 20m24-68-17 17 14 12-12 17m-2-29 12 4"/></>,
  }
  return <svg className={`asteroid-svg asteroid-svg-${kind}`} viewBox="0 0 124 112" aria-hidden="true">{details[kind]}</svg>
}
