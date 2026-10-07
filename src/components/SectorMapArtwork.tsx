export type SectorMapKey = 'solar-fringe' | 'red-nebula' | 'orion-field' | 'forgotten-systems' | 'the-void'

interface SectorMapArtworkProps {
  sectorKey: SectorMapKey
  kind?: 'emblem' | 'region'
}

function SectorEmblem({ sectorKey }: { sectorKey: SectorMapKey }) {
  if (sectorKey === 'solar-fringe') return <svg className="sector-emblem" viewBox="0 0 56 56" aria-hidden="true">
    <ellipse className="emblem-orbit" cx="28" cy="29" rx="23" ry="9" transform="rotate(-23 28 29)" />
    <circle className="emblem-body" cx="28" cy="28" r="13" />
    <path className="emblem-surface" d="M18 23q5-6 11-3t10 1M17 31q7-4 13 0t9 1M23 39q5-3 10-1" />
    <ellipse className="emblem-orbit emblem-orbit-front" cx="28" cy="29" rx="23" ry="9" transform="rotate(-23 28 29)" />
    <circle className="emblem-debris" cx="8" cy="33" r="2.1" /><circle className="emblem-debris" cx="46" cy="19" r="1.7" /><circle className="emblem-debris" cx="42" cy="40" r="1.3" />
  </svg>

  if (sectorKey === 'red-nebula') return <svg className="sector-emblem" viewBox="0 0 56 56" aria-hidden="true">
    <path className="emblem-nebula" d="M10 28c2-12 19-19 30-10 8 7 3 20-8 20-8 0-13-7-9-13 3-5 11-5 14 0" />
    <path className="emblem-nebula emblem-nebula-thin" d="M7 34c5 10 22 13 33 5M13 18c8-8 23-8 31 1" />
    <circle className="emblem-core" cx="28" cy="28" r="4.2" />
    <circle className="emblem-dust" cx="13" cy="29" r="1.4" /><circle className="emblem-dust" cx="43" cy="15" r="1.7" /><circle className="emblem-dust" cx="39" cy="42" r="1.2" />
  </svg>

  if (sectorKey === 'orion-field') return <svg className="sector-emblem" viewBox="0 0 56 56" aria-hidden="true">
    <path className="emblem-constellation" d="M9 15 22 11 35 18 43 34 28 42 16 31 9 15" />
    <path className="emblem-constellation emblem-constellation-inner" d="m22 11-6 20 19-13-7 24" />
    <circle className="emblem-star-node" cx="9" cy="15" r="2.6" /><circle className="emblem-star-node" cx="22" cy="11" r="3.1" /><circle className="emblem-star-node" cx="35" cy="18" r="2.4" />
    <circle className="emblem-star-node" cx="43" cy="34" r="3.2" /><circle className="emblem-star-node" cx="28" cy="42" r="2.1" /><circle className="emblem-star-node" cx="16" cy="31" r="2.8" />
    <circle className="emblem-core" cx="22" cy="11" r="1.3" />
  </svg>

  if (sectorKey === 'forgotten-systems') return <svg className="sector-emblem" viewBox="0 0 56 56" aria-hidden="true">
    <path className="emblem-relic" d="M28 7 36 13 39 23 35 29 39 39 28 48 17 39 21 29 17 23 20 13Z" />
    <path className="emblem-relic-inner" d="M22 18h12M21 28h14M22 38h12M28 13v29" />
    <path className="emblem-broken-orbit" d="M8 26c1-11 10-19 20-19M48 30c-1 11-10 19-20 19" />
    <circle className="emblem-relay" cx="8" cy="26" r="2.2" /><circle className="emblem-relay" cx="48" cy="30" r="2.2" />
  </svg>

  return <svg className="sector-emblem" viewBox="0 0 56 56" aria-hidden="true">
    <ellipse className="emblem-accretion" cx="28" cy="29" rx="24" ry="9" transform="rotate(-24 28 29)" />
    <ellipse className="emblem-accretion emblem-accretion-inner" cx="28" cy="29" rx="17" ry="5" transform="rotate(-24 28 29)" />
    <circle className="emblem-black-hole" cx="28" cy="28" r="10" />
    <circle className="emblem-horizon" cx="28" cy="28" r="13" />
    <circle className="emblem-debris" cx="10" cy="20" r="1.6" /><circle className="emblem-debris" cx="44" cy="39" r="1.8" />
  </svg>
}

function SectorRegion({ sectorKey }: { sectorKey: SectorMapKey }) {
  if (sectorKey === 'solar-fringe') return <svg className="map-region-art" viewBox="0 0 320 220" aria-hidden="true">
    <path className="region-soft" d="M4 137c60-78 114-91 166-65s91 67 146 9M-2 160c61-69 116-72 171-46s90 43 156-3" />
    <path className="region-line" d="M0 105c52 27 105 44 160 35s103-37 160-62M4 122c54 26 102 37 156 28s105-36 155-60" />
    <g className="region-dust"><circle cx="34" cy="89" r="2" /><circle cx="68" cy="158" r="1.5" /><circle cx="112" cy="84" r="1.4" /><circle cx="205" cy="150" r="2" /><circle cx="252" cy="75" r="1.5" /><circle cx="283" cy="128" r="1.2" /></g>
  </svg>

  if (sectorKey === 'red-nebula') return <svg className="map-region-art" viewBox="0 0 320 220" aria-hidden="true">
    <path className="region-cloud" d="M42 133c-24-31 13-76 56-68 12-38 71-52 99-20 35-8 75 20 67 53 38 28 16 76-23 77-25 29-75 20-88-4-41 23-92 2-92-38-12 3-17 2-19 0Z" />
    <path className="region-line" d="M44 119c21-47 56-35 85-18 26 15 50 23 81 0 22-16 42-15 68-4M57 146c28 25 64 22 91 2 28-21 63-18 89 6M95 82c31-18 67-10 82 7" />
    <path className="region-soft" d="M74 112c14-28 55-30 77-8 15 16 12 41-9 50-17 7-34-3-31-18 3-13 23-17 31-7" />
    <g className="region-dust"><circle cx="55" cy="86" r="1.4" /><circle cx="236" cy="69" r="2" /><circle cx="274" cy="138" r="1.4" /><circle cx="91" cy="173" r="1.8" /></g>
  </svg>

  if (sectorKey === 'orion-field') return <svg className="map-region-art" viewBox="0 0 320 220" aria-hidden="true">
    <path className="region-line" d="m44 57 76-23 75 42 66 70-88 42-67-50-62-81m76 23 65-4-12 93" />
    <path className="region-soft" d="m44 57 76-23 75 42 66 70-88 42-67-50-62-81" />
    <g className="region-node"><circle cx="44" cy="57" r="4" /><circle cx="120" cy="34" r="5" /><circle cx="195" cy="76" r="3.5" /><circle cx="261" cy="146" r="5" /><circle cx="173" cy="188" r="3" /><circle cx="106" cy="138" r="4" /></g>
    <g className="region-dust"><circle cx="75" cy="104" r="1.5" /><circle cx="225" cy="46" r="1.5" /><circle cx="293" cy="87" r="2" /><circle cx="153" cy="95" r="1.4" /></g>
  </svg>

  if (sectorKey === 'forgotten-systems') return <svg className="map-region-art" viewBox="0 0 320 220" aria-hidden="true">
    <ellipse className="region-ruin" cx="160" cy="110" rx="135" ry="79" transform="rotate(-17 160 110)" />
    <ellipse className="region-ruin region-ruin-inner" cx="160" cy="110" rx="95" ry="52" transform="rotate(24 160 110)" />
    <path className="region-line" d="m48 65 37 10 16 35-18 34-40 12m105-109 20 24-4 34 34 24 5 40m37-105-24 30 7 27 35 21" />
    <path className="region-ruin-break" d="M40 103c11-39 52-65 92-65m39 4c41 5 77 31 96 66M269 126c-9 43-53 75-99 79m-39-3c-39-7-71-34-87-67" />
    <g className="region-node"><rect x="77" y="69" width="7" height="7" rx="1" /><rect x="156" y="87" width="8" height="8" rx="1" /><rect x="222" y="143" width="7" height="7" rx="1" /></g>
  </svg>

  return <svg className="map-region-art" viewBox="0 0 320 220" aria-hidden="true">
    <ellipse className="region-black-hole" cx="160" cy="110" rx="119" ry="40" transform="rotate(-19 160 110)" />
    <ellipse className="region-line" cx="160" cy="110" rx="144" ry="53" transform="rotate(-19 160 110)" />
    <ellipse className="region-soft" cx="160" cy="110" rx="98" ry="29" transform="rotate(-19 160 110)" />
    <circle className="region-singularity" cx="160" cy="110" r="24" />
    <path className="region-lens" d="M48 90c41 17 82 27 112 27s72-10 112-27M59 131c36-14 68-22 101-22s68 8 101 22" />
    <g className="region-dust"><circle cx="53" cy="54" r="2" /><circle cx="275" cy="75" r="1.6" /><circle cx="83" cy="169" r="1.4" /><circle cx="256" cy="165" r="2" /></g>
  </svg>
}

export default function SectorMapArtwork({ sectorKey, kind = 'emblem' }: SectorMapArtworkProps) {
  return kind === 'region'
    ? <SectorRegion sectorKey={sectorKey} />
    : <SectorEmblem sectorKey={sectorKey} />
}
